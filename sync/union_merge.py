#!/usr/bin/env python3
"""Union-merge two §-separated memory files.

Blocks are split on lines containing only "§". Order-preserving union:
blocks from the base file first, then any block from the incoming file
whose normalized content is not already present. Files without §
separators are treated as a single block.

Usage: union_merge.py <base> <incoming> <output>
"""
import sys


def split_blocks(text: str) -> list[str]:
    blocks, current = [], []
    for line in text.splitlines():
        if line.strip() == "§":
            block = "\n".join(current).strip()
            if block:
                blocks.append(block)
            current = []
        else:
            current.append(line)
    block = "\n".join(current).strip()
    if block:
        blocks.append(block)
    return blocks


def normalize(block: str) -> str:
    return " ".join(block.split())


def main() -> int:
    base_path, incoming_path, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
    base = open(base_path, encoding="utf-8").read() if base_path != "-" else ""
    incoming = open(incoming_path, encoding="utf-8").read()

    merged = split_blocks(base)
    seen = {normalize(b) for b in merged}
    added = 0
    for block in split_blocks(incoming):
        if normalize(block) not in seen:
            merged.append(block)
            seen.add(normalize(block))
            added += 1

    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n§\n".join(b + "\n" for b in merged))
    print(f"union_merge: {len(merged)} blocks total, {added} added from {incoming_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
