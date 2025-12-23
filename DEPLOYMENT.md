# 服务器快速部署指南

本文档提供在服务器上快速部署 Unia-Danmuku 的详细步骤。

## 📋 准备工作

### 系统要求
- Node.js >= 16.0.0
- npm 或 yarn
- Git

### 端口要求
- 后端服务：3001（可自定义）
- 前端服务：5173（开发）/ 80或443（生产）

## 🚀 快速部署步骤

### 1. 克隆项目

```bash
git clone https://github.com/yourusername/Unia-Danmuku.git
cd Unia-Danmuku
```

### 2. 安装依赖

```bash
# 安装后端依赖
cd backend
npm install
cd ..

# 安装前端依赖
cd frontend
npm install
cd ..
```

### 3. 配置环境变量

在 `backend` 目录下创建 `.env` 文件：

```env
PORT=3001
FRONTEND_URL=http://your-domain.com  # 改为你的域名或服务器IP
NODE_ENV=production
```

### 4. 构建前端

```bash
cd frontend
npm run build
cd ..
```

### 5. 启动服务

#### 方式一：使用一键启动脚本（推荐）

**Windows:**
```cmd
start.bat
```

**Linux/Mac:**
```bash
chmod +x start.sh stop.sh
./start.sh
```

#### 方式二：使用 PM2（推荐生产环境）

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start backend/src/server.js --name unia-danmuku

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status

# 查看日志
pm2 logs unia-danmuku
```

#### 方式三：手动启动

```bash
cd backend
npm start
```

## ⚙️ 开机自启配置

### Windows 系统

1. **以管理员身份运行 PowerShell**
2. **执行安装脚本**
   ```powershell
   .\install-windows-service.ps1
   ```
3. **验证服务**
   ```powershell
   sc query UniaDanmuku
   ```

### Linux 系统（systemd）

1. **编辑服务配置**
   ```bash
   nano unia-danmuku.service
   ```
   修改以下内容：
   - `User=YOUR_USERNAME` → 改为你的用户名
   - `WorkingDirectory=/path/to/...` → 改为实际路径
   - `ExecStart=/usr/bin/node /path/to/...` → 改为实际路径

2. **安装服务**
   ```bash
   # 复制服务文件
   sudo cp unia-danmuku.service /etc/systemd/system/

   # 创建日志目录
   sudo mkdir -p /var/log/unia-danmuku
   sudo chown $USER:$USER /var/log/unia-danmuku

   # 重新加载配置
   sudo systemctl daemon-reload

   # 启用并启动服务
   sudo systemctl enable unia-danmuku
   sudo systemctl start unia-danmuku

   # 查看状态
   sudo systemctl status unia-danmuku
   ```

## 🌐 Nginx 反向代理配置

### 1. 安装 Nginx

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install nginx
```

**CentOS/RHEL:**
```bash
sudo yum install nginx
```

### 2. 创建配置文件

```bash
sudo nano /etc/nginx/sites-available/unia-danmuku
```

添加以下内容：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 改为你的域名

    # 前端静态文件
    location / {
        root /path/to/Unia-Danmuku/frontend/dist;  # 改为实际路径
        try_files $uri $uri/ /index.html;
        
        # 缓存静态资源
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # 后端 API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }
}
```

### 3. 启用配置

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/unia-danmuku /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

### 4. 配置 SSL（可选但推荐）

使用 Let's Encrypt 免费证书：

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

## 🔥 防火墙配置

### Ubuntu/Debian (UFW)

```bash
# 允许 HTTP/HTTPS
sudo ufw allow 'Nginx Full'

# 如果不使用 Nginx，直接开放端口
sudo ufw allow 3001
sudo ufw allow 5173

# 启用防火墙
sudo ufw enable
```

### CentOS/RHEL (firewalld)

```bash
# 允许 HTTP/HTTPS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https

# 如果不使用 Nginx
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --permanent --add-port=5173/tcp

# 重载配置
sudo firewall-cmd --reload
```

## 📊 监控和日志

### 查看日志

**使用一键启动脚本:**
```bash
tail -f logs/backend.log
```

**使用 systemd:**
```bash
sudo journalctl -u unia-danmuku -f
```

**使用 PM2:**
```bash
pm2 logs unia-danmuku
```

### 查看服务状态

**systemd:**
```bash
sudo systemctl status unia-danmuku
```

**PM2:**
```bash
pm2 status
pm2 monit
```

## 🔄 更新部署

```bash
# 拉取最新代码
git pull

# 安装新依赖
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 重新构建前端
cd frontend && npm run build && cd ..

# 重启服务
# 使用 systemd:
sudo systemctl restart unia-danmuku

# 使用 PM2:
pm2 restart unia-danmuku

# 使用脚本:
./stop.sh && ./start.sh
```

## 🐛 故障排查

### 1. 服务无法启动

```bash
# 检查端口占用
sudo lsof -i :3001
# 或
sudo netstat -tlnp | grep 3001

# 检查 Node.js 进程
ps aux | grep node

# 查看详细日志
tail -n 100 logs/backend.log
```

### 2. 无法访问网页

```bash
# 检查 Nginx 状态
sudo systemctl status nginx

# 检查 Nginx 配置
sudo nginx -t

# 查看 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log
```

### 3. WebSocket 连接失败

- 确认后端服务正常运行
- 检查防火墙设置
- 查看 Nginx WebSocket 配置
- 检查浏览器控制台错误

### 4. 前端访问 404

- 确认前端已构建：`ls frontend/dist`
- 检查 Nginx 配置中的路径
- 重启 Nginx：`sudo systemctl restart nginx`

## ✅ 验证部署

访问以下 URL 验证部署是否成功：

1. **前端页面**: `http://your-domain.com` 或 `http://your-ip`
2. **健康检查**: `http://your-domain.com/api/health`
3. **WebSocket**: 在前端页面测试连接功能

## 📞 获取帮助

如果遇到问题，请：
1. 查看日志文件
2. 检查 GitHub Issues
3. 提交新的 Issue 并附上错误日志
