import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ObsPreview from './ObsPreview';
import './ObsSettingsPage.css';

const ObsSettingsPage = () => {
  const navigate = useNavigate();
  
  // 默认设置
  const defaultSettings = {
    usernameFontFamily: 'Microsoft YaHei',
    usernameFontSize: 16,
    usernameFontWeight: 'bold',
    usernameColor: '#333333',
    usernameColorGuard1: '#ff1a75', // 总督
    usernameColorGuard2: '#9b39f4', // 提督
    usernameColorGuard3: '#1fa3f1', // 舰长
    usernameStrokeWidth: 2,
    usernameStrokeColor: '#ffffff',
    usernameEnhancedStroke: true, // 启用增强描边
    usernameGlowIntensity: 8, // 外发光强度
    usernameShadowIntensity: 6, // 阴影强度
    danmakuFontFamily: 'Microsoft YaHei',
    danmakuFontSize: 18,
    danmakuFontWeight: 'normal',
    danmakuColor: '#333333',
    danmakuStrokeWidth: 2,
    danmakuStrokeColor: '#ffffff',
    danmakuEnhancedStroke: true, // 启用增强描边
    danmakuGlowIntensity: 8, // 外发光强度
    danmakuShadowIntensity: 6, // 阴影强度
    avatarSize: 48,
    itemSpacing: 12,
    emotSize: 28, // 表情大小
  };

  const [settings, setSettings] = useState(defaultSettings);
  const [roomId, setRoomId] = useState('21514463');

  // 加载保存的设置
  useEffect(() => {
    const saved = localStorage.getItem('obsSettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // 合并默认设置，确保新添加的设置项（如emotSize）有默认值
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Failed to parse settings', e);
      }
    }
    const savedRoom = localStorage.getItem('obsRoomId');
    if (savedRoom) {
      setRoomId(savedRoom);
    }
  }, []);

  // 保存设置
  const saveSettings = () => {
    localStorage.setItem('obsSettings', JSON.stringify(settings));
    localStorage.setItem('obsRoomId', roomId);
    alert('设置已保存！');
  };

  // 重置设置
  const resetSettings = () => {
    if (confirm('确定要重置所有设置吗？')) {
      setSettings(defaultSettings);
      localStorage.removeItem('obsSettings');
    }
  };

  // 预览
  const preview = () => {
    localStorage.setItem('obsSettings', JSON.stringify(settings));
    localStorage.setItem('obsRoomId', roomId);
    window.open(`/obs?room=${roomId}`, '_blank');
  };

  // 返回主页
  const goBack = () => {
    navigate('/dashboard');
  };

  // 生成平滑描边阴影 (与ObsPreview.jsx保持一致)
  const generateTextShadow = (strokeWidth, strokeColor, glowIntensity, shadowIntensity, enhanced) => {
    if (!enhanced) {
      return `
    ${strokeWidth}px 0 0 ${strokeColor},
    -${strokeWidth}px 0 0 ${strokeColor},
    0 ${strokeWidth}px 0 ${strokeColor},
    0 -${strokeWidth}px 0 ${strokeColor},
    0 ${shadowIntensity}px ${shadowIntensity}px rgba(0,0,0,0.5)`;
    }

    // 增强模式：多层描边以实现平滑效果
    const layers = [0.33, 0.66, 1];
    const directions = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]
    ];
    
    let shadows = [];
    
    // 描边层
    if (strokeWidth > 0) {
      layers.forEach(layer => {
        const w = strokeWidth * layer;
        directions.forEach(dir => {
          shadows.push(`${(w * dir[0]).toFixed(1)}px ${(w * dir[1]).toFixed(1)}px 0 ${strokeColor}`);
        });
      });
    }
    
    // 外发光
    if (glowIntensity > 0) {
      shadows.push(`0 0 ${glowIntensity}px ${strokeColor}`);
    }
    
    // 投影
    if (shadowIntensity > 0) {
      shadows.push(`0 ${shadowIntensity * 0.5}px ${shadowIntensity}px rgba(0,0,0,0.6)`);
    }
    
    return shadows.join(', ');
  };

  // 生成OBS自定义CSS代码
  const generateObsCss = () => {
    const usernameShadow = generateTextShadow(
      settings.usernameStrokeWidth,
      settings.usernameStrokeColor,
      settings.usernameGlowIntensity,
      settings.usernameShadowIntensity,
      settings.usernameEnhancedStroke
    );

    const danmakuShadow = generateTextShadow(
      settings.danmakuStrokeWidth,
      settings.danmakuStrokeColor,
      settings.danmakuGlowIntensity,
      settings.danmakuShadowIntensity,
      settings.danmakuEnhancedStroke
    );

    const css = `:root {
  --username-font-family: ${settings.usernameFontFamily};
  --username-font-size: ${settings.usernameFontSize}px;
  --username-font-weight: ${settings.usernameFontWeight};
  --username-color: ${settings.usernameColor};
  --username-color-guard1: ${settings.usernameColorGuard1};
  --username-color-guard2: ${settings.usernameColorGuard2};
  --username-color-guard3: ${settings.usernameColorGuard3};
  --username-stroke-width: ${settings.usernameStrokeWidth}px;
  --username-stroke-color: ${settings.usernameStrokeColor};
  --username-enhanced-stroke: ${settings.usernameEnhancedStroke ? '1' : '0'};
  --username-glow-intensity: ${settings.usernameGlowIntensity}px;
  --username-shadow-intensity: ${settings.usernameShadowIntensity}px;
  --username-text-shadow: ${usernameShadow};
  
  --danmaku-font-family: ${settings.danmakuFontFamily};
  --danmaku-font-size: ${settings.danmakuFontSize}px;
  --danmaku-font-weight: ${settings.danmakuFontWeight};
  --danmaku-color: ${settings.danmakuColor};
  --danmaku-stroke-width: ${settings.danmakuStrokeWidth}px;
  --danmaku-stroke-color: ${settings.danmakuStrokeColor};
  --danmaku-enhanced-stroke: ${settings.danmakuEnhancedStroke ? '1' : '0'};
  --danmaku-glow-intensity: ${settings.danmakuGlowIntensity}px;
  --danmaku-shadow-intensity: ${settings.danmakuShadowIntensity}px;
  --danmaku-text-shadow: ${danmakuShadow};
  
  --avatar-size: ${settings.avatarSize}px;
  --item-spacing: ${settings.itemSpacing}px;
  --emot-size: ${settings.emotSize}px;
}`;
    
    // 复制到剪贴板
    navigator.clipboard.writeText(css).then(() => {
      alert('CSS代码已复制到剪贴板！\n请粘贴到OBS浏览器源的"自定义CSS"框中。');
    }).catch(() => {
      // 如果复制失败，显示弹窗让用户手动复制
      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;padding:20px;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.3);z-index:9999;max-width:600px;max-height:80vh;overflow:auto;';
      modal.innerHTML = `
        <h3 style="margin-top:0;">复制以下CSS代码到OBS</h3>
        <textarea readonly style="width:100%;height:300px;font-family:monospace;font-size:12px;padding:10px;border:1px solid #ddd;border-radius:4px;">${css}</textarea>
        <button onclick="this.parentElement.remove()" style="margin-top:10px;padding:8px 16px;background:#1890ff;color:white;border:none;border-radius:4px;cursor:pointer;">关闭</button>
      `;
      document.body.appendChild(modal);
    });
  };

  const fontWeightOptions = [
    { value: 'normal', label: '正常' },
    { value: 'bold', label: '粗体' },
    { value: '100', label: '极细 (100)' },
    { value: '200', label: '纤细 (200)' },
    { value: '300', label: '细 (300)' },
    { value: '400', label: '正常 (400)' },
    { value: '500', label: '中等 (500)' },
    { value: '600', label: '半粗 (600)' },
    { value: '700', label: '粗 (700)' },
    { value: '800', label: '特粗 (800)' },
    { value: '900', label: '极粗 (900)' },
  ];

  return (
    <div className="obs-settings-page">
      <div className="obs-settings-layout">
        {/* 左侧：设置面板 */}
        <div className="settings-container">
          <h1>OBS 弹幕样式设置</h1>

          {/* 房间号设置 */}
          <div className="setting-section">
            <h2>基本设置</h2>
            <div className="setting-item">
              <label>房间号：</label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="输入B站直播间号"
              />
            </div>
          </div>

          {/* 用户名样式 */}
          <div className="setting-section">
            <h2>用户名样式</h2>
            
            <div className="setting-item">
              <label>字体：</label>
              <input
                type="text"
                value={settings.usernameFontFamily}
                onChange={(e) => setSettings({ ...settings, usernameFontFamily: e.target.value })}
                placeholder="如: Microsoft YaHei, SimHei"
              />
            </div>

            <div className="setting-item">
              <label>字号：</label>
              <input
                type="number"
                value={settings.usernameFontSize}
                onChange={(e) => setSettings({ ...settings, usernameFontSize: parseInt(e.target.value) })}
                min="10"
                max="200"
              />
              <span className="unit">px</span>
            </div>

            <div className="setting-item">
              <label>粗细：</label>
              <select
                value={settings.usernameFontWeight}
                onChange={(e) => setSettings({ ...settings, usernameFontWeight: e.target.value })}
              >
                {fontWeightOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="setting-item">
              <label>颜色：</label>
              <input
                type="color"
                value={settings.usernameColor}
                onChange={(e) => setSettings({ ...settings, usernameColor: e.target.value })}
              />
              <input
                type="text"
                value={settings.usernameColor}
                onChange={(e) => setSettings({ ...settings, usernameColor: e.target.value })}
                placeholder="#333333"
              />
            </div>

            <div className="setting-item">
              <label>舰长颜色：</label>
              <input
                type="color"
                value={settings.usernameColorGuard3}
                onChange={(e) => setSettings({ ...settings, usernameColorGuard3: e.target.value })}
              />
              <input
                type="text"
                value={settings.usernameColorGuard3}
                onChange={(e) => setSettings({ ...settings, usernameColorGuard3: e.target.value })}
                placeholder="#1fa3f1"
              />
            </div>

            <div className="setting-item">
              <label>提督颜色：</label>
              <input
                type="color"
                value={settings.usernameColorGuard2}
                onChange={(e) => setSettings({ ...settings, usernameColorGuard2: e.target.value })}
              />
              <input
                type="text"
                value={settings.usernameColorGuard2}
                onChange={(e) => setSettings({ ...settings, usernameColorGuard2: e.target.value })}
                placeholder="#9b39f4"
              />
            </div>

            <div className="setting-item">
              <label>总督颜色：</label>
              <input
                type="color"
                value={settings.usernameColorGuard1}
                onChange={(e) => setSettings({ ...settings, usernameColorGuard1: e.target.value })}
              />
              <input
                type="text"
                value={settings.usernameColorGuard1}
                onChange={(e) => setSettings({ ...settings, usernameColorGuard1: e.target.value })}
                placeholder="#ff1a75"
              />
            </div>

            <div className="setting-item">
              <label>描边宽度：</label>
              <input
                type="number"
                value={settings.usernameStrokeWidth}
                onChange={(e) => setSettings({ ...settings, usernameStrokeWidth: parseInt(e.target.value) })}
                min="0"
                max="50"
              />
              <span className="unit">px</span>
            </div>

            <div className="setting-item">
              <label>描边颜色：</label>
              <input
                type="color"
                value={settings.usernameStrokeColor}
                onChange={(e) => setSettings({ ...settings, usernameStrokeColor: e.target.value })}
              />
              <input
                type="text"
                value={settings.usernameStrokeColor}
                onChange={(e) => setSettings({ ...settings, usernameStrokeColor: e.target.value })}
                placeholder="#ffffff"
              />
            </div>

            <div className="setting-item">
              <label>增强描边效果：</label>
              <input
                type="checkbox"
                checked={settings.usernameEnhancedStroke}
                onChange={(e) => setSettings({ ...settings, usernameEnhancedStroke: e.target.checked })}
              />
              <span className="hint">（启用8方向描边+外发光+阴影）</span>
            </div>

            {settings.usernameEnhancedStroke && (
              <>
                <div className="setting-item">
                  <label>外发光强度：</label>
                  <input
                    type="number"
                    value={settings.usernameGlowIntensity}
                    onChange={(e) => setSettings({ ...settings, usernameGlowIntensity: parseInt(e.target.value) })}
                    min="0"
                    max="100"
                  />
                  <span className="unit">px</span>
                </div>

                <div className="setting-item">
                  <label>阴影强度：</label>
                  <input
                    type="number"
                    value={settings.usernameShadowIntensity}
                    onChange={(e) => setSettings({ ...settings, usernameShadowIntensity: parseInt(e.target.value) })}
                    min="0"
                    max="100"
                  />
                  <span className="unit">px</span>
                </div>
              </>
            )}
          </div>

          {/* 弹幕内容样式 */}
          <div className="setting-section">
            <h2>弹幕内容样式</h2>
            
            <div className="setting-item">
              <label>字体：</label>
              <input
                type="text"
                value={settings.danmakuFontFamily}
                onChange={(e) => setSettings({ ...settings, danmakuFontFamily: e.target.value })}
                placeholder="如: Microsoft YaHei, SimHei"
              />
            </div>

            <div className="setting-item">
              <label>字号：</label>
              <input
                type="number"
                value={settings.danmakuFontSize}
                onChange={(e) => setSettings({ ...settings, danmakuFontSize: parseInt(e.target.value) })}
                min="10"
                max="200"
              />
              <span className="unit">px</span>
            </div>

            <div className="setting-item">
              <label>粗细：</label>
              <select
                value={settings.danmakuFontWeight}
                onChange={(e) => setSettings({ ...settings, danmakuFontWeight: e.target.value })}
              >
                {fontWeightOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="setting-item">
              <label>颜色：</label>
              <input
                type="color"
                value={settings.danmakuColor}
                onChange={(e) => setSettings({ ...settings, danmakuColor: e.target.value })}
              />
              <input
                type="text"
                value={settings.danmakuColor}
                onChange={(e) => setSettings({ ...settings, danmakuColor: e.target.value })}
                placeholder="#333333"
              />
            </div>

            <div className="setting-item">
              <label>描边宽度：</label>
              <input
                type="number"
                value={settings.danmakuStrokeWidth}
                onChange={(e) => setSettings({ ...settings, danmakuStrokeWidth: parseInt(e.target.value) })}
                min="0"
                max="50"
              />
              <span className="unit">px</span>
            </div>

            <div className="setting-item">
              <label>描边颜色：</label>
              <input
                type="color"
                value={settings.danmakuStrokeColor}
                onChange={(e) => setSettings({ ...settings, danmakuStrokeColor: e.target.value })}
              />
              <input
                type="text"
                value={settings.danmakuStrokeColor}
                onChange={(e) => setSettings({ ...settings, danmakuStrokeColor: e.target.value })}
                placeholder="#ffffff"
              />
            </div>

            <div className="setting-item">
              <label>增强描边效果：</label>
              <input
                type="checkbox"
                checked={settings.danmakuEnhancedStroke}
                onChange={(e) => setSettings({ ...settings, danmakuEnhancedStroke: e.target.checked })}
              />
              <span className="hint">（启用8方向描边+外发光+阴影）</span>
            </div>

            {settings.danmakuEnhancedStroke && (
              <>
                <div className="setting-item">
                  <label>外发光强度：</label>
                  <input
                    type="number"
                    value={settings.danmakuGlowIntensity}
                    onChange={(e) => setSettings({ ...settings, danmakuGlowIntensity: parseInt(e.target.value) })}
                    min="0"
                    max="100"
                  />
                  <span className="unit">px</span>
                </div>

                <div className="setting-item">
                  <label>阴影强度：</label>
                  <input
                    type="number"
                    value={settings.danmakuShadowIntensity}
                    onChange={(e) => setSettings({ ...settings, danmakuShadowIntensity: parseInt(e.target.value) })}
                    min="0"
                    max="100"
                  />
                  <span className="unit">px</span>
                </div>
              </>
            )}
          </div>

          {/* 布局设置 */}
          <div className="setting-section">
            <h2>布局设置</h2>
            
            <div className="setting-item">
              <label>头像大小：</label>
              <input
                type="number"
                value={settings.avatarSize}
                onChange={(e) => setSettings({ ...settings, avatarSize: parseInt(e.target.value) })}
                min="20"
                max="100"
              />
              <span className="unit">px</span>
            </div>

            <div className="setting-item">
              <label>弹幕间距：</label>
              <input
                type="number"
                value={settings.itemSpacing}
                onChange={(e) => setSettings({ ...settings, itemSpacing: parseInt(e.target.value) })}
                min="0"
                max="50"
              />
              <span className="unit">px</span>
            </div>

            <div className="setting-item">
              <label>表情大小：</label>
              <input
                type="number"
                value={settings.emotSize}
                onChange={(e) => setSettings({ ...settings, emotSize: parseInt(e.target.value) })}
                min="16"
                max="60"
              />
              <span className="unit">px</span>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="action-buttons">
            <button onClick={saveSettings} className="btn-primary">保存设置</button>
            <button onClick={preview} className="btn-success">预览效果</button>
            <button onClick={generateObsCss} className="btn-info">生成OBS CSS代码</button>
            <button onClick={resetSettings} className="btn-warning">重置设置</button>
            <button onClick={goBack} className="btn-secondary">返回主页</button>
          </div>

          {/* 使用说明 */}
          <div className="info-box">
            <h3>使用说明</h3>
            <p><strong>方法一：使用localStorage（推荐）</strong></p>
            <ol>
              <li>设置完成后点击"保存设置"</li>
              <li>在OBS中添加"浏览器"源</li>
              <li>URL填写：<code>http://localhost:5173/obs?room={roomId}</code></li>
              <li>建议分辨率：1920x1080</li>
              <li>刷新浏览器源即可看到新样式</li>
            </ol>
            <p><strong>方法二：使用OBS自定义CSS（如果localStorage不生效）</strong></p>
            <ol>
              <li>点击"生成OBS CSS代码"按钮复制CSS</li>
              <li>在OBS浏览器源设置中，找到"自定义CSS"框</li>
              <li>粘贴复制的CSS代码</li>
              <li>保存并刷新浏览器源</li>
            </ol>
          </div>
        </div>

        {/* 右侧：预览面板 */}
        <div className="preview-container">
          <ObsPreview settings={settings} />
        </div>
      </div>
    </div>
  );
};

export default ObsSettingsPage;
