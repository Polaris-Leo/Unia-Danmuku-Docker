import express from 'express';
import { WebSocketServer } from 'ws';
import { BilibiliLiveWS } from '../services/bilibiliLiveWS.js';
import { loadCookies } from '../utils/cookieStorage.js';
import { loadHistory } from '../utils/historyStorage.js';

const router = express.Router();

// 存储活动的直播间连接
const liveConnections = new Map();

/**
 * 启动直播间弹幕监听
 * POST /api/danmaku/start
 */
router.post('/start', (req, res) => {
  const { roomId } = req.body;
  
  if (!roomId) {
    return res.status(400).json({
      success: false,
      message: '缺少roomId参数'
    });
  }
  
  // 检查是否已经在监听
  if (liveConnections.has(roomId)) {
    return res.json({
      success: true,
      message: '直播间已在监听中',
      roomId
    });
  }
  
  res.json({
    success: true,
    message: '直播间弹幕监听已启动',
    roomId
  });
});

/**
 * 停止直播间弹幕监听
 * POST /api/danmaku/stop
 */
router.post('/stop', (req, res) => {
  const { roomId } = req.body;
  
  if (!roomId) {
    return res.status(400).json({
      success: false,
      message: '缺少roomId参数'
    });
  }
  
  const conn = liveConnections.get(roomId);
  if (conn) {
    conn.disconnect();
    liveConnections.delete(roomId);
  }
  
  res.json({
    success: true,
    message: '直播间弹幕监听已停止',
    roomId
  });
});

/**
 * 获取当前监听的直播间列表
 * GET /api/danmaku/rooms
 */
router.get('/rooms', (req, res) => {
  const rooms = Array.from(liveConnections.keys());
  res.json({
    success: true,
    rooms,
    count: rooms.length
  });
});

/**
 * 创建WebSocket服务器用于转发弹幕
 */
