/**
 * 类型定义文件
 */

/** Agent 执行请求 */
export interface AgentExecuteRequest {
  /** Anthropic API Key */
  apiKey: string;
  /** 自定义 API Base URL（可选） */
  baseUrl?: string;
  /** 任务提示词 */
  prompt: string;
  /** Agent 配置选项 */
  options?: AgentOptions;
}

/** Agent 配置选项 */
export interface AgentOptions {
  /** 允许使用的工具列表 */
  allowedTools?: string[];
  /** 权限模式 */
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions';
  /** 模型名称 */
  model?: string;
  /** 自定义系统提示 */
  systemPrompt?: string;
  /** 工作目录 */
  workingDir?: string;
}

/** Worker 消息类型 */
export interface WorkerMessage {
  type: 'event' | 'complete' | 'error';
  data?: any;
  error?: {
    message: string;
    stack?: string;
  };
}

/** Worker 任务消息 */
export interface WorkerTaskMessage {
  apiKey: string;
  baseUrl?: string;
  prompt: string;
  options?: AgentOptions;
  requestId: string;
}

/** SSE 事件 */
export interface SSEEvent {
  event: string;
  data: string;
  id?: string;
}

/** 连接指标 */
export interface ConnectionMetrics {
  requestId: string;
  startTime: number;
  eventsCount: number;
  bytesTransferred: number;
  errors: number;
}

/** 健康检查响应 */
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
}

/** 错误响应 */
export interface ErrorResponse {
  error: string;
  requestId?: string;
  code?: string;
}
