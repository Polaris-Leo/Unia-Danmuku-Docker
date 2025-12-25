import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMonitoredRooms, addMonitoredRoom, removeMonitoredRoom, pauseMonitoredRoom, resumeMonitoredRoom } from '../services/api';
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
    if (!window.confirm(`确定要取消监控房间 ${roomId} 吗？`)) return;

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

  const handleTogglePause = async (room) => {
    try {
      if (room.paused) {
        await resumeMonitoredRoom(room.roomId);
      } else {
        await pauseMonitoredRoom(room.roomId);
      }
      fetchRooms();
    } catch (error) {
      console.error('Failed to toggle pause:', error);
      alert('操作失败');
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
                <div className="room-header-left">
                  {room.face ? (
                    <img src={room.face} alt={room.uname} className="room-face" />
                  ) : (
                    <div className="room-face-placeholder"></div>
                  )}
                  <div className="room-header-info">
                    <span className="room-uname">{room.uname || '加载中...'}</span>
                    <span className="room-id">房间号: {room.roomId}</span>
                  </div>
                </div>
                <span className={`room-status ${room.liveStatus === 1 ? 'online' : 'offline'}`}>
                  {room.liveStatus === 1 ? '直播中' : '未开播'}
                </span>
              </div>
              <div className="room-card-body">
                <div className="room-info-item">
                  状态: {room.paused ? '已暂停' : (room.connected ? '监控中' : '连接中...')}
                </div>
              </div>
              <div className="room-card-actions">
                <button 
                  className={`btn-view ${room.paused ? 'btn-resume' : 'btn-pause'}`}
                  onClick={() => handleTogglePause(room)}
                >
                  {room.paused ? '恢复监控' : '暂停监控'}
                </button>
                <button 
                  className="btn-delete"
                  onClick={() => handleRemoveRoom(room.roomId)}
                >
                  取消监控
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