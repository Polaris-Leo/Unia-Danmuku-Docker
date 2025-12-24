# WebSocket 连接失败排查指南

## 问题现象

```
WebSocket connection to 'ws://localhost:3001/ws/danmaku?roomId=21514463' failed
```

当通过反向代理（如 `https://danmuku.unia.love/danmaku`）访问时，WebSocket 连接失败。

## 原因分析

前端代码已经正确实现了动态 WebSocket URL 构建：
```javascript
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const host = window.location.host;
const wsUrl = `${protocol}//${host}/ws/danmaku?roomId=${roomId}`;
```

问题在于：
1. **旧版本前端代码**：如果 Docker 镜像使用的是旧代码，可能还在硬编码 localhost
2. **Nginx 配置缺失**：反向代理没有正确配置 WebSocket 协议升级
3. **路径不匹配**：Nginx location 配置和实际 WebSocket 路径不匹配

## 解决步骤

### 1. 重新构建 Docker 镜像（最重要！）

确保使用最新的前端代码：

```bash
# 停止并删除旧容器
docker-compose down

# 清理旧镜像（可选）
docker rmi unia-danmuku:latest

# 重新构建（不使用缓存）
docker-compose build --no-cache

# 启动新容器
docker-compose up -d

# 查看日志确认启动成功
docker-compose logs -f
```

### 2. 确认 Nginx 配置正确

检查你的 Nginx 配置文件，确保包含以下关键配置：

```nginx
location /ws {
    proxy_pass http://localhost:3000;  # 或你的容器地址
    proxy_http_version 1.1;
    
    # 这两行是 WebSocket 的关键！
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # 超时设置
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;
    
    # 禁用缓冲
    proxy_buffering off;
}
```

### 3. 重启 Nginx

```bash
# 测试配置
nginx -t

# 重启 Nginx
systemctl restart nginx
# 或
nginx -s reload
```

### 4. 验证配置

#### 方法 A：浏览器控制台测试

打开 `https://danmuku.unia.love/danmaku`（或你的域名），在浏览器控制台运行：

```javascript
// 测试 WebSocket 连接
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const host = window.location.host;
const ws = new WebSocket(`${protocol}//${host}/ws/danmaku?roomId=21514463`);

ws.onopen = () => console.log('✅ WebSocket 连接成功！');
ws.onerror = (err) => console.error('❌ WebSocket 连接失败:', err);
ws.onmessage = (msg) => console.log('📨 收到消息:', msg.data);
ws.onclose = () => console.log('🔌 WebSocket 连接关闭');
```

#### 方法 B：查看网络面板

1. 打开浏览器开发者工具
2. 切换到 Network（网络）标签
3. 筛选 WS（WebSocket）
4. 刷新页面
5. 查看 WebSocket 连接状态：
   - ✅ Status: 101 Switching Protocols（成功）
   - ❌ Status: 其他（失败）

### 5. 常见错误排查

#### 错误 1: Status 400 Bad Request

**原因**：Nginx 缺少 `Upgrade` 和 `Connection` 头

**解决**：
```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

#### 错误 2: Status 502 Bad Gateway

**原因**：后端服务未运行或地址错误

**解决**：
```bash
# 检查容器是否运行
docker ps | grep unia-danmuku

# 检查容器日志
docker logs unia-danmuku

# 检查端口
netstat -tlnp | grep 3000
```

#### 错误 3: Status 504 Gateway Timeout

**原因**：超时时间过短

**解决**：增加 Nginx 超时时间
```nginx
proxy_read_timeout 300s;
proxy_send_timeout 300s;
proxy_connect_timeout 60s;
```

#### 错误 4: 连接后立即断开

**原因**：可能是 `proxy_buffering` 问题

**解决**：
```nginx
proxy_buffering off;
```

### 6. 针对子路径部署的特殊配置

如果你部署在 `/danmaku` 子路径下（如 `https://domain.com/danmaku/`），需要额外配置：

```nginx
# 主应用路径
location /danmaku/ {
    rewrite ^/danmaku/(.*) /$1 break;
    proxy_pass http://localhost:3000;
    # ... 其他配置
}

# WebSocket 路径（注意：这个匹配 /danmaku/ws/...）
location /danmaku/ws/ {
    rewrite ^/danmaku/(.*) /$1 break;
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    
    # ... 其他 WebSocket 配置
}
```

## 完整检查清单

- [ ] 重新构建 Docker 镜像（`docker-compose build --no-cache`）
- [ ] 重启容器（`docker-compose up -d`）
- [ ] 确认容器正常运行（`docker ps`）
- [ ] Nginx 包含 WebSocket 配置
- [ ] Nginx 配置中有 `Upgrade` 和 `Connection` 头
- [ ] Nginx 配置中有 `proxy_buffering off`
- [ ] 重启 Nginx（`nginx -s reload`）
- [ ] 清除浏览器缓存
- [ ] 使用无痕模式测试
- [ ] 检查浏览器控制台错误信息
- [ ] 检查 Network 面板的 WebSocket 状态

## 快速修复命令

```bash
# 一键重新部署
cd /path/to/Unia-Danmuku-Docker
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 重启 Nginx
sudo systemctl restart nginx

# 查看服务状态
docker ps
docker logs unia-danmuku
sudo systemctl status nginx
```

## 还是不行？

如果按照以上步骤还是无法解决，请检查：

1. **防火墙规则**：确保允许 WebSocket 连接
2. **CDN/WAF 设置**：如果使用 Cloudflare 等，需要在设置中启用 WebSocket
3. **浏览器支持**：确保浏览器支持 WebSocket（现代浏览器都支持）
4. **CORS 设置**：检查后端 CORS 配置是否正确

需要更多帮助，请提供：
- 浏览器控制台完整错误信息
- Nginx 错误日志：`tail -f /var/log/nginx/error.log`
- Docker 容器日志：`docker logs unia-danmuku`
