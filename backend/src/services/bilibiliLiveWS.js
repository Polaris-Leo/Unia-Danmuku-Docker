import WebSocket from 'ws';
import axios from 'axios';
import pako from 'pako';
import zlib from 'zlib';
import fs from 'fs';
import path from 'path';
import { getCookieString } from '../utils/cookieStorage.js';

/**
 * B站直播间弹幕WebSocket客户端
 */
export class BilibiliLiveWS {
  constructor(roomId, cookies = null) {
    this.roomId = roomId;
    this.cookies = cookies;
    this.ws = null;
    this.heartbeatTimer = null;
    this.isConnected = false;
    this.authInfo = null;
    this.userFaceCache = new Map();  // 用户头像URL缓存
    this.faceCacheFile = path.join(process.cwd(), 'data', 'face-cache.json');
    this.loadFaceCache();  // 加载持久化缓存
    this.isRateLimited = false;  // 是否处于限速状态
    this.rateLimitTime = null;   // 限速触发时间
    this.rateLimitCD = 5 * 60 * 1000;  // CD时间：5分钟
    
    // 事件回调
    this.onDanmaku = null;      // 弹幕消息
    this.onGift = null;          // 礼物消息
    this.onGuard = null;         // 上舰消息
    this.onWelcome = null;       // 欢迎消息
    this.onSuperChat = null;     // SC醒目留言
    this.onLike = null;          // 点赞消息
    this.onWatched = null;       // 看过人数
    this.onRankCount = null;     // 高能榜人数
    this.onEntry = null;         // 进场特效
    this.onPopularity = null;    // 人气值
    this.onError = null;         // 错误
    this.onConnect = null;       // 连接成功
    this.onClose = null;         // 连接关闭
  }

  /**
   * 加载持久化的头像缓存
   */
  loadFaceCache() {
    try {
      if (fs.existsSync(this.faceCacheFile)) {
        const data = JSON.parse(fs.readFileSync(this.faceCacheFile, 'utf-8'));
        this.userFaceCache = new Map(Object.entries(data));
        console.log(`📦 已加载 ${this.userFaceCache.size} 个头像缓存`);
      }
    } catch (error) {
      console.log('⚠️  加载头像缓存失败:', error.message);
    }
  }

  /**
   * 保存头像缓存到文件
   */
  saveFaceCache() {
    try {
      const dir = path.dirname(this.faceCacheFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = Object.fromEntries(this.userFaceCache);
      fs.writeFileSync(this.faceCacheFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.log('⚠️  保存头像缓存失败:', error.message);
    }
  }

  /**
   * 获取用户头像URL（后台异步获取，避免频繁触发限速）
   */
  async getUserFace(uid) {
    // 检查缓存
    if (this.userFaceCache.has(uid)) {
      return this.userFaceCache.get(uid);
    }

    // 先返回默认头像，后台异步获取真实头像
    const defaultFace = 'https://i0.hdslb.com/bfs/face/member/noface.jpg';
    this.fetchUserFaceInBackground(uid);
    return defaultFace;
  }

  /**
   * 后台异步获取用户头像
   */
  async fetchUserFaceInBackground(uid) {
    // 添加随机延迟，避免频率限制（1-3秒）
    const delay = 1000 + Math.random() * 2000;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    console.log(`🔍 后台获取头像: uid=${uid}`);
    
    try {
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.bilibili.com'
      };
      
      // 添加Cookie以获取权限
      if (this.cookies) {
        const cookieStr = getCookieString(this.cookies);
        headers['Cookie'] = cookieStr;
      }
      
      const response = await axios.get('https://api.bilibili.com/x/space/acc/info', {
        params: { mid: uid },
        headers,
        timeout: 8000
      });

      if (response.data.code === 0 && response.data.data && response.data.data.face) {
        const faceUrl = response.data.data.face;
        this.userFaceCache.set(uid, faceUrl);
        this.saveFaceCache();  // 持久化保存
        console.log(`✅ 后台获取成功: uid=${uid}`);
        return faceUrl;
      } else {
        console.log(`⚠️  后台获取失败(${uid}): code=${response.data.code}`);
      }
    } catch (error) {
      console.log(`❌ 后台获取异常(${uid}): ${error.message}`);
    }

    return null;
  }

  /**
   * 连接直播间
   */
  async connect() {
    try {
      // 1. 获取真实房间号
      const realRoomId = await this.getRealRoomId();
      this.roomId = realRoomId;
      console.log(`🏠 真实房间号: ${realRoomId}`);
      
      // 2. 获取认证信息
      this.authInfo = await this.getDanmuInfo();
      
      // 3. 选择服务器
      const host = this.authInfo.host_list[0];
      const wsUrl = `wss://${host.host}:${host.wss_port}/sub`;
      
      console.log(`🔌 正在连接直播间 ${this.roomId}...`);
      
      // 4. 建立WebSocket连接
      this.ws = new WebSocket(wsUrl);
      this.ws.binaryType = 'arraybuffer';
      
      this.ws.onopen = () => this.onOpen();
      this.ws.onmessage = (event) => this.onMessage(event);
      this.ws.onerror = (error) => this.handleError(error);
      this.ws.onclose = () => this.handleClose();
      
    } catch (error) {
      console.error('❌ 连接失败:', error);
      if (this.onError) this.onError(error);
    }
  }

  /**
   * 获取真实房间号
   */
  async getRealRoomId() {
    const url = 'https://api.live.bilibili.com/room/v1/Room/room_init';
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    };
    
    const response = await axios.get(url, {
      params: { id: this.roomId },
      headers
    });
    
    if (response.data.code !== 0) {
      throw new Error(`获取房间信息失败: ${response.data.message || '未知错误'}`);
    }
    
    return response.data.data.room_id;
  }

