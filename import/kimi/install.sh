#!/bin/bash
# Import prefrontal-cortex memory into a vault-mode agent (Kimi Work / daimon). 幂等。
set -euo pipefail
TOOL_HOME="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REPO="${PFC_MEMORY_HOME:-$HOME/.prefrontal-cortex}"
VAULT="${KIMI_VAULT:-$HOME/Library/Application Support/kimi-desktop/daimon-share/daimon/agents/main/memory/vault}"

[ -e "$REPO/sync" ] || ln -s "$TOOL_HOME/sync" "$REPO/sync"

mkdir -p "$VAULT"
rsync -a "$REPO/agents/kimi/memory/vault/" "$VAULT/"

echo "✅ kimi 导入完成 → $VAULT"
