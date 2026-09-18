#!/bin/bash
# Import prefrontal-cortex into Dario（markdown 模式：安装 ~/AGENTS.md 行为契约段落）。幂等。
set -euo pipefail
TOOL_HOME="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REPO="${PFC_MEMORY_HOME:-$HOME/.prefrontal-cortex}"
BLOCK="$TOOL_HOME/import/dario/AGENTS.md"
TARGET="$HOME/AGENTS.md"

[ -e "$REPO/sync" ] || ln -s "$TOOL_HOME/sync" "$REPO/sync"

mkdir -p "$(dirname "$TARGET")"
touch "$TARGET"
python3 - "$BLOCK" "$TARGET" <<'EOF'
import re, sys
block_path, target_path = sys.argv[1], sys.argv[2]
block = open(block_path).read().strip() + "\n"
text = open(target_path).read()
pattern = re.compile(r'<!-- prefrontal-cortex:sync BEGIN -->.*?<!-- prefrontal-cortex:sync END -->\n?', re.S)
if pattern.search(text):
    bak = target_path + ".bak"
    open(bak, "w").write(text)
    print(f"backup: {bak}")
    text = pattern.sub(block, text)
    print("replaced existing prefrontal-cortex:sync block")
else:
    if text and not text.endswith("\n"):
        text += "\n"
    text = text + "\n" + block
    print("appended prefrontal-cortex:sync block")
open(target_path, "w").write(text)
EOF

echo "import done -> $TARGET"
