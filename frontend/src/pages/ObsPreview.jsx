import React, { useState, useEffect, useRef } from 'react';
import './ObsPreview.css';

const ObsPreview = ({ settings }) => {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  // 自动计算缩放比例以适应容器
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const parentHeight = containerRef.current.parentElement.clientHeight;
        const parentWidth = containerRef.current.parentElement.clientWidth;
        // 目标尺寸 2400x3000
        // 计算基于宽度的缩放和基于高度的缩放，取较小值以确保完全容纳
        const scaleX = parentWidth / 2400;
        const scaleY = parentHeight / 3000;
        setScale(Math.min(scaleX, scaleY));
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // 示例数据
  const sampleMessages = [
    {
      id: 1,
      type: 'message',
      user: { username: '萌新用户', face: 'https://i0.hdslb.com/bfs/face/member/noface.jpg' },
      message: '主播好！第一次来看直播',
      guardLevel: 0
    },
    {
      id: 2,
      type: 'message',
      user: { username: '老粉A', face: 'https://i0.hdslb.com/bfs/face/member/noface.jpg' },
      message: '前排围观，今天的背景音乐很好听',
      guardLevel: 0
    },
    {
      id: 3,
      type: 'message',
      user: { username: '舰长大佬', face: 'https://i0.hdslb.com/bfs/face/member/noface.jpg' },
      message: '今天的直播效果真不错！',
      guardLevel: 3
    },
    {
      id: 4,
      type: 'message',
      user: { username: '提督巨佬', face: 'https://i0.hdslb.com/bfs/face/member/noface.jpg' },
      message: '什么时候唱那首歌呀？期待很久了',
      guardLevel: 2
    },
    {
      id: 5,
      type: 'message',
      user: { username: '总督神豪', face: 'https://i0.hdslb.com/bfs/face/member/noface.jpg' },
      message: '大家晚上好，今晚不醉不归',
      guardLevel: 1
    },
    {
      id: 6,
      type: 'message',
      user: { username: '表情包达人', face: 'https://i0.hdslb.com/bfs/face/member/noface.jpg' },
      message: '这也太好笑了吧 [dog] [笑哭]',
      guardLevel: 0,
      emots: {
        '[dog]': { url: 'https://i0.hdslb.com/bfs/live/4428c84e694fbf4e0ef6c06e958d9352c3582740.png', height: 20 },
        '[笑哭]': { url: 'https://i0.hdslb.com/bfs/live/e6073c6849f735ae6cb7af3a20ff7dcec962b4c5.png', height: 20 }
      }
    },
    {
      id: 7,
      type: 'message',
      user: { username: '话痨用户', face: 'https://i0.hdslb.com/bfs/face/member/noface.jpg' },
      message: '这是一条非常非常长的弹幕消息，用来测试换行显示的效果是否正常。如果显示不正常的话，就需要调整CSS样式了。',
      guardLevel: 0
    },
    {
      id: 8,
      type: 'message',
      user: { username: '大表情测试', face: 'https://i0.hdslb.com/bfs/face/member/noface.jpg' },
      message: '[U脑过载]',
      guardLevel: 0,
      emots: {
        '[U脑过载]': { url: 'https://i0.hdslb.com/bfs/live/6528ebcab366a09c92c4c6bf2a16af1a088a9578.png', height: 60 }
      }
    }
  ];

  const sampleSC = {
    id: 99,
    type: 'superchat',
    user: { username: '富豪用户', face: 'https://i0.hdslb.com/bfs/face/member/noface.jpg' },
    message: '这是一条醒目留言 Super Chat，支持主播！',
    price: 30,
    startTime: Date.now(),
    endTime: Date.now() + 60000,
    duration: 60
  };

  // 生成平滑描边阴影
  const generateTextShadow = (strokeWidth, strokeColor, glowIntensity, shadowIntensity, enhanced) => {
    if (!enhanced) {
      return `
        ${strokeWidth}px 0 0 ${strokeColor},
        -${strokeWidth}px 0 0 ${strokeColor},
        0 ${strokeWidth}px 0 ${strokeColor},
        0 -${strokeWidth}px 0 ${strokeColor},
        0 ${shadowIntensity}px ${shadowIntensity}px rgba(0,0,0,0.5)
      `;
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

  // 构建样式对象
  const containerStyle = {
    '--username-font-family': settings.usernameFontFamily,
    '--username-font-size': `${settings.usernameFontSize}px`,
    '--username-font-weight': settings.usernameFontWeight,
    '--username-color': settings.usernameColor,
    '--username-color-guard1': settings.usernameColorGuard1,
    '--username-color-guard2': settings.usernameColorGuard2,
    '--username-color-guard3': settings.usernameColorGuard3,
    
    // 动态生成阴影
    '--username-text-shadow': generateTextShadow(
      settings.usernameStrokeWidth,
      settings.usernameStrokeColor,
      settings.usernameGlowIntensity,
      settings.usernameShadowIntensity,
      settings.usernameEnhancedStroke
    ),
    
    '--danmaku-font-family': settings.danmakuFontFamily,
    '--danmaku-font-size': `${settings.danmakuFontSize}px`,
    '--danmaku-font-weight': settings.danmakuFontWeight,
    '--danmaku-color': settings.danmakuColor,
    
    // 动态生成阴影
    '--danmaku-text-shadow': generateTextShadow(
      settings.danmakuStrokeWidth,
      settings.danmakuStrokeColor,
      settings.danmakuGlowIntensity,
      settings.danmakuShadowIntensity,
      settings.danmakuEnhancedStroke
    ),
    
    '--avatar-size': `${settings.avatarSize}px`,
    '--item-spacing': `${settings.itemSpacing}px`,
    '--emot-size': `${settings.emotSize || 28}px`,
  };

  // 渲染内容（简化版，不包含所有逻辑）
  const renderContent = (msg) => {
    if (msg.emots && Object.keys(msg.emots).length > 0) {
      const pattern = new RegExp(Object.keys(msg.emots).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
      
      // 如果没有匹配到任何表情，直接返回文本
      if (!pattern.test(msg.message)) {
        return msg.message;
      }
      
      // 重置 lastIndex
      pattern.lastIndex = 0;
      
      const parts = msg.message.split(pattern);
      const matches = msg.message.match(pattern) || [];
      
      const content = [];
      parts.forEach((part, i) => {
        if (part) content.push(part);
        if (i < matches.length) {
          const key = matches[i];
          if (msg.emots[key]) {
            const isLarge = msg.emots[key].height > 30;
            content.push(
              <img 
                key={i} 
                src={msg.emots[key].url} 
                className={`danmaku-emot ${isLarge ? 'emote-large' : ''}`}
                alt={key} 
                referrerPolicy="no-referrer"
                onError={(e) => { e.target.style.display = 'none'; }} // 图片加载失败隐藏
              />
            );
          } else {
            content.push(key);
          }
        }
      });
      
      return content.length > 0 ? content : msg.message;
    }
    return msg.message;
  };

  return (
    <div className="obs-preview-wrapper">
      <div 
        className="obs-preview-scale-container" 
        style={{ ...containerStyle, transform: `scale(${scale})` }}
        ref={containerRef}
      >
        {/* SC 倒计时栏模拟 */}
        <div className="sc-timer-bar">
        <div 
          className="sc-timer-capsule"
          style={{
            '--sc-bg': '#2a60b2',
            '--sc-bg-light': '#4275c4',
            '--progress': '70%'
          }}
        >
          <div className="sc-timer-avatar">
            <img src={sampleSC.user.face} alt="" referrerPolicy="no-referrer" />
          </div>
          <div className="sc-timer-price">CN¥{sampleSC.price}</div>
        </div>
      </div>

      <div className="danmaku-list has-sc-timer">
        {/* SC 消息 */}
        <div className="sc-item" style={{ '--sc-bg': '#2a60b2', '--sc-bg-light': '#4275c4' }}>
          <div className="sc-header">
            <div className="sc-avatar">
              <img src={sampleSC.user.face} alt="" referrerPolicy="no-referrer" />
            </div>
            <div className="sc-user-info">
              <div className="sc-username">{sampleSC.user.username}</div>
            </div>
            <div className="sc-price">CN¥{sampleSC.price}</div>
          </div>
          <div className="sc-content">
            {sampleSC.message}
          </div>
        </div>

        {/* 普通消息 */}
        {sampleMessages.map(msg => (
          <div key={msg.id} className="danmaku-item">
            <div className="avatar">
              <img src={msg.user.face} alt="" referrerPolicy="no-referrer" />
            </div>
            <div className="content-area">
              <div className="username-line">
                {msg.guardLevel > 0 && (
                  <img 
                    className="guard-icon"
                    src={
                      msg.guardLevel === 3 ? 'https://s1.hdslb.com/bfs/static/blive/live-pay-mono/relation/relation/assets/captain-Bjw5Byb5.png' :
                      msg.guardLevel === 2 ? 'https://s1.hdslb.com/bfs/static/blive/live-pay-mono/relation/relation/assets/supervisor-u43ElIjU.png' :
                      'https://s1.hdslb.com/bfs/static/blive/live-pay-mono/relation/relation/assets/governor-DpDXKEdA.png'
                    }
                    alt="guard"
                    referrerPolicy="no-referrer"
                  />
                )}
                <span className={`username guard-${msg.guardLevel}`}>
                  {msg.user.username}
                </span>
              </div>
              <div className="danmaku-text">
                {renderContent(msg)}
              </div>
            </div>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
};

export default ObsPreview;
