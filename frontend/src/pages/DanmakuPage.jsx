import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthStatus, logout } from '../services/api';
import './DanmakuPage.css';

function DanmakuPage() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [watchedCount, setWatchedCount] = useState(0);
  const [rankCount, setRankCount] = useState(0);
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    checkAuth();
    return () => {
      // 组件卸载时断开连接
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    // 自动滚动到底部
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkAuth = async () => {
    try {
      const result = await getAuthStatus();
      if (!result.success || !result.isLoggedIn) {
        navigate('/');
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      navigate('/');
    }
  };

  const connectRoom = () => {
    if (!roomId) {
      alert('请输入直播间号');
      return;
    }

    if (wsRef.current) {
      wsRef.current.close();
    }

    // 连接WebSocket
    const ws = new WebSocket(`ws://localhost:3001/ws/danmaku?roomId=${roomId}`);
    
    ws.onopen = () => {
      console.log('WebSocket连接成功');
      setConnected(true);
      addSystemMessage('已连接到直播间');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleMessage(data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket错误:', error);
      addSystemMessage('连接错误', 'error');
    };

    ws.onclose = () => {
      console.log('WebSocket连接关闭');
      setConnected(false);
      addSystemMessage('已断开连接');
    };

    wsRef.current = ws;
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  };

  const handleMessage = (data) => {
    switch (data.type) {
      case 'danmaku':
      case 'gift':
      case 'guard':
      case 'welcome':
      case 'superchat':
      case 'entry_effect':
        addMessage(data);
        break;
      case 'watched':
        setWatchedCount(data.num || 0);
        break;
      case 'rank_count':
        setRankCount(data.count || 0);
        break;
      case 'system':
        addSystemMessage(data.message);
        break;
      case 'error':
        addSystemMessage(data.message, 'error');
        break;
    }
  };

  const addMessage = (data) => {
    // 添加详细日志
    if (data.type === 'danmaku') {
      console.log('🔍 收到弹幕消息:', {
        user: data.user?.username,
        uid: data.user?.uid,
        face: data.user?.face,
        content: data.content,
        emots: data.emots,
        emotKeys: data.emots ? Object.keys(data.emots) : []
      });
    }
    
    const msg = {
      id: Date.now() + Math.random(),
      ...data,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev.slice(-199), msg]); // 保留最新200条
  };

  const addSystemMessage = (content, level = 'info') => {
    const msg = {
      id: Date.now() + Math.random(),
      type: 'system',
      content,
      level,
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev.slice(-199), msg]);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('退出登录失败:', error);
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  // 渲染带表情的内容
  const renderContentWithEmoji = (content, emots) => {
    console.log('📄 renderContentWithEmoji called:', { content, emots });
    
    if (!emots || Object.keys(emots).length === 0) {
      console.log('  ⚠️  没有表情信息');
      return content;
    }
    
    console.log('  ✅ 找到表情:', Object.keys(emots));
    
    const parts = [];
    let currentText = content;
    let key = 0;
    
    // 找出所有表情的位置
    const emotPositions = [];
    Object.entries(emots).forEach(([emotText, emotInfo]) => {
      let pos = 0;
      while ((pos = currentText.indexOf(emotText, pos)) !== -1) {
        emotPositions.push({
          start: pos,
          end: pos + emotText.length,
          text: emotText,
          info: emotInfo
        });
        pos += emotText.length;
      }
    });
    
    // 按位置排序
    emotPositions.sort((a, b) => a.start - b.start);
    
    // 构建最终内容
    let lastEnd = 0;
    emotPositions.forEach((emot) => {
      // 避免重叠
      if (emot.start < lastEnd) return;
      
      // 添加表情前的文本
      if (emot.start > lastEnd) {
        parts.push(currentText.substring(lastEnd, emot.start));
      }
      
      // 添加表情图片
      // 根据表情类型判断是否限制高度：
      // - B站小表情（如[dog]、[大笑]、[吃瓜]、[妙]、[热]）：height <= 30，限制为单行
      // - 大表情（如[乐]、[摆]）：height > 30，保持原大小
      // - 房间表情包（[[xxx]]）：不限制
      const isRoomEmoji = emot.text.startsWith('[[');
      const isSmallBiliEmoji = emot.info.height <= 30;  // B站小表情
      const shouldLimit = !isRoomEmoji && isSmallBiliEmoji;
      
      parts.push(
        <img 
          key={`emot-${key++}`}
          src={emot.info.url} 
          alt={emot.text}
          title={emot.text}
          referrerPolicy="no-referrer"
          style={{
            height: shouldLimit ? '1.2em' : 'auto',
            maxWidth: shouldLimit ? 'auto' : '60px',
            maxHeight: shouldLimit ? '1.2em' : '60px',
            width: 'auto',
            verticalAlign: 'middle',
            display: 'inline-block',
            margin: '0 2px'
          }}
          onError={(e) => {
            // 图片加载失败时显示原文本
            e.target.style.display = 'none';
            e.target.insertAdjacentText('afterend', emot.text);
          }}
        />
      );
      
      lastEnd = emot.end;
    });
    
    // 添加剩余文本
    if (lastEnd < currentText.length) {
      parts.push(currentText.substring(lastEnd));
    }
    
    return parts.length > 0 ? parts : content;
  };

  // 渲染单条消息
  const renderMessageItem = (msg) => {
    if (!msg) return null;

    return (
      <div key={msg.id} className={`message message-${msg.type}`}>
        {renderMessageContent(msg)}
      </div>
    );
  };

  // 渲染消息内容
  const renderMessageContent = (msg) => {
    // 定义大航海相关常量（在 switch 外部，避免重复声明）
    const guardNames = { 1: '总督', 2: '提督', 3: '舰长' };
    const guardColors = { 1: '#ff6699', 2: '#9b39f4', 3: '#00d7ff' };
    
    switch (msg.type) {
      case 'danmaku': {
        const guardLevel = msg.user?.guardLevel || 0;
        const hasMedal = !!msg.medal;
        
        // 根据大航海等级和粉丝牌设置底色
        let backgroundColor = 'transparent';
        if (guardLevel === 1) {
          // 总督 - 粉色底
          backgroundColor = 'rgba(255, 102, 153, 0.08)';
        } else if (guardLevel === 2) {
          // 提督 - 紫色底
          backgroundColor = 'rgba(155, 57, 244, 0.08)';
        } else if (guardLevel === 3) {
          // 舰长 - 蓝色底
          backgroundColor = 'rgba(31, 163, 241, 0.08)';
        } else if (hasMedal) {
          // 有粉丝牌但非大航海 - 淡蓝色底
          backgroundColor = 'rgba(63, 180, 246, 0.05)';
        }
        
        return (
          <div style={{
            backgroundColor,
            padding: backgroundColor !== 'transparent' ? '4px 8px' : '0',
            borderRadius: '4px',
            marginLeft: '-8px',
            marginRight: '-8px'
          }}>
            {/* 用户头像 */}
            {msg.user?.face && (
              <img 
                src={msg.user.face}
                alt={msg.user.username}
                referrerPolicy="no-referrer"
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  marginRight: '8px',
                  verticalAlign: 'middle',
                  objectFit: 'cover',
                  border: '1px solid #e1e8ed',
                  flexShrink: 0
                }}
                onError={(e) => {
                  // 头像加载失败时隐藏
                  e.target.style.display = 'none';
                }}
              />
            )}
            {msg.medal && (
              <span 
                style={{
                  display: 'inline-flex',
                  alignItems: 'stretch',
                  marginRight: '4px',
                  verticalAlign: 'middle',
                  height: '18px',
                  borderRadius: '9px',
                  overflow: 'hidden',
                  border: '1px solid rgba(63, 180, 246, 0.4)',
                  boxShadow: 'none'
                }}>
                {/* 粉丝牌主体 - 名称部分 */}
                <span 
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    backgroundImage: 'linear-gradient(45deg, rgba(63, 180, 246, 0.6), rgba(63, 180, 246, 0.6))',
                    padding: '0 5px',
                    fontSize: '12px',
                    lineHeight: '1',
                    color: '#FFFFFF',
                    fontWeight: '400',
                    position: 'relative'
                  }}>
                  {/* 大航海图标 */}
                  {guardLevel > 0 && (
                    <span 
                      style={{
                        display: 'inline-block',
                        width: '12px',
                        height: '12px',
                        marginRight: '2px',
                        borderRadius: '50%',
                        background: 'white',
                        border: '1.5px solid ' + (
                          guardLevel === 3 
                            ? '#1fa3f1'
                            : guardLevel === 2
                            ? '#9b39f4'
                            : '#ff6699'
                        ),
                        fontSize: '7px',
                        lineHeight: '9px',
                        textAlign: 'center',
                        flexShrink: 0,
                        color: guardLevel === 3 
                          ? '#1fa3f1'
                          : guardLevel === 2
                          ? '#9b39f4'
                          : '#ff6699'
                      }}
                      title={guardNames[guardLevel]}>
                      ⚓
                    </span>
                  )}
                  <span style={{ whiteSpace: 'nowrap' }}>{msg.medal.name}</span>
                </span>
                {/* 粉丝牌等级部分 */}
                <span 
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundImage: 'linear-gradient(45deg, rgba(63, 180, 246, 0.7), rgba(63, 180, 246, 0.7))',
                    padding: '0 4px',
                    minWidth: '18px',
                    fontSize: '12px',
                    lineHeight: '1',
                    color: '#FFFFFF',
                    fontWeight: '400'
                  }}>
                  {msg.medal.level}
                </span>
              </span>
            )}
            <span style={{
              fontWeight: '400',
              color: '#61666d',
              marginRight: '0'
            }}>
              {msg.user?.username || '未知用户'} : 
            </span>
            <span style={{ 
              color: '#18191c',
              wordBreak: 'break-all'
            }}>
              {renderContentWithEmoji(msg.content, msg.emots)}
            </span>
          </div>
        );
      }

      case 'superchat':
        return (
          <div style={{
            backgroundColor: msg.backgroundColor || '#f97316',
            padding: '8px',
            borderRadius: '4px',
            marginTop: '4px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {msg.user?.face && (
                <img src={msg.user.face} alt="" style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%'
                }} />
              )}
              <span className="username" style={{ fontWeight: 'bold' }}>
                {msg.user?.username}
              </span>
              <span style={{ 
                marginLeft: 'auto', 
                color: '#ffd700', 
                fontWeight: 'bold',
                fontSize: '14px'
              }}>
                ¥{msg.price}
              </span>
            </div>
            <div style={{ color: 'white', marginTop: '4px' }}>{msg.message}</div>
          </div>
        );

      case 'like':
        return (
          <span style={{ color: '#ff69b4' }}>
            ❤️ {msg.user?.username} {msg.likeText || '点赞了'}
          </span>
        );

      case 'gift':
        return (
          <>
            <span>🎁 {msg.user?.username}</span>
            <span className="content"> 赠送了 {msg.num} 个 {msg.giftName}</span>
          </>
        );

      case 'guard':
        return (
          <>
            <span>⚓ {msg.user?.username}</span>
            <span className="content"> 开通了 {guardNames[msg.guardLevel]}</span>
          </>
        );

      case 'welcome': {
        const actions = { 1: '进入', 2: '关注', 3: '分享' };
        const username = msg.user?.username || msg.username || '用户';
        const action = actions[msg.msgType] || '进入';
        return (
          <>
            <span>👋 {username}</span>
            <span className="content"> {action}了直播间</span>
          </>
        );
      }
        
      case 'entry_effect':
        return (
          <span style={{ color: '#ffa500' }}>
            ✨ {msg.user?.username} 进场
          </span>
        );

      case 'system':
        return <span className={`system-msg ${msg.level}`}>{msg.content}</span>;

      default:
        return <span className="content">{JSON.stringify(msg)}</span>;
    }
  };

  return (
    <div className="danmaku-page">
      <div className="danmaku-header">
        <h1>🎬 直播间弹幕</h1>
        <button onClick={handleLogout} className="logout-btn">退出登录</button>
      </div>

      <div className="control-panel">
        <div className="room-input">
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="输入直播间号 (例如: 22603245)"
            disabled={connected}
          />
          {!connected ? (
            <button onClick={connectRoom} className="connect-btn">
              连接
            </button>
          ) : (
            <button onClick={disconnect} className="disconnect-btn">
              断开
            </button>
          )}
        </div>

        <div className="info-bar">
          <span className={`status ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? '● 已连接' : '○ 未连接'}
          </span>
          {connected && (
            <>
              {watchedCount > 0 && (
                <span className="watched">
                  👁️ {watchedCount.toLocaleString()}人看过
                </span>
              )}
              {rankCount > 0 && (
                <span className="rank">
                  🔥 高能榜: {rankCount.toLocaleString()}人
                </span>
              )}
            </>
          )}
          <button onClick={clearMessages} className="clear-btn">
            清空消息
          </button>
        </div>
      </div>

      <div className="messages-container">
        {messages.map((msg) => renderMessageItem(msg))}
        <div ref={messagesEndRef} />
      </div>

      <div className="tips">
        <p>💡 提示:</p>
        <ul>
          <li>输入直播间号后点击"连接"开始接收弹幕</li>
          <li>支持显示普通弹幕、礼物、上舰、进房等消息</li>
          <li>消息会自动滚动，最多保留200条</li>
        </ul>
      </div>
    </div>
  );
}

export default DanmakuPage;
