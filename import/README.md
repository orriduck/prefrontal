# import/ — 把记忆库导入到各个 agent

每个子目录对应一个 agent 的「一键导入」材料：`install.sh` 把记忆快照和
同步行为约定物化到该 agent 的原生位置，并自动建立 memory 库里的
`sync/` symlink（如缺失）。幂等，可重复执行。

```bash
bash import/openclaw/install.sh   # markdown 模式工作区
bash import/kimi/install.sh       # vault 模式
bash import/kimi-code/install.sh  # repo-only：安装全局 AGENTS.md
bash import/claude-code/install.sh # file：恢复 CLAUDE.md + 注入约定
```

等价于 `sync/sync.sh restore <agent>`。为你的 agent 新增导入：
复制最接近的目录，改路径与模板即可。
