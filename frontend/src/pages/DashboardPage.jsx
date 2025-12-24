import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthStatus, logout } from '../services/api';
import './DashboardPage.css';

function DashboardPage() {
  const navigate = useNavigate();
  const [authInfo, setAuthInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const result = await getAuthStatus();
      if (result.success && result.isLoggedIn) {
        setAuthInfo(result);
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('退出登录失败:', error);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <div className="dashboard-header">
          <h1>🎉 登录成功！</h1>
          <p>欢迎使用 Unia 弹幕系统</p>
        </div>

        <div className="dashboard-content">
          <div className="info-section">
            <h3>✅ 登录状态</h3>
            <div className="info-item">
              <span className="label">状态：</span>
              <span className="value success">已登录</span>
            </div>
            {authInfo?.cookies && (
              <>
                <div className="info-item">
                  <span className="label">SESSDATA：</span>
                  <span className="value">{authInfo.cookies.SESSDATA}</span>
                </div>
                <div className="info-item">
                  <span className="label">bili_jct：</span>
                  <span className="value">{authInfo.cookies.bili_jct}</span>
                </div>
              </>
            )}
          </div>

          <div className="features-section">
            <h3>📋 功能列表</h3>
            <ul className="feature-list">
              <li onClick={() => navigate('/danmaku')} style={{cursor: 'pointer'}}>
                📺 实时弹幕接收 →
              </li>
              <li onClick={() => navigate('/obs-settings')} style={{cursor: 'pointer'}}>
                💬 OBS弹幕姬 →
              </li>
              <li>👥 直播信息面板 (开发中)</li>
              <li>🎯 更多功能敬请期待</li>
            </ul>
          </div>

          <div className="actions">
            <button onClick={handleLogout} className="logout-btn">
              🚪 退出登录
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
