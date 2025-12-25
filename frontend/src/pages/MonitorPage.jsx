import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMonitoredRooms, addMonitoredRoom, removeMonitoredRoom } from '../services/api';
import './MonitorPage.css';

const MonitorPage = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newRoomId, setNewRoomId] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const data = await getMonitoredRooms();
      if (data.success) {
        setRooms(data.rooms);
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoom = async (e) => {
    e.preventDefault();
    if (!newRoomId) return;

    try {
      setAdding(true);
      const data = await addMonitoredRoom(newRoomId);
      if (data.success) {
        setNewRoomId('');
        fetchRooms();
      } else {
        alert(data.message || '添加失败');
      }
    } catch (error) {
      console.error('Failed to add room:', error);
      alert('添加失败，请检查网络或房间号');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveRoom = async (roomId) => {
    if (!window.confirm(`确定要停止监控房间 ${roomId} 吗？`)) return;

    try {
      const data = await removeMonitoredRoom(roomId);
      if (data.success) {
        fetchRooms();
      } else {
        alert(data.message || '移除失败');
      }
    } catch (error) {
      console.error('Failed to remove room:', error);
      alert('移除失败');
    }
  };

  return (
    <div className="monitor-container">
      <div className="monitor-header">
        <h2>后台持续监控配置</h2>
        <Link to="/" className="btn-view">返回首页</Link>
      </div>

      <form className="add-room-form" onSubmit={handleAddRoom}>
        <input
          type="text"
          placeholder="输入B站直播间房间号"
          value={newRoomId}
          onChange={(e) => setNewRoomId(e.target.value)}
          disabled={adding}
        />
        <button type="submit" disabled={adding || !newRoomId}>
          {adding ? '添加中...' : '添加监控'}
        </button>
      </form>

      {loading ? (
        <div className="loading-state">加载中...</div>
      ) : rooms.length === 0 ? (
        <div className="empty-state">暂无监控的直播间</div>
      ) : (
        <div className="room-grid">
          {rooms.map((room) => (
            <div key={room.roomId} className="room-card">
              <div className="room-card-header">
                <span className="room-id">房间号: {room.roomId}</span>
                <span className={`room-status ${room.connected ? 'online' : 'offline'}`}>
                  {room.connected ? '监控中' : '连接断开'}
                </span>
              </div>
              <div className="room-card-body">
                <div className="room-info-item">
                  添加时间: {new Date(room.addedAt).toLocaleString()}
                </div>
                {room.title && (
                  <div className="room-info-item">
                    标题: {room.title}
                  </div>
                )}
                {room.uname && (
                  <div className="room-info-item">
                    主播: {room.uname}
                  </div>
                )}
              </div>
              <div className="room-card-actions">
                <Link to={`/danmaku/${room.roomId}`} className="btn-view">
                  查看弹幕
                </Link>
                <button 
                  className="btn-delete"
                  onClick={() => handleRemoveRoom(room.roomId)}
                >
                  停止监控
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MonitorPage;