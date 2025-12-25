import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import danmakuRoutes, { createDanmakuWSS } from './routes/danmaku.js';
import monitorRoutes from './routes/monitor.js';
import historyRoutes from './routes/history.js';
import { roomManager } from './services/roomManager.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

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
app.use('/api/monitor', monitorRoutes);
app.use('/api/history', historyRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// 静态文件托管
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));

// SPA 路由回退
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not Found' });
  }
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// 创建WebSocket服务器
createDanmakuWSS(server);

// 初始化房间管理器（加载持久化配置并开始监控）
roomManager.init();

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
