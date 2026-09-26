# Agent 全局指令注册模板（prefrontal-cortex memory sync）

> [src:hermes, 2026-08-04, conf:high] **单一事实源**：所有接入 prefrontal-cortex 记忆库的 agent（hermes / codex / claude-code / deepseek …），其全局指令文件（AGENTS.md / CLAUDE.md）中的记忆同步段落必须按本模板设置。任何差异都以本模板为准。
>
> 生成方式：把 `<AGENT>` 替换为 agent 名（小写，如 `codex`、`claude-code`、`deepseek`），`<文件>` 替换为具体记忆文件路径，其余内容原样复制。
>
> 全局指令文件位置约定：
> - codex → `~/.codex/AGENTS.md`
> - claude-code → `~/.claude/CLAUDE.md`
> - deepseek → `~/.dsh/AGENTS.md`（DSH user-global；加载面已验证 2026-08-13，见 `~/.prefrontal-cortex/agents/deepseek/README.md`）
> - hermes → 无独立全局文件；记忆直接写 `agents/hermes/memory/`（repo-only）

---

```markdown
<!-- prefrontal-cortex:sync BEGIN -->
## prefrontal-cortex：共享记忆（repo-first，用户偏好 2026-08-04）

> **如果你是第一次接入本记忆库的新 agent：先读 `~/.prefrontal-cortex/agents/README.md`（onboarding 指引，约 2 分钟）。**

本机共享记忆仓库 `~/.prefrontal-cortex`（GitHub: orriduck/prefrontal-cortex），同步引擎 `~/Devs/prefrontal`（模板源：`~/Devs/prefrontal/templates/agent-global-instructions.md`）。

**用户偏好：记忆以 repo 为准（repo-first）——repo-only 模式的 agent 所有 durable 记忆写入仓库文件、内部 memory store 只留精简指针；markdown 模式的 agent 读写原生记忆文件，由 sync 快照进仓库做版本化备份与共享视图。共同的职业、人物和工作方式知识写在 `shared/knowledge/`。**

作为 <AGENT>：

1. **读取**：需要用户背景/跨工具上下文时，读 `~/.prefrontal-cortex/shared/MEMORY.md`、`shared/USER.md` 和相关的 `shared/knowledge/` 主题页。前两者是自动重建视图，勿手改；`shared/knowledge/` 是可直接维护的共同事实源。
2. **写入**：agent 专属 durable 信息追加到 `<文件>`（`§` 分节，前缀 `[src:<AGENT>, YYYY-MM-DD, conf:high|med|low]`）；跨 agent 的职业、人物和工作方式知识写到 `shared/knowledge/` 的对应主题页。不要再按日创建运行日志。
3. **禁止**：不手改 `shared/MEMORY.md` / `shared/USER.md`（重建视图会覆盖）；`.env`、`*auth*.json`、`mcp-tokens/` 永不入 git；不得把登录邮箱、token 或客户非公开信息写入共同主题知识。
4. **同步**：实质任务完成/session 结束前，先告知用户「我将进行 memory 的 GitHub 同步」，然后执行 `bash ~/.prefrontal-cortex/sync/sync.sh <SYNC-CMD>`（markdown 模式：`push <AGENT>`；repo-only 模式：`commit "<AGENT>: <摘要>"`）。不要为同步创建每日记录。
5. **事实核查（fact-check）**：陈述外部、当前或决策性事实时遵守 `~/.prefrontal-cortex/agents/hermes/memory/fact-check-standards.md`（一手/官方优先、附来源+核查时间、事实/推断/传闻分开、无来源标不确定）。
6. **投资判断（finance）**：涉及投资评级/买卖/仓位/纪律结论前，先读 `~/.prefrontal-cortex/agents/hermes/memory/financial-investment-system.md`（canonical policy §4 连续研究原则）；未成功读取则只能说明「无法给出投资结论」，结论尾部附 `[policy:已读]`。
7. **外部服务连接器（connectors）**：涉及 Fidelity、Robinhood、Google Workspace、小红书或浏览器自动化时，先读 `~/.prefrontal-cortex/agents/hermes/memory/connector-registry.md`，再通过 `~/Devs/hermes-connectors` 的 manifest/`connectors` CLI 或声明的 MCP surface 执行；不要绕过 connector core 直接注入凭据。凭据只保留在 Keychain/OAuth/MCP credential store，永不写入 repo、argv 或 memory。Fidelity 永远只读且不设置 `FIDELITY_LIVE_TRADING`；`KEYCHAIN_LOCKED`、`CRED_NOT_CONFIGURED`、`SESSION_EXPIRED` 是终止性 typed error，不得自动重试风暴或用 fixture 伪造真实成功。
<!-- prefrontal-cortex:sync END -->
```

## 各 agent 的 <文件> 值

| Agent | MODE | <文件> |
|-------|------|--------|
| codex | repo-only | `~/.prefrontal-cortex/agents/codex/memory/MEMORY.md` |
| claude-code | file | `~/.prefrontal-cortex/agents/claude-code/memory/CLAUDE.md` |
| deepseek | repo-only | `~/.prefrontal-cortex/agents/deepseek/memory/MEMORY.md` |
| hermes | repo-only | `~/.prefrontal-cortex/agents/hermes/memory/MEMORY.md` |

## 变更流程

1. 修改本模板（唯一事实源）
2. 用模板重新生成各 agent 全局指令段落（替换旧段落）
3. `bash ~/.prefrontal-cortex/sync/sync.sh commit "hermes: 更新 agent 全局指令模板"`
