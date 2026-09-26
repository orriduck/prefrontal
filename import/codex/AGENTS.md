# Global Instructions — Codex (prefrontal-cortex memory sync)

> 生成方式：把此文件复制到 `~/.codex/AGENTS.md` 对应段落（`<!-- prefrontal-cortex:sync BEGIN -->` ... `END` 之间），或按需调整。hermes 无独立全局文件（repo-only，直接写 agents/hermes/memory/）。

## prefrontal-cortex：共享记忆（repo-first，用户偏好 2026-08-04）

本机共享记忆仓库 `~/.prefrontal-cortex`（GitHub: orriduck/prefrontal-cortex，private），
同步引擎 `~/Devs/prefrontal`。repo-only 模式：durable 记忆直接写在仓库文件里。

作为 Codex（repo-only）：

1. **读取**：需要用户背景/跨工具上下文时，读 `~/.prefrontal-cortex/shared/MEMORY.md`、
   `shared/USER.md` 和相关的 `shared/knowledge/` 主题页；前两者是自动重建视图，勿手改。
2. **写入**：durable 信息追加到 `~/.prefrontal-cortex/agents/codex/memory/MEMORY.md`
   （`§` 分节，前缀 `[id:C-YYYYMMDD-xxxxxx] [src:codex, YYYY-MM-DD, conf:high|med|low]`）。
   跨 agent 的职业、人物和工作方式知识写对应的 `shared/knowledge/` 主题页；不再创建每日运行日志。
3. **ID 约定**：记忆条目带 `[id:C-YYYYMMDD-xxxxxx]`（C=codex，随机 6hex）；引用他人记忆用 ID
   （`grep -r "<ID>" ~/.prefrontal-cortex/agents/*/memory/`）；撞 ID = 合并信号。
4. **禁止**：不手改 `shared/MEMORY.md` / `shared/USER.md`；`.env`、`*auth*.json`、
   `mcp-tokens/` 永不入 git，也不把登录邮箱、token 或客户非公开信息写入共同主题知识。
5. **同步**：实质任务完成/session 结束前，先告知用户「我将进行 memory 的 GitHub 同步」，
   然后执行 `bash ~/.prefrontal-cortex/sync/sync.sh commit "codex: <摘要>"`。不要每条消息都同步。
6. **事实核查**：外部/当前/决策性事实遵守 `agents/hermes/memory/fact-check-standards.md`。
7. **投资判断**：涉及投资评级/买卖/仓位前，先读 `agents/hermes/memory/financial-investment-system.md`
   （canonical policy）；未读取则说「无法给出投资结论」，结论尾附 `[policy:已读]`。
8. **连接器**：涉及 Fidelity/Robinhood/GWS/小红书/浏览器自动化，先读
   `agents/hermes/memory/connector-registry.md`，走 `~/Devs/hermes-connectors` manifest/CLI。
   凭据只在 Keychain/OAuth/MCP credential store，永不写入 repo/日志/argv/memory。
