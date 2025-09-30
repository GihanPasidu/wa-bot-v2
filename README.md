# 🚀 CloudNextra WhatsApp Bot V2.0

<div align="center">
  
[![Version](https://img.shields.io/badge/Version-2.0.0-brightgreen.svg)](https://github.com/GihanPasidu/WA-BOT)
[![Node](https://img.shields.io/badge/Node.js-20%2B-blue.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ed.svg)](https://docker.com)
[![Render](https://img.shields.io/badge/Render-Deploy-46e3b7.svg)](https://render.com)
[![License](https://img.shields.io/badge/License-Apache%202.0-yellow.svg)](LICENSE)

**The Ultimate Professional WhatsApp Bot - Now with V2.0 Power! 💪**

</div>

---

## 🌟 What's New in V2.0

### 🔥 **Enhanced Features**
- 🎨 **Professional UI Design** - Stunning Unicode borders and emoji-rich interfaces
- 🤖 **Advanced Auto-Reply System** - 14+ intelligent greeting responses
- 📊 **Real-time Analytics** - Comprehensive usage statistics and monitoring
- 🛡️ **Enhanced Security** - Better call blocking and privacy controls
- ⚡ **Performance Boost** - Optimized codebase with faster response times
- 🔄 **Enterprise Resilience** - Auto-restart, exponential backoff, self-healing

### 🆕 **New Commands**
-  **Enhanced Control Panel** - Complete dashboard with system analytics

### 🎯 **Professional Improvements**
- 📋 **Structured Messages** - All responses now feature professional formatting
- 🎨 **Visual Appeal** - Unicode box-drawing characters for beautiful layouts
- 📈 **Better UX** - Intuitive command structure and helpful error messages
- 🔄 **Smart Retry Logic** - Enhanced connection stability and auto-recovery
- 👤 **Persistent Presence** - Offline status now persists through reconnections
- 🏥 **Self-Healing System** - Automatic recovery from network issues and platform events

---

## ✨ Core Features

### 🤖 **Smart Bot Capabilities**
- 🔐 **Multi-device WhatsApp Connection** - Seamless Baileys integration
- 📱 **QR Code Web Interface** - No terminal checking needed!
- 👀 **Auto-View Status Updates** - Intelligent status viewing (not messages)
- 🎭 **Presence Management** - Control online/offline status dynamically (persistent state)
- 🎛️ **Bot Control System** - Enable/disable bot functionality with `.onbot`/`.offbot`
- 🌐 **Beautiful Web Dashboard** - Real-time status and analytics
- ⚡ **Lightning-Fast Processing** - Optimized message handling
- 🔄 **Auto-Reconnection** - Smart retry logic with exponential backoff
- 🐳 **Docker Containerization** - Easy deployment anywhere
- ☁️ **Render Deployment Ready** - One-click cloud deployment

### 🏥 **Enterprise Resilience** 
- 🔄 **Auto-Restart System** - Survives platform hibernation and redeploys
- 📈 **Exponential Backoff** - Smart retry delays (5s → 2min) with jitter
- 🎯 **Error Classification** - Network, auth, rate-limit specific handling
- 📊 **Health Monitoring** - Real-time health scores and diagnostics
- 🔧 **Self-Healing** - Automatic auth clearing and connection recovery
- 📡 **Advanced Endpoints** - `/health` and `/monitor` for observability

### 🛡️ **Security & Privacy**
- 📞 **Advanced Call Blocking** - Block unwanted calls automatically
- 🔒 **Private Chat Only** - Auto-reply works only in private chats
- 🛡️ **Self-Chat Commands** - Commands only work in your own chat
- 🔐 **Secure Authentication** - Multi-file auth state management
- 🚫 **No Group Auto-Reply** - Prevents spam in group chats

---## 🎮 Command Reference

### 📊 **System Commands**
| Command | Description | Usage | V2.0 Status |
|---------|-------------|-------|-------------|
| `.info` | 📈 Detailed bot analytics & system information | `.info` | ✅ Enhanced |
| `.panel` | 🎛️ Complete control dashboard with analytics | `.panel` | 🆕 New Feature |
| `.onbot` | 🟢 Enable bot and all services | `.onbot` | ✅ Enhanced |
| `.offbot` | 🔴 Disable bot (keep basic commands) | `.offbot` | ✅ Enhanced |
| `.online` | 🟢 Set presence to online | `.online` | ✅ Enhanced |
| `.offline` | 🔴 Set presence to offline (persistent) | `.offline` | ✅ Enhanced |

### 🤖 **Smart Features**
| Command | Description | Usage | V2.0 Status |
|---------|-------------|-------|-------------|
| `.autoreply` | 🤖 Toggle intelligent auto-reply system | `.autoreply` | ✅ 14+ Responses |
| `.autoview` | 👀 Toggle automatic status viewing | `.autoview` | ✅ Enhanced |
| `.anticall` | 📞 Toggle advanced call blocking | `.anticall` | ✅ Better Security |

---

## 🤖 Advanced Auto-Reply System

V2.0 introduces an **intelligent auto-reply system** with 14+ natural responses:

### 🎯 **Supported Keywords & Responses:**
- **👋 Greetings**: `hi`, `hello`, `good morning`, `gm`, `good afternoon`, `good evening`, `good night`, `gn`
- **🙏 Gratitude**: `thank you`, `thanks`  
- **👋 Farewells**: `bye`, `see you`
- **💬 Casual Chat**: `how are you`, `what's up`

### ✨ **Smart Features:**
- ✅ **Exact & Partial Matching** - Detects keywords in context
- ✅ **Natural Delays** - Random 1-3 second delays for authenticity
- ✅ **Usage Analytics** - Track auto-reply statistics
- ✅ **Easy Toggle** - Enable/disable with `.autoreply` command
- ✅ **Private Chats Only** - No group chat interference
- ✅ **Professional Responses** - Beautifully formatted replies

### 📊 **Usage Statistics:**
- View stats via `.info` or `.panel` commands
- Track total auto-replies sent
- Monitor feature usage analytics

---

## 👀 Professional Auto-View Feature

The auto-view feature is designed to **only view status updates**, not regular messages:

### ✨ **What it does:**
- ✅ **Views:** WhatsApp status updates automatically
- ❌ **Doesn't view:** Regular chat messages  
- 🔧 **Toggle:** Use `.autoview` command to enable/disable
- 📊 **Analytics:** Track viewed status count

### 🛡️ **Privacy Protection:**
This ensures your privacy while keeping up with status updates from contacts.

---

## 🤖 Bot Control System

The bot features a comprehensive control system to enable/disable functionality as needed:

### 🎛️ **Bot Management Commands**
- **`.onbot`** - 🟢 Enable bot and activate all services
- **`.offbot`** - 🔴 Disable bot while keeping essential commands

### ✨ **How it works:**
- ✅ **When Enabled (`.onbot`)**: All features work (auto-reply, auto-view, call blocking, full command set)
- ❌ **When Disabled (`.offbot`)**: Most features disabled, only `.onbot`, `.offbot`, and `.info` commands work
- 🔧 **Smart Design**: Bot remembers your settings and restores them when re-enabled
- 🛡️ **Safety First**: Critical commands like `.onbot` always work to prevent lockout

### 📊 **Status Tracking:**
- Check current bot status via `.info` or `.panel` commands
- Bot status is clearly displayed in all system information

---

## 🚀 Quick Start

### ☁️ **Cloud Deployment (Recommended)**

**Deploy to Render in 1-click:**

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/GihanPasidu/WA-BOT)

1. Click the deploy button above
2. Sign up/login to Render
3. Connect your GitHub account
4. Review configuration and deploy
5. Access your bot at: `https://your-app-name.onrender.com`
6. Scan QR code with WhatsApp to connect

📖 **Detailed Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)

### 🏠 **Local Development**

1. **Clone and Install**
   ```bash
   git clone https://github.com/GihanPasidu/WA-BOT.git
   cd WA-BOT
   npm install
   ```

2. **Start the Bot**
   ```bash
   npm start
   ```

3. **Connect WhatsApp via Web Interface**
   - Open `http://localhost:10000` in your browser
   - The QR code will automatically appear when disconnected
   - Scan with WhatsApp: Settings → Linked Devices → Link a Device
   - No need to check terminal!

### 🐳 **Docker Deployment**

1. **Using Docker**
   ```bash
   npm run docker:build
   npm run docker:run
   ```

### ☁️ **Render Deployment**

#### 🚀 **One-Click Deploy (Recommended)**

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/GihanPasidu/WA-BOT)

#### 📋 **Manual Deployment Steps**
1. **Fork this repository**
2. **Sign up/Login** to [Render](https://render.com)
3. **Create new Web Service** from your forked repository
4. **Configure environment variables**:
   ```env
   NODE_ENV=production
   PORT=10000
   AUTO_VIEW_STATUS=false
   AUTO_REPLY_ENABLED=false
   ```
5. **Add persistent disk** for session storage (`/app/auth_info`)
6. **Deploy and connect WhatsApp** via the web interface

📖 **Detailed Guide**: See [DEPLOYMENT.md](DEPLOYMENT.md) for complete instructions

---

## 📡 API Endpoints

### 🌐 **Web Interface**
- `GET /` - **Main Dashboard** with QR code interface
- `GET /health` - **Health Check** endpoint for monitoring
- `GET /ping` - **Ping** endpoint for keep-alive
- `GET /wake` - **Wake** endpoint for sleep prevention
- `GET /stats` - **Statistics** endpoint for analytics

### 📊 **Real-time Features**
- **Auto-refreshing QR Code** - Updates every 30 seconds
- **Connection Status** - Live status monitoring
- **Bot Statistics** - Real-time analytics display

---

## 🔧 Configuration

### 📝 **Environment Variables**

```env
# Core Settings
NODE_ENV=production
PORT=10000

# Bot Features
AUTO_VIEW_STATUS=false          # Enable auto-view status
STATUS_DOWNLOAD=true            # Enable status download tracking
SESSION_ID=your_session_id      # Bot session identifier

# Deployment
RENDER_EXTERNAL_URL=https://your-app.onrender.com
```

---

## 📊 Performance & Analytics

### 🚀 **Performance Metrics**
- ⚡ **Response Time** - Sub-second command execution
- 💾 **Memory Usage** - Optimized for low memory consumption
- 🔄 **Uptime** - 99.9% availability with auto-restart
- 📈 **Scalability** - Handles multiple concurrent requests

### 📈 **Built-in Analytics**
- 📊 **Command Usage** - Track most used features
- 👁️ **Status Views** - Monitor auto-view activity
- 🤖 **Auto-Replies** - Count automated responses
- 📞 **Call Blocks** - Security event tracking
- ⏱️ **System Uptime** - Monitor bot availability

---

## 🛡️ Security Features

### 🔒 **Privacy Protection**
- **Self-Chat Only Commands** - Prevents unauthorized access
- **Private Chat Auto-Reply** - No group chat interference
- **Secure Session Management** - Multi-file authentication
- **Call Blocking** - Automatic unwanted call rejection

---

## 🤝 Contributing

We welcome contributions to CloudNextra Bot V2.0!

### 🚀 **How to Contribute**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📞 Support & License

### 🆘 **Get Help**
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/GihanPasidu/WA-BOT/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/GihanPasidu/WA-BOT/discussions)

### 📄 **License**
This project is licensed under the **Apache License 2.0** - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Made with ❤️ by [CloudNextra](https://github.com/GihanPasidu)**

[![GitHub](https://img.shields.io/badge/GitHub-CloudNextra-black?style=for-the-badge&logo=github)](https://github.com/GihanPasidu)
[![Version](https://img.shields.io/badge/Version-2.0.0-brightgreen?style=for-the-badge)](https://github.com/GihanPasidu/WA-BOT)

**🚀 CloudNextra WhatsApp Bot V2.0 - Professional, Powerful, Perfect! 🚀**

</div>
