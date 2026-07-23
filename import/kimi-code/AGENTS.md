# Global Instructions

## prefrontal-cortex：自主记忆同步（用户长期授权）

本机有一个共享记忆仓库 `~/.prefrontal-cortex`（GitHub: orriduck/prefrontal-cortex，私有），
由 kimi（Kimi Work）、Kimi Claw（openclaw）和 Kimi Code 三方共享、备份、可迁移。

作为 Kimi Code，你的约定（repo-only 模式，记忆直接写在仓库里）：

1. **写入**：当会话产生值得长期记住的信息（用户偏好、项目事实、经验教训、
   账户/工具使用要点），用 `§` 作为分节符，将该信息作为一个新分节追加到
   `~/.prefrontal-cortex/agents/kimi-code/memory/MEMORY.md`。追加前可先读该文件避免重复。
   新分节建议带前缀 `[src:kimi-code, <date>, conf:high|med|low]` 区分事实与猜测。
   不要直接改 `shared/MEMORY.md`——那是自动重建的视图，会被覆盖。
2. **时机**：由你自主判断合适时机（例如一个实质性任务完成后、会话即将结束时），
   不要每条消息都同步。
3. **提示后执行**：同步前用一句话告知用户「我将进行 memory 的 GitHub 同步」，
   然后直接执行，无需征求同意（用户已长期授权）：

   ```bash
   bash ~/.prefrontal-cortex/sync/sync.sh commit "kimi-code: <一句话摘要>"
   ```

   （commit 会自动把新分节重建进 `shared/MEMORY.md` 视图并推送。）
4. **读取**：需要了解用户背景或跨工具上下文时，直接读
   `~/.prefrontal-cortex/shared/MEMORY.md` 和 `~/.prefrontal-cortex/shared/USER.md`。
5. **安全**：绝不读取或提交 `~/.prefrontal-cortex` 之外的密钥文件；
   `.env`、`*auth*.json`、`mcp-tokens/` 永远不加入 git。
