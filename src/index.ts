/**
 * 应用入口
 * 启动 Bun 服务器并部署 CLAUDE.md 配置
 */

import { logger } from './utils/logger';
import { setupClaudeMd } from './services/claude-setup';
import { app } from './app';

const PORT = parseInt(process.env.PORT || '8080', 10);

/**
 * 启动服务
 */
async function bootstrap() {
  try {
    logger.info('🚀 Starting Sprites Claude Agent SDK Proxy...');

    // 1. 部署 CLAUDE.md 配置
    logger.info('📝 Deploying CLAUDE.md configuration...');
    await setupClaudeMd();

    // 2. 启动 Bun 服务器
    const server = Bun.serve({
      port: PORT,
      fetch: app.fetch,
      development: process.env.NODE_ENV === 'development',
    });

    logger.info(`✅ Server started successfully`);
    logger.info(`🌐 Local: http://localhost:${PORT}`);
    logger.info(`🔗 Sprites: https://<name>.sprites.app`);
    logger.info(`📊 Health Check: http://localhost:${PORT}/api/health`);
    logger.info(
      `🤖 Agent API: http://localhost:${PORT}/api/agent/execute (POST)`
    );

    // 3. 优雅关闭
    const shutdown = () => {
      logger.info('🛑 Shutting down gracefully...');
      server.stop();
      logger.info('👋 Server stopped');
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    logger.fatal(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      '❌ Failed to start server'
    );
    process.exit(1);
  }
}

// 启动应用
bootstrap();
