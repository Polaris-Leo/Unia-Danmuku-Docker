import fs from 'fs';
import path from 'path';
import { BilibiliLiveWS } from './bilibiliLiveWS.js';
import { loadCookies } from '../utils/cookieStorage.js';
import { loadHistory, saveMessage } from '../utils/historyStorage.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const MONITOR_FILE = path.join(DATA_DIR, 'monitored_rooms.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class RoomManager {
  constructor() {
    this.connections = new Map(); // roomId -> BilibiliLiveWS instance
    this.monitoredRooms = new Map(); // roomId -> { paused: boolean, addedAt: number }
    this.wss = null; // WebSocket Server instance
    
    this.loadMonitoredRooms();
  }

  setWSS(wss) {
    this.wss = wss;
  }

  loadMonitoredRooms() {
    try {
      if (fs.existsSync(MONITOR_FILE)) {
        const data = JSON.parse(fs.readFileSync(MONITOR_FILE, 'utf-8'));
        
        // Migration: Handle old array format
        if (Array.isArray(data)) {
          data.forEach(id => {
            this.monitoredRooms.set(String(id), { paused: false, addedAt: Date.now() });
          });
        } else {
          // New object format
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
      
      // Check if we should disconnect (no clients watching)
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
      this.checkDisconnect(id); // Will disconnect if no clients
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

      // Setup event handlers
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
        // Don't delete immediately, maybe retry later? 
        // For now, let it stay in map so we don't spam create
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
      
      // If it closed unexpectedly and is monitored AND NOT PAUSED, we might want to reconnect
      const config = this.monitoredRooms.get(roomId);
      if (config && !config.paused) {
        console.log(`⚠️ Monitored room ${roomId} disconnected. Reconnecting in 5s...`);
        setTimeout(() => {
          // Check again if still monitored and not paused
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
    
    // If monitored AND NOT PAUSED, never disconnect
    if (config && !config.paused) {
      return;
    }

    // Check if any clients are watching this room
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

  // Initialize all monitored rooms on startup
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
