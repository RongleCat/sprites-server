# 部署指南

## 🚀 使用 PM2 进行进程守护（推荐）

### 快速开始

```bash
# 1. 安装 PM2（全局）
bun add -g pm2

# 2. 使用启动脚本（自动配置）
chmod +x scripts/start.sh
./scripts/start.sh
```

### 手动操作

```bash
# 启动服务
pm2 start ecosystem.config.cjs --env production

# 查看状态
pm2 status

# 查看日志（实时）
pm2 logs sprites-agent-server

# 查看监控
pm2 monit

# 重启服务
pm2 restart sprites-agent-server

# 停止服务
pm2 stop sprites-agent-server

# 删除服务
pm2 delete sprites-agent-server
```

### 系统重启后自动启动

```bash
# 1. 保存当前 PM2 进程列表
pm2 save

# 2. 生成启动脚本
pm2 startup

# 3. 执行 PM2 提示的命令（需要 sudo）
# 示例：sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u sprite --hp /home/sprite
```

### 日志管理

```bash
# 查看所有日志
pm2 logs

# 查看最近 100 行
pm2 logs --lines 100

# 只看错误日志
pm2 logs --err

# 清空日志
pm2 flush

# 日志文件位置
# - 应用日志: ./logs/app.log
# - PM2 输出: ./logs/pm2-out.log
# - PM2 错误: ./logs/pm2-error.log
```

### 更新部署

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 重新安装依赖
bun install

# 3. 重启服务（零停机）
pm2 reload sprites-agent-server

# 或者强制重启
pm2 restart sprites-agent-server
```

### 环境切换

```bash
# 开发环境
pm2 start ecosystem.config.cjs --env development

# 生产环境
pm2 start ecosystem.config.cjs --env production
```

---

## 📝 方案二：systemd（Linux 系统服务）

### 创建服务文件

```bash
sudo nano /etc/systemd/system/sprites-agent.service
```

### 服务配置

```ini
[Unit]
Description=Sprites Claude Agent SDK Proxy Server
After=network.target

[Service]
Type=simple
User=sprite
WorkingDirectory=/home/sprite/app/sprites-server
ExecStart=/usr/local/bin/bun run src/index.ts
Restart=always
RestartSec=10
StandardOutput=append:/home/sprite/app/sprites-server/logs/systemd.log
StandardError=append:/home/sprite/app/sprites-server/logs/systemd-error.log

Environment=NODE_ENV=production
Environment=PORT=8080
Environment=LOG_LEVEL=info

[Install]
WantedBy=multi-user.target
```

### 管理服务

```bash
# 重载 systemd 配置
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start sprites-agent

# 设置开机自启
sudo systemctl enable sprites-agent

# 查看状态
sudo systemctl status sprites-agent

# 查看日志
sudo journalctl -u sprites-agent -f

# 停止服务
sudo systemctl stop sprites-agent

# 重启服务
sudo systemctl restart sprites-agent
```

---

## 🔧 方案三：nohup（简单后台运行）

```bash
# 启动
nohup bun run src/index.ts > logs/nohup.log 2>&1 &

# 查看进程
ps aux | grep bun

# 停止（替换 PID）
kill -9 <PID>

# 查看日志
tail -f logs/nohup.log
```

---

## 🖥️ 方案四：tmux/screen（会话管理）

### 使用 tmux

```bash
# 创建会话
tmux new -s sprites-agent

# 启动服务
bun run start

# 分离会话: Ctrl+B, 然后按 D

# 重新连接
tmux attach -t sprites-agent

# 查看会话列表
tmux ls

# 杀死会话
tmux kill-session -t sprites-agent
```

### 使用 screen

```bash
# 创建会话
screen -S sprites-agent

# 启动服务
bun run start

# 分离会话: Ctrl+A, 然后按 D

# 重新连接
screen -r sprites-agent

# 查看会话列表
screen -ls

# 杀死会话
screen -X -S sprites-agent quit
```

---

## 📊 监控和运维

### 健康检查

```bash
# 创建健康检查脚本
cat > scripts/health-check.sh << 'EOF'
#!/bin/bash
HEALTH_URL="http://localhost:8080/api/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ "$RESPONSE" = "200" ]; then
  echo "✅ Service is healthy"
  exit 0
else
  echo "❌ Service is unhealthy (HTTP $RESPONSE)"
  exit 1
fi
EOF

chmod +x scripts/health-check.sh
./scripts/health-check.sh
```

### 设置定时健康检查（crontab）

```bash
# 编辑 crontab
crontab -e

# 每 5 分钟检查一次
*/5 * * * * /home/sprite/app/sprites-server/scripts/health-check.sh >> /home/sprite/app/sprites-server/logs/health-check.log 2>&1
```

### 性能监控

```bash
# 使用 PM2 监控
pm2 monit

# 查看资源使用
pm2 show sprites-agent-server

# 使用 htop
htop
```

---

## 🔥 推荐配置

**开发环境**: tmux/screen（方便调试）
**测试环境**: PM2（监控和日志）
**生产环境**: PM2 + systemd（双保险，PM2 管理进程，systemd 管理 PM2）

### PM2 + systemd 组合

```bash
# 1. 使用 PM2 启动
pm2 start ecosystem.config.cjs --env production
pm2 save

# 2. 配置 PM2 开机启动
pm2 startup systemd

# 这样系统重启后：
# systemd -> 启动 PM2 -> PM2 恢复所有进程
```

---

## 🆘 故障排查

### 服务无法启动

```bash
# 检查端口占用
lsof -i :8080

# 检查日志
pm2 logs sprites-agent-server --err

# 查看详细信息
pm2 show sprites-agent-server
```

### 内存泄漏

```bash
# 查看内存使用
pm2 show sprites-agent-server

# 如果超过限制，PM2 会自动重启（配置了 max_memory_restart）
```

### 无法连接

```bash
# 检查服务状态
curl http://localhost:8080/api/health

# 检查防火墙
sudo ufw status

# 检查网络监听
netstat -tlnp | grep 8080
```
