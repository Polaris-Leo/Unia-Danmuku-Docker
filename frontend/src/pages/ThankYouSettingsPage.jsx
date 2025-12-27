import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ThankYouSettingsPage.css';

const ThankYouSettingsPage = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState(localStorage.getItem('lastRoomId') || '');
  
  const [config, setConfig] = useState({
    // Image & Audio
    audioEnabled: true,
    audioVolume: 1.0,
    backgroundImg: '', 
    
    // Text Style
    template: '感谢 {sender} 的 {gift} * {count} ({price} 元)',
    guardTemplate: '感谢 {sender} 开通 {gift} * {count}',
    scTemplate: '感谢 {sender} 的醒目留言 ({price} 元)',
    fontFamily: 'Microsoft YaHei',
    fontSize: 30,
    fontColor: '#000000',
    fontWeight: 'normal',
    
    // Gift
    minPrice: 9.9,
    ignoreFree: true,
    
    // Animation
    stayDuration: 5, // seconds
    animationDuration: 1, // seconds
    animationType: 'fadein'
  });

  const [previewData] = useState({
    user: { username: '这是一个很长很长很长很长很长很长的用户名', face: 'https://i0.hdslb.com/bfs/face/member/noface.jpg' },
    giftName: '星月盲盒',
    num: 1,
    price: 2500, // 2.5 CNY
    type: 'gift'
  });

  const [previewBgDark, setPreviewBgDark] = useState(false);
  const [previewAudio, setPreviewAudio] = useState(true);
  const [expandedPanel, setExpandedPanel] = useState('animation'); // default open

  useEffect(() => {
    const savedConfig = localStorage.getItem('thankYouConfig');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
  }, []);

  const saveConfig = (newConfig) => {
    setConfig(newConfig);
    localStorage.setItem('thankYouConfig', JSON.stringify(newConfig));
  };

  const handleReset = () => {
    if (window.confirm('确定要重置所有设置吗？')) {
      localStorage.removeItem('thankYouConfig');
      window.location.reload();
    }
  };

  const handleGenerate = () => {
    if (!roomId) {
      alert('请输入直播间ID');
      return;
    }
    localStorage.setItem('lastRoomId', roomId);
    const link = `${window.location.origin}/thankyou?room=${roomId}`;
    navigator.clipboard.writeText(link).then(() => {
      alert('答谢姬链接已复制到剪贴板！\n请在OBS中添加浏览器源，粘贴此链接。');
    });
  };

  const togglePanel = (panel) => {
    setExpandedPanel(expandedPanel === panel ? null : panel);
  };

  return (
    <div className="v-app">
      <div className="settings-layout">
        {/* Left Side: Preview */}
        <div className="preview-pane">
          <div className={`preview-container ${previewBgDark ? 'dark-bg' : 'light-bg'}`}>
            <div className="thank-you-card-preview" style={{
              animationDuration: `${config.animationDuration}s`,
              opacity: 1
            }}>
              <img 
                src={previewData.user.face} 
                alt="face" 
                className="preview-avatar"
              />
              <div className="preview-message" style={{
                fontFamily: config.fontFamily,
                color: config.fontColor,
                fontWeight: config.fontWeight,
                fontSize: `${config.fontSize}px`
              }}>
                {config.template
                  .replace('{sender}', previewData.user.username)
                  .replace('{gift}', previewData.giftName)
                  .replace('{count}', previewData.num)
                  .replace('{price}', (previewData.price / 1000).toFixed(1))
                }
              </div>
            </div>
          </div>
          
          <div className="preview-controls">
            <div className="switch-group">
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={previewAudio} 
                  onChange={e => setPreviewAudio(e.target.checked)} 
                />
                <span className="slider round"></span>
              </label>
              <span className="switch-label">预览时播放音效</span>
            </div>

            <div className="switch-group">
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={previewBgDark} 
                  onChange={e => setPreviewBgDark(e.target.checked)} 
                />
                <span className="slider round"></span>
              </label>
              <span className="switch-label">反转预览背景颜色</span>
            </div>

            <button className="v-btn bg-red" onClick={handleReset}>
              重置数据
            </button>
          </div>
        </div>

        {/* Right Side: Settings */}
        <div className="settings-pane">
          <div className="v-expansion-panels">
            
            {/* Panel 1: Image & Audio */}
            <div className={`v-expansion-panel ${expandedPanel === 'audio' ? 'active' : ''}`}>
              <button className="v-expansion-panel-title" onClick={() => togglePanel('audio')}>
                图片与音效
                <span className="icon-chevron">▼</span>
              </button>
              {expandedPanel === 'audio' && (
                <div className="v-expansion-panel-text">
                  <div className="form-group">
                    <label>启用音效</label>
                    <input 
                      type="checkbox" 
                      checked={config.audioEnabled}
                      onChange={e => saveConfig({...config, audioEnabled: e.target.checked})}
                    />
                  </div>
                  <div className="form-group">
                    <label>音量 ({config.audioVolume})</label>
                    <input 
                      type="range" 
                      min="0" max="1" step="0.1"
                      value={config.audioVolume}
                      onChange={e => saveConfig({...config, audioVolume: Number(e.target.value)})}
                    />
                  </div>
                  <div className="form-group">
                    <label>背景图片 URL</label>
                    <input 
                      type="text" 
                      className="v-input"
                      value={config.backgroundImg}
                      onChange={e => saveConfig({...config, backgroundImg: e.target.value})}
                      placeholder="http://..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Panel 2: Text Style */}
            <div className={`v-expansion-panel ${expandedPanel === 'style' ? 'active' : ''}`}>
              <button className="v-expansion-panel-title" onClick={() => togglePanel('style')}>
                文字样式
                <span className="icon-chevron">▼</span>
              </button>
              {expandedPanel === 'style' && (
                <div className="v-expansion-panel-text">
                  <div className="form-group">
                    <label>礼物模板</label>
                    <textarea 
                      className="v-input"
                      value={config.template}
                      onChange={e => saveConfig({...config, template: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>舰长模板</label>
                    <textarea 
                      className="v-input"
                      value={config.guardTemplate}
                      onChange={e => saveConfig({...config, guardTemplate: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>字体大小 (px)</label>
                    <input 
                      type="number" 
                      className="v-input"
                      value={config.fontSize}
                      onChange={e => saveConfig({...config, fontSize: Number(e.target.value)})}
                    />
                  </div>
                  <div className="form-group">
                    <label>字体颜色</label>
                    <input 
                      type="color" 
                      className="v-input-color"
                      value={config.fontColor}
                      onChange={e => saveConfig({...config, fontColor: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>字体粗细</label>
                    <select 
                      className="v-input"
                      value={config.fontWeight}
                      onChange={e => saveConfig({...config, fontWeight: e.target.value})}
                    >
                      <option value="normal">正常</option>
                      <option value="bold">加粗</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Panel 3: Gift */}
            <div className={`v-expansion-panel ${expandedPanel === 'gift' ? 'active' : ''}`}>
              <button className="v-expansion-panel-title" onClick={() => togglePanel('gift')}>
                礼物
                <span className="icon-chevron">▼</span>
              </button>
              {expandedPanel === 'gift' && (
                <div className="v-expansion-panel-text">
                  <div className="form-group">
                    <label>最低触发金额 (元)</label>
                    <input 
                      type="number" 
                      className="v-input"
                      value={config.minPrice}
                      onChange={e => saveConfig({...config, minPrice: Number(e.target.value)})}
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <input 
                        type="checkbox" 
                        checked={config.ignoreFree}
                        onChange={e => saveConfig({...config, ignoreFree: e.target.checked})}
                      /> 忽略免费礼物
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Panel 4: Animation */}
            <div className={`v-expansion-panel ${expandedPanel === 'animation' ? 'active' : ''}`}>
              <button className="v-expansion-panel-title" onClick={() => togglePanel('animation')}>
                动画
                <span className="icon-chevron">▼</span>
              </button>
              {expandedPanel === 'animation' && (
                <div className="v-expansion-panel-text">
                  <div className="form-group">
                    <label>停留时间 (s)</label>
                    <input 
                      type="number" 
                      className="v-input"
                      value={config.stayDuration}
                      onChange={e => saveConfig({...config, stayDuration: Number(e.target.value)})}
                    />
                  </div>
                  <div className="form-group">
                    <label>动画时间 (s)</label>
                    <input 
                      type="number" 
                      className="v-input"
                      value={config.animationDuration}
                      onChange={e => saveConfig({...config, animationDuration: Number(e.target.value)})}
                    />
                  </div>
                </div>
              )}
            </div>

          </div>

          <div className="v-divider"></div>

          {/* Generation Section */}
          <div className="generation-section">
            <h2>生成</h2>
            <p className="subtitle">生成网页链接后, 在obs的浏览器源中添加链接</p>
            
            <div className="form-group">
              <label>直播间ID</label>
              <input 
                type="number" 
                className="v-input"
                value={roomId}
                onChange={e => setRoomId(e.target.value)}
                placeholder="输入直播间ID"
              />
            </div>
            <button className="v-btn bg-primary full-width" onClick={handleGenerate}>
              生成 / 复制链接
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThankYouSettingsPage;
