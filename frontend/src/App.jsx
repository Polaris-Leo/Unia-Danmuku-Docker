import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DanmakuPage from './pages/DanmakuPage';
import ObsDanmakuPage from './pages/ObsDanmakuPage';
import ObsSettingsPage from './pages/ObsSettingsPage';

function App() {
  useEffect(() => {
    // 显示构建版本信息
    const buildTime = new Date().toISOString();
    console.log('🎯 Unia 弹幕系统');
    console.log('📅 构建时间:', '__BUILD_TIME__');
    console.log('🔗 页面地址:', window.location.href);
    console.log('🌐 协议:', window.location.protocol);
    console.log('🏠 主机:', window.location.host);
  }, []);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/danmaku" element={<DanmakuPage />} />
        <Route path="/obs" element={<ObsDanmakuPage />} />
        <Route path="/obs-settings" element={<ObsSettingsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
