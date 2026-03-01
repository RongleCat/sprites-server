/**
 * 日志工具 - 使用 Pino
 */

import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';
const logPretty = process.env.LOG_PRETTY === 'true' || isDevelopment;

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',

  // 开发环境使用 pretty 格式
  transport: logPretty
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,

  // 格式化配置
  formatters: {
    level: (label) => ({ level: label }),
  },

  // ISO 时间戳
  timestamp: pino.stdTimeFunctions.isoTime,

  // 敏感信息脱敏
  redact: {
    paths: [
      'apiKey',
      '*.apiKey',
      'headers.authorization',
      'headers.x-api-key',
    ],
    censor: '***REDACTED***',
  },
});

/**
 * 创建子日志器
 */
export function createChildLogger(bindings: Record<string, any>) {
  return logger.child(bindings);
}
