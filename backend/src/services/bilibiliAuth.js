import axios from 'axios';
import QRCode from 'qrcode';

/**
 * B站API基础配置
 */
const BILIBILI_API = {
  QR_GENERATE: 'https://passport.bilibili.com/x/passport-login/web/qrcode/generate',
  QR_POLL: 'https://passport.bilibili.com/x/passport-login/web/qrcode/poll'
};

/**
 * 生成登录二维码
 * @returns {Promise<{url: string, qrcode_key: string, qrcode_image: string}>}
 */
export async function generateQRCode() {
  try {
    console.log('🔑 开始请求B站二维码API...');
    // 1. 请求B站API获取二维码URL和key
    const response = await axios.get(BILIBILI_API.QR_GENERATE, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.bilibili.com'
      },
      timeout: 10000
    });
    
    console.log('📡 B站API响应:', {
      code: response.data.code,
      message: response.data.message,
      hasData: !!response.data.data
    });
    
    if (response.data.code !== 0) {
      throw new Error(`B站API返回错误: ${response.data.message}`);
    }

    const { url, qrcode_key } = response.data.data;

    console.log('✅ 获取二维码URL成功，开始生成图片...');
    
    // 2. 生成二维码图片（Base64）
    const qrcode_image = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    console.log('✅ 二维码图片生成成功');

    return {
      url,
      qrcode_key,
      qrcode_image, // Base64格式的二维码图片
      expires_in: 180 // 二维码有效期180秒
    };
  } catch (error) {
    console.error('❌ 生成二维码失败:', error.message);
    console.error('错误详情:', error.response?.data || error);
    throw error;
  }
}

/**
 * 轮询二维码扫描状态
 * @param {string} qrcode_key - 二维码密钥
 * @returns {Promise<Object>}
 */
export async function pollQRCode(qrcode_key) {
  try {
    const response = await axios.get(BILIBILI_API.QR_POLL, {
      params: { qrcode_key }
    });

    // 提取Set-Cookie头中的cookies
    const setCookieHeader = response.headers['set-cookie'];
    let cookies = null;

    if (setCookieHeader && response.data.data.code === 0) {
      cookies = parseCookies(setCookieHeader);
    }

    return {
      data: response.data.data,
      cookies
    };
  } catch (error) {
    console.error('轮询二维码状态失败:', error);
    throw error;
  }
}

/**
 * 解析Set-Cookie响应头
 * @param {Array<string>} setCookieArray
 * @returns {Array<{name: string, value: string}>}
 */
function parseCookies(setCookieArray) {
  return setCookieArray.map(cookieStr => {
    const [nameValue] = cookieStr.split(';');
    const [name, value] = nameValue.split('=');
    return { name: name.trim(), value: value.trim() };
  });
}

/**
 * 二维码状态码说明
 */
export const QR_CODE_STATUS = {
  SUCCESS: 0,           // 扫码登录成功
  KEY_ERROR: 86038,     // 二维码已失效
  NOT_SCANNED: 86101,   // 未扫码
  SCANNED: 86090        // 已扫码未确认
};

/**
 * 获取状态码对应的消息
 * @param {number} code
 * @returns {string}
 */
export function getStatusMessage(code) {
  const messages = {
    [QR_CODE_STATUS.SUCCESS]: '登录成功',
    [QR_CODE_STATUS.KEY_ERROR]: '二维码已失效',
    [QR_CODE_STATUS.NOT_SCANNED]: '请使用B站APP扫码',
    [QR_CODE_STATUS.SCANNED]: '已扫码，请在手机上确认'
  };
  return messages[code] || '未知状态';
}
