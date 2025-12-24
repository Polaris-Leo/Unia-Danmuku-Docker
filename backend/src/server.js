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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors({
  origin: [
    'http://0.0.0.0:3000',
    'https://danmuku.unia.love'
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/danmaku', danmakuRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// 在生产环境中提供前端静态文件
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));
  
  // 所有其他路由返回前端应用
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

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
  console.log(`🚀 Server is running on http://0.0.0.0:${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`🌐 WebSocket URL: ws://0.0.0.0:${PORT}/ws/danmaku`);
});
