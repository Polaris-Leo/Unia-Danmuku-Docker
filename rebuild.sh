#!/bin/bash

# 完整重建脚本 - 确保使用最新代码

echo "🔧 开始完整重建..."

# 1. 停止并删除旧容器
echo "📦 停止并删除旧容器..."
docker-compose down

# 2. 删除旧镜像
echo "🗑️  删除旧镜像..."
docker rmi unia-danmuku:latest 2>/dev/null || echo "  (没有旧镜像)"

# 3. 清理 Docker 构建缓存
echo "🧹 清理 Docker 构建缓存..."
docker builder prune -f

# 4. 清理前端构建产物（如果存在）
echo "🧹 清理前端构建产物..."
rm -rf frontend/dist
rm -rf frontend/node_modules/.vite

# 5. 重新构建镜像（不使用缓存）
echo "🔨 重新构建 Docker 镜像（不使用缓存）..."
docker-compose build --no-cache

# 6. 启动新容器
echo "🚀 启动新容器..."
docker-compose up -d

# 7. 等待容器启动
echo "⏳ 等待容器启动..."
sleep 3

# 8. 查看容器状态
echo ""
echo "✅ 容器状态:"
docker-compose ps

# 9. 显示日志
echo ""
echo "📋 最近的日志:"
docker-compose logs --tail=20

echo ""
echo "✨ 完成！现在请："
echo "  1. 清除浏览器缓存（Ctrl+Shift+Delete）或使用无痕模式"
echo "  2. 访问 http://localhost:3000"
echo "  3. 查看浏览器控制台的调试信息"
echo ""
echo "📊 查看实时日志: docker-compose logs -f"
