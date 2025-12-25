import { useState, useEffect, useRef } from 'react';
import './ObsDanmakuPage.css';

const ObsDanmakuPage = () => {
  // 立即同步加载样式设置，避免第一条消息显示异常
  const initialSettings = (() => {
    const saved = localStorage.getItem('obsSettings');
    console.log('🔍 OBS页面加载设置:', saved);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        console.log('✅ 解析后的设置:', parsed);
        return parsed;
      } catch (e) {
        console.error('❌ 设置解析失败:', e);
        return null;
      }
    }
    console.warn('⚠️ 未找到保存的设置，将使用默认样式');
    return null;
  })();
  
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [customStyles] = useState(initialSettings);
  const [activeSCs, setActiveSCs] = useState([]); // 活跃的SC列表（倒计时中）
  const messagesContainerRef = useRef(null);
  const wsRef = useRef(null);
  const isClosingRef = useRef(false);
  
  // 检测是否开启测试模式（URL包含 ?test=true）
  const params = new URLSearchParams(window.location.search);
  const testMode = params.get('test') === 'true';

  // 动态应用样式（移除加载样式的useEffect，因为已经在初始化时同步加载）
  useEffect(() => {
    console.log('🎨 应用样式到CSS变量:', customStyles);
    if (customStyles) {
      const root = document.documentElement;
      // 所有样式都需要设置，因为气泡样式也使用了部分CSS变量
      root.style.setProperty('--username-font-family', customStyles.usernameFontFamily);
      root.style.setProperty('--username-font-size', `${customStyles.usernameFontSize}px`);
      root.style.setProperty('--username-font-weight', customStyles.usernameFontWeight);
      root.style.setProperty('--username-color', customStyles.usernameColor);
      root.style.setProperty('--username-color-guard1', customStyles.usernameColorGuard1 || '#ff1a75');
      root.style.setProperty('--username-color-guard2', customStyles.usernameColorGuard2 || '#9b39f4');
      root.style.setProperty('--username-color-guard3', customStyles.usernameColorGuard3 || '#1fa3f1');
      root.style.setProperty('--username-stroke-width', `${customStyles.usernameStrokeWidth}px`);
      root.style.setProperty('--username-stroke-width-neg', `-${customStyles.usernameStrokeWidth}px`);
      root.style.setProperty('--username-stroke-color', customStyles.usernameStrokeColor);
      root.style.setProperty('--username-enhanced-stroke', customStyles.usernameEnhancedStroke !== false ? '1' : '0');
      root.style.setProperty('--username-glow-intensity', `${customStyles.usernameGlowIntensity || 8}px`);
      root.style.setProperty('--username-shadow-intensity', `${customStyles.usernameShadowIntensity || 6}px`);
      root.style.setProperty('--danmaku-font-family', customStyles.danmakuFontFamily);
      root.style.setProperty('--danmaku-font-size', `${customStyles.danmakuFontSize}px`);
      root.style.setProperty('--danmaku-font-weight', customStyles.danmakuFontWeight);
      root.style.setProperty('--danmaku-color', customStyles.danmakuColor);
      root.style.setProperty('--danmaku-stroke-width', `${customStyles.danmakuStrokeWidth}px`);
      root.style.setProperty('--danmaku-stroke-width-neg', `-${customStyles.danmakuStrokeWidth}px`);
      root.style.setProperty('--danmaku-stroke-color', customStyles.danmakuStrokeColor);
      root.style.setProperty('--danmaku-enhanced-stroke', customStyles.danmakuEnhancedStroke !== false ? '1' : '0');
      root.style.setProperty('--danmaku-glow-intensity', `${customStyles.danmakuGlowIntensity || 8}px`);
      root.style.setProperty('--danmaku-shadow-intensity', `${customStyles.danmakuShadowIntensity || 6}px`);
      root.style.setProperty('--avatar-size', `${customStyles.avatarSize}px`);
      root.style.setProperty('--item-spacing', `${customStyles.itemSpacing}px`);
      root.style.setProperty('--emot-size', `${customStyles.emotSize || 28}px`);
      console.log('✅ CSS变量应用完成');
    } else {
      console.warn('⚠️ 没有自定义样式，将使用默认CSS样式');
    }
  }, [customStyles]);

  // 自动滚动到底部
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 活跃SC倒计时更新
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSCs(prev => {
        const now = Date.now();
        // 过滤掉已过期的SC
        return prev.filter(sc => sc.endTime > now);
      });
    }, 1000); // 每秒更新一次

    return () => clearInterval(timer);
  }, []);

  // 格式化倒计时显示
  const formatTime = (seconds) => {
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours}:${mins.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    } else if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      return `${mins}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  };

  // WebSocket连接
  useEffect(() => {
    // 防止重复连接
    if (wsRef.current) {
      console.log('⚠️ WebSocket 已存在，跳过创建');
      return;
    }
    
    // 从URL参数或localStorage获取房间号
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('room') || localStorage.getItem('obsRoomId') || '1017';

    // 动态构建WebSocket URL，支持局域网访问
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host; // 包含域名和端口 (如 localhost:5173 或 192.168.1.x:3000)
    const wsUrl = `${protocol}//${host}/ws/danmaku?roomId=${roomId}`;
    
    console.log('🔌 创建 WebSocket 连接 [实例ID:', Date.now() + ']:', wsUrl);
    const websocket = new WebSocket(wsUrl);
    wsRef.current = websocket;
    isClosingRef.current = false;

    websocket.onopen = () => {
      console.log('✅ WebSocket 已连接');
      setConnected(true);
      setError(null);
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'danmaku' || data.type === 'superchat') {
          setMessages(prev => {
            // 生成唯一指纹用于去重
            const fingerprint = data.type === 'danmaku' 
              ? `${data.timestamp}-${data.user?.uid}-${data.content}`
              : `${data.time}-${data.user?.uid}-${data.price}`;
            
            // 检查最近的消息中是否已存在相同指纹
            const isDuplicate = prev.slice(-20).some(msg => {
              const msgFingerprint = msg.type === 'danmaku'
                ? `${msg.timestamp}-${msg.user?.uid}-${msg.content}`
                : `${msg.time}-${msg.user?.uid}-${msg.price}`;
              return msgFingerprint === fingerprint;
            });

            if (isDuplicate) {
              console.log('⚠️ 忽略重复消息:', fingerprint);
              return prev;
            }

            const newMessages = [...prev, {
              id: Date.now() + Math.random(),
              ...data
            }].slice(-50);
            return newMessages;
          });
          
          // 如果是SC，添加到活跃SC列表
          if (data.type === 'superchat') {
            const duration = getSCDuration(data.price);
            const newSC = {
              id: Date.now() + Math.random(),
              user: data.user,
              price: data.price,
              startTime: Date.now(),
              endTime: Date.now() + duration * 1000,
              duration: duration
            };
            setActiveSCs(prev => [...prev, newSC]);
          }
        }
      } catch (error) {
        console.error('❌ 消息解析失败:', error);
      }
    };

    websocket.onerror = (error) => {
      console.error('❌ WebSocket 错误:', error);
      setError('WebSocket 连接错误');
      setConnected(false);
    };

    websocket.onclose = () => {
      console.log('🔌 WebSocket 已断开');
      setConnected(false);
      wsRef.current = null;
      if (!isClosingRef.current) {
        setTimeout(() => {
          console.log('🔄 准备重新连接...');
          window.location.reload();
        }, 5000);
      }
    };

    return () => {
      console.log('🧹 清理 WebSocket 连接');
      isClosingRef.current = true;
      if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
        wsRef.current.close();
      }
      wsRef.current = null;
    };
  }, []);

  // 处理表情包
  const renderContentWithEmoji = (content, emots) => {
    if (!emots || Object.keys(emots).length === 0) {
      return content;
    }

    const emotMatches = [];
    Object.keys(emots).forEach(emotText => {
      let index = content.indexOf(emotText);
      while (index !== -1) {
        emotMatches.push({
          text: emotText,
          start: index,
          end: index + emotText.length,
          info: emots[emotText]
        });
        index = content.indexOf(emotText, index + 1);
      }
    });

    if (emotMatches.length === 0) {
      return content;
    }

    emotMatches.sort((a, b) => a.start - b.start);

    const parts = [];
    let lastEnd = 0;
    let key = 0;

    emotMatches.forEach(emot => {
      if (emot.start >= lastEnd) {
        if (emot.start > lastEnd) {
          parts.push(content.substring(lastEnd, emot.start));
        }

        const textContent = emot.text.replace(/[\[\]]/g, '');
        const isRoomEmoji = emot.text.startsWith('[[');
        const isSmallBiliEmoji = emot.info.height <= 30;
        const shouldLimit = !isRoomEmoji && isSmallBiliEmoji;

        parts.push(
          <img 
            key={`emot-${key++}`}
            src={emot.info.url} 
            alt={emot.text}
            title={emot.text}
            referrerPolicy="no-referrer"
            className={shouldLimit ? 'emote emote-small' : 'emote emote-large'}
          />
        );

        lastEnd = emot.end;
      }
    });

    if (lastEnd < content.length) {
      parts.push(content.substring(lastEnd));
    }

    return parts.length > 0 ? parts : content;
  };

  // 判断是否只有大表情
  const hasOnlyEmotes = (content, emots) => {
    if (!emots) return false;
    
    let textOnly = content;
    Object.keys(emots).forEach(emotText => {
      textOnly = textOnly.replace(new RegExp(emotText.replace(/[[\]]/g, '\\$&'), 'g'), '');
    });
    
    return textOnly.trim().length === 0;
  };

  // 根据SC金额获取颜色
  const getSCColor = (price) => {
    // 特殊金额紫色配色（优先级最高）
    if (price === 77777) return { bg: '#7e00a8', bgLight: '#9510c2' }; // 最深紫色
    if (price === 17777) return { bg: '#900bbd', bgLight: '#a825d1' }; // 深紫色
    if (price === 7777) return { bg: '#b645da', bgLight: '#c860e6' }; // 中深紫色
    if (price === 777) return { bg: '#d280f0', bgLight: '#dd99f4' }; // 中浅紫色
    if (price === 177) return { bg: '#ebb8fc', bgLight: '#f2cafd' }; // 浅紫色
    if (price === 77) return { bg: '#f5d4ff', bgLight: '#fae5ff' }; // 最浅紫色
    
    // 常规金额配色
    if (price >= 2000) return { bg: '#ab1a32', bgLight: '#c42a42' }; // 深红色
    if (price >= 1000) return { bg: '#e54d4d', bgLight: '#ed6565' }; // 红色
    if (price >= 500) return { bg: '#e09443', bgLight: '#e8a75c' }; // 橙色
    if (price >= 100) return { bg: '#e2b52b', bgLight: '#eac043' }; // 黄色
    if (price >= 50) return { bg: '#427d9e', bgLight: '#5a93b5' }; // 浅蓝色
    return { bg: '#2a60b2', bgLight: '#4275c4' }; // 蓝色（30元以下）
  };

  // 根据SC金额获取CD时长（秒）
  const getSCDuration = (price) => {
    if (price >= 2000) return 7200; // 2小时
    if (price >= 1000) return 3600; // 1小时
    if (price >= 500) return 1800; // 30分钟
    if (price >= 100) return 300; // 5分钟
    if (price >= 50) return 120; // 2分钟
    return 60; // 60秒
  };

  // 测试SC功能
  const sendTestSC = () => {
    const testAmounts = [30, 50, 77, 100, 177, 500, 777, 1000, 2000, 7777, 17777, 77777];
    const testMessages = [
      '测试SC消息',
      '这是一条测试的醒目留言',
      '支持主播！',
      '来看看效果怎么样',
      '紫色主题真好看',
      '感谢分享',
      'Test Super Chat',
      '666666',
      '测试一下特殊金额'
    ];
    
    const amount = testAmounts[Math.floor(Math.random() * testAmounts.length)];
    const message = testMessages[Math.floor(Math.random() * testMessages.length)];
    
    const testSC = {
      id: Date.now() + Math.random(),
      type: 'superchat',
      user: {
        uid: 123456,
        username: '测试用户' + Math.floor(Math.random() * 100),
        face: `https://i2.hdslb.com/bfs/face/member/noface.jpg`
      },
      message: message,
      price: amount,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, testSC].slice(-50));
    
    // 添加到活跃SC列表
    const duration = getSCDuration(amount);
    const newSC = {
      id: testSC.id,
      user: testSC.user,
      price: amount,
      startTime: Date.now(),
      endTime: Date.now() + duration * 1000,
      duration: duration
    };
    setActiveSCs(prev => [...prev, newSC]);
  };

  return (
    // 简洁样式
    <div className={`obs-danmaku-simple ${activeSCs.length > 0 ? 'has-sc-timer' : ''}`}>
      {/* SC倒计时栏 */}
      {activeSCs.length > 0 && (
        <div className="sc-timer-bar">
          {activeSCs.map(sc => {
            const now = Date.now();
            const elapsed = now - sc.startTime;
            const remaining = Math.max(0, Math.ceil((sc.endTime - now) / 1000));
            const progress = Math.min(100, (elapsed / (sc.duration * 1000)) * 100);
            const colors = getSCColor(sc.price);
            
            return (
              <div 
                key={sc.id} 
                className="sc-timer-capsule"
                style={{
                  '--sc-bg': colors.bg,
                  '--sc-bg-light': colors.bgLight,
                  '--progress': `${progress}%`
                }}
              >
                <div className="sc-timer-avatar">
                  <img src={sc.user.face} alt="" />
                </div>
                <div className="sc-timer-price">CN¥{sc.price}</div>
              </div>
            );
          })}
        </div>
      )}
      
      {testMode && (
        <button 
          onClick={sendTestSC}
          style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            zIndex: 9999,
            padding: '10px 20px',
            background: '#8a2be2',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}
        >
          测试SC
        </button>
      )}
      <div className="danmaku-list" ref={messagesContainerRef}>
        {messages.map(msg => {
          const guardLevel = msg.user?.guardLevel || 0;
          
          // SC消息特殊处理
          if (msg.type === 'superchat') {
            const colors = getSCColor(msg.price);
            return (
              <div key={msg.id} className="sc-item" style={{ '--sc-bg': colors.bg, '--sc-bg-light': colors.bgLight }}>
                <div className="sc-header">
                  <div className="sc-avatar">
                    <img 
                      src={msg.user?.face || 'https://i0.hdslb.com/bfs/face/member/noface.jpg'}
                      alt={msg.user?.username}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="sc-user-info">
                    <div className="sc-username">{msg.user?.username || '未知用户'}</div>
                  </div>
                  <div className="sc-price">CN¥{msg.price}</div>
                </div>
                <div className="sc-content">
                  {msg.message}
                </div>
              </div>
            );
          }
          
          // 普通弹幕
          return (
            <div key={msg.id} className="danmaku-item">
              <div className="avatar">
                <img 
                  src={msg.user?.face || 'https://i0.hdslb.com/bfs/face/member/noface.jpg'}
                  alt={msg.user?.username}
                  referrerPolicy="no-referrer"
                />
              </div>
              
              <div className="content-area">
                <div className="username-line">
                  {guardLevel > 0 && (
                    <img 
                      src={
                        guardLevel === 3 
                          ? 'https://s1.hdslb.com/bfs/static/blive/live-pay-mono/relation/relation/assets/captain-Bjw5Byb5.png'
                          : guardLevel === 2
                          ? 'https://s1.hdslb.com/bfs/static/blive/live-pay-mono/relation/relation/assets/supervisor-u43ElIjU.png'
                          : 'https://s1.hdslb.com/bfs/static/blive/live-pay-mono/relation/relation/assets/governor-DpDXKEdA.png'
                      }
                      alt={`guard-${guardLevel}`}
                      className="guard-icon"
                    />
                  )}
                  <span className={`username ${guardLevel > 0 ? `guard-${guardLevel}` : ''}`}>
                    {msg.user?.username || '未知用户'}
                  </span>
                </div>
                <div className="danmaku-text">
                  {renderContentWithEmoji(msg.content, msg.emots)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ObsDanmakuPage;
