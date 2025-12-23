import express from 'express';
import { generateQRCode, pollQRCode } from '../services/bilibiliAuth.js';
import { saveCookies, loadCookies, clearCookies } from '../utils/cookieStorage.js';

const router = express.Router();

/**
 * 生成登录二维码
 * GET /api/auth/qrcode
 */
router.get('/qrcode', async (req, res) => {
  try {
    const qrData = await generateQRCode();
    res.json({
      success: true,
      data: qrData
    });
  } catch (error) {
    console.error('生成二维码失败:', error);
    res.status(500).json({
      success: false,
      message: '生成二维码失败',
      error: error.message
    });
  }
});

/**
 * 轮询二维码扫描状态
 * GET /api/auth/qrcode/poll
 */
router.get('/qrcode/poll', async (req, res) => {
  try {
    const { qrcode_key } = req.query;
    
    if (!qrcode_key) {
      return res.status(400).json({
        success: false,
        message: '缺少 qrcode_key 参数'
      });
    }

    const result = await pollQRCode(qrcode_key);
    
    // 如果登录成功，设置cookie
    if (result.data.code === 0 && result.cookies) {
      const cookieObj = {};
      
      // 设置从B站返回的cookie
      result.cookies.forEach(cookie => {
        res.cookie(cookie.name, cookie.value, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30天
        });
        cookieObj[cookie.name] = cookie.value;
      });
      
      // 保存Cookie到本地文件
      saveCookies(cookieObj);
    }

    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('轮询二维码状态失败:', error);
    res.status(500).json({
      success: false,
      message: '轮询二维码状态失败',
      error: error.message
    });
  }
});

/**
 * 获取当前登录状态
 * GET /api/auth/status
 */
router.get('/status', (req, res) => {
  // 优先从请求Cookie获取，否则从本地文件加载
  let hasAuth = req.cookies.SESSDATA && req.cookies.bili_jct;
  let cookieData = null;
  
  if (hasAuth) {
    cookieData = {
      SESSDATA: req.cookies.SESSDATA?.substring(0, 10) + '...',
      bili_jct: req.cookies.bili_jct
    };
  } else {
    // 尝试从本地加载
    const savedCookies = loadCookies();
    if (savedCookies && savedCookies.SESSDATA && savedCookies.bili_jct) {
      hasAuth = true;
      cookieData = {
        SESSDATA: savedCookies.SESSDATA?.substring(0, 10) + '...',
        bili_jct: savedCookies.bili_jct
      };
    }
  }
  
  res.json({
    success: true,
    authenticated: !!hasAuth,
    isLoggedIn: !!hasAuth,  // 保持兼容性
    cookies: cookieData
  });
});

/**
 * 退出登录
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  // 清除所有相关cookie
  const cookiesToClear = ['SESSDATA', 'bili_jct', 'DedeUserID', 'DedeUserID__ckMd5'];
  cookiesToClear.forEach(name => {
    res.clearCookie(name);
  });
  
  // 清除本地保存的Cookie
  clearCookies();
  
  res.json({
    success: true,
    message: '已退出登录'
  });
});

export default router;
