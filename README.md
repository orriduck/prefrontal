# prefrontal

**多 agent 共享记忆的同步引擎**。让一个设备上的多个 AI agent（CLI、桌面助手、
编码代理……）把各自长期记忆备份到同一个 git 仓库、共享一层共识视图、并整体迁移到新机。

设计：**工具（本仓库，public）与记忆（你的私有仓库）分离**。

```
工具库（本仓库）                记忆库（私有，如 ~/.prefrontal-cortex）
├── sync/sync.sh         ────►  shared/     自动重建的共识视图（勿手改）
├── sync/union_merge.py        agents/<name>/{memory,logs,identity}
├── registry/examples/         registry/<name>.env   你的真实注册项
└── import/<agent>/            archive/     退役 agent 存档
```

记忆库里的 `sync/` 是指向本工具库 `sync/` 的 **symlink**——agent 只需记住
一个路径，工具更新只需 push 本仓库。

## 核心语义

- **agent 自包含**：每个 agent 的记忆、日志、身份文件都在 `agents/<name>/` 下
- **shared 纯派生**：`shared/MEMORY.md`、`shared/USER.md` 是注册（活跃）agent
  记忆的 `§` 分节并集，每次 push 从头重建——被修改/删除的分节零残留
- **声明式接入**：新 agent = 一个 `registry/<name>.env` + 一个
  `import/<name>/install.sh`，引擎零改动
- **存档不进视图**：退役 agent 的记忆留在仓库，但不污染共识

## 快速开始

```bash
# 1. 工具库
git clone <this-repo> ~/Devs/prefrontal

# 2. 记忆库（你的私有仓库；或用仓库里的结构新建一个）
git clone <your-private-memory-repo> ~/.prefrontal-cortex
ln -s ~/Devs/prefrontal/sync ~/.prefrontal-cortex/sync   # import 脚本会自动补

# 3. 注册一个 agent（选一种 MODE）
cp ~/Devs/prefrontal/registry/examples/markdown.env.example \
   ~/.prefrontal-cortex/registry/my-agent.env   # 然后改 NATIVE_ROOT

# 4. 首次同步
bash ~/Devs/prefrontal/sync/sync.sh push my-agent
bash ~/Devs/prefrontal/sync/sync.sh status
```

## 四种注册模式（registry/<name>.env）

| MODE | 适用 | 行为 |
|---|---|---|
| `markdown` | 原生目录有 `MEMORY.md/USER.md`、身份文件、`memory/*.md` 日期日志 | 分目录快照 + 进 shared 视图 |
| `vault` | 整个记忆目录需原样保存 | 目录级快照（--delete 镜像） |
| `file` | 单文件记忆（如 `~/.claude/CLAUDE.md`） | 文件快照；非 § 格式不进视图 |
| `repo-only` | 无外部目录 | 记忆直接写在 `agents/<name>/memory/` |

## 接口

| 命令 | 作用 |
|---|---|
| `sync.sh push <agent>` | 快照原生记忆 → 重建视图 → 提交推送 |
| `sync.sh pull <agent>` | 拉取远端，视图合并回原生 |
| `sync.sh status` | 全量漂移报告 |
| `sync.sh restore <agent>` | 委托 `import/<agent>/install.sh` 导入 |
| `sync.sh commit [msg]` | 仓库内直接编辑后重建视图并推送 |

环境变量：`PFC_MEMORY_HOME`（记忆库位置，默认 `~/.prefrontal-cortex`）。

## 行为约定（让 agent 自主同步）

工具之外，建议把「自主判断时机 → 告知用户 → 执行同步」的约定写进每个 agent
每次会话都会读的指令源。模板见 `import/<agent>/`（如
`import/kimi-code/AGENTS.md`、`import/claude-code/CLAUDE.snippet.md`）。

## 安全

- 本仓库只含代码与模板，**不应**包含任何真实记忆或密钥
- 记忆库务必保持 **private**；密钥类文件（`.env`、`*token*`）永远不要跟踪
