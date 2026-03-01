/**
 * Agent API 路由
 * 处理 Claude Agent 执行请求
 */

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { Worker } from 'worker_threads';
import { logger } from '../utils/logger';
import { ValidationError } from '../utils/error-handler';
import type {
  AgentExecuteRequest,
  WorkerMessage,
  WorkerTaskMessage,
  ConnectionMetrics,
} from '../types';

const agentRoutes = new Hono();

/**
 * POST /execute
 * 执行 Claude Agent 任务，返回 SSE 流
 */
agentRoutes.post('/execute', async (c) => {
  const requestId = c.get('requestId') as string;
  const metrics = c.get('metrics') as ConnectionMetrics;

  // 解析请求体（支持 JSON 和 form-urlencoded）
  let body: AgentExecuteRequest;
  try {
    const contentType = c.req.header('content-type') || '';

    if (contentType.includes('application/json')) {
      // JSON 格式
      body = await c.req.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      // Form-urlencoded 格式
      const formData = await c.req.parseBody();
      body = {
        apiKey: formData.apiKey as string,
        baseUrl: formData.baseUrl as string | undefined,
        prompt: formData.prompt as string,
        options: formData.options ? JSON.parse(formData.options as string) : undefined,
      };
    } else {
      throw new ValidationError('Unsupported Content-Type. Use application/json or application/x-www-form-urlencoded');
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError('Invalid request body format');
  }

  const { apiKey, baseUrl, prompt, options } = body;

  // 验证必需参数
  if (!apiKey) {
    throw new ValidationError('Missing required field: apiKey');
  }
  if (!prompt) {
    throw new ValidationError('Missing required field: prompt');
  }

  logger.info(
    {
      requestId,
      prompt: prompt.substring(0, 100), // 只记录前 100 个字符
      hasBaseUrl: !!baseUrl,
      allowedTools: options?.allowedTools,
      contentType: c.req.header('content-type'),
    },
    'Starting agent execution'
  );

  // 创建 Worker（但暂不发送任务）
  const workerPath = new URL('../services/agent-worker.ts', import.meta.url)
    .href;
  const worker = new Worker(workerPath);

  // 准备 Worker 任务消息
  const taskMessage: WorkerTaskMessage = {
    apiKey,
    baseUrl,
    prompt,
    options,
    requestId,
  };

  // 返回 SSE 流
  return streamSSE(c, async (stream) => {
    let isComplete = false;

    // 创建 Promise 用于等待 Worker 完成
    let resolveCompletion: () => void;
    const completionPromise = new Promise<void>((resolve) => {
      resolveCompletion = resolve;
    });

    // 立即发送连接建立事件，防止客户端超时断开
    try {
      await stream.writeSSE({
        event: 'connected',
        data: JSON.stringify({
          status: 'ready',
          requestId,
          timestamp: new Date().toISOString()
        }),
        id: requestId,
      });
      logger.info({ requestId }, 'SSE connection established');
    } catch (error) {
      logger.error(
        { requestId, error: error instanceof Error ? error.message : String(error) },
        'Failed to send initial SSE event'
      );
    }

    // 先注册 Worker 消息监听器（在发送任务之前！）
    worker.on('message', async (msg: WorkerMessage) => {
      logger.info({ requestId, msgType: msg.type }, 'Received worker message');
      try {
        if (msg.type === 'event') {
          // Agent 事件
          const data = JSON.stringify(msg.data);
          logger.info(
            { requestId, dataSize: data.length, preview: data.substring(0, 100) },
            'Sending agent event via SSE'
          );
          await stream.writeSSE({
            event: 'agent_event',
            data,
            id: requestId,
          });

          // 更新指标
          metrics.eventsCount++;
          metrics.bytesTransferred += data.length;
          logger.info({ requestId, eventsCount: metrics.eventsCount }, 'Event sent successfully');
        } else if (msg.type === 'complete') {
          // 任务完成
          await stream.writeSSE({
            event: 'complete',
            data: JSON.stringify({ status: 'success' }),
            id: requestId,
          });

          isComplete = true;
          worker.terminate();

          logger.info({ requestId }, 'Agent execution completed');

          // 通知流可以关闭了
          resolveCompletion();
        } else if (msg.type === 'error') {
          // 错误
          await stream.writeSSE({
            event: 'error',
            data: JSON.stringify({
              code: 'SDK_ERROR',
              message: msg.error?.message || 'Unknown error',
            }),
            id: requestId,
          });

          metrics.errors++;
          isComplete = true;
          worker.terminate();

          logger.error(
            {
              requestId,
              error: msg.error?.message,
              stack: msg.error?.stack,
            },
            'Agent execution failed'
          );

          // 通知流可以关闭了
          resolveCompletion();
        }
      } catch (error) {
        logger.error(
          {
            requestId,
            error: error instanceof Error ? error.message : String(error),
          },
          'Error writing SSE'
        );
        worker.terminate();
        if (!isComplete) {
          isComplete = true;
          resolveCompletion();
        }
      }
    });

    // Worker 错误处理
    worker.on('error', async (error) => {
      if (!isComplete) {
        try {
          await stream.writeSSE({
            event: 'error',
            data: JSON.stringify({
              code: 'WORKER_ERROR',
              message: error.message,
            }),
            id: requestId,
          });
        } catch {}

        metrics.errors++;
        logger.error({ requestId, error: error.message }, 'Worker error');
        worker.terminate();
        isComplete = true;
        resolveCompletion();
      }
    });

    // 客户端断开连接时清理 Worker
    c.req.raw.signal.addEventListener('abort', () => {
      if (!isComplete) {
        logger.warn(
          {
            requestId,
            eventsCount: metrics.eventsCount,
            bytesTransferred: metrics.bytesTransferred
          },
          'Client disconnected prematurely, terminating worker'
        );
        worker.terminate();
        isComplete = true;
        resolveCompletion();
      }
    });

    // 🔥 关键：所有监听器注册完成后，才发送任务到 Worker
    // 这样可以确保不会错过任何消息
    logger.info({ requestId }, 'All listeners registered, starting worker task');
    worker.postMessage(taskMessage);

    // 🔥 关键：等待 Worker 完成，保持 SSE 流打开
    await completionPromise;
    logger.info({ requestId }, 'SSE stream closing');
  });
});

export { agentRoutes };
