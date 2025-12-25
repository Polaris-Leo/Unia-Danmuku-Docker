import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import danmakuRoutes, { createDanmakuWSS } from './routes/danmaku.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/danmaku', danmakuRoutes);

// 静态文件托管 (生产环境)
if (process.env.NODE_ENV === 'production') {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  // 对应 Dockerfile 中的路径结构: /app/backend/src -> /app/frontend/dist
  const distPath = path.join(__dirname, '../../frontend/dist');
  
  app.use(express.static(distPath));
  
  // 处理 SPA 路由，所有未匹配的请求返回 index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// 创建WebSocket服务器
createDanmakuWSS(server);

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error', 
    message: err.message 
  });
});

// 启动服务器
server.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`🌐 WebSocket URL: ws://localhost:${PORT}/ws/danmaku`);
});
