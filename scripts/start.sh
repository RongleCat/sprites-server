#!/bin/bash
###############################################################################
# Sprites Agent Server - 启动脚本
# 使用 PM2 进行进程守护和管理
###############################################################################

set -e

echo "🚀 Starting Sprites Agent Server..."

# 检查 PM2 是否安装
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 not found. Installing..."
    bun add -g pm2
fi

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    bun install
fi

# 创建日志目录
mkdir -p logs

# 启动服务
echo "🔥 Starting with PM2..."
pm2 start ecosystem.config.js --env production

# 保存 PM2 配置（用于系统重启后自动启动）
pm2 save

echo ""
echo "✅ Server started successfully!"
echo ""
echo "📊 View status:  pm2 status"
echo "📝 View logs:    pm2 logs sprites-agent-server"
echo "🔄 Restart:      pm2 restart sprites-agent-server"
echo "🛑 Stop:         pm2 stop sprites-agent-server"
echo "🗑️  Delete:       pm2 delete sprites-agent-server"
echo ""
