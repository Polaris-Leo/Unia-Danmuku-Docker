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

        for await (const line of rl) {
          if (line.trim()) {
            try {
              history[type].push(JSON.parse(line));
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