  /**
   * 获取弹幕服务器信息
   */
  async getDanmuInfo() {
    // 使用旧版API（不需要Wbi签名），但仍然传递Cookie以获取完整权限
    const url = 'https://api.live.bilibili.com/room/v1/Danmu/getConf';
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': `https://live.bilibili.com/${this.roomId}`,
      'Origin': 'https://live.bilibili.com'
    };
    
    // 添加Cookie以获取完整权限
    if (this.cookies) {
      const cookieStr = getCookieString(this.cookies);
      headers['Cookie'] = cookieStr;
      console.log('🍪 使用Cookie请求弹幕服务器信息');
      console.log('   - SESSDATA:', this.cookies.SESSDATA ? '✅ 存在' : '❌ 缺失');
      console.log('   - DedeUserID:', this.cookies.DedeUserID || '❌ 缺失');
      console.log('   - bili_jct:', this.cookies.bili_jct ? '✅ 存在' : '❌ 缺失');
    } else {
      console.log('⚠️  未使用Cookie，将以游客身份连接，用户信息将被脱敏！');
    }
    
    const response = await axios.get(url, {
      params: { 
        room_id: this.roomId, 
        platform: 'pc', 
        player: 'web' 
      },
      headers
    });
    
    if (response.data.code !== 0) {
      throw new Error(`获取弹幕服务器信息失败: ${response.data.code} - ${response.data.message || response.data.msg || '未知错误'}`);
    }
    
    const data = response.data.data;
    
