#!/usr/bin/env python3
"""coord.py — coordination 唯一写入口（v3 规格，双方 agreed）。

子命令：
  handoff FROM TO SUMMARY TTL REF...    创建交接（TTL 如 14d/7d）
  brief TODO STATUS                    更新当前待办
  list [status]                        列出活跃交接
  stale-check [--apply]                检查过期；--apply 归档+索引
  prune --days N --keep K              数量超限归档+索引
"""
import argparse
import datetime as dt
import fcntl
import os
import re
import subprocess
import sys
import tempfile
from typing import Any, IO
from pathlib import Path

REPO = Path(os.environ.get("PFC_MEMORY_HOME", Path.home() / ".prefrontal-cortex"))
COORD = REPO / "coordination"
HANDOFFS = COORD / "handoffs"
ARCHIVE = COORD / "archive"
INDEX = COORD / "archive-index.md"
BRIEF = COORD / "brief.md"
LOCK = COORD / ".coord.lock"

BRIEF_MAX_LINES = 60


def _now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def _lock() -> "IO[Any]":
    COORD.mkdir(parents=True, exist_ok=True)
    f = open(LOCK, "w")
    fcntl.flock(f, fcntl.LOCK_EX)
    return f


def _next_id(now: dt.datetime) -> str:
    """当天序号，flock 保护下调用（并发安全）。"""
    seq = 0
    for f in HANDOFFS.glob(f"h-{now:%Y%m%d}-*.md"):
        m = re.match(rf"h-{now:%Y%m%d}-(\d{{3}})", f.name)
        if m:
            seq = max(seq, int(m.group(1)))
    return f"h-{now:%Y%m%d}-{seq + 1:03d}"


def _parse_ttl(ttl: str) -> dt.datetime:
    m = re.match(r"^(\d+)([dh])$", ttl.strip().lower())
    if not m:
        raise SystemExit(f"bad TTL: {ttl} (use e.g. 14d / 7d)")
    n, unit = int(m.group(1)), m.group(2)
    delta = dt.timedelta(days=n) if unit == "d" else dt.timedelta(hours=n)
    return _now() + delta


def _git_head() -> str:
    try:
        out = subprocess.run(
            ["git", "-C", str(REPO), "rev-parse", "--short", "HEAD"],
            capture_output=True, text=True, timeout=10,
        )
        return out.stdout.strip() or "unknown"
    except Exception:
        return "unknown"


def _write_atomic(path: Path, text: str) -> None:
    """mkstemp + fsync + replace：真原子写，无固定 .tmp 竞争。"""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), prefix=".tmp-", suffix=".part")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(text)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def _sanitize(value: str, field: str) -> str:
    """拒绝 CR/LF（防 YAML/index 注入）。"""
    if "\r" in value or "\n" in value:
        raise SystemExit(f"bad {field}: newline not allowed")
    return value.strip()


def _utc_parse(iso: str) -> dt.datetime:
    """统一解析为 UTC-aware；非法即报错（不静默跳过）。"""
    parsed = dt.datetime.fromisoformat(iso.strip())
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=dt.timezone.utc)
    return parsed.astimezone(dt.timezone.utc)


def _archive(hid: str, summary: str) -> None:
    src = HANDOFFS / f"{hid}.md"
    dst = ARCHIVE / f"{hid}.md"
    if not src.exists():
        # 已归档过：no-op，避免重复 index 行
        return
    _write_atomic(dst, src.read_text(encoding="utf-8"))
    src.unlink()
    head = _git_head()
    line = f"{_now():%Y-%m-%d}|{hid}|{summary}|{dst.relative_to(REPO)}|{head}"
    existing = INDEX.read_text(encoding="utf-8") if INDEX.exists() else ""
    _write_atomic(INDEX, existing.rstrip() + "\n" + line + "\n")


def cmd_handoff(args) -> None:
    frm = _sanitize(args.frm, "from")
    to = _sanitize(args.to, "to")
    summary = _sanitize(args.summary, "summary")
    refs = " ".join(_sanitize(r, "ref") for r in args.ref) if args.ref else "-"
    now = _now()
    lock_f = _lock()
    try:
        hid = _next_id(now)
        expires = _parse_ttl(args.ttl).isoformat()
        fm = "\n".join([
            "---",
            f"id: {hid}",
            f"created: {now.isoformat()}",
            f"expires_at: {expires}",
            "status: open",
            f"to: {to}",
            f"from: {frm}",
            f"summary: {summary}",
            f"context_refs: [{refs}]",
            "version: 1",
            "---",
        ])
        body = "\n决策：\n证据：\n下一步：\n"
        _write_atomic(HANDOFFS / f"{hid}.md", fm + body)
    finally:
        lock_f.close()
    print(f"✓ {hid} created → {to} (expires {expires})")


