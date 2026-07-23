#!/bin/bash
# prefrontal-cortex sync wrapper — installed by import/openclaw/install.sh.
# 保持原有调用习惯：session 结束前直接跑本脚本即可。
exec bash "${PFC_HOME:-$HOME/.prefrontal-cortex}/sync/sync.sh" push openclaw
