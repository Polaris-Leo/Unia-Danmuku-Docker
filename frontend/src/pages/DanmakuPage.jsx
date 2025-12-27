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

  // 计算位置以保持在屏幕内
  const style = {
    top: position.y,
    left: position.x,
  };
  
  // 如果超出屏幕则调整
  if (position.x + 280 > window.innerWidth) {
    style.left = window.innerWidth - 290;
  }
  if (position.y + 350 > window.innerHeight) {
    style.top = Math.max(10, position.y - 350); // 向上翻转
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
  
  // 历史模式状态
  const [isHistoryMode, setIsHistoryMode] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historySessions, setHistorySessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  // 不同列的列表数据
  const [danmakuList, setDanmakuList] = useState([]);
  const [scList, setScList] = useState([]);
  const [giftList, setGiftList] = useState([]);
  
  // 统计数据
  const [watchedCount, setWatchedCount] = useState(0);
  const [rankCount, setRankCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [anchorName, setAnchorName] = useState('Loading...');
  const [anchorFace, setAnchorFace] = useState('');
  const [guardCount, setGuardCount] = useState(0);
  const [fansClubCount, setFansClubCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  
  // 直播状态
  const [liveStatus, setLiveStatus] = useState(0); // 0: 未开播, 1: 直播中, 2: 轮播
  const [liveStartTime, setLiveStartTime] = useState(0);
  const [liveDuration, setLiveDuration] = useState('00:00:00');
  
  // 滚动状态
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNewMsgButton, setShowNewMsgButton] = useState(false);

  // SC和礼物滚动状态
  const [isScAutoScroll, setIsScAutoScroll] = useState(true);
  const [scUnreadCount, setScUnreadCount] = useState(0);
  const [showScNewMsgButton, setShowScNewMsgButton] = useState(false);

  const [isGiftAutoScroll, setIsGiftAutoScroll] = useState(true);
  const [giftUnreadCount, setGiftUnreadCount] = useState(0);
  const [showGiftNewMsgButton, setShowGiftNewMsgButton] = useState(false);
  
  // 设置状态
  const [showSettings, setShowSettings] = useState(false);
  const [onlyCurrentSession, setOnlyCurrentSession] = useState(() => {
    const saved = localStorage.getItem('onlyCurrentSession');
    return saved !== null ? saved === 'true' : true;
  });
  const [loadedHistorySessions, setLoadedHistorySessions] = useState(new Set());

  // 用户弹窗状态
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
  const reconnectTimeoutRef = useRef(null);
  const isManualDisconnect = useRef(false);
  const danmakuListRef = useRef(null); // 滚动容器的引用
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

  // 直播时长计时器
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
      
      updateDuration(); // 初始更新
      timer = setInterval(updateDuration, 1000);
    } else {
      setLiveDuration('00:00:00');
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [liveStatus, liveStartTime]);

  // 自动滚动效果
  useEffect(() => {
    if (isAutoScroll) {
      if (danmakuEndRef.current) {
        // 使用 'auto' 行为进行即时滚动，以防止高消息量时的卡顿
        danmakuEndRef.current.scrollIntoView({ behavior: 'auto' });
      }
    } else {
      setUnreadCount(prev => prev + 1);
      setShowNewMsgButton(true);
    }
  }, [danmakuList]);

  // 处理滚动事件
  const handleScroll = (e) => {
    if (!danmakuListRef.current) return;
    
    // 仅在用户主动滚动时检查手动滚动
    // 我们可以通过检查是否在自动滚动开启时发生滚动，但现在不在底部来推断
    
    const { scrollTop, scrollHeight, clientHeight } = danmakuListRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    // 如果用户手动向上滚动（通常 deltaY < 0，但这里我们检查位置）
    // 我们需要小心，不要仅仅因为新消息到达并在自动滚动效果运行之前将底部向下推而禁用自动滚动。
    
    // 策略：仅当用户距离底部明显较远时才禁用自动滚动
    // 并且我们当前没有处于自动滚动过程中（这在 React 状态中很难完美跟踪）。
    // 对于“仅手动”更好的方法：
    // 使用 `onWheel` 或 `onTouchMove` 事件来检测用户交互。
  };

  // 检测用户手动交互以暂停自动滚动
  const handleUserScrollInteraction = () => {
    const { scrollTop, scrollHeight, clientHeight } = danmakuListRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    
    if (!isAtBottom) {
      setIsAutoScroll(false);
      setShowNewMsgButton(true);
    }
  };

  // 如果用户手动滚动回底部，重新启用自动滚动
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

  // SC 滚动处理
  const handleScUserScrollInteraction = () => {
    if (!scListRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scListRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    if (!isAtBottom) {
      setIsScAutoScroll(false);
      setShowScNewMsgButton(true);
    }
  };

  const handleScScrollCheck = () => {
    if (!scListRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scListRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 20;
    if (isAtBottom) {
      setIsScAutoScroll(true);
      setScUnreadCount(0);
      setShowScNewMsgButton(false);
    }
  };

  // 礼物滚动处理
  const handleGiftUserScrollInteraction = () => {
    if (!giftListRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = giftListRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    if (!isAtBottom) {
      setIsGiftAutoScroll(false);
      setShowGiftNewMsgButton(true);
    }
  };

  const handleGiftScrollCheck = () => {
    if (!giftListRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = giftListRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 20;
    if (isAtBottom) {
      setIsGiftAutoScroll(true);
      setGiftUnreadCount(0);
      setShowGiftNewMsgButton(false);
    }
  };

  // 手动滚动到底部
  const scrollToBottom = () => {
    setIsAutoScroll(true);
    setUnreadCount(0);
    setShowNewMsgButton(false);
    if (danmakuEndRef.current) {
      danmakuEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  };

  const scrollToBottomSc = () => {
    setIsScAutoScroll(true);
    setScUnreadCount(0);
    setShowScNewMsgButton(false);
    if (scEndRef.current) {
      scEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  };

  const scrollToBottomGift = () => {
    setIsGiftAutoScroll(true);
    setGiftUnreadCount(0);
    setShowGiftNewMsgButton(false);
    if (giftEndRef.current) {
      giftEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  };

  useEffect(() => {
    if (isScAutoScroll) {
      if (scEndRef.current) {
        scEndRef.current.scrollIntoView({ behavior: 'auto' });
      }
    } else {
      setScUnreadCount(prev => prev + 1);
      setShowScNewMsgButton(true);
    }
  }, [scList]);

  useEffect(() => {
    if (isGiftAutoScroll) {
      if (giftEndRef.current) {
        giftEndRef.current.scrollIntoView({ behavior: 'auto' });
      }
    } else {
      setGiftUnreadCount(prev => prev + 1);
      setShowGiftNewMsgButton(true);
    }
  }, [giftList]);

  // 设置逻辑
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

  // 如果设置关闭，则初始加载历史记录
  useEffect(() => {
    if (roomId && !onlyCurrentSession && loadedHistorySessions.size === 0) {
      // 稍微延迟以允许 live_status 到达（如果已连接）
      const timer = setTimeout(() => {
        loadPreviousHistory();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [roomId, connected, onlyCurrentSession]);

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

  // 如果 URL 中有 roomId，则自动连接
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRoomId = params.get('roomId');
    
    if (urlRoomId) {
      setRoomId(urlRoomId);
      connectRoom(urlRoomId);
    }
    // 如果 URL 中没有 roomId，则不执行任何操作（显示空框架）
  }, []);

  const connectRoom = (targetRoomId) => {
    const idToUse = targetRoomId || roomId;
    if (!idToUse) {
      alert('请输入直播间号');
      return;
    }

    localStorage.setItem('lastRoomId', idToUse);

    // 重置主动断开标志
    isManualDisconnect.current = false;
    // 清除可能存在的重连定时器
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
    }

    // 使用 window.location.hostname 允许同一网络上的其他设备连接
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host; // Includes port if present
    const ws = new WebSocket(`${wsProtocol}//${wsHost}/ws/danmaku?roomId=${idToUse}`);
    
    ws.onopen = () => {
      console.log('WebSocket连接成功');
      setConnected(true);
      // 新连接时清空列表
      setDanmakuList([]);
      setScList([]);
      setGiftList([]);
      // 重置已加载的历史记录标记，以便重新加载
      setLoadedHistorySessions(new Set());
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
      wsRef.current = null;

      if (!isManualDisconnect.current) {
        console.log('非主动断开，3秒后尝试重连...');
        reconnectTimeoutRef.current = setTimeout(() => {
          connectRoom(idToUse);
        }, 3000);
      }
    };

    wsRef.current = ws;
  };

  const disconnect = () => {
    isManualDisconnect.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  };

  // 历史记录功能
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
      // 1. 断开直播连接
      disconnect();
      setIsHistoryMode(true);
      setCurrentSessionId(sessionId);
      setShowHistoryModal(false);
      
      // 2. 清空当前列表
      setDanmakuList([]);
      setScList([]);
      setGiftList([]);
      
      // 3. 获取历史数据
      const response = await getHistoryData(roomId, sessionId);
      if (response.success) {
        const { danmaku, superchat, gift, guard } = response.data;
        
        // 处理并设置数据
        const historyDanmaku = (danmaku || []).map(item => ({ ...item, id: item.id || Date.now() + Math.random() }));
        const historySc = (superchat || []).map(item => ({ ...item, id: item.id || Date.now() + Math.random() }));
        const historyGift = (gift || []).map(item => ({ ...item, id: item.id || Date.now() + Math.random() }));
        const historyGuard = (guard || []).map(item => ({ ...item, id: item.id || Date.now() + Math.random() }));

        setDanmakuList(historyDanmaku); // 加载所有历史记录，而不仅仅是最后 200 条
        setScList(historySc);
        
        // 合并礼物和舰长
        const combinedGifts = [...historyGift, ...historyGuard].sort((a, b) => {
          const timeA = a.timestamp || 0;
          const timeB = b.timestamp || 0;
          return timeA - timeB;
        });
        setGiftList(combinedGifts);
        
        // 加载后滚动到底部
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
      const getFingerprint = (item) => {
        return type === 'danmaku' 
          ? `${item.timestamp}-${item.user?.uid}-${item.content}`
          : type === 'superchat'
          ? `${item.time}-${item.user?.uid}-${item.price}`
          : type === 'gift'
          ? `${item.timestamp}-${item.user?.uid}-${item.giftId}-${item.num}`
          : `${item.timestamp}-${item.user?.uid}-${item.guardLevel}`;
      };

      const fingerprint = getFingerprint(newItem);

      return list.slice(-20).some(item => {
        const itemFingerprint = getFingerprint(item);
        if (itemFingerprint === fingerprint) return true;
        // Check if it matches the last stacked message in a combo
        // 检查是否匹配连击中的最后一条堆叠消息
        if (item.lastFingerprint === fingerprint) return true;
        return false;
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
          if (isDuplicate(prev, msg, 'superchat')) return prev;
          return [...prev, msg].slice(-maxCount);
        });
        break;
      case 'gift':
        setGiftList(prev => {
          // 1. Check for duplicates first (including against lastFingerprint)
          // 1. 首先检查重复项（包括针对 lastFingerprint）
          if (isDuplicate(prev, msg, 'gift')) return prev;

          // 2. Check for stacking (Combo)
          // 2. 检查堆叠（连击）
          const lastItem = prev[prev.length - 1];
          // Only stack if it's a gift (not divider/guard) and same user/giftId
          // 仅当是礼物（非分界线/舰长）且是同一用户/同一礼物ID时才堆叠
          if (lastItem && lastItem.type === 'gift' && 
              lastItem.user?.uid === msg.user?.uid && 
              lastItem.giftId === msg.giftId) {
            
            // Check time window (30 seconds)
            // 检查时间窗口（30秒）
            // msg.timestamp is usually unix timestamp (seconds) or ms. 
            // Assuming consistent units.
            // msg.timestamp 通常是 Unix 时间戳（秒）或毫秒。假设单位一致。
            const timeDiff = Math.abs((msg.timestamp || 0) - (lastItem.timestamp || 0));
            
            // Threshold: 30 seconds. 
            // 阈值：30秒。
            // If timestamp is large (> 10000000000), it's ms. If < 10000000000, it's seconds.
            // 如果时间戳很大 (> 10000000000)，则是毫秒。如果 < 10000000000，则是秒。
            // Bilibili usually uses seconds. 30s.
            // Bilibili 通常使用秒。30秒。
            // If it happens to be ms, 30 is 0.03s, which is too strict.
            // 如果恰好是毫秒，30 就是 0.03秒，太严格了。
            // Let's assume seconds. If diff is huge, it won't stack.
            // 让我们假设是秒。如果差异巨大，则不会堆叠。
            // To be safe, we can check magnitude.
            // 为了安全起见，我们可以检查数量级。
            const isMs = (msg.timestamp || 0) > 10000000000;
            const threshold = isMs ? 30000 : 30;

            if (timeDiff <= threshold) {
              // Stack it!
              // 堆叠它！
              const currentNum = msg.num || 1;
              const previousTotal = lastItem.totalNum || lastItem.num || 1;
              const newTotal = previousTotal + currentNum;
              
              const fingerprint = `${msg.timestamp}-${msg.user?.uid}-${msg.giftId}-${msg.num}`;

              const updatedItem = {
                ...lastItem,
                num: currentNum, // The latest batch count // 最新批次的数量
                totalNum: newTotal, // Accumulated count // 累计数量
                timestamp: msg.timestamp, // Update time to extend window // 更新时间以延长窗口
                lastFingerprint: fingerprint, // Store for duplicate check // 存储用于重复检查
                // Keep original ID to maintain React key stability or update it?
                // 保持原始 ID 以维持 React key 稳定性还是更新它？
                // If we update ID, it might flash. Let's keep ID but force update.
                // 如果我们更新 ID，可能会闪烁。让我们保持 ID 但强制更新。
                // Actually, we need to trigger re-render.
                // 实际上，我们需要触发重新渲染。
                // Creating a new object reference is enough for React state.
                // 创建新的对象引用对于 React 状态来说就足够了。
              };
              
              return [...prev.slice(0, -1), updatedItem];
            }
          }

          // 3. New Item
          // 3. 新项目
          const newItem = { 
            ...msg, 
            totalNum: msg.num || 1,
            lastFingerprint: `${msg.timestamp}-${msg.user?.uid}-${msg.giftId}-${msg.num}`
          };
          return [...prev, newItem].slice(-maxCount);
        });
        
        // Also add to Danmaku list (optional: do we stack there too? Probably not requested, keep simple)
        // 也添加到弹幕列表（可选：我们在那里也堆叠吗？可能没有要求，保持简单）
        setDanmakuList(prev => {
          if (isDuplicate(prev, msg, 'gift')) return prev;
          return [...prev, msg].slice(-maxCount);
        });
        break;
      case 'guard':
        setGiftList(prev => {
          if (isDuplicate(prev, msg, data.type)) return prev;
          return [...prev, msg].slice(-maxCount);
        });
        setDanmakuList(prev => {
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
        // 合并礼物和舰长，然后按时间戳排序
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
  // 辅助函数：渲染带有表情符号的内容
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
  // 辅助函数：获取 SC 颜色
  const getSCColor = (price) => {
    // Colors: { main: Body Color, header: Header Color, text: Text Color }
    // 颜色：{ main: 主体颜色, header: 头部颜色, text: 文本颜色 }
    
    // Special Amounts (Purple Theme)
    // 特殊金额（紫色主题）
    if (price === 77777) return { main: '#7e00a8', header: '#9510c2', text: '#fff' }; // Deepest Purple // 最深紫色
    if (price === 17777) return { main: '#900bbd', header: '#a825d1', text: '#fff' }; // Deep Purple // 深紫色
    if (price === 7777) return { main: '#b645da', header: '#c860e6', text: '#fff' }; // Medium Deep Purple // 中深紫色
    if (price === 777) return { main: '#d280f0', header: '#dd99f4', text: '#fff' }; // Medium Light Purple // 中浅紫色
    if (price === 177) return { main: '#ebb8fc', header: '#f2cafd', text: '#333' }; // Light Purple (Dark Text) // 浅紫色（深色文本）
    if (price === 77) return { main: '#f5d4ff', header: '#fae5ff', text: '#333' }; // Lightest Purple (Dark Text) // 最浅紫色（深色文本）

    // Standard Bilibili / OBS Tiers
    // 标准 Bilibili / OBS 层级
    // >= 2000: Dark Red
    // >= 2000: 深红色
    if (price >= 2000) return { main: '#B01E34', header: '#FFD4D7', text: '#fff' };
    // >= 1000: Red
    // >= 1000: 红色
    if (price >= 1000) return { main: '#E54D4D', header: '#FFD9D9', text: '#fff' };
    // >= 500: Orange
    // >= 500: 橙色
    if (price >= 500) return { main: '#E09443', header: '#FFEBD6', text: '#fff' };
    // >= 100: Yellow
    // >= 100: 黄色
    if (price >= 100) return { main: '#E2B52B', header: '#FFF7E3', text: '#333' }; // Yellow usually needs dark text // 黄色通常需要深色文本
    // >= 50: Cyan
    // >= 50: 青色
    if (price >= 50) return { main: '#427D9E', header: '#ECF6F9', text: '#fff' };
    // < 50: Blue
    // < 50: 蓝色
    return { main: '#2A60B2', header: '#EDF5FF', text: '#fff' };
  };

  // Helper: Get Relative Time
  // 辅助函数：获取相对时间
  const getRelativeTime = (timestamp) => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;
    
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    return `${Math.floor(diff / 86400)}天前`;
  };

  // Helper: Get Medal Color based on level (Updated to match official snippets)
  // 辅助函数：根据等级获取勋章颜色（更新以匹配官方片段）
  const getMedalColor = (level) => {
    if (level >= 41) return '#9066d3'; // Purple // 紫色
    if (level >= 31) return '#6892ff'; // Blue // 蓝色
    if (level >= 21) return '#5dc0f7'; // Light Blue // 浅蓝色
    if (level >= 11) return '#cf86b2'; // Pink // 粉色
    return '#727bb5'; // Blue Grey (1-10) // 蓝灰色 (1-10)
  };

  // Calculate Totals
  // 计算总计
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
      // 舰长（价格单位为金瓜子/1000）
      if (curr.type === 'guard') {
        return acc + (Number(curr.price) || 0) / 1000;
      }
      
      // Gift (gold only)
      // 礼物（仅限金瓜子）
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
      {/* 头部 */}
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
              {/* 主播信息 */}
              <div className="stat-item anchor-info" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img 
                  src={anchorFace || 'https://i0.hdslb.com/bfs/face/member/noface.jpg'} 
                  alt={anchorName}
                  style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                  referrerPolicy="no-referrer"
                />
                {/* <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{anchorName}</span> */}
              </div>

              {/* 舰长数量 */}
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

              {/* 粉丝团 / 人气 */}
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

              {/* 高能榜人数 */}
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

              {/* 直播时长 */}
              <div className="stat-item" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: '#999', lineHeight: 1 }}>时长</span>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#333', lineHeight: '14px' }}>{liveDuration}</span>
              </div>
              
              {/* 跑马灯占位符（可选，基于图片） */}
              <div className="ticker-placeholder" style={{ display: 'flex', gap: '5px', marginLeft: '10px' }}>
                {/* 稍后可以用最近的 SC/礼物头像填充 */}
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

          {/* 设置按钮（移至最右侧） */}
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
                      <label className="dm-toggle-switch">
                        <input 
                          type="checkbox" 
                          checked={onlyCurrentSession} 
                          onChange={toggleOnlyCurrentSession}
                        />
                        <span className="dm-slider"></span>
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

      {/* 主要内容 */}
      <div className="danmaku-content-area">
        {/* 第一列：弹幕 */}
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
              // 处理分界线
              if (msg.type === 'divider') {
                return (
                  <div key={msg.id} className="danmaku-divider">
                    <span>{msg.content}</span>
                  </div>
                );
              }

              // 从主弹幕列中过滤掉 SC、礼物和舰长消息
              if (msg.type === 'superchat' || msg.type === 'gift' || msg.type === 'guard') {
                return null;
              }

              // 普通弹幕（简单样式）
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
                      {/* 粉丝勋章 */}
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
                                  referrerPolicy="no-referrer"
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
                      
                      {/* 独立舰长图标（仅当没有勋章时） */}
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
                          referrerPolicy="no-referrer"
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
              {unreadCount > 0 ? `新消息 ${unreadCount > 99 ? '99+' : unreadCount}` : '回到最新位置'}
              <span className="arrow-down">↓</span>
            </div>
          )}
        </div>

        {/* 第二列：醒目留言 */}
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
          {showScNewMsgButton && (
            <div className="new-msg-btn" onClick={scrollToBottomSc}>
              {scUnreadCount > 0 ? `新消息 ${scUnreadCount > 99 ? '99+' : scUnreadCount}` : '回到最新位置'}
              <span className="arrow-down">↓</span>
            </div>
          )}
        </div>

        {/* 第三列：礼物和舰长 */}
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
              
              // 计算人民币价格
              // 如果硬币类型是 'gold'，价格通常是 1000 = 1 元 (或 100 = 0.1 元)。
              // 标准 Bilibili API：价格是单价。
              // 对于付费礼物 (gold)，1000 单位 = 1 元。
              // 对于免费礼物 (silver)，我们将其值视为低/0 用于显示目的或显示原始值。
              
              let priceDisplay = '';
              let priceValue = 0;
              
              // 确定显示的有效数量
              const count = msg.totalNum || msg.num || 1;

              if (msg.coinType === 'gold') {
                priceValue = msg.price / 1000;
                // 总价
                const total = priceValue * count;
                const totalFixed = parseFloat(total.toFixed(2)); 
                priceDisplay = `CN¥${totalFixed}`;
              } else if (msg.coinType === 'silver') {
                priceValue = 0; 
                const total = msg.price * count;
                priceDisplay = `${total}银瓜子`;
              } else {
                priceValue = msg.price; 
                const total = msg.price * count;
                priceDisplay = `¥${total}`;
              }

              // 大卡片显示的阈值：舰长 或 价格 >= 9.9 元
              const isLargeCard = isGuard || (msg.coinType === 'gold' && priceValue >= 9.9);

              if (!isLargeCard && msg.coinType === 'gold') {
                priceDisplay = priceDisplay.replace('CN', '');
              }
              
              if (isLargeCard) {
                // 确定背景颜色
                let bgColor = '#23ade5'; // 默认蓝色 (舰长 3 / 舰长)
                let textColor = '#fff';

                if (isGuard) {
                   if (msg.guardLevel === 3) {
                     bgColor = '#23ade5'; // 舰长 (蓝色)
                     textColor = '#fff';
                   }
                   if (msg.guardLevel === 2) {
                     bgColor = '#ae5cff'; // 提督 (淡紫色)
                     textColor = '#fff';
                   }
                   if (msg.guardLevel === 1) {
                     bgColor = '#ff7b52'; // 总督 (淡橙红色)
                     textColor = '#fff';
                   }
                } else {
                   bgColor = '#42B25F'; // 礼物 >= 10 的绿色
                }

                // 确定图标
                let iconSrc = msg.giftIconStatic || msg.giftIcon; // 优先使用静态图标
                if (isGuard) {
                   if (msg.guardLevel === 3) iconSrc = 'https://s1.hdslb.com/bfs/static/blive/live-pay-mono/relation/relation/assets/captain-Bjw5Byb5.png';
                   else if (msg.guardLevel === 2) iconSrc = 'https://s1.hdslb.com/bfs/static/blive/live-pay-mono/relation/relation/assets/supervisor-u43ElIjU.png';
                   else if (msg.guardLevel === 1) iconSrc = 'https://s1.hdslb.com/bfs/static/blive/live-pay-mono/relation/relation/assets/governor-DpDXKEdA.png';
                }

                if (isGuard) {
                  // 舰长卡片布局 (参考：蓝卡)
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
                        <img src={iconSrc} alt="" className="guard-icon-large" referrerPolicy="no-referrer" />
                      </div>
                    </div>
                  );
                } else {
                  // 大礼物卡片布局 (参考：绿卡)
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
                        <div className="gift-highlight-name">
                          {msg.giftName}
                          {count > 1 && (
                            <span style={{ marginLeft: '8px', fontWeight: 'normal' }}>X{count}</span>
                          )}
                        </div>
                      </div>
                      {iconSrc && (
                        <div className="gift-highlight-bg-icon">
                          <img src={iconSrc} alt="" referrerPolicy="no-referrer" />
                        </div>
                      )}
                    </div>
                  );
                }
              } else {
                // 小型紧凑行 (< 10)
                // 小行优先使用静态图标
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
                      <img className="gift-icon-small" src={smallIconSrc} alt="" referrerPolicy="no-referrer" />
                    )}
                    <span className="gift-name-small">{msg.giftName}</span>
                    {count > 1 && (
                      <span className="gift-count-small" style={{ marginLeft: '2px', fontWeight: 'normal', color: '#ff6699' }}>
                        X{count}
                      </span>
                    )}
                    <span className="gift-price-small" style={{ marginLeft: '2px' }}>{priceDisplay}</span>
                  </div>
                );
              }
            })}
            <div ref={giftEndRef} />
          </div>
          {showGiftNewMsgButton && (
            <div className="new-msg-btn" onClick={scrollToBottomGift}>
              {giftUnreadCount > 0 ? `新消息 ${giftUnreadCount > 99 ? '99+' : giftUnreadCount}` : '回到最新位置'}
              <span className="arrow-down">↓</span>
            </div>
          )}
        </div>
      </div>

      {/* 历史场次选择模态框 */}
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

      {/* 用户详情弹窗 */}
      <UserDetailPopup 
        user={selectedUser} 
        position={popupPosition} 
        onClose={() => setSelectedUser(null)} 
      />
    </div>
  );
}

export default DanmakuPage;
