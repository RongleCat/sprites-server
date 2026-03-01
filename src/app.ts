/**
 * Hono 应用配置
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { connectionMonitor } from './middleware/connection-monitor';
import { agentRoutes } from './routes/agent';
import { errorHandler } from './utils/error-handler';
import type { HealthCheckResponse } from './types';

export const app = new Hono();

// 全局中间件
app.use('*', cors());
app.use('*', honoLogger());
app.use('*', connectionMonitor());

// 健康检查
app.get('/api/health', (c) => {
  const response: HealthCheckResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
  };
  return c.json(response);
});

// Agent 路由
app.route('/api/agent', agentRoutes);

// 根路径
app.get('/', (c) => {
  return c.json({
    name: 'Sprites Claude Agent SDK Proxy',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      agent: '/api/agent/execute',
    },
  });
});

// 全局错误处理
app.onError(errorHandler);

// 404 处理
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});