def cmd_brief(args) -> None:
    rows = []
    for row in args.todo:
        parts = [_sanitize(p, "todo") for p in row.split("|")]
        parts += [""] * 6
        rows.append(parts[:6])
        if len(rows) >= 40:  # 保守上限：表头3行+40 todo+结论/阻塞/摘要 ≈ ≤60
            break
    text = (
        "# Brief ｜ v1\n\n"
        f"> updated: {_now().isoformat()}\n\n"
        "## 当前待办\n\n"
        "| ID | 事项 | owner | 状态 | 截止 | handoff |\n"
        "|----|------|-------|------|------|---------|\n"
    )
    for parts in rows:
        text += f"| {' | '.join(parts)} |\n"
    # stale 摘要：活跃但过期的 handoff
    stale_hids = []
    for f in HANDOFFS.glob("h-*.md"):
        content = f.read_text(encoding="utf-8")
        m = re.search(r"^expires_at: (.+)$", content, re.M)
        if m:
            try:
                if _utc_parse(m.group(1)) < _now():
                    stale_hids.append(f.stem)
            except ValueError:
                pass
    text += "\n## 结论\n\n## 阻塞/需决策\n"
    if stale_hids:
        text += "\n> ⚠ 过期待办：" + "、".join(stale_hids) + "（stale-check --apply 归档）\n"
    _write_atomic(BRIEF, text)
    print(f"✓ brief updated ({len(rows)} todos)")


def cmd_list(args) -> None:
    for f in sorted(HANDOFFS.glob("h-*.md")):
        content = f.read_text(encoding="utf-8")
        m = re.search(r"^status: (\S+)", content, re.M)
        status = m.group(1) if m else "?"
        m2 = re.search(r"^summary: (.+)$", content, re.M)
        summary = m2.group(1) if m2 else f.name
        if args.status and status != args.status:
            continue
        print(f"{f.stem} [{status}] {summary}")


def cmd_stale(args) -> None:
    now = _now()
    stale = []
    for f in HANDOFFS.glob("h-*.md"):
        content = f.read_text(encoding="utf-8")
        m = re.search(r"^expires_at: (.+)$", content, re.M)
        m2 = re.search(r"^summary: (.+)$", content, re.M)
        if m:
            try:
                exp = _utc_parse(m.group(1))
            except ValueError:
                print(f"⚠ bad expires_at in {f.stem}; fix manually")
                continue
            if exp < now:
                stale.append((f.stem, m2.group(1) if m2 else f.stem))
    if not args.apply:
        for hid, s in stale:
            print(f"⚠ stale: {hid} ({s})")
        print(f"{len(stale)} stale handoff(s); use --apply to archive")
        return
    lock_f = _lock()
    try:
        for hid, s in stale:
            _archive(hid, s)
            print(f"✓ archived {hid}")
    finally:
        lock_f.close()


def cmd_prune(args) -> None:
    if args.days < 1 or args.keep < 1:
        raise SystemExit("prune: --days and --keep must be >= 1")
    now = _now()
    items = []
    for f in HANDOFFS.glob("h-*.md"):
        content = f.read_text(encoding="utf-8")
        m2 = re.search(r"^summary: (.+)$", content, re.M)
        created = dt.datetime.min.replace(tzinfo=dt.timezone.utc)
        m3 = re.search(r"^created: (.+)$", content, re.M)
        if m3:
            try:
                created = _utc_parse(m3.group(1))
            except ValueError:
                pass
        items.append((f.stem, created, m2.group(1) if m2 else f.stem, f))
    # 按创建时间排序，老的在前
    items.sort(key=lambda x: x[1])
    to_archive = []
    for hid, created, summary, f in items:
        if (now - created) > dt.timedelta(days=args.days):
            to_archive.append((hid, summary))
    if len(items) - len(to_archive) > args.keep:
        # 超过保留上限：把最老的（未因天数归档的）继续归档
        remaining = [x for x in items if x[0] not in {h for h, _ in to_archive}]
        overflow = len(remaining) - args.keep
        for hid, _, summary, _ in remaining[:overflow]:
            to_archive.append((hid, summary))
    for hid, summary in to_archive:
        lock_f = _lock()
        try:
            _archive(hid, summary)
            print(f"✓ pruned {hid}")
        finally:
            lock_f.close()


def main() -> int:
    p = argparse.ArgumentParser(prog="coord.py")
    sub = p.add_subparsers(dest="cmd", required=True)
    h = sub.add_parser("handoff")
    h.add_argument("frm"); h.add_argument("to"); h.add_argument("summary")
    h.add_argument("ttl"); h.add_argument("ref", nargs="*")
    h.set_defaults(fn=cmd_handoff)
    b = sub.add_parser("brief")
    b.add_argument("todo", nargs="*")
    b.set_defaults(fn=cmd_brief)
    l = sub.add_parser("list")
    l.add_argument("status", nargs="?")
    l.set_defaults(fn=cmd_list)
    s = sub.add_parser("stale-check")
    s.add_argument("--apply", action="store_true")
    s.set_defaults(fn=cmd_stale)
    pr = sub.add_parser("prune")
    pr.add_argument("--days", type=int, default=14)
    pr.add_argument("--keep", type=int, default=50)
    pr.set_defaults(fn=cmd_prune)
    args = p.parse_args()
    HANDOFFS.mkdir(parents=True, exist_ok=True)
    ARCHIVE.mkdir(parents=True, exist_ok=True)
    args.fn(args)
    return 0


if __name__ == "__main__":
    sys.exit(main())
