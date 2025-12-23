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

export default api;
