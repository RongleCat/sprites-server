/**
 * 统一错误处理工具
 */

import type { Context } from 'hono';
import { logger } from './logger';
import type { ErrorResponse } from '../types';

/**
 * 自定义错误类
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * 验证错误
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, 'VALIDATION_ERROR', message);
    this.name = 'ValidationError';
  }
}

/**
 * 全局错误处理器
 */
export function errorHandler(err: Error, c: Context) {
  const requestId = c.get('requestId') || 'unknown';

  // 记录错误日志
  logger.error({
    requestId,
    error: err.message,
    stack: err.stack,
    type: 'error_handler',
  });

  // 自定义错误
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      error: err.message,
      requestId,
      code: err.code,
    };
    return c.json(response, err.statusCode);
  }

  // 默认 500 错误
  const response: ErrorResponse = {
    error: 'Internal server error',
    requestId,
  };
  return c.json(response, 500);
}
