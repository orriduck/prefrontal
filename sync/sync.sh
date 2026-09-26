#!/bin/bash
# prefrontal — the sync engine for a prefrontal-cortex shared memory repo.
#
# Tools live in THIS repo (public). Memories live in a separate private repo
# (default ~/.prefrontal-cortex, override: PFC_MEMORY_HOME).
#
#   sync.sh push    <agent>     native memory → agents/<agent>/，重建 shared 阅读视图，提交推送
#   sync.sh pull    <agent>     git pull，shared/ 视图合并回原生记忆
#   sync.sh status              漂移报告（按 memory 库 registry/ 全量检查）
#   sync.sh restore <agent>     导入到指定 agent（委托 import/<agent>/install.sh）
#   sync.sh commit  [message]   提交推送 memory 库内的直接编辑（repo-only agent 用）
#
# agent 通过 memory 库里的 registry/<name>.env 声明式注册（MODE + 路径），
# 新 agent 接入无需改动本脚本。
set -euo pipefail

TOOL_HOME="$(cd -P "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="${PFC_MEMORY_HOME:-$HOME/.prefrontal-cortex}"
MERGE="$TOOL_HOME/union_merge.py"
REGISTRY="$REPO/registry"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
CMD="${1:-status}"; AGENT="${2:-}"

die() { echo -e "${RED}❌ $*${NC}" >&2; exit 1; }

load_agent() {
    local f="$REGISTRY/$1.env"
    [ -f "$f" ] || die "agent 未注册: $1（缺少 $REGISTRY/$1.env，参考 prefrontal 工具的 registry/examples/）"
    MODE=""; NATIVE_ROOT=""; SRC_FILE=""; DEST_NAME=""
    source "$f"
    [ -n "$MODE" ] || die "registry/$1.env 缺少 MODE"
}

