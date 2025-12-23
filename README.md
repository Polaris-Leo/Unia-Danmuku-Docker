# Unia-Danmuku 弹幕系统

<div align="center">

🎉 一个基于 B站直播的 OBS 弹幕姬系统

![React](https://img.shields.io/badge/React-18.2.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-Express-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

</div>

## 📖 项目简介

Unia-Danmuku 是一个专为 Unia 设计的弹幕姬系统，支持实时弹幕接收、OBS 浏览器源显示、SC（醒目留言）展示等功能。通过简洁优雅的界面设计和高度可定制的样式系统，让主播能够轻松打造属于自己的直播弹幕效果。

### 📚 快速导航

- 📖 [Docker部署指南](DOCKER.md) -Docker镜像构建详细步骤
- 💡 [使用指南](#-使用指南) - 功能使用说明
- 🐛 [常见问题](#-常见问题) - 问题排查

## ✨ 功能特性

### 🎯 核心功能

- **📺 实时弹幕接收**

  - 基于 WebSocket 的实时弹幕推送
  - 支持多种弹幕消息类型（普通弹幕、醒目留言、礼物、上舰等）
  - 稳定的长连接机制，自动重连
- **💬 OBS 弹幕姬**

  - 支持 OBS Studio 浏览器源集成
  - 多种弹幕样式（简洁模式、气泡模式）
  - 高度可定制的样式系统
  - 实时预览效果
  - 支持舰长等级显示
  - SC（醒目留言）特效展示
- **🔐 B站登录系统**

  - 扫码登录支持
  - Cookie 持久化存储
  - 自动状态检查
- **🎨 样式定制**

  - 用户名样式（字体、大小、颜色、粗细）
  - 弹幕内容样式（字体、大小、颜色、粗细）
  - 舰长等级颜色自定义
  - SC 特效时长设置
  - 实时预览功能

### 🚧 开发中功能

- 👥 直播信息面板
- 📊 数据统计分析
- 更多功能敬请期待...

## 🛠️ 技术栈

### 前端

- **React 18.2** - UI 框架
- **React Router** - 路由管理
- **Vite** - 构建工具
- **Axios** - HTTP 客户端
- **WebSocket** - 实时通信

### 后端

- **Node.js** - 运行时
- **Express** - Web 框架
- **bilibili-live-ws** - B站直播 WebSocket 库
- **ws** - WebSocket 服务器
- **QRCode** - 二维码生成

## 📦 安装部署

### 环境要求

- Node.js >= 16.0.0
- npm 或 yarn 包管理器

### 克隆项目

```bash
git clone https://github.com/yourusername/Unia-Danmuku.git
cd Unia-Danmuku
```

### 安装依赖

#### 后端依赖

```bash
cd backend
npm install
```

#### 前端依赖

```bash
cd frontend
npm install
```

### 配置环境变量

在 `backend` 目录下创建 `.env` 文件：

```env
PORT=3001
FRONTEND_URL=http://localhost:5173
```

### 启动服务

#### 开发环境启动

**启动后端服务**

```bash
cd backend
npm start
# 或使用开发模式（自动重启）
npm run dev
```

**启动前端服务**

```bash
cd frontend
npm run dev
```

### 生产环境部署

#### 🖥️ 一键启动（推荐）

**Windows 系统**

双击运行 `start.bat` 脚本，会自动：

- 检查并安装依赖
- 构建前端静态文件
- 启动后端服务
- 生成日志文件

停止服务：双击运行 `stop.bat`

**Linux/Mac 系统**

```bash
# 添加执行权限
chmod +x start.sh stop.sh

# 启动服务
./start.sh

# 停止服务
./stop.sh
```

#### ⚙️ 开机自启配置

##### Windows 系统（使用 Windows 服务）

1. **安装服务**（需要管理员权限）

   右键点击 PowerShell，选择"以管理员身份运行"，然后执行：

   ```powershell
   .\install-windows-service.ps1
   ```
2. **服务管理命令**

   ```powershell
   # 启动服务
   net start UniaDanmuku

   # 停止服务
   net stop UniaDanmuku

   # 查看服务状态
   sc query UniaDanmuku
   ```
3. **卸载服务**

   ```powershell
   .\uninstall-windows-service.ps1
   ```

##### Linux 系统（使用 systemd）

1. **编辑服务配置文件**

   打开 `unia-danmuku.service` 文件，修改以下内容：

   ```ini
   User=YOUR_USERNAME                                    # 改为你的用户名
   WorkingDirectory=/path/to/Unia-Danmuku/backend       # 改为实际路径
   ExecStart=/usr/bin/node /path/to/Unia-Danmuku/backend/src/server.js
   ```
2. **安装服务**

   ```bash
   # 复制服务文件到系统目录
   sudo cp unia-danmuku.service /etc/systemd/system/

   # 创建日志目录
   sudo mkdir -p /var/log/unia-danmuku
   sudo chown YOUR_USERNAME:YOUR_USERNAME /var/log/unia-danmuku

   # 重新加载 systemd 配置
   sudo systemctl daemon-reload

   # 启用开机自启
   sudo systemctl enable unia-danmuku

   # 启动服务
   sudo systemctl start unia-danmuku
   ```
3. **服务管理命令**

   ```bash
   # 查看服务状态
   sudo systemctl status unia-danmuku

   # 启动服务
   sudo systemctl start unia-danmuku

   # 停止服务
   sudo systemctl stop unia-danmuku

   # 重启服务
   sudo systemctl restart unia-danmuku

   # 查看日志
   sudo journalctl -u unia-danmuku -f

   # 禁用开机自启
   sudo systemctl disable unia-danmuku
   ```

#### 🌐 反向代理配置（可选）

如果需要使用域名访问，建议配置 Nginx 反向代理：

**Nginx 配置示例**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/Unia-Danmuku/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }
}
```

#### 📊 进程管理（可选）

也可以使用 PM2 进行进程管理：

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start backend/src/server.js --name unia-danmuku

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status

# 查看日志
pm2 logs unia-danmuku

# 重启服务
pm2 restart unia-danmuku

# 停止服务
pm2 stop unia-danmuku
```

## 🚀 使用指南

### 1. 登录 B站账号

1. 访问 `http://localhost:5173`
2. 点击"扫码登录"按钮
3. 使用 B站 APP 扫描二维码
4. 登录成功后会自动跳转到控制面板

### 2. 配置 OBS 弹幕姬

#### 进入样式设置页面

1. 登录后进入控制面板
2. 点击"OBS弹幕姬"进入 OBS 弹幕显示页面
3. 点击"样式设置"按钮进入设置页面

#### 自定义样式

在设置页面可以调整以下内容：

- **样式类型**：简洁模式 / 气泡模式
- **用户名样式**：字体、大小、颜色、粗细
- **弹幕内容样式**：字体、大小、颜色、粗细
- **舰长等级颜色**：总督、提督、舰长
- **SC 显示时长**：醒目留言的展示时间

#### 添加到 OBS

1. 打开 OBS Studio
2. 添加"浏览器"源
3. 设置 URL：
   - 普通模式：`http://localhost:5173/obs-danmaku`
   - 测试模式：`http://localhost:5173/obs-danmaku?test=true`
4. 设置宽度：1920，高度：1080
5. 勾选"关闭源时刷新浏览器"
6. 点击"确定"

### 3. 连接直播间

1. 在 OBS 弹幕页面输入 B站直播间房间号
2. 点击"连接"按钮
3. 连接成功后即可实时接收弹幕

### 4. 测试模式

在 OBS 弹幕页面 URL 后添加 `?test=true` 参数，可以启用测试模式：

- 显示"发送测试弹幕"按钮
- 可以手动发送各种类型的测试消息
- 方便调试样式效果

## 📂 项目结构

```
Unia-Danmuku/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── server.js       # 服务器入口
│   │   ├── routes/         # API 路由
│   │   │   ├── auth.js     # 登录认证路由
│   │   │   └── danmaku.js  # 弹幕相关路由
│   │   ├── services/       # 业务逻辑
│   │   │   ├── bilibiliAuth.js      # B站登录服务
│   │   │   ├── bilibiliLiveWS.js    # B站直播 WebSocket
│   │   │   └── biliLiveService.js   # 直播服务
│   │   └── utils/          # 工具类
│   │       └── cookieStorage.js     # Cookie 存储
│   ├── data/               # 数据存储
│   │   └── cookies.json    # Cookie 持久化
│   └── package.json
│
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── App.jsx         # 应用主组件
│   │   ├── main.jsx        # 入口文件
│   │   ├── pages/          # 页面组件
│   │   │   ├── LoginPage.jsx           # 登录页
│   │   │   ├── DashboardPage.jsx       # 控制面板
│   │   │   ├── DanmakuPage.jsx         # 弹幕测试页
│   │   │   ├── ObsDanmakuPage.jsx      # OBS 弹幕显示页
│   │   │   └── ObsSettingsPage.jsx     # 样式设置页
│   │   └── services/       # API 服务
│   │       └── api.js      # API 请求封装
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── logs/                   # 日志文件目录
│   ├── backend.log         # 后端服务日志
│   └── error.log           # 错误日志
│
├── start.bat               # Windows 一键启动脚本
├── stop.bat                # Windows 停止脚本
├── start.sh                # Linux/Mac 启动脚本
├── stop.sh                 # Linux/Mac 停止脚本
├── install-windows-service.ps1    # Windows 服务安装脚本
├── uninstall-windows-service.ps1  # Windows 服务卸载脚本
├── unia-danmuku.service    # Linux systemd 服务配置
└── README.md               # 项目文档
```

## 🎨 弹幕类型支持

| 类型          | 说明               | 图标 |
| ------------- | ------------------ | ---- |
| 普通弹幕      | 观众发送的文字消息 | 💬   |
| 醒目留言 (SC) | 付费醒目留言       | 💰   |
| 礼物          | 观众赠送的礼物     | 🎁   |
| 上舰          | 购买舰长           | ⚓   |
| 续费舰长      | 舰长续费           | 🔄   |

## ⚙️ 配置说明

### 后端配置

- **PORT**: 后端服务端口（默认：3001）
- **FRONTEND_URL**: 前端地址（用于 CORS 配置）

### 前端配置

修改 `frontend/src/services/api.js` 中的 API 地址：

```javascript
const API_BASE_URL = 'http://localhost:3001/api';
```

## 🐛 常见问题

### 1. 登录后无法接收弹幕？

- 检查后端服务是否正常运行
- 确认 Cookie 是否保存成功
- 尝试重新登录

### 2. OBS 中弹幕不显示？

- 检查浏览器源 URL 是否正确
- 确认浏览器源的宽度和高度设置
- 查看 OBS 日志是否有错误信息

### 3. 样式修改不生效？

- 刷新 OBS 浏览器源
- 清除浏览器缓存
- 检查本地存储是否保存成功

### 4. Windows 服务安装失败？

- 确保以管理员权限运行 PowerShell
- 检查 Node.js 是否正确安装
- 查看错误日志：`logs/backend.log`
- 尝试手动安装 node-windows：`cd backend && npm install node-windows`

### 5. Linux 系统服务无法启动？

- 检查服务配置文件中的路径是否正确
- 确认用户权限：`sudo chown -R $USER:$USER /path/to/Unia-Danmuku`
- 查看系统日志：`sudo journalctl -u unia-danmuku -n 50`
- 检查端口是否被占用：`sudo lsof -i :3001`

### 6. 服务器上无法访问前端页面？

- 确认前端已正确构建：`cd frontend && npm run build`
- 检查防火墙是否开放对应端口
- 如果使用域名，检查 DNS 解析是否正确
- 建议配置 Nginx 反向代理

### 7. WebSocket 连接失败？

- 检查后端服务是否正常运行
- 确认 WebSocket 端口未被防火墙阻止
- 如果使用反向代理，确保正确配置 WebSocket 转发
- 查看浏览器控制台错误信息

## 📝 开发计划

- [ ] 直播信息面板
- [ ] 数据统计与分析
- [ ] 弹幕过滤与关键词屏蔽
- [ ] 自动回复功能
- [ ] 粉丝牌等级显示
- [ ] 更多弹幕特效
- [ ] 移动端支持

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 开源协议

本项目采用 [MIT](LICENSE) 协议开源。

## 👨‍💻 作者

- GitHub: [@yourusername](https://github.com/yourusername)

## 🙏 致谢

- [bilibili-live-ws](https://github.com/simon300000/bilibili-live-ws) - B站直播 WebSocket 库
- [React](https://reactjs.org/) - 前端框架
- [Express](https://expressjs.com/) - 后端框架
- [Vite](https://vitejs.dev/) - 构建工具

---

<div align="center">

**⭐ 如果这个项目对你有帮助，欢迎给个 Star！⭐**

Made with ❤️ by Unia Team

</div>