    // 旧版API返回的数据格式需要转换
    return {
      token: data.token,
      host_list: data.host_server_list || data.host_list || []
    };
  }

  /**
   * WebSocket连接成功
   */
  onOpen() {
    console.log('✅ WebSocket连接成功');
    this.isConnected = true;
    
    // 发送认证包
    this.sendAuth();
    
    // 启动心跳
    this.startHeartbeat();
    
    if (this.onConnect) this.onConnect();
  }

  /**
   * 发送认证包
   */
  sendAuth() {
    // 从Cookie中提取uid
    let uid = 0;
    if (this.cookies && this.cookies.DedeUserID) {
      uid = parseInt(this.cookies.DedeUserID) || 0;
    }
    
    if (uid === 0) {
      console.log('⚠️  使用游客身份 (uid=0) 连接，用户信息将被*** 隐藏！');
      console.log('   原因: Cookie中缺少 DedeUserID 字段');
      console.log('   解决: 请确保已正确登录并保存Cookie');
    } else {
      console.log('🔑 认证信息 - UID:', uid, '房间:', this.roomId);
    }
    
    const authData = {
      uid: uid,  // 使用真实uid或游客身份
      roomid: this.roomId,
      protover: 3,  // 使用brotli压缩
      platform: 'web',
      type: 2,
      key: this.authInfo.token
    };
    
    const authStr = JSON.stringify(authData);
    const packet = this.createPacket(authStr, 7);
    this.ws.send(packet);
    
    console.log('📤 已发送认证包');
  }

  /**
   * 创建数据包
   */
  createPacket(data, operation) {
    const body = typeof data === 'string' ? Buffer.from(data) : data;
    const header = Buffer.alloc(16);
    
    header.writeUInt32BE(header.length + body.length, 0); // 总长度
    header.writeUInt16BE(16, 4);                          // 头部长度
    header.writeUInt16BE(1, 6);                           // 协议版本
    header.writeUInt32BE(operation, 8);                   // 操作码
    header.writeUInt32BE(1, 12);                          // sequence
    
    return Buffer.concat([header, body]);
  }

  /**
   * 启动心跳
   */
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        // 心跳包发送空Buffer
        const packet = this.createPacket(Buffer.alloc(0), 2);
        this.ws.send(packet);
      }
    }, 30000); // 30秒一次
  }

  /**
   * 处理WebSocket消息
   */
  async onMessage(event) {
    const buffer = Buffer.from(event.data);
    await this.parsePacket(buffer);
  }

  /**
   * 解析数据包
   */
  async parsePacket(buffer, depth = 0) {
    let offset = 0;
    const indent = '  '.repeat(depth);
    
    while (offset < buffer.length) {
      const remaining = buffer.length - offset;
      
      // 如果剩余数据不足16字节（包头大小）
      if (remaining < 16) {
        if (remaining > 0) {
          console.log(`${indent}⚠️  剩余 ${remaining} 字节 (不足16字节包头)`);
          // 输出剩余字节的十六进制，帮助调试
          console.log(`${indent}   剩余数据(hex):`, buffer.slice(offset, offset + remaining).toString('hex'));
        }
        break;
      }
      
      const packLen = buffer.readUInt32BE(offset);
      const headerLen = buffer.readUInt16BE(offset + 4);
      const ver = buffer.readUInt16BE(offset + 6);
      const op = buffer.readUInt32BE(offset + 8);
      
      // 验证包长度的合理性
      if (packLen < 16) {
        console.log(`${indent}⚠️  包长度过小: ${packLen} (最小应为16)`);
        console.log(`${indent}   包头(hex):`, buffer.slice(offset, offset + 16).toString('hex'));
        break;
      }
      
      if (packLen > remaining) {
        console.log(`${indent}⚠️  包长度 ${packLen} 超出剩余数据 ${remaining}`);
        console.log(`${indent}   这可能表示数据包跨越了边界或数据损坏`);
        break;
      }
      
      // 验证headerLen的合理性
      if (headerLen < 16 || headerLen > packLen) {
        console.log(`${indent}⚠️  无效的包头长度: ${headerLen} (包长: ${packLen})`);
        break;
      }
      
      const body = buffer.slice(offset + headerLen, offset + packLen);
      
      // 处理不同操作码
      switch (op) {
        case 3: // 心跳回复(人气值)
          if (body.length >= 4) {
            const popularity = body.readUInt32BE(0);
            console.log(`${indent}💓 心跳回复 - 人气值:`, popularity);
            if (this.onPopularity) this.onPopularity(popularity);
          }
          break;
          
        case 5: // 普通消息
          console.log(`${indent}📦 收到消息包 - 版本: ${ver}, 长度: ${body.length}, 包总长: ${packLen}`);
          await this.handleMessage(body, ver, depth);
          break;
          
        case 8: // 认证回复
          const authReply = JSON.parse(body.toString());
          if (authReply.code === 0) {
            console.log(`${indent}✅ 认证成功`);
          }
          break;
          
        default:
          console.log(`${indent}⚠️  未知操作码: ${op}, 包长度: ${packLen}`);
          break;
      }
      
      offset += packLen;
    }
  }

  /**
   * 处理消息
   */
  async handleMessage(body, ver, depth = 0) {
    const indent = '  '.repeat(depth);
    
    // 根据协议版本解压
    if (ver === 2) {
      // zlib压缩
      try {
        console.log(`${indent}🗜️  解压 zlib 数据 (原始: ${body.length} 字节)...`);
        const unzipped = pako.inflate(body);
        console.log(`${indent}   解压后: ${unzipped.length} 字节`);
        await this.parsePacket(Buffer.from(unzipped), depth + 1);
        return;
      } catch (e) {
        console.error(`${indent}❌ zlib解压失败:`, e.message);
        return;
      }
    } else if (ver === 3) {
      // brotli压缩
      try {
        console.log(`${indent}🗜️  解压 brotli 数据 (原始: ${body.length} 字节)...`);
        const unzipped = zlib.brotliDecompressSync(body);
        console.log(`${indent}   解压后: ${unzipped.length} 字节`);
        await this.parsePacket(Buffer.from(unzipped), depth + 1);
        return;
      } catch (e) {
        console.error(`${indent}❌ brotli解压失败:`, e.message);
        return;
      }
    }
    
    // 解析JSON
    try {
      const json = JSON.parse(body.toString());
      await this.handleCommand(json);
    } catch (e) {
      console.error(`${indent}❌ JSON解析失败:`, e.message);
    }
  }

  /**
   * 处理命令
   */
  async handleCommand(data) {
    const cmd = data.cmd;
    console.log('📨 收到消息:', cmd);
    
    switch (cmd) {
      case 'DANMU_MSG': // 弹幕
        const info = data.info;
        
        // 方式1: 从 info[0][13] 获取单个表情（大表情，通常是单独发送的）
        let emots = {};
        let content = info[1]; // 弹幕内容
        
        if (info[0] && info[0][13] && info[0][13].emoticon_unique) {
          const emoticon = info[0][13];
          // 当有 info[0][13] 时，说明这是一个大表情弹幕
          // 弹幕内容本身就是表情的文本（如"乐"、"摆"）
          // 我们需要将内容包装成 [xxx] 格式，这样前端才能匹配
          const emotKey = `[${content}]`;
          emots[emotKey] = {
            url: emoticon.url,
            width: emoticon.width || 60,
            height: emoticon.height || 60,
            emoticon_id: emoticon.emoticon_id,
            emoticon_unique: emoticon.emoticon_unique
          };
          // 修改内容为带方括号的格式，让前端能匹配
          content = emotKey;
          console.log('🎨 大表情弹幕:', emotKey, '->', emoticon.url);
        }
        
        // 方式2: 从 info[0][15].extra.emots 获取多个小表情
        try {
          if (info[0] && info[0][15] && info[0][15].extra) {
            const extra = typeof info[0][15].extra === 'string' 
              ? JSON.parse(info[0][15].extra) 
              : info[0][15].extra;
            
            // extra.emots 包含文本中的小表情
            if (extra.emots && Object.keys(extra.emots).length > 0) {
              // 合并到 emots 对象
              Object.assign(emots, extra.emots);
              console.log('🎨 文本小表情:', Object.keys(extra.emots).join(', '));
            }
          }
        } catch (e) {
          console.log('⚠️  表情包解析失败:', e.message);
        }
        
        // 如果没有任何表情，设为 null
        const finalEmots = Object.keys(emots).length > 0 ? emots : null;
        
        // 从协议中直接获取用户信息（包括头像）
        const uid = info[2][0];
        const userInfo = info[0]?.[15]?.user?.base;
        const face = userInfo?.face || 'https://i0.hdslb.com/bfs/face/member/noface.jpg';  // 协议中的头像或默认头像
        
        const danmaku = {
          type: 'danmaku',
          user: {
            uid: uid,
            username: info[2][1],
            isAdmin: info[2][2] === 1,
            isVip: info[2][3] === 1,
            isSvip: info[2][4] === 1,
            guardLevel: info[7] || 0,  // 大航海等级: 0=无, 1=总督, 2=提督, 3=舰长
            face: face  // 优先使用协议中的头像，fallback到API
          },
          content: content,  // 使用修改后的内容
          timestamp: info[9].ts,
          medal: info[3] && info[3].length > 0 ? {
            level: info[3][0],
            name: info[3][1],
            upName: info[3][2],
            roomId: info[3][3]
          } : null,
          emots: finalEmots  // 使用合并后的表情信息
        };
        
        console.log('💬 弹幕:', danmaku.user.username, '-', danmaku.content);
        if (danmaku.emots) {
          console.log('🎨 表情包:', Object.keys(danmaku.emots));
        }
        
        if (this.onDanmaku) this.onDanmaku(danmaku);
        break;
        
      case 'SEND_GIFT': // 礼物
        const gift = {
          type: 'gift',
          user: {
            uid: data.data.uid,
            username: data.data.uname,
            face: data.data.face
          },
          giftName: data.data.giftName,
          giftId: data.data.giftId,
          num: data.data.num,
          price: data.data.price,
          coinType: data.data.coin_type,
          totalCoin: data.data.total_coin,
          timestamp: data.data.timestamp
        };
        if (this.onGift) this.onGift(gift);
        break;
        
      case 'GUARD_BUY': // 上舰
        const guard = {
          type: 'guard',
          user: {
            uid: data.data.uid,
            username: data.data.username
          },
          guardLevel: data.data.guard_level,
          num: data.data.num,
          price: data.data.price,
          giftName: data.data.gift_name
        };
        if (this.onGuard) this.onGuard(guard);
        break;
        
      case 'INTERACT_WORD': // 进房欢迎
      case 'INTERACT_WORD_V2': // 进房欢迎V2
        const username = data.data.uname || data.data.name || '';
        // 过滤掉空用户名、默认用户名和脱敏用户名
        if (!username || username === '用户' || username.includes('*')) {
          // 静默跳过
          break;
        }
        
        const welcome = {
          type: 'welcome',
          user: {
            uid: data.data.uid || 0,
            username: username
          },
          msgType: data.data.msg_type || 1, // 1:进入 2:关注 3:分享
          timestamp: data.data.timestamp
        };
        if (this.onWelcome) this.onWelcome(welcome);
        break;
        
      case 'SUPER_CHAT_MESSAGE': // SC醒目留言
        const sc = {
          type: 'superchat',
          user: {
            uid: data.data.uid,
            username: data.data.user_info.uname,
            face: data.data.user_info.face
          },
          price: data.data.price,
          message: data.data.message,
          time: data.data.time,
          backgroundColor: data.data.background_bottom_color
        };
        console.log('💎 SC:', sc.user.username, '-', sc.price, '元 -', sc.message);
        if (this.onSuperChat) this.onSuperChat(sc);
        break;
        
      case 'LIKE_INFO_V3_CLICK': // 点赞
        // 过滤掉点赞消息，不显示
        break;
        
      case 'WATCHED_CHANGE': // 看过人数变化
        const watched = {
          type: 'watched',
          num: data.data.num,
          textSmall: data.data.text_small,
          textLarge: data.data.text_large
        };
        if (this.onWatched) this.onWatched(watched);
        break;
        
      case 'ONLINE_RANK_COUNT': // 高能榜人数
        const rankCount = {
          type: 'rank_count',
          count: data.data.count
        };
        if (this.onRankCount) this.onRankCount(rankCount);
        break;
        
      case 'ENTRY_EFFECT': // 进场特效
        // 过滤掉进场特效消息，不显示
        break;
        
      case 'LIKE_INFO_V3_UPDATE': // 点赞数更新
        // 静默处理，不输出
        break;
        
      case 'ONLINE_RANK_V3': // 高能榜V3
      case 'STOP_LIVE_ROOM_LIST': // 停播房间列表
        // 这些消息数据量大但用处不大，静默处理
        break;
      
      default:
        // 只记录真正未处理的消息类型
        if (cmd && !cmd.startsWith('_') && !cmd.includes('ONLINE_RANK') && !cmd.includes('ROOM_LIST')) {
          console.log('ℹ️  未知消息:', cmd);
        }
        break;
    }
  }

  /**
   * 错误处理
   */
  handleError(error) {
    console.error('❌ WebSocket错误:', error);
    if (this.onError) this.onError(error);
  }

  /**
   * 连接关闭
   */
  handleClose() {
    console.log('🔌 WebSocket连接已关闭');
    this.isConnected = false;
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    if (this.onClose) this.onClose();
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    this.isConnected = false;
  }
}
