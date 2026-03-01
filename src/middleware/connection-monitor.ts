/**
 * 连接监控中间件
 * 记录每个请求的生命周期和性能指标
 */

import { nanoid } from 'nanoid';
import { logger } from '../utils/logger';
import type { Context, Next } from 'hono';
import type { ConnectionMetrics } from '../types';

/**
 * 连接监控中间件
 */
export function connectionMonitor() {
  return async (c: Context, next: Next) => {
    const requestId = nanoid();
    const startTime = Date.now();

    // 初始化连接指标
    const metrics: ConnectionMetrics = {
      requestId,
      startTime,
      eventsCount: 0,
      bytesTransferred: 0,
      errors: 0,
    };

    // 将请求 ID 和指标存储到上下文
    c.set('requestId', requestId);
    c.set('metrics', metrics);

    // 记录请求开始
    logger.info({
      requestId,
      type: 'request_start',
      path: c.req.path,
      method: c.req.method,
      userAgent: c.req.header('user-agent'),
      clientIp:
        c.req.header('x-forwarded-for') ||
        c.req.header('x-real-ip') ||
        'unknown',
    });

    try {
      await next();
    } finally {
      // 记录请求结束
      const duration = Date.now() - startTime;

      logger.info({
        requestId,
        type: 'request_complete',
        duration,
        status: c.res.status,
        metrics: {
          eventsCount: metrics.eventsCount,
          bytesTransferred: metrics.bytesTransferred,
          errors: metrics.errors,
        },
      });
    }
  };
}
