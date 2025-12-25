import express from 'express';
import { getSessions, loadHistory } from '../utils/historyStorage.js';

const router = express.Router();

// 获取房间的历史会话列表
router.get('/:roomId/sessions', async (req, res) => {
  const { roomId } = req.params;
  const sessions = await getSessions(roomId);
  res.json({ success: true, sessions });
});

// 获取指定会话的历史数据
router.get('/:roomId/:sessionId', async (req, res) => {
  const { roomId, sessionId } = req.params;
  const history = await loadHistory(roomId, sessionId);
  
  if (history) {
    res.json({ success: true, data: history });
  } else {
    res.status(404).json({ success: false, message: 'History not found' });
  }
});

export default router;
