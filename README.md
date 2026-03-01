# Sprites Claude Agent SDK 代理服务

一个运行在 Sprites 虚拟机上的 HTTP 代理服务，让前端能够通过 HTTP 接口使用 Claude Agent SDK 执行任务。

## 🌟 核心特性

- ✅ **环境隔离**: 使用 Bun Worker 为每个请求创建独立环境，支持不同的 API Key 和 Base URL
- ✅ **SSE 流式**: 通过 Server-Sent Events 实时返回 Agent 执行结果
- ✅ **连接监控**: 完整的请求日志、性能指标和连接质量追踪
- ✅ **自动部署**: 启动时自动部署 CLAUDE.md 配置到 `~/.claude/CLAUDE.md`
- ✅ **生产就绪**: 完善的错误处理、日志脱敏、优雅关闭

## 🚀 快速开始

### 前置要求

- [Bun](https://bun.sh/) v1.1.34+
- Sprites 虚拟机环境（可选，用于部署）

### 本地开发

```bash
# 1. 安装依赖
bun install

# 2. 配置环境变量（可选）
cp .env.example .env

# 3. 启动开发服务器（热重载）
bun run dev
```

服务器将在 `http://localhost:8080` 启动。

### 生产部署

```bash
# 启动生产服务器
bun run start
```

在 Sprites 环境中，端口 8080 会自动映射到 `https://<name>.sprites.app`。

## 📡 API 接口

### POST `/api/agent/execute`

执行 Claude Agent 任务，返回 SSE 流。

**请求示例：**

```bash
curl -N -X POST http://localhost:8080/api/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "sk-ant-api03-...",
    "prompt": "List files in the current directory",
    "options": {
      "allowedTools": ["Bash", "Read"],
      "permissionMode": "bypassPermissions"
    }
  }'
```

**请求参数：**

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `apiKey` | string | ✅ | Anthropic API Key |
| `baseUrl` | string | ❌ | 自定义 API Base URL（默认：https://api.anthropic.com） |
| `prompt` | string | ✅ | 任务描述 |
| `options` | object | ❌ | Agent 配置选项 |
| `options.allowedTools` | string[] | ❌ | 允许的工具（如：`["Read", "Edit", "Bash"]`） |
| `options.permissionMode` | string | ❌ | 权限模式（`acceptEdits`, `bypassPermissions`） |
| `options.model` | string | ❌ | 模型名称 |
| `options.systemPrompt` | string | ❌ | 自定义系统提示 |

**响应格式（SSE）：**

```
event: agent_event
data: {"type":"assistant","message":{"content":[{"text":"正在分析..."}]}}

event: agent_event
data: {"type":"assistant","message":{"content":[{"name":"Bash","input":"ls -la"}]}}

event: complete
data: {"status":"success"}
```

**错误事件：**

```
event: error
data: {"code":"SDK_ERROR","message":"Invalid API key"}
```

### GET `/api/health`

健康检查接口。

**响应示例：**

```json
{
  "status": "healthy",
  "timestamp": "2026-03-01T12:00:00.000Z"
}
```

## 🏗️ 项目结构

```
sprites-client/
├── src/
│   ├── index.ts                  # 应用入口
│   ├── app.ts                    # Hono 应用配置
│   ├── routes/
│   │   └── agent.ts              # Agent API 路由
│   ├── services/
│   │   ├── agent-worker.ts       # Worker 实现（隔离环境）
│   │   └── claude-setup.ts       # CLAUDE.md 部署
│   ├── middleware/
│   │   └── connection-monitor.ts # 连接监控
│   ├── utils/
│   │   ├── logger.ts             # 日志配置
│   │   └── error-handler.ts      # 错误处理
│   └── types/
│       └── index.ts              # 类型定义
├── config/
│   └── CLAUDE.md                 # Claude 配置模板
├── logs/                         # 日志目录
├── package.json
├── tsconfig.json
└── .env.example
```

## 🔧 技术架构

### 核心技术栈

- **运行时**: Bun 1.1.34+
- **Web 框架**: Hono 4.6+ (轻量、支持 SSE)
- **Agent SDK**: @anthropic-ai/claude-agent-sdk
- **日志**: Pino + Pino-Pretty
- **ID 生成**: Nanoid

### 关键设计

#### 1. Worker 环境隔离

使用 Bun Worker 的默认环境变量隔离特性，为每个请求创建独立的执行环境：

```typescript
// 每个 Worker 拥有独立的 process.env 副本
const worker = new Worker(new URL('./agent-worker.ts', import.meta.url));
worker.postMessage({ apiKey, baseUrl, prompt, options });
```

在 Worker 内部设置的环境变量不会影响主进程或其他 Worker。

#### 2. SSE 流式响应

使用 Hono 的 `streamSSE` 辅助函数，将 Worker 消息流转换为标准 SSE 格式：

```typescript
return streamSSE(c, async (stream) => {
  worker.on('message', async (msg) => {
    await stream.writeSSE({
      event: msg.type,
      data: JSON.stringify(msg.data)
    });
  });
});
```

#### 3. 连接质量监控

实现三层监控：
- **请求层**: 请求 ID、耗时、API Key 哈希
- **连接层**: SSE 连接时长、事件数、传输字节数
- **网络层**: API 延迟、错误率

## 🔒 安全特性

- **API Key 脱敏**: 日志中自动脱敏所有敏感字段
- **Worker 隔离**: 每个请求独立的 Worker 进程，防止环境污染
- **错误处理**: 统一的错误处理和日志记录
- **CORS 支持**: 跨域请求支持

## 📊 监控与日志

### 日志级别

- `info`: 请求开始/结束、CLAUDE.md 部署
- `warn`: 源文件不存在
- `error`: SDK 错误、Worker 失败
- `fatal`: 服务启动失败

### 日志格式

```json
{
  "level": "info",
  "time": "2026-03-01T12:00:00.000Z",
  "requestId": "abc123",
  "msg": "Starting agent execution",
  "prompt": "Fix the bug in auth.py"
}
```

### 查看日志

```bash
# 开发环境（Pretty 格式）
tail -f logs/app.log

# 生产环境（JSON 格式）
LOG_PRETTY=false bun run start
```

## 🧪 测试

### 基础功能测试

```bash
# 健康检查
curl http://localhost:8080/api/health

# Agent 执行（需要真实的 API Key）
curl -N -X POST http://localhost:8080/api/agent/execute \
  -H "Content-Type: application/json" \
  -d @- <<'EOF'
{
  "apiKey": "sk-ant-api03-...",
  "prompt": "What is 2+2?",
  "options": {
    "permissionMode": "bypassPermissions"
  }
}
EOF
```

### 错误处理测试

```bash
# 缺少 apiKey
curl -X POST http://localhost:8080/api/agent/execute \
  -H "Content-Type: application/json" \
  -d '{"prompt": "test"}'
# 预期: 400 错误

# 缺少 prompt
curl -X POST http://localhost:8080/api/agent/execute \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "test"}'
# 预期: 400 错误
```

### 验证 CLAUDE.md 部署

```bash
cat ~/.claude/CLAUDE.md
```

## 🌐 Sprites 部署

### 部署步骤

```bash
# 1. 在 Sprites 虚拟机中克隆项目
sprite exec -- git clone <repo-url> sprites-client

# 2. 进入项目目录并安装依赖
sprite exec -- cd sprites-client && bun install

# 3. 启动服务
sprite exec -- cd sprites-client && bun run start

# 4. 查看 Sprites URL
sprite url
```

### 访问服务

服务启动后，可以通过以下方式访问：

- **本地**: `http://localhost:8080`
- **Sprites**: `https://<name>.sprites.app`

### 日志查看

```bash
# 查看实时日志
sprite exec -- tail -f sprites-client/logs/app.log

# 查看 CLAUDE.md 部署状态
sprite exec -- cat ~/.claude/CLAUDE.md
```

## 🛠️ 开发指南

### 环境变量

```bash
# 服务配置
PORT=8080                                    # 服务端口
NODE_ENV=development                         # 环境（development/production）
LOG_LEVEL=info                               # 日志级别
LOG_PRETTY=true                              # 美化日志输出

# API 配置
DEFAULT_ANTHROPIC_BASE_URL=https://api.anthropic.com
```

### 类型检查

```bash
bun run type-check
```

### 代码风格

- 使用 TypeScript 严格模式
- 所有函数和类型都有清晰的注释
- 遵循 Bun 最佳实践

## 📝 验证清单

实施完成后，验证以下功能：

- [x] ✅ 服务成功启动在端口 8080
- [x] ✅ `~/.claude/CLAUDE.md` 已成功部署
- [x] ✅ POST /api/agent/execute 接口可访问
- [x] ✅ SSE 流式响应正常工作
- [x] ✅ 错误处理返回正确的状态码和消息
- [x] ✅ 请求日志包含 requestId、duration
- [x] ✅ 健康检查接口返回正常

## 📚 参考资料

- [Bun Worker API](https://bun.com/reference/node/worker_threads) - 环境变量隔离文档
- [Hono Streaming](https://hono.dev/docs/helpers/streaming) - SSE 辅助函数
- [Claude Agent SDK](https://platform.claude.com/docs/en/agent-sdk/quickstart) - SDK 快速入门
- [Sprites 文档](https://docs.sprites.dev/working-with-sprites/#http-access) - HTTP 访问和端口配置

## 📄 License

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
