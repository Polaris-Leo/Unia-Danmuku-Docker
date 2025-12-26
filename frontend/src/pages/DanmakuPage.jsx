import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import NumberFlow from '@number-flow/react';
import { getAuthStatus, logout, getHistorySessions, getHistoryData } from '../services/api';
import './DanmakuPage.css';

const UserDetailPopup = ({ user, position, onClose }) => {
  const popupRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (!user) return null;

  // Calculate position to keep it on screen
  const style = {
    top: position.y,
    left: position.x,
  };
  
  // Adjust if going off screen
  if (position.x + 280 > window.innerWidth) {
    style.left = window.innerWidth - 290;
  }
  if (position.y + 350 > window.innerHeight) {
    style.top = Math.max(10, position.y - 350); // Flip up
  }

  return (
    <div className="user-popup-overlay" onClick={onClose}>
      <div className="user-popup" style={style} ref={popupRef} onClick={e => e.stopPropagation()}>
        <div className="user-popup-header">
          <div className="user-popup-avatar-wrap">
            <img 
              src={user.face || 'https://i0.hdslb.com/bfs/face/member/noface.jpg'} 
              alt="avatar" 
              className="user-popup-avatar" 
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="user-popup-info">
            <div className="user-popup-name-row">
              <span className="user-popup-name" title={user.username}>{user.username}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{cursor: 'pointer', color: '#a1a1aa'}}>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </div>
            <div className="user-popup-uid" onClick={() => navigator.clipboard.writeText(user.uid)} title="点击复制UID">
              UID:{user.uid}
            </div>
            <div className="user-popup-time">
               {user.msgTime ? new Date(user.msgTime).toLocaleString() : '未知时间'}
            </div>
          </div>
        </div>
        
        <div className="user-popup-menu">
          <div className="user-popup-item">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v2.172a2 2 0 0 1 -.586 1.414l-4.414 4.414v7l-6 2v-8.5l-4.48 -4.928a2 2 0 0 1 -.52 -1.345v-2.227z"></path></svg>
            筛选该用户
          </div>
          <div className="user-popup-item">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M8.8 20v-4.1l1.9.2a2.3 2.3 0 0 0 2.164-2.1V8.3A5.37 5.37 0 0 0 2 8.25c0 2.8.656 3.054 1 4.55a5.77 5.77 0 0 1 .029 2.758L2 20"></path><path d="M19.8 17.8a7.5 7.5 0 0 0 .003-10.603"></path><path d="M17 15a3.5 3.5 0 0 0-.025-4.975"></path></svg>
            语音播报
          </div>
          
          <div className="user-popup-section-label">外部功能</div>
          <div className="user-popup-separator"></div>
          
          <a href={`https://space.bilibili.com/${user.uid}`} target="_blank" rel="noopener noreferrer" className="user-popup-item user-popup-link">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6"></path><path d="M11 13l9 -9"></path><path d="M15 4h5v5"></path></svg>
            哔哩哔哩空间...
          </a>
          <a href={`https://laplace.live/user/${user.uid}`} target="_blank" rel="noopener noreferrer" className="user-popup-item user-popup-link">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6"></path><path d="M11 13l9 -9"></path><path d="M15 4h5v5"></path></svg>
            用户数据...
          </a>
        </div>
      </div>
    </div>
  );
};

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
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [onlyCurrentSession, setOnlyCurrentSession] = useState(() => {
    const saved = localStorage.getItem('onlyCurrentSession');
    return saved !== null ? saved === 'true' : true;
  });
  const [loadedHistorySessions, setLoadedHistorySessions] = useState(new Set());

  // User Popup State
  const [selectedUser, setSelectedUser] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  const handleUserClick = (e, user, msgTime) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setPopupPosition({
      x: rect.left,
      y: rect.bottom + 5
    });
    setSelectedUser({ ...user, msgTime });
  };

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

  // Settings Logic
  const toggleOnlyCurrentSession = async () => {
    const newValue = !onlyCurrentSession;
    setOnlyCurrentSession(newValue);
    localStorage.setItem('onlyCurrentSession', String(newValue));
    
    if (!newValue) {
      // 关闭了“仅查看当前场次”，加载历史数据
      await loadPreviousHistory();
    } else {
      // 开启了“仅查看当前场次”，清除历史数据
      // 如果当前有直播开始时间，保留该时间之后的数据
      // 否则，如果正在直播，保留所有数据（假设都是当前的）
      // 如果没在直播，可能需要清空
      
      if (liveStartTime > 0) {
        const filterFunc = (item) => {
          // 保留 divider 类型的消息吗？不，只保留当前场次
          if (item.type === 'divider') return false;
          // 比较时间戳
          const itemTime = item.timestamp || item.time || 0;
          return itemTime >= liveStartTime;
        };
        
        setDanmakuList(prev => prev.filter(filterFunc));
        setScList(prev => prev.filter(filterFunc));
        setGiftList(prev => prev.filter(filterFunc));
      } else {
        // 如果不知道开始时间，但用户切换回“仅当前”，最安全的做法是清空列表并重连（如果在线）
        // 或者不做任何操作，只是后续不再加载历史
        // 这里选择清空列表，因为用户期望“仅查看当前”
        setDanmakuList([]);
        setScList([]);
        setGiftList([]);
        if (connected && wsRef.current) {
           // 保持连接，新消息会进来
        }
      }
      setLoadedHistorySessions(new Set());
    }
  };

  const loadPreviousHistory = async () => {
    if (!roomId) return;
    try {
      const res = await getHistorySessions(roomId);
      if (!res.success || !res.sessions || res.sessions.length === 0) return;
      
      // 过滤掉已经加载的 session
      // 假设 sessions 是时间戳数组，倒序排列（最新的在前）
      // 我们需要找到比当前 liveStartTime 早的 session
      
      const sortedSessions = [...res.sessions].sort((a, b) => b - a);
      
      // 找到第一个未加载且早于当前直播的 session
      // 如果当前没直播 (liveStartTime=0)，则加载最新的 session
      // 如果当前直播中，加载 liveStartTime 之前的最新的 session
      
      let targetSessionId = null;
      
      for (const sessionId of sortedSessions) {
        if (loadedHistorySessions.has(sessionId)) continue;
        
        if (liveStartTime > 0) {
          if (sessionId < liveStartTime) {
            targetSessionId = sessionId;
            break;
          }
        } else {
          // 没在直播，加载最新的未加载 session
          targetSessionId = sessionId;
          break;
        }
      }
      
      if (!targetSessionId) {
        console.log('没有更多历史场次可加载');
        return;
      }
      
      // 加载该 session 数据
      const dataRes = await getHistoryData(roomId, targetSessionId);
      if (dataRes.success) {
        const { danmaku, superchat, gift, guard } = dataRes.data;
        
        // 标记为已加载
        setLoadedHistorySessions(prev => new Set(prev).add(targetSessionId));
        
        // 处理数据
        const historyDanmaku = (danmaku || []).map(item => ({ ...item, id: item.id || `hist-${Date.now()}-${Math.random()}` }));
        const historySc = (superchat || []).map(item => ({ ...item, id: item.id || `hist-${Date.now()}-${Math.random()}` }));
        const historyGift = (gift || []).map(item => ({ ...item, id: item.id || `hist-${Date.now()}-${Math.random()}` }));
        const historyGuard = (guard || []).map(item => ({ ...item, id: item.id || `hist-${Date.now()}-${Math.random()}` }));
        
        // 创建分界线
        // 分界线时间戳设为该场次最后一条消息的时间，或者下一场开始前
        // 这里简单用该场次最大的时间戳
        let maxTime = targetSessionId;
        [...historyDanmaku, ...historySc, ...historyGift, ...historyGuard].forEach(item => {
            const t = item.timestamp || item.time || 0;
            if (t > maxTime) maxTime = t;
        });
        
        const divider = {
            type: 'divider',
            content: '直播已结束',
            timestamp: maxTime + 1,
            id: `divider-${targetSessionId}`
        };
        
        // 合并到列表头部
        setDanmakuList(prev => [...historyDanmaku, divider, ...prev]);
        setScList(prev => [...historySc, divider, ...prev]);
        
        const combinedGifts = [...historyGift, ...historyGuard].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        setGiftList(prev => [...combinedGifts, divider, ...prev]);
        
      }
      
    } catch (error) {
      console.error('加载历史数据失败:', error);
    }
  };

  // Initial load of history if setting is off
  useEffect(() => {
    if (roomId && !onlyCurrentSession && loadedHistorySessions.size === 0) {
      // Delay slightly to allow live_status to arrive if connected
      const timer = setTimeout(() => {
        loadPreviousHistory();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [roomId]);

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

    const maxCount = onlyCurrentSession ? 200 : 5000;

    switch (data.type) {
      case 'danmaku':
        setDanmakuList(prev => {
          if (isDuplicate(prev, msg, 'danmaku')) return prev;
          return [...prev, msg].slice(-maxCount);
        });
        break;
      case 'superchat':
        setScList(prev => {
          if (isDuplicate(prev, msg, 'superchat')) return prev;
          return [...prev, msg].slice(-maxCount);
        });
        setDanmakuList(prev => {
          // SC也显示在弹幕流中，同样去重
          if (isDuplicate(prev, msg, 'superchat')) return prev;
          return [...prev, msg].slice(-maxCount);
        });
        break;
      case 'gift':
      case 'guard':
        setGiftList(prev => {
          if (isDuplicate(prev, msg, data.type)) return prev;
          return [...prev, msg].slice(-maxCount);
        });
        setDanmakuList(prev => {
          // 礼物也显示在弹幕流中，同样去重
          if (isDuplicate(prev, msg, data.type)) return prev;
          return [...prev, msg].slice(-maxCount);
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

  // Calculate Totals
  const scTotal = React.useMemo(() => {
    return scList.reduce((acc, curr) => {
      if (curr.type === 'divider') return acc;
      return acc + (Number(curr.price) || 0);
    }, 0);
  }, [scList]);

  const giftTotal = React.useMemo(() => {
    return giftList.reduce((acc, curr) => {
      if (curr.type === 'divider') return acc;
      
      // Guard (price is in gold/1000)
      if (curr.type === 'guard') {
        return acc + (Number(curr.price) || 0) / 1000;
      }
      
      // Gift (gold only)
      if (curr.coinType === 'gold') {
        return acc + (Number(curr.price) || 0) / 1000;
      }
      
      return acc;
    }, 0);
  }, [giftList]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(val);
  };

  return (
    <div className="danmaku-dashboard">
      {/* Header */}
      <div className="danmaku-header">
        <div className="header-left">
          <div className="logo-area" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: '20px' }}>
            <img src="/logo192.png" alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '50%' }} onError={(e) => e.target.style.display = 'none'} />
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#333' }}>Unia Danmuku</span>
            {isHistoryMode && (
              <span className="history-badge">历史回放模式</span>
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

        <div className="header-right">
          <div className="header-actions" style={{ marginRight: '10px', display: 'flex', alignItems: 'center' }}>
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

          {/* Settings Button (Moved to far right) */}
          <div style={{ position: 'relative', marginLeft: '10px' }}>
            <button className="settings-btn" onClick={() => setShowSettings(!showSettings)} title="设置">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
            
            {showSettings && (
              <>
                <div className="settings-panel-overlay" onClick={() => setShowSettings(false)}></div>
                <div className="settings-panel">
                  <div className="settings-header">
                    <h3>控制台设置</h3>
                    <button className="close-btn" onClick={() => setShowSettings(false)}>×</button>
                  </div>
                  <div className="settings-content">
                    <div className="setting-item">
                      <div className="setting-label">仅查看当前场次</div>
                      <label className="toggle-switch">
                        <input 
                          type="checkbox" 
                          checked={onlyCurrentSession} 
                          onChange={toggleOnlyCurrentSession}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                    {!onlyCurrentSession && (
                      <div style={{ fontSize: '12px', color: '#999', marginTop: '-10px', marginBottom: '15px' }}>
                        关闭后将加载之前的直播数据，并在场次间显示分界线。
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="danmaku-content-area">
        {/* Column 1: Danmaku */}
        <div className="danmaku-column" style={{ position: 'relative' }}>
          <div className="column-header">
            <span className="column-count">{danmakuList.length} 条弹幕</span>
          </div>
          <div 
            className="column-body" 
            ref={danmakuListRef}
            onScroll={handleScrollCheck}
            onWheel={handleUserScrollInteraction}
            onTouchMove={handleUserScrollInteraction}
          >
            {danmakuList.map(msg => {
              // Handle Divider
              if (msg.type === 'divider') {
                return (
                  <div key={msg.id} className="danmaku-divider">
                    <span>{msg.content}</span>
                  </div>
                );
              }

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
                      <span 
                        className={`username ${guardLevel > 0 ? `guard-${guardLevel}` : ''}`}
                        onClick={(e) => handleUserClick(e, msg.user, msg.time)}
                      >
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="column-count">{scList.length} 条醒目留言</span>
              <span style={{ color: '#999' }}>•</span>
              <span style={{ fontWeight: 'bold', color: '#666' }}>{formatCurrency(scTotal)}</span>
            </div>
          </div>
          <div 
            className="column-body"
            ref={scListRef}
            onScroll={handleScScrollCheck}
            onWheel={handleScUserScrollInteraction}
            onTouchMove={handleScUserScrollInteraction}
          >
            {scList.map(msg => {
              if (msg.type === 'divider') {
                return (
                  <div key={msg.id} className="danmaku-divider">
                    <span>{msg.content}</span>
                  </div>
                );
              }
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
                        <div className="sc-name" onClick={(e) => handleUserClick(e, msg.user, msg.time)}>{msg.user?.username}</div>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="column-count">{giftList.length} 个礼物</span>
              <span style={{ color: '#999' }}>•</span>
              <span style={{ fontWeight: 'bold', color: '#666' }}>{formatCurrency(giftTotal)}</span>
            </div>
          </div>
          <div 
            className="column-body"
            ref={giftListRef}
            onScroll={handleGiftScrollCheck}
            onWheel={handleGiftUserScrollInteraction}
            onTouchMove={handleGiftUserScrollInteraction}
          >
            {giftList.map(msg => {
              if (msg.type === 'divider') {
                return (
                  <div key={msg.id} className="danmaku-divider">
                    <span>{msg.content}</span>
                  </div>
                );
              }
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
                let textColor = '#fff';

                if (isGuard) {
                   if (msg.guardLevel === 3) {
                     bgColor = '#23ade5'; // Captain (Blue)
                     textColor = '#fff';
                   }
                   if (msg.guardLevel === 2) {
                     bgColor = '#ae5cff'; // Admiral (Pale Purple)
                     textColor = '#fff';
                   }
                   if (msg.guardLevel === 1) {
                     bgColor = '#ff7b52'; // Governor (Pale Orange-Red)
                     textColor = '#fff';
                   }
                } else {
                   bgColor = '#42B25F'; // Green for Gifts >= 10
                }

                // Determine Icon
                let iconSrc = msg.giftIconStatic || msg.giftIcon; // Prefer static as requested
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
                      style={{ background: bgColor, color: textColor }}
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
                        <div className="guard-username" onClick={(e) => handleUserClick(e, msg.user, msg.time)}>{msg.user?.username}</div>
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
                          <span className="gift-highlight-username" onClick={(e) => handleUserClick(e, msg.user, msg.time)}>{msg.user?.username}</span>
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
                    <span className="gift-username-small" onClick={(e) => handleUserClick(e, msg.user, msg.time)}>{msg.user?.username}</span>
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

      {/* User Detail Popup */}
      <UserDetailPopup 
        user={selectedUser} 
        position={popupPosition} 
        onClose={() => setSelectedUser(null)} 
      />
    </div>
  );
}

export default DanmakuPage;
