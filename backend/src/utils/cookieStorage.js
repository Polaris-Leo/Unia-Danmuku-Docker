import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COOKIE_FILE = path.join(__dirname, '../../data/cookies.json');

/**
 * 确保数据目录存在
 */
function ensureDataDir() {
  const dataDir = path.dirname(COOKIE_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

/**
 * 保存Cookie到文件
 * @param {Object} cookies - Cookie对象
 */
export function saveCookies(cookies) {
  try {
    ensureDataDir();
    const data = {
      cookies,
      timestamp: Date.now(),
      date: new Date().toISOString()
    };
    fs.writeFileSync(COOKIE_FILE, JSON.stringify(data, null, 2));
    console.log('✅ Cookies已保存到本地');
    return true;
  } catch (error) {
    console.error('❌ 保存Cookies失败:', error);
    return false;
  }
}

/**
 * 从文件加载Cookie
 * @returns {Object|null} - Cookie对象或null
 */
export function loadCookies() {
  try {
    if (!fs.existsSync(COOKIE_FILE)) {
      console.log('⚠️  未找到保存的Cookies');
      return null;
    }

    const data = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf-8'));
    
    // 检查Cookie是否过期(30天)
    const daysPassed = (Date.now() - data.timestamp) / (1000 * 60 * 60 * 24);
    if (daysPassed > 30) {
      console.log('⚠️  Cookies已过期');
      return null;
    }

    console.log(`✅ 已加载保存的Cookies (保存于 ${data.date})`);
    return data.cookies;
  } catch (error) {
    console.error('❌ 加载Cookies失败:', error);
    return null;
  }
}

/**
 * 清除保存的Cookie
 */
export function clearCookies() {
  try {
    if (fs.existsSync(COOKIE_FILE)) {
      fs.unlinkSync(COOKIE_FILE);
      console.log('✅ Cookies已清除');
    }
    return true;
  } catch (error) {
    console.error('❌ 清除Cookies失败:', error);
    return false;
  }
}

/**
 * 获取Cookie字符串(用于HTTP请求)
 * @param {Object} cookies - Cookie对象
 * @returns {string} - Cookie字符串
 */
export function getCookieString(cookies) {
  if (!cookies) return '';
  
  return Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');
}
