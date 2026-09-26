# Global Instructions — Hermes (prefrontal-cortex memory sync)

> 生成方式：Hermes 无独立全局文件（repo-only，记忆直接写 agents/hermes/memory/）。
> 本文件是行为约定的 canonical 参考，供模板生成/审计对照。

## prefrontal-cortex：共享记忆（repo-first，用户偏好 2026-08-04）

本机共享记忆仓库 `~/.prefrontal-cortex`（GitHub: orriduck/prefrontal-cortex，private），
同步引擎 `~/Devs/prefrontal`。repo-only 模式：durable 记忆直接写在仓库文件里。

作为 Hermes（repo-only）：

1. **读取**：需要用户背景/跨工具上下文时，读 `~/.prefrontal-cortex/shared/MEMORY.md`、
   `shared/USER.md` 和相关的 `shared/knowledge/` 主题页；前两者是自动重建视图，勿手改。
2. **写入**：durable 信息追加到 `~/.prefrontal-cortex/agents/hermes/memory/MEMORY.md`
   （`§` 分节，前缀 `[id:H-YYYYMMDD-xxxxxx] [src:hermes, YYYY-MM-DD, conf:high|med|low]`）。
   专题文档（投资/连接器/模型等）写独立文件；跨 agent 主题写 `shared/knowledge/`，不再创建每日运行日志。
3. **ID 约定**：记忆条目带 `[id:H-YYYYMMDD-xxxxxx]`（H=hermes，随机 6hex）；引用他人记忆用 ID
   （`grep -r "<ID>" ~/.prefrontal-cortex/agents/*/memory/`）；撞 ID = 合并信号。
   文档式文件用 `文件ID §章节名` 引用。
4. **禁止**：不手改 `shared/MEMORY.md` / `shared/USER.md`；`.env`、`*auth*.json`、
   `mcp-tokens/` 永不入 git；不写明文凭据、登录邮箱或客户非公开信息。
5. **同步**：实质任务完成/session 结束前，先告知用户「我将进行 memory 的 GitHub 同步」，
   然后执行 `bash ~/.prefrontal-cortex/sync/sync.sh commit "hermes: <摘要>"`。不要每条消息都同步。
6. **事实核查**：外部/当前/决策性事实遵守 `agents/hermes/memory/fact-check-standards.md`。
7. **投资判断**：涉及投资评级/买卖/仓位前，先读 `agents/hermes/memory/financial-investment-system.md`
   （canonical policy）；未读取则说「无法给出投资结论」，结论尾附 `[policy:已读]`。
8. **连接器**：涉及 Fidelity/Robinhood/GWS/小红书/浏览器自动化，先读
   `agents/hermes/memory/connector-registry.md`，走 `~/Devs/hermes-connectors` manifest/CLI。
   凭据只在 Keychain/OAuth/MCP credential store，永不写入 repo/日志/argv/memory。
