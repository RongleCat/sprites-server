# Sprites Client 配置

此配置文件会在服务启动时自动部署到 ~/.claude/CLAUDE.md

## 项目说明

这是一个运行在 Sprites 虚拟机上的 Claude Agent SDK 代理服务。

### 主要功能
- 接收前端 HTTP 请求
- 使用 Claude Agent SDK 执行任务
- 支持每个请求独立配置 API Key 和 Base URL
- 通过 SSE 流式返回执行结果
- 完整的连接质量监控和日志追踪

## 技术栈

- **运行时**: Bun
- **Web 框架**: Hono
- **Agent SDK**: @anthropic-ai/claude-agent-sdk
- **日志**: Pino

## 编码规范

- 使用 TypeScript 严格模式
- 遵循 Bun 最佳实践
- 所有异步操作使用 async/await
- 函数和类型都应有清晰的注释
- 所有错误都应该有详细日志

## 安全要求

- API Key 不得记录到日志
- 仅存储 API Key 的 SHA256 哈希用于追踪
- 使用 Pino 的 redact 功能自动脱敏敏感字段
- Worker 进程隔离，防止环境变量污染

## 性能要求

- Worker 在请求结束后立即清理
- SSE 连接断开时正确释放资源
- 日志异步写入，不阻塞主线程
