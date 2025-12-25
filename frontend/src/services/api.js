import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  withCredentials: true
});

/**
 * 生成登录二维码
 */
export const generateQRCode = async () => {
  const response = await api.get('/auth/qrcode');
  return response.data;
};

/**
 * 轮询二维码扫描状态
 * @param {string} qrcode_key
 */
export const pollQRCode = async (qrcode_key) => {
  const response = await api.get('/auth/qrcode/poll', {
    params: { qrcode_key }
  });
  return response.data;
};

/**
 * 获取登录状态
 */
export const getAuthStatus = async () => {
  const response = await api.get('/auth/status');
  return response.data;
};

/**
 * 退出登录
 */
export const logout = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

/**
 * 获取监控房间列表
 */
export const getMonitoredRooms = async () => {
  const response = await api.get('/monitor/rooms');
  return response.data;
};

/**
 * 添加监控房间
 * @param {string} roomId
 */
export const addMonitoredRoom = async (roomId) => {
  const response = await api.post('/monitor/rooms', { roomId });
  return response.data;
};

/**
 * 移除监控房间
 * @param {string} roomId
 */
export const removeMonitoredRoom = async (roomId) => {
  const response = await api.delete(`/monitor/rooms/${roomId}`);
  return response.data;
};

export default api;
