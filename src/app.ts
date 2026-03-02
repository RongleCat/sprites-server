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
// CORS 配置：允许所有跨域访问
app.use(
  '*',
  cors({
    origin: ['http://localhost:5173'], // 允许所有来源
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'], // 允许所有常用方法
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'], // 允许常用请求头
    exposeHeaders: ['Content-Length', 'X-Request-Id'], // 暴露响应头
    maxAge: 86400, // 预检请求缓存时间（24小时）
  })
);
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
