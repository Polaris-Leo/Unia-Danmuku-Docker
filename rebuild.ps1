# 完整重建脚本 - Windows 版本
# 确保使用最新代码

Write-Host "🔧 开始完整重建..." -ForegroundColor Cyan

# 1. 停止并删除旧容器
Write-Host "📦 停止并删除旧容器..." -ForegroundColor Yellow
docker-compose down

# 2. 删除旧镜像
Write-Host "🗑️  删除旧镜像..." -ForegroundColor Yellow
docker rmi unia-danmuku:latest 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  (没有旧镜像)" -ForegroundColor Gray
}

# 3. 清理 Docker 构建缓存
Write-Host "🧹 清理 Docker 构建缓存..." -ForegroundColor Yellow
docker builder prune -f

# 4. 清理前端构建产物（如果存在）
Write-Host "🧹 清理前端构建产物..." -ForegroundColor Yellow
if (Test-Path "frontend\dist") {
    Remove-Item -Recurse -Force "frontend\dist"
}
if (Test-Path "frontend\node_modules\.vite") {
    Remove-Item -Recurse -Force "frontend\node_modules\.vite"
}

# 5. 重新构建镜像（不使用缓存）
Write-Host "🔨 重新构建 Docker 镜像（不使用缓存）..." -ForegroundColor Yellow
docker-compose build --no-cache

# 6. 启动新容器
Write-Host "🚀 启动新容器..." -ForegroundColor Yellow
docker-compose up -d

# 7. 等待容器启动
Write-Host "⏳ 等待容器启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# 8. 查看容器状态
Write-Host ""
Write-Host "✅ 容器状态:" -ForegroundColor Green
docker-compose ps

# 9. 显示日志
Write-Host ""
Write-Host "📋 最近的日志:" -ForegroundColor Cyan
docker-compose logs --tail=20

Write-Host ""
Write-Host "✨ 完成！现在请：" -ForegroundColor Green
Write-Host "  1. 清除浏览器缓存（Ctrl+Shift+Delete）或使用无痕模式" -ForegroundColor White
Write-Host "  2. 访问 http://localhost:3000" -ForegroundColor White
Write-Host "  3. 查看浏览器控制台的调试信息（查找 '🔍 WebSocket 连接信息'）" -ForegroundColor White
Write-Host ""
Write-Host "📊 查看实时日志: docker-compose logs -f" -ForegroundColor Cyan