export function createDanmakuWSS(server) {
  const wss = new WebSocketServer({ 
    server,
    path: '/ws/danmaku'
  });
  
  console.log('🌐 弹幕WebSocket服务器已启动: /ws/danmaku');
  
  wss.on('connection', (ws, req) => {
    // 从URL参数获取roomId
    const url = new URL(req.url, 'http://localhost');
    const roomId = url.searchParams.get('roomId');
    
    if (!roomId) {
      ws.close(1008, '缺少roomId参数');
      return;
    }
    
    console.log(`📺 客户端连接到直播间 ${roomId}`);
    
    // 检查是否已有连接，没有则创建
    let liveWS = liveConnections.get(roomId);
    
    if (!liveWS) {
      // 加载保存的Cookie
      const cookies = loadCookies();
      console.log('🍪 加载的Cookies:', cookies ? '已加载' : '未找到');
      
      liveWS = new BilibiliLiveWS(roomId, cookies);
      liveConnections.set(roomId, liveWS);
      
      // 设置事件监听
      liveWS.onDanmaku = (danmaku) => {
        broadcastToRoom(roomId, danmaku);
      };
      
      liveWS.onGift = (gift) => {
        broadcastToRoom(roomId, gift);
      };
      
      liveWS.onGuard = (guard) => {
        broadcastToRoom(roomId, guard);
      };
      
      liveWS.onWelcome = (welcome) => {
        broadcastToRoom(roomId, welcome);
      };

      liveWS.onWatched = (watched) => {
        broadcastToRoom(roomId, watched);
      };

      liveWS.onRankCount = (rankData) => {
        broadcastToRoom(roomId, {
          type: 'rank',
          num: rankData.count
        });
      };

      liveWS.onLiveStatus = (status) => {
        broadcastToRoom(roomId, {
          type: 'live_status',
          ...status
        });
      };
      
      liveWS.onPopularity = (popularity) => {
        broadcastToRoom(roomId, {
          type: 'popularity',
          value: popularity
        });
      };
      
      liveWS.onSuperChat = (sc) => {
        console.log(`[Room ${roomId}] 📨 收到SC完整数据:`, JSON.stringify(sc, null, 2));
        console.log(`[Room ${roomId}] SC数据检查:`, {
          type: sc.type,
          hasUser: !!sc.user,
          username: sc.user?.username,
          price: sc.price,
          message: sc.message
        });
        broadcastToRoom(roomId, sc);
        console.log(`[Room ${roomId}] ✅ SC已广播`);
      };
      
      liveWS.onLike = (like) => {
        broadcastToRoom(roomId, like);
      };
      
      liveWS.onWatched = (watched) => {
        broadcastToRoom(roomId, watched);
      };
      
      liveWS.onRankCount = (rankCount) => {
        broadcastToRoom(roomId, rankCount);
      };
      
      liveWS.onEntry = (entry) => {
        broadcastToRoom(roomId, entry);
      };
      
      liveWS.onConnect = () => {
        broadcastToRoom(roomId, {
          type: 'system',
          message: '直播间连接成功'
        });
      };
      
      liveWS.onClose = () => {
        broadcastToRoom(roomId, {
          type: 'system',
          message: '直播间连接已关闭'
        });
        liveConnections.delete(roomId);
      };
      
      liveWS.onError = (error) => {
        broadcastToRoom(roomId, {
          type: 'error',
          message: error.message
        });
      };
      
      // 连接直播间
      liveWS.connect().catch(err => {
        console.error('连接直播间失败:', err);
        ws.send(JSON.stringify({
          type: 'error',
          message: '连接直播间失败: ' + err.message
        }));
      });
    }

    // 如果已有连接（或刚创建），立即发送当前的直播状态和高能榜
    if (liveWS) {
      liveWS.getLiveStatus().then(async (status) => {
        if (status) {
          ws.send(JSON.stringify({
            type: 'live_status',
            ...status
          }));

          // 如果正在直播，加载并发送历史记录
          if (status.liveStatus === 1 && liveWS.currentSessionId) {
            // 使用 liveWS.roomId (真实房间号) 而不是 URL 参数中的 roomId
            const history = await loadHistory(liveWS.roomId, liveWS.currentSessionId);
            if (history) {
              ws.send(JSON.stringify({
                type: 'history',
                data: history
              }));
            }
          }
        }
        // 获取高能榜 (依赖 getLiveStatus 获取的 anchorId)
        return liveWS.getRankCount();
      }).then(rankData => {
        if (rankData) {
          ws.send(JSON.stringify({
            type: 'rank',
            num: rankData.count
          }));
        }
        // 获取直播间综合信息（主播名、舰长数等）
        return liveWS.getRoomInfo();
      }).then(roomInfo => {
        if (roomInfo) {
          ws.send(JSON.stringify({
            type: 'room_info',
            data: roomInfo
          }));
        }
      });
    }
    
    // 保存客户端连接
    ws.roomId = roomId;
    
    // 客户端断开连接
    ws.on('close', () => {
      console.log(`📺 客户端断开直播间 ${roomId}`);
      
      // 检查是否还有其他客户端连接到该直播间
      const hasOtherClients = Array.from(wss.clients).some(
        client => client.roomId === roomId && client !== ws
      );
      
      // 如果没有其他客户端，关闭直播间连接
      if (!hasOtherClients && liveConnections.has(roomId)) {
        console.log(`🔌 关闭直播间 ${roomId} 的连接`);
        liveConnections.get(roomId).disconnect();
        liveConnections.delete(roomId);
      }
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket错误:', error);
    });
  });
  
  // 广播消息到指定直播间的所有客户端
  function broadcastToRoom(roomId, data) {
    let clientCount = 0;
    wss.clients.forEach(client => {
      if (client.roomId === roomId && client.readyState === 1) {
        clientCount++;
        client.send(JSON.stringify(data));
      }
    });
    if (clientCount > 0 && data.type === 'danmaku') {
      console.log(`📤 转发弹幕到 ${clientCount} 个客户端:`, data.user.username, '-', data.content);
    }
  }
  
  return wss;
}

export default router;
