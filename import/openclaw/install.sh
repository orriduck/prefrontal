#!/bin/bash
# Import prefrontal-cortex memory into an openclaw-style agent workspace
# (markdown mode: MEMORY.md/USER.md + identity files + dated logs). 幂等。
set -euo pipefail
TOOL_HOME="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REPO="${PFC_MEMORY_HOME:-$HOME/.prefrontal-cortex}"
WS="${OPENCLAW_WS:-$HOME/.kimi_openclaw/workspace}"

# 0. 自愈：memory 库里的 sync/ 应是指向工具库的 symlink
[ -e "$REPO/sync" ] || ln -s "$TOOL_HOME/sync" "$REPO/sync"

mkdir -p "$WS/memory" "$WS/bin"
# 1. 恢复工作区记忆快照（MEMORY/USER/SOUL/IDENTITY/TOOLS + memory/）
rsync -a "$REPO/agents/openclaw/memory/" "$WS/" 2>/dev/null || true
rsync -a "$REPO/agents/openclaw/identity/" "$WS/" 2>/dev/null || true
[ -d "$REPO/agents/openclaw/logs" ] && rsync -a "$REPO/agents/openclaw/logs/" "$WS/memory/"
# 2. 安装同步封装
cp "$TOOL_HOME/import/openclaw/backup.sh" "$WS/bin/backup.sh"
chmod +x "$WS/bin/backup.sh"
# 3. shared 层合并回原生记忆
bash "$TOOL_HOME/sync/sync.sh" pull openclaw

echo "✅ openclaw 导入完成 → $WS"
