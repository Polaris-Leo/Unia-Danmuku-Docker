# Nginx 反向代理部署指南

## 问题描述

当通过 Nginx 反向代理访问应用时（如 `https://danmuku.unia.love/danmaku`），WebSocket 连接可能会失败。这是因为 Nginx 需要特殊配置才能正确处理 WebSocket 协议升级。

## 解决方案

### 1. 确保应用代码正确

前端代码已经自动适配环境，会根据当前协议和主机动态构建 WebSocket URL：

```javascript
// 自动判断使用 ws:// 还是 wss://
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const host = window.location.host; // 包含端口号
const wsUrl = `${protocol}//${host}/ws/danmaku?roomId=${roomId}`;
```

### 2. 配置 Nginx 反向代理

#### 场景 A: 部署在子路径（如 `/danmaku`）

```nginx
location /danmaku/ {
    # 去掉路径前缀
    rewrite ^/danmaku/(.*) /$1 break;
    
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    
    # 基本代理头
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # WebSocket 支持（关键！）
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    
    # 超时设置
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;
    
    # 禁用缓冲（对 WebSocket 很重要）
    proxy_buffering off;
}
```

#### 场景 B: 部署在根路径

```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # WebSocket 支持
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    
    proxy_read_timeout 300s;
    proxy_buffering off;
}
```

### 3. 关键配置说明

| 配置项 | 说明 | 重要性 |
|--------|------|--------|
| `proxy_http_version 1.1` | WebSocket 需要 HTTP/1.1 | ⭐⭐⭐ |
| `proxy_set_header Upgrade $http_upgrade` | 传递协议升级请求 | ⭐⭐⭐ |
| `proxy_set_header Connection "upgrade"` | 传递连接升级头 | ⭐⭐⭐ |
| `proxy_buffering off` | 禁用缓冲，实时传输 | ⭐⭐ |
| `proxy_read_timeout 300s` | 避免长连接超时 | ⭐⭐ |

### 4. 完整部署步骤

#### 步骤 1: 重新构建 Docker 镜像

```bash
cd /path/to/Unia-Danmuku-Docker
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

#### 步骤 2: 配置 Nginx

1. 将 `nginx.conf` 中的配置添加到你的 Nginx 配置文件
2. 根据实际情况修改：
   - 域名 `server_name`
   - 代理地址 `proxy_pass`（如果容器在不同端口）
   - 路径前缀（如果不是 `/danmaku`）
   - SSL 证书路径（如果使用 HTTPS）

3. 测试配置：
```bash
nginx -t
```

4. 重启 Nginx：
```bash
systemctl restart nginx
# 或
nginx -s reload
```

### 5. 验证 WebSocket 连接

在浏览器控制台查看：

```
✅ 成功：WebSocket 已连接
❌ 失败：WebSocket connection failed
```

### 6. 常见问题排查

#### 问题 1: WebSocket 连接失败

**检查点：**
- Nginx 配置中是否包含 `Upgrade` 和 `Connection` 头
- 是否设置了 `proxy_http_version 1.1`
- 防火墙是否允许 WebSocket 连接

#### 问题 2: 连接建立后立即断开

**检查点：**
- `proxy_read_timeout` 是否足够长（建议 300s）
- 是否设置了 `proxy_buffering off`

#### 问题 3: 子路径部署导致路径错误

**检查点：**
- 是否正确使用 `rewrite` 去掉路径前缀
- 前端资源路径是否正确（应该使用相对路径）

### 7. 使用 Docker Compose 网络

如果 Nginx 也在 Docker 中运行，可以使用 Docker 网络：

```yaml
# docker-compose.yml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - unia-danmuku
    networks:
      - unia-network

  unia-danmuku:
    # ... 现有配置
    networks:
      - unia-network

networks:
  unia-network:
    driver: bridge
```

然后在 Nginx 配置中使用容器名：
```nginx
proxy_pass http://unia-danmuku:3000;
```

## 测试 WebSocket

使用浏览器控制台测试：

```javascript
// 替换为你的域名和路径
const ws = new WebSocket('wss://danmuku.unia.love/ws/danmaku?roomId=21514463');

ws.onopen = () => console.log('✅ 连接成功');
ws.onerror = (err) => console.error('❌ 连接失败', err);
ws.onmessage = (msg) => console.log('📨 收到消息', msg.data);
```

## 参考资料

- [Nginx WebSocket 代理官方文档](http://nginx.org/en/docs/http/websocket.html)
- [Docker 网络配置](https://docs.docker.com/compose/networking/)
