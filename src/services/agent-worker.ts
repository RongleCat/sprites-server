/**
 * Agent Worker
 * 在隔离的 Worker 线程中运行 Claude Agent SDK
 */

import { parentPort } from 'worker_threads';
import type { WorkerTaskMessage, WorkerMessage } from '../types';

if (!parentPort) {
  throw new Error('This file must be run as a Worker');
}

parentPort.on('message', async (msg: WorkerTaskMessage) => {
  const { apiKey, baseUrl, prompt, options, requestId } = msg;

  try {
    // 设置隔离的环境变量
    process.env.ANTHROPIC_API_KEY = apiKey;
    if (baseUrl) {
      process.env.ANTHROPIC_BASE_URL = baseUrl;
    }

    // 动态导入 Claude Agent SDK
    // 这确保每个 Worker 使用自己的环境变量
    const { query } = await import('@anthropic-ai/claude-agent-sdk');

    // 执行 Agent 任务
    let eventCount = 0;
    for await (const message of query({ prompt, options })) {
      eventCount++;
      // 将每个事件发送回主线程
      const workerMsg: WorkerMessage = {
        type: 'event',
        data: message,
      };
      console.log(`[Worker ${requestId}] Sending event #${eventCount}:`, JSON.stringify(message).substring(0, 100));
      parentPort?.postMessage(workerMsg);
    }

    // 任务完成
    console.log(`[Worker ${requestId}] Task completed, total events: ${eventCount}`);
    const completeMsg: WorkerMessage = {
      type: 'complete',
    };
    parentPort?.postMessage(completeMsg);
  } catch (error) {
    // 错误处理
    const errorMsg: WorkerMessage = {
      type: 'error',
      error: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    };
    parentPort?.postMessage(errorMsg);
  }
});
