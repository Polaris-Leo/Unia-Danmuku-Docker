# Docker 构建和部署指南

## 📦 Docker 镜像构建

### 快速开始

使用 Docker Compose（推荐）：

```bash
# 构建并启动容器
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止容器
docker-compose down
```

### 手动构建

```bash
# 构建镜像
docker build -t unia-danmuku:latest .

# 运行容器
docker run -d \
  --name unia-danmuku \
  -p 3000:3000 \
  -v $(pwd)/backend/data:/app/backend/data \
  -v $(pwd)/logs:/app/logs \
  --restart unless-stopped \
  unia-danmuku:latest
```

## 🌐 访问应用

- **Web 界面**: http://localhost:3000
- **健康检查**: http://localhost:3000/health
- **WebSocket**: ws://localhost:3000/ws/danmaku

## 📋 Docker 文件说明

### Dockerfile
- 采用多阶段构建，优化镜像大小
- 第一阶段：构建前端静态文件
- 第二阶段：打包后端和前端静态文件
- 使用 alpine 版本的 Node.js，镜像更小
- 使用非 root 用户运行，提高安全性
- 包含健康检查机制

### .dockerignore
- 排除不必要的文件，减小构建上下文
- 排除开发依赖和日志文件

### docker-compose.yml
- 简化部署流程
- 自动管理容器生命周期
- 配置数据持久化
- 包含健康检查和自动重启

## 🔧 环境变量

可以在 `docker-compose.yml` 中配置以下环境变量：

- `NODE_ENV`: 运行环境（默认: production）
- `PORT`: 服务端口（默认: 3000）

## 💾 数据持久化

以下目录会持久化到宿主机：

- `./backend/data`: 存储 cookies 等数据
- `./logs`: 应用日志

## 🐛 故障排查

### 查看容器日志
```bash
docker-compose logs -f unia-danmuku
```

### 进入容器调试
```bash
docker-compose exec unia-danmuku sh
```

### 重新构建镜像
```bash
docker-compose build --no-cache
docker-compose up -d
```

## 🚀 生产部署建议

1. **使用反向代理**: 建议在前面加 Nginx 或 Traefik
2. **配置 HTTPS**: 使用 Let's Encrypt 证书
3. **备份数据**: 定期备份 `backend/data` 目录
4. **监控日志**: 配置日志收集和监控系统
5. **资源限制**: 在 docker-compose.yml 中配置内存和 CPU 限制

```yaml
services:
  unia-danmuku:
    # ... 其他配置
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
```
