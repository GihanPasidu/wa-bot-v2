# 🚀 CloudNextra WhatsApp Bot V2.0

<div align="center">
  
[![Version](https://img.shields.io/badge/Version-2.0.0-brightgreen.svg)](https://github.com/GihanPasidu/WA-BOT)
[![Node](https://img.shields.io/badge/Node.js-20%2B-blue.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ed.svg)]| `.o| `.anticall` | 📞 Toggle call blocking | `.anticall` |
| `.panel` | 📋 Show control panel | `.panel` |

## 👀 Auto-View Feature| Set presence to offline | `.offline` |
| `.anticall` | 📞 Toggle call blocking | `.anticall` |
| `.panel` | 📋 Show control panel | `.panel` |

## 👀 Auto-View Featuredocker.com)
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

### 🆕 **New Commands**
-  **Enhanced Control Panel** - Complete dashboard with system analytics

### 🎯 **Professional Improvements**
- 📋 **Structured Messages** - All responses now feature professional formatting
- 🎨 **Visual Appeal** - Unicode box-drawing characters for beautiful layouts
- 📈 **Better UX** - Intuitive command structure and helpful error messages
- 🔄 **Smart Retry Logic** - Enhanced connection stability and auto-recovery
- 👤 **Persistent Presence** - Offline status now persists through reconnections

---

## ✨ Core Features

### 🤖 **Smart Bot Capabilities**
- 🔐 **Multi-device WhatsApp Connection** - Seamless Baileys integration
- 📱 **QR Code Web Interface** - No terminal checking needed!
- 👀 **Auto-View Status Updates** - Intelligent status viewing (not messages)
- 🎭 **Presence Management** - Control online/offline status dynamically (persistent state)
- 🌐 **Beautiful Web Dashboard** - Real-time status and analytics
- ⚡ **Lightning-Fast Processing** - Optimized message handling
- 🔄 **Auto-Reconnection** - Smart retry logic with exponential backoff
- 🐳 **Docker Containerization** - Easy deployment anywhere
- ☁️ **Render Deployment Ready** - One-click cloud deployment

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
| `.online` | 🟢 Set presence to online | `.online` | ✅ Enhanced |
| `.offline` | 🔴 Set presence to offline (persistent) | `.offline` | ✅ Enhanced |

### 🤖 **Smart Features**
| Command | Description | Usage | V2.0 Status |
|---------|-------------|-------|-------------|
| `.autoreply` | 🤖 Toggle intelligent auto-reply system | `.autoreply` | ✅ 14+ Responses |
| `.autoview` | 👀 Toggle automatic status viewing | `.autoview` | ✅ Enhanced |
| `.anticall` | 📞 Toggle advanced call blocking | `.anticall` | ✅ Better Security |

### 🛠️ **Utility Tools**
| Command | Description | Usage | V2.0 Status |
|---------|-------------|-------|-------------|
| `.panel` | 📋 Complete control dashboard with analytics | `.panel` | ✅ Enhanced |

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

## 🚀 Quick Start

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

1. **One-Click Deploy**
   [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

2. **Manual Deployment**
   - Fork this repository
   - Connect to Render
   - Deploy using `render.yaml` configuration

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

## 🤖 Auto-Reply Feature

The auto-reply feature automatically responds to incoming messages containing specific keywords:

### Supported Keywords:
- **Greetings**: `hi`, `hello`, `good morning`, `gm`, `good afternoon`, `good evening`, `good night`, `gn`
- **Gratitude**: `thank you`, `thanks`
- **Farewells**: `bye`, `see you`
- **Casual**: `how are you`, `what's up`

### Features:
- ✅ **Smart matching:** Works with exact matches and partial keyword detection
- ✅ **Natural delays:** 1-3 second random delays to seem more natural
- ✅ **Statistics tracking:** Keep track of auto-replies sent
- ✅ **Easy toggle:** Use `.autoreply` command to enable/disable
- ✅ **Private chats only:** Only works in private chats, not in group chats
- ❌ **Only for incoming messages:** Doesn't reply to your own messages

### Usage:
- Toggle: `.autoreply` - Enable/disable the feature
- The bot will automatically reply when contacts send messages with supported keywords
- Check stats via `.info` or `.panel` commands

## 👀 Auto-View Featurep bot built with Baileys library, featuring **QR code web interface** and **auto-view status** functionality.

## ✨ Features

- 🔐 Multi-device WhatsApp connection
- 📱 **QR code web interface** - No need to check terminal!
- � **Auto-view status updates** - Only views status, not messages
- � **Presence management** - Control online/offline status
- 🌐 Beautiful web dashboard with real-time status
- ⚡ Fast and reliable message handling
- 🔄 Auto-reconnection with retry logic
- 🐳 Docker containerization
- ☁️ Render deployment ready

## 🚀 Quick Start

### Local Development

1. **Clone and install**
   ```bash
   git clone https://github.com/yourusername/WA-BOT.git
   cd WA-BOT
   npm install
   ```

2. **Start the bot**
   ```bash
   npm start
   ```

3. **Connect WhatsApp via Web Interface**
   - Open http://localhost:10000 in your browser
   - The QR code will automatically appear when disconnected
   - Scan with WhatsApp: Settings → Linked Devices → Link a Device
   - No need to check terminal!

## 🎮 Bot Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `.info` | Show bot information and statistics | `.info` |
| `.autoview` | Toggle auto-view for status updates | `.autoview` |
| `.autoreply` | Toggle auto-reply for messages | `.autoreply` |
| `.online` | Set presence to online | `.online` |
| `.offline` | Set presence to offline | `.offline` |
| `.anticall` | 📞 Toggle call blocking | `.anticall` |
| `.panel` | 📋 Show control panel | `.panel` |
| `.sticker` | 🏷️ Create sticker | `.sticker (with image)` |
| `.toimg` | 🖼️ Convert to image | `.toimg (reply to sticker)` |
| `.shorturl` | 🔗 Shorten URL | `.shorturl https://example.com` |
| `.pass` | 🔐 Generate password | `.pass 16` |

## � Auto-View Feature

The auto-view feature is designed to **only view status updates**, not regular messages:

- ✅ **Views:** WhatsApp status updates automatically
- ❌ **Doesn't view:** Regular chat messages  
- 🔧 **Toggle:** Use `.autoview` command to enable/disable

This ensures your privacy while keeping up with status updates from contacts.

## 📡 API Endpoints

- `GET /` - Web dashboard with QR code interface
- `GET /qr` - QR code API endpoint
- `GET /status` - Bot connection status
- `GET /health` - Health check
- `GET /ping` - Keep-alive ping

## 🔧 QR Code Troubleshooting

If the QR code doesn't appear:

1. **Check the console logs** for QR generation messages
2. **Refresh the page** - the QR updates automatically
3. **Clear auth_info folder** if you're having session issues
4. **Check browser console** for JavaScript errors

The QR code will only appear when:
- The bot is disconnected from WhatsApp
- A new session needs to be established
- The previous session has expired

## 🐳 Docker Deployment

### Build and Run

```bash
# Build Docker image
npm run docker:build

# Run container
npm run docker:run
```

### Docker Compose (Optional)

```yaml
version: '3.8'
services:
  wa-bot:
    build: .
    ports:
      - "10000:10000"
    volumes:
      - ./auth_info:/app/auth_info
    environment:
      - NODE_ENV=production
      - AUTO_VIEW_STATUS=false
```

## ☁️ Render Deployment

1. **Fork this repository**
2. **Connect to Render**
3. **Deploy with render.yaml**
4. **Set environment variables:**
   - `AUTO_VIEW_STATUS=false`
   - `PORT=10000`

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTO_VIEW_STATUS` | `false` | Enable auto-viewing status updates |
| `PORT` | `10000` | Server port |
| `NODE_ENV` | `development` | Node.js environment |

### Config Files

- `config.js` - Bot configuration
- `config.env` - Environment variables
- `settings.js` - Runtime settings

## 🛡️ Security

- Commands only work in self-chat
- Session data is encrypted
- No sensitive data in logs
- Secure Docker container
- Auto-reconnection with retry limits

## 🔧 Development

### Project Structure

```
WA-BOT/
├── index.js          # Main bot file
├── config.js         # Configuration
├── polyfill.js       # Node.js polyfills
├── keep-alive.js     # Keep-alive service
├── package.json      # Dependencies
├── Dockerfile        # Container config
├── render.yaml       # Render deployment
└── auth_info/        # WhatsApp session data
```

### Scripts

```bash
npm start              # Start the bot
npm run dev           # Development mode with nodemon
npm run docker:build  # Build Docker image
npm run docker:run    # Run Docker container
npm test              # Run tests
```

### Development Notes

- The bot uses Baileys v7.0.0-rc.3 for WhatsApp connectivity
- Express.js provides the web interface
- QR code generation happens automatically
- Session persistence via `auth_info/` directory

## 📊 Monitoring

### Health Checks

The bot provides several endpoints for monitoring:

- `/health` - Comprehensive health status
- `/ping` - Simple ping response
- `/status` - Bot connection details
- `/keep-alive-stats` - Keep-alive service statistics

### Logs

- Connection status updates
- Command usage tracking
- Error logging with context
- Auto-view activity logs

## 🚨 Troubleshooting

### Common Issues

1. **QR Code not showing**
   - Clear auth_info folder
   - Restart the bot
   - Check browser console

2. **Connection drops**
   - Check internet connection
   - Verify WhatsApp is linked
   - Review auth_info permissions

3. **Commands not working**
   - Ensure you're messaging the bot number
   - Check command prefix (default: `.`)
   - Verify bot is online

### Debug Mode

Enable debug logging by setting `NODE_ENV=development`:

```bash
NODE_ENV=development npm start
```

## 📝 License

Apache License 2.0 - see [LICENSE](LICENSE) file

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

- 🐛 [Report bugs](https://github.com/GihanPasidu/WA-BOT/issues)
- 💬 [Discussions](https://github.com/GihanPasidu/WA-BOT/discussions)
- 📧 Contact: contact@cloudnextra.dev

---

**Made with ❤️ by [CloudNextra](https://cloudnextra.dev)**
