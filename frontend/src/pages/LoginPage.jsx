import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateQRCode, pollQRCode, getAuthStatus } from '../services/api';
import './LoginPage.css';

const QR_STATUS = {
  SUCCESS: 0,
  KEY_ERROR: 86038,
  NOT_SCANNED: 86101,
  SCANNED: 86090
};

const STATUS_MESSAGES = {
  [QR_STATUS.SUCCESS]: '登录成功！',
  [QR_STATUS.KEY_ERROR]: '二维码已失效',
  [QR_STATUS.NOT_SCANNED]: '请使用B站APP扫码',
  [QR_STATUS.SCANNED]: '已扫码，请在手机上确认'
};

function LoginPage() {
  const navigate = useNavigate();
  const [qrData, setQrData] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(180);

  // 生成二维码
  const fetchQRCode = async () => {
    try {
      setLoading(true);
      setStatus('正在生成二维码...');
      const result = await generateQRCode();
      
      if (result.success) {
        setQrData(result.data);
        setStatus(STATUS_MESSAGES[QR_STATUS.NOT_SCANNED]);
        setCountdown(180);
      }
    } catch (error) {
      setStatus('生成二维码失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 轮询二维码状态
  useEffect(() => {
    if (!qrData) return;

    const pollInterval = setInterval(async () => {
      try {
        const result = await pollQRCode(qrData.qrcode_key);
        
        if (result.success) {
          const code = result.data.code;
          setStatus(STATUS_MESSAGES[code] || result.data.message);

          if (code === QR_STATUS.SUCCESS) {
            clearInterval(pollInterval);
            setTimeout(() => {
              navigate('/dashboard');
            }, 1000);
          } else if (code === QR_STATUS.KEY_ERROR) {
            clearInterval(pollInterval);
          }
        }
      } catch (error) {
        console.error('轮询失败:', error);
      }
    }, 2000); // 每2秒轮询一次

    return () => clearInterval(pollInterval);
  }, [qrData, navigate]);

  // 倒计时
  useEffect(() => {
    if (!qrData || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setStatus('二维码已过期，请刷新');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [qrData, countdown]);

  // 检查登录状态
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const result = await getAuthStatus();
        if (result.success && result.authenticated) {
          console.log('已登录，跳转到dashboard');
          navigate('/dashboard');
          return;
        }
      } catch (error) {
        console.log('未登录，显示二维码');
      }
      // 未登录则生成二维码
      fetchQRCode();
    };
    
    checkAuth();
  }, [navigate]);

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🎬 Unia弹幕系统</h1>
          <p>使用B站账号登录</p>
        </div>

        <div className="qr-section">
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>加载中...</p>
            </div>
          ) : qrData ? (
            <>
              <div className="qr-wrapper">
                <img 
                  src={qrData.qrcode_image} 
                  alt="登录二维码" 
                  className={countdown === 0 ? 'expired' : ''}
                />
                {countdown === 0 && (
                  <div className="expired-overlay">
                    <p>二维码已过期</p>
                  </div>
                )}
              </div>
              
              <div className="qr-info">
                <p className="status-text">{status}</p>
                <p className="countdown">
                  {countdown > 0 ? `有效期: ${countdown}秒` : '已过期'}
                </p>
              </div>
            </>
          ) : (
            <div className="error">
              <p>{status}</p>
            </div>
          )}
        </div>

        <div className="actions">
          <button 
            onClick={fetchQRCode}
            disabled={loading}
            className="refresh-btn"
          >
            🔄 刷新二维码
          </button>
        </div>

        <div className="tips">
          <p>💡 扫码步骤：</p>
          <ol>
            <li>打开哔哩哔哩APP</li>
            <li>点击右上角扫一扫</li>
            <li>扫描上方二维码</li>
            <li>在手机上确认登录</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
