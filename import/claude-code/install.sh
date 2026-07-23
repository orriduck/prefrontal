#!/bin/bash
# Import prefrontal-cortex into Claude Code（file 模式：恢复 CLAUDE.md + 注入约定）。幂等。
set -euo pipefail
TOOL_HOME="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REPO="${PFC_MEMORY_HOME:-$HOME/.prefrontal-cortex}"
CC_HOME="${CLAUDE_HOME:-$HOME/.claude}"

[ -e "$REPO/sync" ] || ln -s "$TOOL_HOME/sync" "$REPO/sync"

mkdir -p "$CC_HOME"
if [ -f "$REPO/agents/claude-code/memory/CLAUDE.md" ]; then
    if [ -f "$CC_HOME/CLAUDE.md" ] && ! diff -q "$CC_HOME/CLAUDE.md" "$REPO/agents/claude-code/memory/CLAUDE.md" >/dev/null 2>&1; then
        cp "$CC_HOME/CLAUDE.md" "$CC_HOME/CLAUDE.md.bak.$(date +%Y%m%d_%H%M%S)"
        echo "⚠️  已备份原有 CLAUDE.md"
    fi
    cp "$REPO/agents/claude-code/memory/CLAUDE.md" "$CC_HOME/CLAUDE.md"
fi

if ! grep -q "prefrontal-cortex:sync BEGIN" "$CC_HOME/CLAUDE.md" 2>/dev/null; then
    printf '\n' >> "$CC_HOME/CLAUDE.md"
    cat "$TOOL_HOME/import/claude-code/CLAUDE.snippet.md" >> "$CC_HOME/CLAUDE.md"
    echo "✅ 已注入 prefrontal-cortex 同步约定"
fi

echo "✅ claude-code 导入完成 → $CC_HOME/CLAUDE.md"
