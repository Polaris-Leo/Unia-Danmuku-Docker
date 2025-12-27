import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import './ThankYouPage.css';

const ThankYouPage = () => {
  const [searchParams] = useSearchParams();
  const [queue, setQueue] = useState([]);
  const [currentGift, setCurrentGift] = useState(null);
  const [ws, setWs] = useState(null);
  const audioRef = useRef(new Audio('/thankyou.mp3'));
  const processingRef = useRef(false);
  const [config, setConfig] = useState({
    audioEnabled: true,
    audioVolume: 1.0,
    backgroundImg: '',
    template: '感谢 {sender} 的 {gift} * {count} ({price} 元)',
    guardTemplate: '感谢 {sender} 开通 {gift} * {count}',
    fontFamily: 'Microsoft YaHei',
    fontSize: 28,
    fontColor: '#333333',
    fontWeight: 'bold',
    minPrice: 9.9,
    ignoreFree: true,
    displayDuration: 5000
  });

  useEffect(() => {
    // Load config from localStorage
    const savedConfig = localStorage.getItem('thankYouConfig');
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig);
      setConfig(prev => ({ ...prev, ...parsed }));
      
      // Update Audio Volume
      if (audioRef.current) {
        audioRef.current.volume = parsed.audioVolume !== undefined ? parsed.audioVolume : 1.0;
      }
    }
    
    connectWebSocket();
    return () => {
      if (ws) ws.close();
    };
  }, []);

  useEffect(() => {
    if (queue.length > 0 && !processingRef.current) {
      processQueue();
    }
  }, [queue]);

  const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:3001`;
    const newWs = new WebSocket(wsUrl);

    newWs.onopen = () => {
      console.log('Connected to WebSocket');
    };

    newWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleMessage(data);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    newWs.onclose = () => {
      console.log('WebSocket disconnected, reconnecting...');
      setTimeout(connectWebSocket, 3000);
    };

    setWs(newWs);
  };

  const handleMessage = (data) => {
    if (data.type === 'gift' || data.type === 'guard') {
      let price = 0;
      
      if (data.type === 'guard') {
        // Guard price is usually in gold/1000
        price = (Number(data.price) || 0) / 1000;
      } else {
        // Gift
        if (data.coinType === 'gold') {
          price = (Number(data.price) || 0) / 1000;
        } else {
          // Silver gifts
          price = 0;
        }
      }

      // Filter based on config
      if (config.ignoreFree && price <= 0 && data.type !== 'guard') return;
      if (price < config.minPrice && data.type !== 'guard') return;

      const giftItem = {
        ...data,
        priceInCny: price,
        id: Date.now() + Math.random()
      };
      setQueue(prev => [...prev, giftItem]);
    }
  };

  const processQueue = async () => {
    if (queue.length === 0) return;

    processingRef.current = true;
    const nextGift = queue[0];
    setQueue(prev => prev.slice(1));
    setCurrentGift(nextGift);

    // Play Audio
    if (config.audioEnabled) {
      try {
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
      } catch (e) {
        console.error("Audio play failed", e);
      }
    }

    // Wait for duration
    setTimeout(() => {
      setCurrentGift(null);
      processingRef.current = false;
      // Trigger next processing if queue has items
      if (queue.length > 0) {
        // Small delay between items
        setTimeout(() => processQueue(), 500); 
      }
    }, config.displayDuration);
  };

  if (!currentGift) {
    return <div className="thank-you-container empty"></div>;
  }

  const isGuard = currentGift.type === 'guard';
  
  // Format Message
  let message = '';
  if (isGuard) {
    message = (config.guardTemplate || '感谢 {sender} 开通 {gift} * {count}')
      .replace('{sender}', currentGift.user?.username)
      .replace('{gift}', currentGift.giftName)
      .replace('{count}', currentGift.num || 1)
      .replace('{price}', currentGift.priceInCny);
  } else {
    message = (config.template || '感谢 {sender} 的 {gift} * {count} ({price} 元)')
      .replace('{sender}', currentGift.user?.username)
      .replace('{gift}', currentGift.giftName)
      .replace('{count}', currentGift.num || 1)
      .replace('{price}', currentGift.priceInCny);
  }

  return (
    <div className="thank-you-container active" style={{
      fontFamily: config.fontFamily,
      fontWeight: config.fontWeight
    }}>
      <div className="thank-you-card" style={{
        backgroundImage: config.backgroundImg ? `url(${config.backgroundImg})` : 'none',
        backgroundSize: 'cover'
      }}>
        <div className="thank-you-header">
          <img 
            src={currentGift.user?.face || 'https://i0.hdslb.com/bfs/face/member/noface.jpg'} 
            className="user-avatar" 
            alt="avatar"
            referrerPolicy="no-referrer"
          />
          <div className="user-info">
            <div className="username" style={{ color: config.fontColor }}>{currentGift.user?.username}</div>
          </div>
        </div>
        
        <div className="gift-display">
          {/* Use static icon if available, else dynamic */}
          <img 
            src={currentGift.giftIconStatic || currentGift.giftIcon || (isGuard ? getGuardIcon(currentGift.guardLevel) : '')} 
            className="gift-icon" 
            alt="gift" 
          />
          <div className="gift-count">x {currentGift.num || 1}</div>
        </div>

        <div className="thank-you-message" style={{ 
          fontSize: `${config.fontSize}px`,
          color: config.fontColor 
        }}>
          {message}
        </div>
      </div>
    </div>
  );
};

// Helper for guard icons
const getGuardIcon = (level) => {
  if (level === 3) return 'https://s1.hdslb.com/bfs/static/blive/live-pay-mono/relation/relation/assets/captain-Bjw5Byb5.png';
  if (level === 2) return 'https://s1.hdslb.com/bfs/static/blive/live-pay-mono/relation/relation/assets/supervisor-u43ElIjU.png';
  if (level === 1) return 'https://s1.hdslb.com/bfs/static/blive/live-pay-mono/relation/relation/assets/governor-DpDXKEdA.png';
  return '';
};

export default ThankYouPage;
