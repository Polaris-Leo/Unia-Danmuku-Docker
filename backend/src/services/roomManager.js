import fs from 'fs';
import path from 'path';
import { BilibiliLiveWS } from './bilibiliLiveWS.js';
import { loadCookies } from '../utils/cookieStorage.js';
import { loadHistory, saveMessage } from '../utils/historyStorage.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const MONITOR_FILE = path.join(DATA_DIR, 'monitored_rooms.json');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class RoomManager {
  constructor() {
    this.connections = new Map(); // roomId -> BilibiliLiveWS 实例
    this.monitoredRooms = new Map(); // roomId -> { paused: boolean, addedAt: number }
    this.wss = null; // WebSocket 服务器实例
    
    this.loadMonitoredRooms();
  }

  setWSS(wss) {
    this.wss = wss;
  }

  loadMonitoredRooms() {
    try {
      if (fs.existsSync(MONITOR_FILE)) {
        const data = JSON.parse(fs.readFileSync(MONITOR_FILE, 'utf-8'));
        
        // 迁移：处理旧的数组格式
        if (Array.isArray(data)) {
          data.forEach(id => {
            this.monitoredRooms.set(String(id), { paused: false, addedAt: Date.now() });
          });
        } else {
          // 新的对象格式
          Object.entries(data).forEach(([id, config]) => {
            this.monitoredRooms.set(id, config);
          });
        }
        console.log(`📋 Loaded ${this.monitoredRooms.size} monitored rooms`);
      }
    } catch (error) {
      console.error('Failed to load monitored rooms:', error);
    }
  }

  saveMonitoredRooms() {
    try {
      const data = Object.fromEntries(this.monitoredRooms);
      fs.writeFileSync(MONITOR_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save monitored rooms:', error);
    }
  }

  getMonitoredRooms() {
    return Array.from(this.monitoredRooms.keys());
  }
  
  getRoomConfig(roomId) {
    return this.monitoredRooms.get(String(roomId));
  }

  async addMonitoredRoom(roomId) {
    const id = String(roomId);
    if (!this.monitoredRooms.has(id)) {
      this.monitoredRooms.set(id, { paused: false, addedAt: Date.now() });
      this.saveMonitoredRooms();
      await this.ensureConnection(id);
      return true;
    }
    return false;
  }

  async removeMonitoredRoom(roomId) {
    const id = String(roomId);
    if (this.monitoredRooms.has(id)) {
      this.monitoredRooms.delete(id);
      this.saveMonitoredRooms();
      
      // 检查是否应该断开连接（没有客户端在观看）
      this.checkDisconnect(id);
      return true;
    }
    return false;
  }
  
  async pauseRoom(roomId) {
    const id = String(roomId);
    const config = this.monitoredRooms.get(id);
    if (config) {
      config.paused = true;
      this.monitoredRooms.set(id, config);
      this.saveMonitoredRooms();
      this.checkDisconnect(id); // 如果没有客户端将断开连接
      return true;
    }
    return false;
  }

  async resumeRoom(roomId) {
    const id = String(roomId);
    const config = this.monitoredRooms.get(id);
    if (config) {
      config.paused = false;
      this.monitoredRooms.set(id, config);
      this.saveMonitoredRooms();
      await this.ensureConnection(id);
      return true;
    }
    return false;
  }

  updateRoomInfo(roomId, info) {
    const id = String(roomId);
    const config = this.monitoredRooms.get(id);
    if (config) {
      let changed = false;
      if (info.uname && config.uname !== info.uname) {
        config.uname = info.uname;
        changed = true;
      }
      if (info.face && config.face !== info.face) {
        config.face = info.face;
        changed = true;
      }
      
      if (changed) {
        this.monitoredRooms.set(id, config);
        this.saveMonitoredRooms();
      }
    }
  }

  async ensureConnection(roomId) {
    const id = String(roomId);
    let liveWS = this.connections.get(id);

    if (!liveWS) {
      console.log(`🔌 Starting connection for room ${id}`);
      const cookies = loadCookies();
      liveWS = new BilibiliLiveWS(id, cookies);
      this.connections.set(id, liveWS);

      // 设置事件处理程序
      this.setupEventHandlers(liveWS, id);

      try {
        await liveWS.connect();
        // 连接成功后立即获取直播状态，以初始化 currentSessionId (用于历史记录)
        await liveWS.getLiveStatus();
        
        // 获取并缓存主播信息（头像、昵称）
        const roomInfo = await liveWS.getRoomInfo();
        if (roomInfo) {
          this.updateRoomInfo(id, {
            uname: roomInfo.anchorName,
            face: roomInfo.anchorFace
          });
        }
      } catch (error) {
        console.error(`Failed to connect to room ${id}:`, error);
        // 不要立即删除，也许稍后重试？
        // 暂时让它保留在 map 中，以免频繁创建
      }
    }
    return liveWS;
  }

  setupEventHandlers(liveWS, roomId) {
    const broadcast = (data) => this.broadcastToRoom(roomId, data);

    liveWS.onDanmaku = (data) => broadcast(data);
    liveWS.onGift = (data) => broadcast(data);
    liveWS.onGuard = (data) => broadcast(data);
    liveWS.onWelcome = (data) => broadcast(data);
    liveWS.onWatched = (data) => broadcast(data);
    liveWS.onRankCount = (data) => broadcast({ type: 'rank', num: data.count });
    liveWS.onLiveStatus = (data) => broadcast({ type: 'live_status', ...data });
    liveWS.onPopularity = (data) => broadcast({ type: 'popularity', value: data });
    liveWS.onSuperChat = (data) => broadcast(data);
    liveWS.onLike = (data) => broadcast(data);
    liveWS.onEntry = (data) => broadcast(data);
    
    liveWS.onConnect = () => broadcast({ type: 'system', message: '直播间连接成功' });
    liveWS.onClose = () => {
      broadcast({ type: 'system', message: '直播间连接已关闭' });
      
      // 如果意外关闭且处于监控中且未暂停，我们可能需要重新连接
      const config = this.monitoredRooms.get(roomId);
      if (config && !config.paused) {
        console.log(`⚠️ Monitored room ${roomId} disconnected. Reconnecting in 5s...`);
        setTimeout(() => {
          // 再次检查是否仍在监控且未暂停
          const currentConfig = this.monitoredRooms.get(roomId);
          if (currentConfig && !currentConfig.paused && this.connections.has(roomId)) {
             this.connections.get(roomId).connect();
          }
        }, 5000);
      } else {
        this.connections.delete(roomId);
      }
    };
    
    liveWS.onError = (err) => broadcast({ type: 'error', message: err.message });
  }

  broadcastToRoom(roomId, data) {
    if (!this.wss) return;
    
    this.wss.clients.forEach(client => {
      if (client.roomId === roomId && client.readyState === 1) {
        client.send(JSON.stringify(data));
      }
    });
  }

  checkDisconnect(roomId) {
    const id = String(roomId);
    const config = this.monitoredRooms.get(id);
    
    // 如果处于监控中且未暂停，切勿断开连接
    if (config && !config.paused) {
      return;
    }

    // 检查是否有客户端正在观看此房间
    let hasClients = false;
    if (this.wss) {
      for (const client of this.wss.clients) {
        if (client.roomId === id && client.readyState === 1) {
          hasClients = true;
          break;
        }
      }
    }

    if (!hasClients) {
      console.log(`🔌 No clients and not monitored (or paused). Disconnecting room ${id}`);
      const liveWS = this.connections.get(id);
      if (liveWS) {
        liveWS.disconnect();
        this.connections.delete(id);
      }
    }
  }

  // 启动时初始化所有监控的房间
  async init() {
    console.log('🚀 Initializing monitored rooms...');
    for (const [roomId, config] of this.monitoredRooms) {
      if (!config.paused) {
        await this.ensureConnection(roomId);
      }
    }
  }
}

export const roomManager = new RoomManager();
