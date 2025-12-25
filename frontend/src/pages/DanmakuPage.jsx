import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import NumberFlow from '@number-flow/react';
import { getAuthStatus, logout, getHistorySessions, getHistoryData } from '../services/api';
import './DanmakuPage.css';

function DanmakuPage() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');
  const [connected, setConnected] = useState(false);
  
  // History Mode State
  const [isHistoryMode, setIsHistoryMode] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historySessions, setHistorySessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  // Lists for different columns
  const [danmakuList, setDanmakuList] = useState([]);
  const [scList, setScList] = useState([]);
  const [giftList, setGiftList] = useState([]);
  
  // Stats
  const [watchedCount, setWatchedCount] = useState(0);
  const [rankCount, setRankCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [anchorName, setAnchorName] = useState('Loading...');
  const [anchorFace, setAnchorFace] = useState('');
  const [guardCount, setGuardCount] = useState(0);
  const [fansClubCount, setFansClubCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  
  // Live Status
  const [liveStatus, setLiveStatus] = useState(0); // 0: Offline, 1: Live, 2: Round
  const [liveStartTime, setLiveStartTime] = useState(0);
  const [liveDuration, setLiveDuration] = useState('00:00:00');
  
  // Scroll State
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNewMsgButton, setShowNewMsgButton] = useState(false);

  // SC & Gift Scroll State
  const [isScAutoScroll, setIsScAutoScroll] = useState(true);
  const [isGiftAutoScroll, setIsGiftAutoScroll] = useState(true);
  
  const wsRef = useRef(null);
  const danmakuListRef = useRef(null); // Ref for the scroll container
  const scListRef = useRef(null);
  const giftListRef = useRef(null);
  const danmakuEndRef = useRef(null);
  const scEndRef = useRef(null);
  const giftEndRef = useRef(null);

  useEffect(() => {
    checkAuth();
    const savedRoomId = localStorage.getItem('lastRoomId');
    if (savedRoomId) {
      setRoomId(savedRoomId);
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Live Duration Timer
  useEffect(() => {
    let timer;
    if (liveStatus === 1 && liveStartTime > 0) {
      const updateDuration = () => {
        const now = Math.floor(Date.now() / 1000);
        const diff = now - liveStartTime;
        if (diff >= 0) {
          const hours = Math.floor(diff / 3600);
          const minutes = Math.floor((diff % 3600) / 60);
          const seconds = diff % 60;
          setLiveDuration(
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
          );
        }
      };
      
      updateDuration(); // Initial update
      timer = setInterval(updateDuration, 1000);
    } else {
      setLiveDuration('00:00:00');
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [liveStatus, liveStartTime]);

  // Auto-scroll effects
  useEffect(() => {
    if (isAutoScroll) {
      if (danmakuEndRef.current) {
        // Use 'auto' behavior for instant scrolling to prevent lag with high message volume
        danmakuEndRef.current.scrollIntoView({ behavior: 'auto' });
      }
    } else {
      setUnreadCount(prev => prev + 1);
      setShowNewMsgButton(true);
    }
  }, [danmakuList]);

  // Handle scroll event
  const handleScroll = (e) => {
    if (!danmakuListRef.current) return;
    
    // Only check for manual scroll if it's a user-initiated scroll event
    // We can infer this if the scroll happened while auto-scroll was ON, 
    // but we are now NOT at the bottom.
    
    const { scrollTop, scrollHeight, clientHeight } = danmakuListRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    // If user manually scrolls up (deltaY < 0 usually, but here we check position)
    // We need to be careful not to disable auto-scroll just because a new message arrived 
    // and pushed the bottom down before the auto-scroll effect ran.
    
    // Strategy: Only disable auto-scroll if the user is significantly far from bottom
    // AND we are not currently in the process of auto-scrolling (which is hard to track perfectly in React state).
    // A better approach for "manual only":
    // Use the `onWheel` or `onTouchMove` events to detect user interaction.
  };

  // Detect manual user interaction to pause auto-scroll
  const handleUserScrollInteraction = () => {
    const { scrollTop, scrollHeight, clientHeight } = danmakuListRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    if (!isAtBottom) {
      setIsAutoScroll(false);
    }
  };

  // Re-enable auto-scroll if user scrolls back to bottom manually
  const handleScrollCheck = () => {
     if (!danmakuListRef.current) return;
     const { scrollTop, scrollHeight, clientHeight } = danmakuListRef.current;
     const isAtBottom = scrollHeight - scrollTop - clientHeight < 20;
     
     if (isAtBottom) {
       setIsAutoScroll(true);
       setUnreadCount(0);
       setShowNewMsgButton(false);
     }
  };

  // SC Scroll Handlers
  const handleScUserScrollInteraction = () => {
    if (!scListRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scListRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    if (!isAtBottom) setIsScAutoScroll(false);
  };

  const handleScScrollCheck = () => {
    if (!scListRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scListRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 20;
    if (isAtBottom) setIsScAutoScroll(true);
  };

  // Gift Scroll Handlers
  const handleGiftUserScrollInteraction = () => {
    if (!giftListRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = giftListRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    if (!isAtBottom) setIsGiftAutoScroll(false);
  };

  const handleGiftScrollCheck = () => {
    if (!giftListRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = giftListRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 20;
    if (isAtBottom) setIsGiftAutoScroll(true);
  };

  // Scroll to bottom manually
  const scrollToBottom = () => {
    setIsAutoScroll(true);
    setUnreadCount(0);
    setShowNewMsgButton(false);
    if (danmakuEndRef.current) {
      danmakuEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  };

  useEffect(() => {
    if (isScAutoScroll && scEndRef.current) {
      scEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [scList, isScAutoScroll]);

  useEffect(() => {
    if (isGiftAutoScroll && giftEndRef.current) {
      giftEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [giftList, isGiftAutoScroll]);

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

  // Auto-connect if roomId is in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRoomId = params.get('roomId');
    
    if (urlRoomId) {
      setRoomId(urlRoomId);
      connectRoom(urlRoomId);
    }
    // If no roomId in URL, do nothing (show empty frame)
  }, []);

  const connectRoom = (targetRoomId) => {
    const idToUse = targetRoomId || roomId;
    if (!idToUse) {
      alert('请输入直播间号');
      return;
    }

    localStorage.setItem('lastRoomId', idToUse);

    if (wsRef.current) {
      wsRef.current.close();
    }

    // Use window.location.hostname to allow connection from other devices on the same network
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host; // Includes port if present
    const ws = new WebSocket(`${wsProtocol}//${wsHost}/ws/danmaku?roomId=${idToUse}`);
    
    ws.onopen = () => {
      console.log('WebSocket连接成功');
      setConnected(true);
      // Clear lists on new connection
      setDanmakuList([]);
      setScList([]);
      setGiftList([]);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleMessage(data);
      } catch (e) {
        console.error('Parse error', e);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket错误:', error);
      setConnected(false);
    };

    ws.onclose = () => {
      console.log('WebSocket连接关闭');
      setConnected(false);
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

  // History Functions
  const openHistoryModal = async () => {
    if (!roomId) return;
    try {
      const data = await getHistorySessions(roomId);
      if (data.success) {
        setHistorySessions(data.sessions);
        setShowHistoryModal(true);
      }
    } catch (error) {
      console.error('Failed to fetch history sessions:', error);
      alert('获取历史记录失败');
    }
  };

  const loadHistorySession = async (sessionId) => {
    try {
      // 1. Disconnect live connection
      disconnect();
      setIsHistoryMode(true);
      setCurrentSessionId(sessionId);
      setShowHistoryModal(false);
      
      // 2. Clear current lists
      setDanmakuList([]);
      setScList([]);
      setGiftList([]);
      
      // 3. Fetch history data
      const response = await getHistoryData(roomId, sessionId);
      if (response.success) {
        const { danmaku, superchat, gift, guard } = response.data;
        
        // Process and set data
        const historyDanmaku = (danmaku || []).map(item => ({ ...item, id: item.id || Date.now() + Math.random() }));
        const historySc = (superchat || []).map(item => ({ ...item, id: item.id || Date.now() + Math.random() }));
        const historyGift = (gift || []).map(item => ({ ...item, id: item.id || Date.now() + Math.random() }));
        const historyGuard = (guard || []).map(item => ({ ...item, id: item.id || Date.now() + Math.random() }));

        setDanmakuList(historyDanmaku); // Load all history, not just last 200
        setScList(historySc);
        
        // Merge gifts and guards
        const combinedGifts = [...historyGift, ...historyGuard].sort((a, b) => {
          const timeA = a.timestamp || 0;
          const timeB = b.timestamp || 0;
          return timeA - timeB;
        });
        setGiftList(combinedGifts);
        
        // Scroll to bottom after loading
        setTimeout(() => {
            if (danmakuEndRef.current) danmakuEndRef.current.scrollIntoView();
            if (scEndRef.current) scEndRef.current.scrollIntoView();
            if (giftEndRef.current) giftEndRef.current.scrollIntoView();
        }, 100);
      }
    } catch (error) {
      console.error('Failed to load history data:', error);
      alert('加载历史数据失败');
      returnToLive();
    }
  };

  const returnToLive = () => {
    setIsHistoryMode(false);
    setCurrentSessionId(null);
    setDanmakuList([]);
    setScList([]);
    setGiftList([]);
    connectRoom(roomId);
  };

  const handleMessage = (data) => {
    const msg = { ...data, id: Date.now() + Math.random() };
    
    // 辅助函数：检查重复
    const isDuplicate = (list, newItem, type) => {
      const fingerprint = type === 'danmaku' 
        ? `${newItem.timestamp}-${newItem.user?.uid}-${newItem.content}`
        : type === 'superchat'
        ? `${newItem.time}-${newItem.user?.uid}-${newItem.price}`
        : type === 'gift'
        ? `${newItem.timestamp}-${newItem.user?.uid}-${newItem.giftId}-${newItem.num}`
        : `${newItem.timestamp}-${newItem.user?.uid}-${newItem.guardLevel}`; // guard

      return list.slice(-20).some(item => {
        const itemFingerprint = type === 'danmaku'
          ? `${item.timestamp}-${item.user?.uid}-${item.content}`
          : type === 'superchat'
          ? `${item.time}-${item.user?.uid}-${item.price}`
          : type === 'gift'
          ? `${item.timestamp}-${item.user?.uid}-${item.giftId}-${item.num}`
          : `${item.timestamp}-${item.user?.uid}-${item.guardLevel}`;
        return itemFingerprint === fingerprint;
      });
    };

    switch (data.type) {
      case 'danmaku':
        setDanmakuList(prev => {
          if (isDuplicate(prev, msg, 'danmaku')) return prev;
          return [...prev, msg].slice(-200);
        });
        break;
      case 'superchat':
        setScList(prev => {
          if (isDuplicate(prev, msg, 'superchat')) return prev;
          return [...prev, msg].slice(-100);
        });
        setDanmakuList(prev => {
          // SC也显示在弹幕流中，同样去重
          if (isDuplicate(prev, msg, 'superchat')) return prev;
          return [...prev, msg].slice(-200);
        });
        break;
      case 'gift':
      case 'guard':
        setGiftList(prev => {
          if (isDuplicate(prev, msg, data.type)) return prev;
          return [...prev, msg].slice(-100);
        });
        setDanmakuList(prev => {
          // 礼物也显示在弹幕流中，同样去重
          if (isDuplicate(prev, msg, data.type)) return prev;
          return [...prev, msg].slice(-200);
        });
        break;
      case 'watched':
        setWatchedCount(data.num || 0);
        break;
      case 'rank':
        setRankCount(data.num || 0);
        break;
      case 'liked':
        setLikeCount(data.num || 0);
        break;
      case 'live_status':
        setLiveStatus(data.liveStatus);
        setLiveStartTime(data.liveStartTime);
        break;
      case 'room_info':
        console.log('Received room_info:', data.data);
        setAnchorName(data.data.anchorName);
        setAnchorFace(data.data.anchorFace);
        setGuardCount(data.data.guardCount);
        setFansClubCount(data.data.fansClubCount);
        setFollowerCount(data.data.followerCount);
        setWatchedCount(data.data.watchedCount);
        break;
      case 'history':
        const historyDanmaku = (data.data.danmaku || []).map(item => ({ ...item, id: item.id || Date.now() + Math.random() }));
        const historySc = (data.data.superchat || []).map(item => ({ ...item, id: item.id || Date.now() + Math.random() }));
        const historyGift = (data.data.gift || []).map(item => ({ ...item, id: item.id || Date.now() + Math.random() }));
        const historyGuard = (data.data.guard || []).map(item => ({ ...item, id: item.id || Date.now() + Math.random() }));

        setDanmakuList(historyDanmaku.slice(-200));
        setScList(historySc.slice(-100));
        
        // Merge gifts and guards, then sort by timestamp
        const combinedGifts = [...historyGift, ...historyGuard].sort((a, b) => {
          const timeA = a.timestamp || 0;
          const timeB = b.timestamp || 0;
          return timeA - timeB;
        });
        
        setGiftList(combinedGifts.slice(-100));
        break;
      default:
        break;
    }
  };

  // Helper: Render content with emojis
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

        const isSmallBiliEmoji = emot.info.height <= 30;
        const isRoomEmoji = emot.text.startsWith('[[');
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

  // Helper: Get SC Color
  const getSCColor = (price) => {
    // Colors: { main: Body Color, header: Header Color, text: Text Color }
    
    // Special Amounts (Purple Theme)
    if (price === 77777) return { main: '#7e00a8', header: '#9510c2', text: '#fff' }; // Deepest Purple
    if (price === 17777) return { main: '#900bbd', header: '#a825d1', text: '#fff' }; // Deep Purple
    if (price === 7777) return { main: '#b645da', header: '#c860e6', text: '#fff' }; // Medium Deep Purple
    if (price === 777) return { main: '#d280f0', header: '#dd99f4', text: '#fff' }; // Medium Light Purple
    if (price === 177) return { main: '#ebb8fc', header: '#f2cafd', text: '#333' }; // Light Purple (Dark Text)
    if (price === 77) return { main: '#f5d4ff', header: '#fae5ff', text: '#333' }; // Lightest Purple (Dark Text)

    // Standard Bilibili / OBS Tiers
    // >= 2000: Dark Red
    if (price >= 2000) return { main: '#B01E34', header: '#FFD4D7', text: '#fff' };
    // >= 1000: Red
    if (price >= 1000) return { main: '#E54D4D', header: '#FFD9D9', text: '#fff' };
    // >= 500: Orange
    if (price >= 500) return { main: '#E09443', header: '#FFEBD6', text: '#fff' };
    // >= 100: Yellow
    if (price >= 100) return { main: '#E2B52B', header: '#FFF7E3', text: '#333' }; // Yellow usually needs dark text
    // >= 50: Cyan
    if (price >= 50) return { main: '#427D9E', header: '#ECF6F9', text: '#fff' };
    // < 50: Blue
    return { main: '#2A60B2', header: '#EDF5FF', text: '#fff' };
  };

  // Helper: Get Relative Time
  const getRelativeTime = (timestamp) => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;
    
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    return `${Math.floor(diff / 86400)}天前`;
  };

  // Helper: Get Medal Color based on level (Updated to match official snippets)
  const getMedalColor = (level) => {
    if (level >= 41) return '#9066d3'; // Purple
    if (level >= 31) return '#6892ff'; // Blue
    if (level >= 21) return '#5dc0f7'; // Light Blue
    if (level >= 11) return '#cf86b2'; // Pink
    return '#727bb5'; // Blue Grey (1-10)
  };

  return (
    <div className="danmaku-dashboard">
      {/* Header */}
      <div className="danmaku-header">
        <div className="header-left">
          <div className="logo-area" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/logo192.png" alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '50%' }} onError={(e) => e.target.style.display = 'none'} />
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#333' }}>Unia Danmuku</span>
            {isHistoryMode && (
              <span className="history-badge">历史回放模式</span>
            )}
          </div>
        </div>

        <div className="header-right">
          <div className="header-actions" style={{ marginRight: '20px' }}>
            {isHistoryMode ? (
              <button className="btn-live" onClick={returnToLive}>
                返回实时直播
              </button>
            ) : (
              <button className="btn-history" onClick={openHistoryModal}>
                查看历史场次
              </button>
            )}
          </div>

          {(connected || isHistoryMode) && (
            <div className="stats-bar" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              {/* Anchor Info */}
              <div className="stat-item anchor-info" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img 
                  src={anchorFace || 'https://i0.hdslb.com/bfs/face/member/noface.jpg'} 
                  alt={anchorName}
                  style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                  referrerPolicy="no-referrer"
                />
                {/* <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{anchorName}</span> */}
              </div>

              {/* Guard Count */}
              <div className="stat-item" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: '#999', lineHeight: 1 }}>大航海</span>
                <NumberFlow 
                  value={guardCount} 
                  format={{ useGrouping: true }}
                  style={{ 
                    fontSize: '14px', 
                    fontWeight: 'bold', 
                    color: '#333', 
                    fontVariantNumeric: 'tabular-nums',
                    '--number-flow-char-height': '14px',
                  }}
                />
              </div>

              {/* Fans Club / Popularity */}
              <div className="stat-item" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: '#999', lineHeight: 1 }}>粉丝团</span>
                <NumberFlow 
                  value={fansClubCount > 0 ? fansClubCount : followerCount} 
                  format={{ useGrouping: true }}
                  style={{ 
                    fontSize: '14px', 
                    fontWeight: 'bold', 
                    color: '#333', 
                    fontVariantNumeric: 'tabular-nums',
                    '--number-flow-char-height': '14px',
                  }}
                />
              </div>

              {/* Rank Count */}
              <div className="stat-item" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: '#999', lineHeight: 1 }}>高能榜</span>
                <NumberFlow 
                  value={rankCount} 
                  format={{ useGrouping: true }}
                  style={{ 
                    fontSize: '14px', 
                    fontWeight: 'bold', 
                    color: '#333', 
                    fontVariantNumeric: 'tabular-nums',
                    '--number-flow-char-height': '14px',
                  }}
                />
              </div>

              {/* Live Duration */}
              <div className="stat-item" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: '#999', lineHeight: 1 }}>时长</span>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#333', lineHeight: '14px' }}>{liveDuration}</span>
              </div>
              
              {/* Ticker Placeholder (Optional, based on image) */}
              <div className="ticker-placeholder" style={{ display: 'flex', gap: '5px', marginLeft: '10px' }}>
                {/* Can be populated with recent SC/Gift avatars later */}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="danmaku-content-area">
        {/* Column 1: Danmaku */}
        <div className="danmaku-column" style={{ position: 'relative' }}>
          <div className="column-header">
            <span className="column-title">实时弹幕</span>
            <span className="column-count">{danmakuList.length}</span>
          </div>
          <div 
            className="column-body" 
            ref={danmakuListRef}
            onScroll={handleScrollCheck}
            onWheel={handleUserScrollInteraction}
            onTouchMove={handleUserScrollInteraction}
          >
            {danmakuList.map(msg => {
              // Filter out SC, Gift, and Guard messages from the main danmaku column
              if (msg.type === 'superchat' || msg.type === 'gift' || msg.type === 'guard') {
                return null;
              }

              // Normal Danmaku (Simple Style)
              const guardLevel = msg.user?.guardLevel || 0;
              
              return (
                <div key={msg.id} className={`danmaku-item ${guardLevel > 0 ? `guard-msg-${guardLevel}` : ''}`}>
                  <div className="avatar">
                    <img 
                      src={msg.user?.face || 'https://i0.hdslb.com/bfs/face/member/noface.jpg'}
                      alt={msg.user?.username}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  
                  <div className="content-area">
                    <div className="username-line">
                      {/* Fan Badge */}
                      {msg.medal && (
                        <div 
                          className={`fans-medal ${guardLevel > 0 ? 'has-guard' : ''}`}
                          style={{ 
                            '--medal-color': getMedalColor(msg.medal.level)
                          }}
                        >
                          <div className="fans-medal-label">
                            {guardLevel > 0 && (
                              <div className="medal-guard-icon-wrapper">
                                <img 
                                  src={
                                    guardLevel === 3 
                                      ? 'https://s1.hdslb.com/bfs/static/blive/live-pay-mono/relation/relation/assets/captain-Bjw5Byb5.png'
                                      : guardLevel === 2
                                      ? 'https://s1.hdslb.com/bfs/static/blive/live-pay-mono/relation/relation/assets/supervisor-u43ElIjU.png'
                                      : 'https://s1.hdslb.com/bfs/static/blive/live-pay-mono/relation/relation/assets/governor-DpDXKEdA.png'
                                  }
                                  alt={`guard-${guardLevel}`}
                                  className="medal-guard-icon"
                                />
                              </div>
                            )}
                            <span className="fans-medal-content">{msg.medal.name}</span>
                          </div>
                          <div className="fans-medal-level">
                            {msg.medal.level}
                          </div>
                        </div>
                      )}
                      
                      {/* Standalone Guard Icon (only if no medal) */}
                      {!msg.medal && guardLevel > 0 && (
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
            <div ref={danmakuEndRef} />
          </div>
          {showNewMsgButton && (
            <div className="new-msg-btn" onClick={scrollToBottom}>
              新消息 {unreadCount > 99 ? '99+' : unreadCount}
              <span className="arrow-down">↓</span>
            </div>
          )}
        </div>

        {/* Column 2: Super Chat */}
        <div className="danmaku-column">
          <div className="column-header">
            <span className="column-title">醒目留言</span>
            <span className="column-count">{scList.length}</span>
          </div>
          <div 
            className="column-body"
            ref={scListRef}
            onScroll={handleScScrollCheck}
            onWheel={handleScUserScrollInteraction}
            onTouchMove={handleScUserScrollInteraction}
          >
            {scList.map(msg => {
              const colors = getSCColor(msg.price);
              const timeStr = getRelativeTime(msg.time);
              return (
                <div 
                  key={msg.id} 
                  className="sc-card"
                  style={{ 
                    '--sc-main': colors.main, 
                    '--sc-header': colors.header,
                    '--sc-text': colors.text 
                  }}
                >
                  <div className="sc-header">
                    <div className="sc-header-left">
                      <div className="sc-avatar-wrapper">
                        <img 
                          className="sc-avatar"
                          src={msg.user?.face || 'https://i0.hdslb.com/bfs/face/member/noface.jpg'}
                          alt=""
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="sc-header-content">
                        <div className="sc-name">{msg.user?.username}</div>
                        <div className="sc-price">CN¥{msg.price}</div>
                      </div>
                    </div>
                    <div className="sc-time">{timeStr}</div>
                  </div>
                  <div className="sc-message">
                    {msg.message}
                  </div>
                </div>
              );
            })}
            <div ref={scEndRef} />
          </div>
        </div>

        {/* Column 3: Gifts & Guards */}
        <div className="danmaku-column">
          <div className="column-header">
            <span className="column-title">礼物 & 上舰</span>
            <span className="column-count">{giftList.length}</span>
          </div>
          <div 
            className="column-body"
            ref={giftListRef}
            onScroll={handleGiftScrollCheck}
            onWheel={handleGiftUserScrollInteraction}
            onTouchMove={handleGiftUserScrollInteraction}
          >
            {giftList.map(msg => {
              const isGuard = msg.type === 'guard';
              
              // Calculate Price in CNY
              // If coinType is 'gold', price is usually in 1000 = 1 CNY (or 100 = 0.1 CNY). 
              // Standard Bilibili API: price is unit price. 
              // For paid gifts (gold), 1000 units = 1 CNY.
              // For free gifts (silver), we treat value as low/0 for display purposes or display raw.
              
              let priceDisplay = '';
              let priceValue = 0;

              if (msg.coinType === 'gold') {
                priceValue = msg.price / 1000;
                priceDisplay = `CN¥${priceValue}`;
              } else if (msg.coinType === 'silver') {
                priceValue = 0; // Treat silver as 0 CNY for threshold
                priceDisplay = `${msg.price}银瓜子`;
              } else {
                // Fallback
                priceValue = msg.price; 
                priceDisplay = `¥${msg.price}`;
              }

              // Threshold for large card display: Guard or Price >= 9.9 CNY
              const isLargeCard = isGuard || (msg.coinType === 'gold' && priceValue >= 9.9);
              
              if (isLargeCard) {
                // Determine background color
                let bgColor = '#23ade5'; // Default Blue (Guard 3 / Captain)
                if (isGuard) {
                   if (msg.guardLevel === 3) bgColor = '#1E90FF'; // Captain (Blue)
                   if (msg.guardLevel === 2) bgColor = '#b074f0'; // Admiral (Purple)
                   if (msg.guardLevel === 1) bgColor = '#ff6868'; // Governor (Red)
                } else {
                   bgColor = '#42B25F'; // Green for Gifts >= 10
                }

                // Determine Icon
                let iconSrc = msg.giftIconDynamic || msg.giftIcon; // Prefer dynamic for large card
                if (isGuard) {
                   if (msg.guardLevel === 3) iconSrc = 'https://s1.hdslb.com/bfs/static/blive/live-pay-mono/relation/relation/assets/captain-Bjw5Byb5.png';
                   else if (msg.guardLevel === 2) iconSrc = 'https://s1.hdslb.com/bfs/static/blive/live-pay-mono/relation/relation/assets/supervisor-u43ElIjU.png';
                   else if (msg.guardLevel === 1) iconSrc = 'https://s1.hdslb.com/bfs/static/blive/live-pay-mono/relation/relation/assets/governor-DpDXKEdA.png';
                }

                if (isGuard) {
                  // Guard Card Layout (Reference: Blue Card)
                  return (
                    <div 
                      key={msg.id} 
                      className="gift-card-large guard-card"
                      style={{ backgroundColor: bgColor }}
                    >
                      <div className="guard-card-left">
                        <img 
                          className="guard-avatar"
                          src={msg.user?.face || 'https://i0.hdslb.com/bfs/face/member/noface.jpg'}
                          alt=""
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="guard-card-content">
                        <div className="guard-username">{msg.user?.username}</div>
                        <div className="guard-price">CN¥{msg.price / 1000}</div>
                        <div className="guard-message">
                          开通{msg.giftName}，已陪伴主播 {msg.num || 1} 天
                        </div>
                      </div>
                      <div className="guard-card-right">
                        <img src={iconSrc} alt="" className="guard-icon-large" />
                      </div>
                    </div>
                  );
                } else {
                  // Large Gift Card Layout (Reference: Green Card)
                  return (
                    <div 
                      key={msg.id} 
                      className="gift-card-large gift-card-highlight"
                      style={{ backgroundColor: bgColor }}
                    >
                      <div className="gift-highlight-left">
                        <img 
                          className="gift-highlight-avatar"
                          src={msg.user?.face || 'https://i0.hdslb.com/bfs/face/member/noface.jpg'}
                          alt=""
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="gift-highlight-content">
                        <div className="gift-highlight-top">
                          <span className="gift-highlight-username">{msg.user?.username}</span>
                          <span className="gift-highlight-price-left">{priceDisplay}</span>
                        </div>
                        <div className="gift-highlight-name">{msg.giftName}</div>
                      </div>
                      {iconSrc && (
                        <div className="gift-highlight-bg-icon">
                          <img src={iconSrc} alt="" />
                        </div>
                      )}
                    </div>
                  );
                }
              } else {
                // Small Compact Row (< 10)
                // Prefer static icon for small row
                const smallIconSrc = msg.giftIconStatic || msg.giftIcon;
                
                return (
                  <div key={msg.id} className="gift-row-small">
                    <img 
                      className="gift-avatar-small"
                      src={msg.user?.face || 'https://i0.hdslb.com/bfs/face/member/noface.jpg'}
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                    <span className="gift-username-small">{msg.user?.username}</span>
                    {smallIconSrc && (
                      <img className="gift-icon-small" src={smallIconSrc} alt="" />
                    )}
                    <span className="gift-name-small">{msg.giftName}</span>
                    <span className="gift-price-small">{priceDisplay}</span>
                  </div>
                );
              }
            })}
            <div ref={giftEndRef} />
          </div>
        </div>
      </div>

      {/* History Selection Modal */}
      {showHistoryModal && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>选择历史直播场次</h3>
              <button className="close-btn" onClick={() => setShowHistoryModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {historySessions.length === 0 ? (
                <div className="empty-history">暂无历史记录</div>
              ) : (
                <div className="session-list">
                  {historySessions.map(sessionId => {
                    const date = new Date(sessionId * 1000);
                    const dateStr = date.toLocaleDateString();
                    const timeStr = date.toLocaleTimeString();
                    return (
                      <div 
                        key={sessionId} 
                        className="session-item"
                        onClick={() => loadHistorySession(sessionId)}
                      >
                        <span className="session-date">{dateStr}</span>
                        <span className="session-time">{timeStr}</span>
                        <span className="session-arrow">→</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DanmakuPage;
