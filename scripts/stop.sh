#!/bin/bash
###############################################################################
# Sprites Agent Server - 停止脚本
###############################################################################

set -e

echo "🛑 Stopping Sprites Agent Server..."

# 停止服务
pm2 stop sprites-agent-server

echo "✅ Server stopped successfully!"
echo ""
echo "To restart: pm2 restart sprites-agent-server"
echo "To delete:  pm2 delete sprites-agent-server"