registered_agents() {
    [ -d "$REGISTRY" ] || return 0
    for f in "$REGISTRY"/*.env; do basename "$f" .env; done
}

# --- push：原生 → agents/<name>/ ---
snapshot() {
    local name="$1" dest="$REPO/agents/$1"
    mkdir -p "$dest"
    case "$MODE" in
        markdown)
            mkdir -p "$dest/memory" "$dest/identity" "$dest/memory/topics"
            for f in MEMORY.md USER.md; do
                [ -f "$NATIVE_ROOT/$f" ] && rsync -a "$NATIVE_ROOT/$f" "$dest/memory/$f"
            done
            for f in SOUL.md IDENTITY.md TOOLS.md; do
                [ -f "$NATIVE_ROOT/$f" ] && rsync -a "$NATIVE_ROOT/$f" "$dest/identity/$f"
            done
            [ -d "$NATIVE_ROOT/memory" ] && rsync -a --update "$NATIVE_ROOT/memory/" "$dest/memory/topics/"
            ;;
        vault)
            mkdir -p "$dest/memory/vault"
            rsync -a --delete "$NATIVE_ROOT/" "$dest/memory/vault/"
            ;;
        repo-only)
            : # 记忆直接写在 memory 库里，无需快照
            ;;
        file)
            [ -n "$SRC_FILE" ] || die "registry/$name.env MODE=file 需要 SRC_FILE"
            mkdir -p "$dest/memory"
            [ -f "$SRC_FILE" ] && rsync -a "$SRC_FILE" "$dest/memory/${DEST_NAME:-$(basename "$SRC_FILE")}"
            ;;
        *) die "未知 MODE: $MODE（registry/$name.env）" ;;
    esac
}

# --- shared 阅读视图重建：注册（活跃）agent 的 memory/ § 并集（每次从头生成，无残留）。
# shared/knowledge/ 是直接维护的共同知识，绝不在这里覆盖。已退役 agent 的记忆仅存 archive/。 ---
rebuild_views() {
    local tmp base name target
    for target in MEMORY.md USER.md; do
        tmp=$(mktemp)
        : > "$tmp"
        for name in $(registered_agents); do
            base="$REPO/agents/$name/memory/$target"
            [ -f "$base" ] || continue
            python3 "$MERGE" "$tmp" "$base" "$tmp" >/dev/null
        done
        if [ -s "$tmp" ]; then
            mv "$tmp" "$REPO/shared/$target"
        else
            rm -f "$tmp"   # 没有任何来源时保留现状
        fi
    done
}

check_nonempty() {
    for f in "$REPO/shared/MEMORY.md" "$REPO/shared/USER.md"; do
        if [ -f "$f" ] && [ ! -s "$f" ]; then
            die "CRITICAL: $f is empty — refusing to commit"
        fi
    done
}

commit_and_push() {
    cd "$REPO"
    git add -A
    if git diff --cached --quiet; then
        echo -e "${GREEN}✅ Nothing to commit${NC}"; return 0
    fi
    local ts; ts=$(date +%Y-%m-%d_%H:%M)
    git commit --quiet -m "ledger(sync): $1 $ts"
    if git push --quiet 2>/dev/null; then
        if [ "$(git rev-parse HEAD)" = "$(git rev-parse @{u} 2>/dev/null || echo '?')" ]; then
            echo -e "${GREEN}✅ pushed & reconciled ($(git rev-parse HEAD))${NC}"
        else
            echo -e "${YELLOW}⚠️  pushed but remote hash mismatch — check manually${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  push failed — committed locally; check remote history, credentials, or connectivity before retrying${NC}"
    fi
}

# --- pull：shared/ 视图 → 原生 ---
pull_native() {
    local name="$1"
    case "$MODE" in
        markdown)
            for f in MEMORY.md USER.md; do
                [ -f "$NATIVE_ROOT/$f" ] || continue
                python3 "$MERGE" "$NATIVE_ROOT/$f" "$REPO/shared/$f" "$NATIVE_ROOT/$f"
            done
            mkdir -p "$NATIVE_ROOT/memory"
            rsync -a --update "$REPO/agents/$name/memory/topics/" "$NATIVE_ROOT/memory/" 2>/dev/null || true
            echo -e "${GREEN}✅ shared → $NATIVE_ROOT${NC}"
            ;;
        vault)
            echo -e "${YELLOW}ℹ️  vault 由其宿主管理；请直接读 $REPO/shared/${NC}"
            ;;
        repo-only)
            echo -e "${YELLOW}ℹ️  repo-only agent：直接读写 $REPO/agents/$name/memory/${NC}"
            ;;
        file)
            echo -e "${YELLOW}ℹ️  file 模式：回写由 import/$name/install.sh 处理${NC}"
            ;;
    esac
}

case "$CMD" in
    push)
        load_agent "$AGENT"
        cd "$REPO"
        git pull --rebase --quiet
        echo -e "${YELLOW}📥 snapshot $AGENT → agents/$AGENT${NC}"
        snapshot "$AGENT"
        rebuild_views
        check_nonempty
        commit_and_push "push $AGENT"
        ;;
    pull)
        load_agent "$AGENT"
        cd "$REPO"
        git pull --rebase --quiet
        pull_native "$AGENT"
        ;;
    status)
        cd "$REPO"
        git fetch --quiet 2>/dev/null || true
        echo "memory repo: $REPO ($(git rev-parse --short HEAD), $(git rev-list --count HEAD..@{u} 2>/dev/null || echo 0) behind)"
        echo "tool repo:   $TOOL_HOME"
        for name in $(registered_agents); do
            load_agent "$name"
            case "$MODE" in
                repo-only)
                    echo -e "$name: ${GREEN}repo-only（无需快照）${NC}"; continue ;;
            esac
            tmp=$(mktemp -d)
            dest="$tmp"
            case "$MODE" in
                markdown)
                    mkdir -p "$dest/memory" "$dest/identity" "$dest/memory/topics"
                    for f in MEMORY.md USER.md; do [ -f "$NATIVE_ROOT/$f" ] && rsync -a "$NATIVE_ROOT/$f" "$dest/memory/$f"; done
                    for f in SOUL.md IDENTITY.md TOOLS.md; do [ -f "$NATIVE_ROOT/$f" ] && rsync -a "$NATIVE_ROOT/$f" "$dest/identity/$f"; done
                    [ -d "$NATIVE_ROOT/memory" ] && rsync -a --update "$NATIVE_ROOT/memory/" "$dest/memory/topics/"
                    ;;
                vault)
                    mkdir -p "$dest/memory/vault"
                    rsync -a "$NATIVE_ROOT/" "$dest/memory/vault/"
                    ;;
                file)
                    mkdir -p "$dest/memory"
                    [ -f "$SRC_FILE" ] && rsync -a "$SRC_FILE" "$dest/memory/${DEST_NAME:-$(basename "$SRC_FILE")}"
                    ;;
            esac
            if diff -qr "$tmp" "$REPO/agents/$name" >/dev/null 2>&1; then
                echo -e "$name: ${GREEN}in sync${NC}"
            else
                echo -e "$name: ${YELLOW}drifted (run: sync.sh push $name)${NC}"
            fi
            rm -rf "$tmp"
        done
        ;;
    restore)
        [ -f "$TOOL_HOME/import/$AGENT/install.sh" ] || die "usage: sync.sh restore <agent>（缺少 import/$AGENT/install.sh）"
        [ -d "$REPO/.git" ] || die "memory repo not cloned: git clone <your-private-memory-repo> $REPO"
        bash "$TOOL_HOME/import/$AGENT/install.sh"
        ;;
    commit)
        cd "$REPO"
        git pull --rebase --quiet
        rebuild_views
        check_nonempty
        commit_and_push "${2:-direct edit}"
        ;;
    *)
        die "unknown command: $CMD (push|pull|status|restore|commit)"
        ;;
esac
