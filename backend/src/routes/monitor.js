import express from 'express';
import { roomManager } from '../services/roomManager.js';

const router = express.Router();

// Get all monitored rooms
router.get('/rooms', async (req, res) => {
  const roomIds = roomManager.getMonitoredRooms();
  
  const rooms = await Promise.all(roomIds.map(async (roomId) => {
    const config = roomManager.getRoomConfig(roomId);
    const conn = roomManager.connections.get(roomId);
    
    let info = {
      roomId,
      connected: conn ? conn.isConnected : false,
      paused: config ? config.paused : false,
      addedAt: config ? config.addedAt : 0,
      uname: config?.uname || '加载中...',
      face: config?.face || '',
      liveStatus: 0 // 0: offline, 1: live, 2: round
    };

    if (conn) {
      try {
        // 如果缓存中没有信息，才尝试主动获取
        if (!info.uname || info.uname === '加载中...' || !info.face) {
            const roomInfo = await conn.getRoomInfo();
            if (roomInfo) {
                info.uname = roomInfo.anchorName;
                info.face = roomInfo.anchorFace;
                
                // Update cache
                roomManager.updateRoomInfo(roomId, {
                    uname: roomInfo.anchorName,
                    face: roomInfo.anchorFace
                });
            }
        }
        
        const status = await conn.getLiveStatus();
        if (status) {
            info.liveStatus = status.liveStatus;
        }
      } catch (e) {
        console.error(`Failed to get info for room ${roomId}:`, e.message);
      }
    }
    return info;
  }));

  res.json({ success: true, rooms });
});

// Pause monitoring
router.post('/rooms/:roomId/pause', async (req, res) => {
  const success = await roomManager.pauseRoom(req.params.roomId);
  res.json({ success });
});

// Resume monitoring
router.post('/rooms/:roomId/resume', async (req, res) => {
  const success = await roomManager.resumeRoom(req.params.roomId);
  res.json({ success });
});

// Add a monitored room
router.post('/rooms', async (req, res) => {
  const { roomId } = req.body;
  if (!roomId) {
    return res.status(400).json({ success: false, message: 'Missing roomId' });
  }

  await roomManager.addMonitoredRoom(roomId);
  res.json({ success: true, message: `Room ${roomId} added to monitor list` });
});

// Remove a monitored room
router.delete('/rooms/:roomId', async (req, res) => {
  const { roomId } = req.params;
  const removed = await roomManager.removeMonitoredRoom(roomId);
  
  if (removed) {
    res.json({ success: true, message: `Room ${roomId} removed from monitor list` });
  } else {
    res.status(404).json({ success: false, message: 'Room not found in monitor list' });
  }
});

export default router;
