#!/bin/bash
# wechat-todo.sh — 读 coordination/brief.md 的「当前待办」区块，空则静默（no_agent cron）
REPO="${PFC_MEMORY_HOME:-$HOME/.prefrontal-cortex}"
BRIEF="$REPO/coordination/brief.md"
[ -f "$BRIEF" ] || exit 0

# awk 状态机提取「当前待办」表格：BEGIN=`## 当前待办`，END=下一个 `## ` 标题
# 过滤：表头(含 ID)、分隔行(去掉|和空格后全是-或:)、列数!=6 的行
TODO=$(awk '
  /^## 当前待办/ {in_todo=1; next}
  /^## / && in_todo {in_todo=0}
  in_todo && /^\|/ {
    if ($0 ~ /^\| *ID *\|/) next           # 表头：仅首列为 ID
    inner = $0
    gsub(/\|/, "", inner)                  # 去所有 |
    gsub(/[ -]/, "", inner)                # 去空格和-
    gsub(/:/, "", inner)                   # 去 :
    if (inner == "") next                  # 分隔行（全 -/:）
    n = split($0, f, "|")
    if (n - 2 != 6) next                   # 首尾| → 6 个字段
    print $0
  }
' "$BRIEF")

[ -z "$TODO" ] && exit 0  # 空待办 → 静默

echo "📋 当前待办："
echo "$TODO"
