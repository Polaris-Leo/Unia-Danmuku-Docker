# 多阶段构建 Dockerfile
# 阶段 1: 构建前端
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# 复制前端依赖文件
COPY frontend/package*.json ./

# 安装前端依赖
RUN npm install

# 复制前端源代码
COPY frontend/ ./

# 构建前端静态文件
RUN npm run build

# 阶段 2: 构建最终镜像
FROM node:18-alpine

WORKDIR /app

# 安装 dumb-init（用于正确处理信号）
RUN apk add --no-cache dumb-init

# 复制后端依赖文件
COPY backend/package*.json ./backend/

# 安装后端依赖（仅生产依赖）
WORKDIR /app/backend
RUN npm install --only=production

# 复制后端源代码
COPY backend/src ./src

# 复制前端构建产物到后端静态文件目录
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# 创建必要的目录
RUN mkdir -p /app/backend/data /app/logs

# 设置环境变量
ENV NODE_ENV=production \
    PORT=3000

# 暴露端口
EXPOSE 3000

# 使用非 root 用户运行
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 使用 dumb-init 启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
