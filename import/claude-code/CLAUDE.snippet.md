<!-- prefrontal-cortex:sync BEGIN -->
## prefrontal-cortex：自主记忆同步（用户长期授权）

本机有一个共享记忆仓库 `~/.prefrontal-cortex`（GitHub: orriduck/prefrontal-cortex，私有），
由 kimi（Kimi Work）、Kimi Claw（openclaw）、Kimi Code、Claude Code 共享、备份、可迁移。

作为 Claude Code，你的约定：

1. **写入**：值得长期记住的信息（用户偏好、项目事实、经验教训）写进本文件
   （`~/.claude/CLAUDE.md`），保持简洁。
2. **时机**：自主判断合适时机（实质性任务完成后、会话即将结束时），不要每条消息都同步。
3. **提示后执行**：同步前用一句话告知用户「我将进行 memory 的 GitHub 同步」，然后
   直接执行，无需征求同意（用户已长期授权）：

   ```bash
   bash ~/.prefrontal-cortex/sync/sync.sh push claude-code
   ```

4. **读取**：需要用户背景或跨工具上下文时，读
   `~/.prefrontal-cortex/shared/MEMORY.md` 和 `~/.prefrontal-cortex/shared/USER.md`。
<!-- prefrontal-cortex:sync END -->
