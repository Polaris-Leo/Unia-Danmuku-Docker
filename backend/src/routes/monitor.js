import express from 'express';
import { roomManager } from '../services/roomManager.js';

const router = express.Router();

// Get all monitored rooms
router.get('/rooms', async (req, res) => {
  const roomIds = roomManager.getMonitoredRooms();
  
  const rooms = await Promise.all(roomIds.map(async (roomId) => {
    const conn = roomManager.connections.get(roomId);
    let info = {
      roomId,
      connected: conn ? conn.isConnected : false,
      addedAt: Date.now(), // Placeholder
      title: '',
      uname: ''
    };

    if (conn) {
      try {
        // Try to get room info if available
        const roomInfo = await conn.getRoomInfo();
        if (roomInfo) {
            info.title = roomInfo.title;
            info.uname = roomInfo.uname;
        }
      } catch (e) {
        console.error(`Failed to get info for room ${roomId}:`, e.message);
      }
    }
    return info;
  }));

  res.json({ success: true, rooms });
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
