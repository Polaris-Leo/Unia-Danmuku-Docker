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
    this.monitoredRooms = new Set(); // Set of roomIds
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
        this.monitoredRooms = new Set(data.map(String));
        console.log(`📋 Loaded ${this.monitoredRooms.size} monitored rooms`);
      }
    } catch (error) {
      console.error('Failed to load monitored rooms:', error);
    }
  }

  saveMonitoredRooms() {
    try {
      const data = Array.from(this.monitoredRooms);
      fs.writeFileSync(MONITOR_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save monitored rooms:', error);
    }
  }

  getMonitoredRooms() {
    return Array.from(this.monitoredRooms);
  }

  async addMonitoredRoom(roomId) {
    const id = String(roomId);
    if (!this.monitoredRooms.has(id)) {
      this.monitoredRooms.add(id);
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
      // If it closed unexpectedly and is monitored, we might want to reconnect
      if (this.monitoredRooms.has(roomId)) {
        console.log(`⚠️ Monitored room ${roomId} disconnected. Reconnecting in 5s...`);
        setTimeout(() => {
          if (this.connections.has(roomId)) {
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
    
    // If monitored, never disconnect
    if (this.monitoredRooms.has(id)) {
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
      console.log(`🔌 No clients and not monitored. Disconnecting room ${id}`);
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
    for (const roomId of this.monitoredRooms) {
      await this.ensureConnection(roomId);
    }
  }
}

export const roomManager = new RoomManager();
