
# -------- 多阶段构建 Dockerfile（自动前后端集成，无需本地 Node 环境） --------

# 阶段1：构建前端
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# 阶段2：构建后端并集成前端产物
FROM node:18-alpine
WORKDIR /app
# 安装 dumb-init 用于信号处理
RUN apk add --no-cache dumb-init
# 复制后端依赖
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install --only=production
# 复制后端源代码
COPY backend/src ./src
# 复制前端构建产物到后端静态目录
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist
# 创建数据和日志目录
RUN mkdir -p /app/backend/data /app/logs
# 环境变量
ENV NODE_ENV=production PORT=3000
# 暴露端口
EXPOSE 3000
# 使用非 root 用户
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 && chown -R nodejs:nodejs /app
USER nodejs
# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
# 启动命令
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
