import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DanmakuPage from './pages/DanmakuPage';
import ObsDanmakuPage from './pages/ObsDanmakuPage';
import ObsSettingsPage from './pages/ObsSettingsPage';
import MonitorPage from './pages/MonitorPage';
import ThankYouPage from './pages/ThankYouPage';
import ThankYouSettingsPage from './pages/ThankYouSettingsPage';

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/danmaku" element={<DanmakuPage />} />
        <Route path="/obs" element={<ObsDanmakuPage />} />
        <Route path="/obs-settings" element={<ObsSettingsPage />} />
        <Route path="/monitor" element={<MonitorPage />} />
        <Route path="/thankyou" element={<ThankYouPage />} />
        <Route path="/thankyou-settings" element={<ThankYouSettingsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
