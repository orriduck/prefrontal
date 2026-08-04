# Agent 全局指令注册模板（prefrontal-cortex memory sync）

> [src:hermes, 2026-08-04, conf:high] **单一事实源**：所有接入 prefrontal-cortex 记忆库的 agent（hermes / codex / claude-code / deepseek …），其全局指令文件（AGENTS.md / CLAUDE.md）中的记忆同步段落必须按本模板设置。任何差异都以本模板为准。
>
> 生成方式：把 `<AGENT>` 替换为 agent 名（小写，如 `codex`、`claude-code`、`deepseek`），`<文件>` 替换为具体记忆文件路径，其余内容原样复制。
>
> 全局指令文件位置约定：
> - codex → `~/.codex/AGENTS.md`
> - claude-code → `~/.claude/CLAUDE.md`
> - deepseek → `~/.deepseek/AGENTS.md`（未来）
> - hermes → 无独立全局文件；记忆直接写 `agents/hermes/memory/`（repo-only）

---

```markdown
<!-- prefrontal-cortex:sync BEGIN -->
## prefrontal-cortex：共享记忆（repo-first，用户偏好 2026-08-04）

> **如果你是第一次接入本记忆库的新 agent：先读 `~/.prefrontal-cortex/agents/README.md`（onboarding 指引，约 2 分钟）。**

本机共享记忆仓库 `~/.prefrontal-cortex`（GitHub: orriduck/prefrontal-cortex），同步引擎 `~/Devs/prefrontal`（模板源：`~/Devs/prefrontal/templates/agent-global-instructions.md`）。

**用户偏好：记忆以 repo 为准（repo-first）——所有 durable 记忆写入仓库文件，内部 memory store 只留精简指针。**

作为 <AGENT>：

1. **读取**：需要用户背景/跨工具上下文时，读 `~/.prefrontal-cortex/shared/MEMORY.md` 和 `~/.prefrontal-cortex/shared/USER.md`（自动重建视图，勿手改）。
2. **写入**：durable 信息追加到 `<文件>`（`§` 分节，前缀 `[src:<AGENT>, YYYY-MM-DD, conf:high|med|low]`）。每日日志写 `agents/<AGENT>/logs/YYYY-MM-DD.md`。
3. **禁止**：不手改 `shared/MEMORY.md` / `shared/USER.md`（重建视图会覆盖）；`.env`、`*auth*.json`、`mcp-tokens/` 永不入 git。
4. **同步**：实质任务完成/session 结束前，先告知用户「我将进行 memory 的 GitHub 同步」，然后执行 `bash ~/.prefrontal-cortex/sync/sync.sh commit "<AGENT>: <摘要>"`。不要每条消息都同步。
<!-- prefrontal-cortex:sync END -->
```

## 各 agent 的 <文件> 值

| Agent | <文件> |
|-------|--------|
| codex | `~/.prefrontal-cortex/agents/codex/memory/MEMORY.md` |
| claude-code | `~/.prefrontal-cortex/agents/claude-code/memory/CLAUDE.md` |
| deepseek | `~/.prefrontal-cortex/agents/deepseek/memory/MEMORY.md`（预留） |
| hermes | `~/.prefrontal-cortex/agents/hermes/memory/MEMORY.md` |

## 变更流程

1. 修改本模板（唯一事实源）
2. 用模板重新生成各 agent 全局指令段落（替换旧段落）
3. `bash ~/.prefrontal-cortex/sync/sync.sh commit "hermes: 更新 agent 全局指令模板"`
