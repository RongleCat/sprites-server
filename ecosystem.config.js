/**
 * PM2 进程配置
 * 用于生产环境的进程守护和管理
 */

module.exports = {
  apps: [
    {
      // 应用名称
      name: 'sprites-agent-server',

      // 启动脚本
      script: 'bun',
      args: 'run src/index.ts',

      // 工作目录
      cwd: './',

      // 实例数量
      instances: 1,

      // 自动重启
      autorestart: true,

      // 监听文件变化（开发环境）
      watch: false,

      // 最大内存限制（超过自动重启）
      max_memory_restart: '500M',

      // 环境变量 - 生产环境
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080,
        LOG_LEVEL: 'info',
        LOG_PRETTY: 'false', // 生产环境使用 JSON 日志
      },

      // 环境变量 - 开发环境
      env_development: {
        NODE_ENV: 'development',
        PORT: 8080,
        LOG_LEVEL: 'debug',
        LOG_PRETTY: 'true',
      },

      // 日志配置
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // 崩溃重启配置
      min_uptime: '10s', // 至少运行 10 秒才算成功启动
      max_restarts: 10, // 最大重启次数
      restart_delay: 4000, // 重启延迟 4 秒

      // 进程 ID 文件
      pid_file: './logs/pm2.pid',

      // 优雅关闭
      kill_timeout: 3000, // 等待 3 秒后强制结束

      // 监控配置
      instance_var: 'INSTANCE_ID',
    },
  ],
};
