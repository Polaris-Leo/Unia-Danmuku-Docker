import fs from 'fs';
import path from 'path';
import readline from 'readline';

const DATA_DIR = path.join(process.cwd(), 'data', 'history');

/**
 * 确保目录存在
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * 获取会话目录
 */
function getSessionDir(roomId, sessionId) {
  return path.join(DATA_DIR, String(roomId), String(sessionId));
}

/**
 * 获取指定房间的所有历史会话列表
 * @param {string|number} roomId 
 * @returns {Promise<Array>} 会话ID(时间戳)列表，按时间倒序排列
 */
export async function getSessions(roomId) {
  const roomDir = path.join(DATA_DIR, String(roomId));
  if (!fs.existsSync(roomDir)) {
    return [];
  }

  try {
    const files = await fs.promises.readdir(roomDir);
    // 过滤出数字命名的文件夹（时间戳）
    const sessions = files
      .filter(file => /^\d+$/.test(file) && fs.statSync(path.join(roomDir, file)).isDirectory())
      .map(file => parseInt(file, 10))
      .sort((a, b) => b - a); // 倒序排列

    return sessions;
  } catch (error) {
    console.error(`[History] Failed to get sessions for room ${roomId}:`, error);
    return [];
  }
}

/**
 * 保存消息到历史记录 (追加模式)
 * @param {string|number} roomId 直播间ID
 * @param {string|number} sessionId 会话ID (通常是开播时间戳)
 * @param {string} type 消息类型 (danmaku, superchat, gift, guard)
 * @param {object} data 消息数据
 */
export function saveMessage(roomId, sessionId, type, data) {
  if (!roomId || !sessionId) return;

  const sessionDir = getSessionDir(roomId, sessionId);
  ensureDir(sessionDir);

  const filePath = path.join(sessionDir, `${type}.jsonl`);
  const line = JSON.stringify(data) + '\n';

  fs.appendFile(filePath, line, (err) => {
    if (err) {
      console.error(`[History] Failed to save ${type} message:`, err);
    }
  });
}

/**
 * 加载会话历史记录
 * @param {string|number} roomId 直播间ID
 * @param {string|number} sessionId 会话ID
 * @returns {Promise<object>} 包含各类消息数组的对象
 */
export async function loadHistory(roomId, sessionId) {
  if (!roomId || !sessionId) return null;

  const sessionDir = getSessionDir(roomId, sessionId);
  if (!fs.existsSync(sessionDir)) return null;

  const history = {
    danmaku: [],
    superchat: [],
    gift: [],
    guard: []
  };

  const types = ['danmaku', 'superchat', 'gift', 'guard'];

  await Promise.all(types.map(async (type) => {
    const filePath = path.join(sessionDir, `${type}.jsonl`);
    if (fs.existsSync(filePath)) {
      try {
        const fileStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({
          input: fileStream,
          crlfDelay: Infinity
        });

        const seen = new Set();

        for await (const line of rl) {
          if (line.trim()) {
            try {
              const item = JSON.parse(line);
              
              // 生成唯一指纹用于去重
              let fingerprint = '';
              if (type === 'danmaku') {
                // 弹幕：时间戳 + 用户UID + 内容
                fingerprint = `${item.timestamp}-${item.user?.uid}-${item.content}`;
              } else if (type === 'gift') {
                // 礼物：时间戳 + 用户UID + 礼物ID + 数量 + 价格
                fingerprint = `${item.timestamp}-${item.user?.uid}-${item.giftId}-${item.num}-${item.price}`;
              } else if (type === 'superchat') {
                // SC：时间 + 用户UID + 价格
                fingerprint = `${item.time}-${item.user?.uid}-${item.price}`;
              } else if (type === 'guard') {
                // 上舰：时间戳 + 用户UID + 等级
                fingerprint = `${item.timestamp}-${item.user?.uid}-${item.guardLevel}`;
              } else {
                // 其他：直接序列化
                fingerprint = JSON.stringify(item);
              }

              if (!seen.has(fingerprint)) {
                seen.add(fingerprint);
                history[type].push(item);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      } catch (err) {
        console.error(`[History] Failed to load ${type} history:`, err);
      }
    }
  }));

  return history;
}
