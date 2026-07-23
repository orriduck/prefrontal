#!/bin/bash
# Import prefrontal-cortex into Kimi Code（repo-only 模式：安装全局 AGENTS.md）。幂等。
set -euo pipefail
TOOL_HOME="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REPO="${PFC_MEMORY_HOME:-$HOME/.prefrontal-cortex}"
KC_HOME="${KIMI_CODE_HOME:-$HOME/.kimi-code}"

[ -e "$REPO/sync" ] || ln -s "$TOOL_HOME/sync" "$REPO/sync"

mkdir -p "$KC_HOME"
if [ -f "$KC_HOME/AGENTS.md" ] && ! diff -q "$KC_HOME/AGENTS.md" "$TOOL_HOME/import/kimi-code/AGENTS.md" >/dev/null 2>&1; then
    cp "$KC_HOME/AGENTS.md" "$KC_HOME/AGENTS.md.bak.$(date +%Y%m%d_%H%M%S)"
    echo "⚠️  已备份原有 AGENTS.md"
fi
cp "$TOOL_HOME/import/kimi-code/AGENTS.md" "$KC_HOME/AGENTS.md"

echo "✅ kimi-code 导入完成 → $KC_HOME/AGENTS.md"
