# 🤖 CloudNextra WhatsApp Bot

A professional WhatsApp automation bot built with Baileys library, featuring **QR code web interface** and **status auto-read** functionality.

## ✨ Features

- 🔐 Multi-device WhatsApp connection
- 📱 **QR code web interface** - No need to check terminal!
- 📊 **Auto-read status updates** - Only reads status, not messages
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

| Command | Description |
|---------|-------------|
| `.info` | Show bot information and statistics |
| `.autoview` | Toggle auto-view for status updates |
| `.online` | Set presence to online |
| `.offline` | Set presence to offline |

## 📊 Auto-View Feature

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

---

Made with ❤️ by [CloudNextra](https://cloudnextra.com)
- Reconnection attempts
- Command prefix
- Keep-alive settings
- Logging levels

## 📡 API Endpoints

- `GET /` - Web dashboard with QR code
- `GET /health` - Health check
- `GET /ping` - Keep-alive ping
- `GET /qr` - QR code API
- `GET /status` - Bot status
- `GET /keep-alive-stats` - Keep-alive statistics

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
npm start          # Start the bot
npm run dev        # Development mode
npm run docker:build  # Build Docker image
npm run docker:run    # Run Docker container
```

## 🛡️ Security

- Commands only work in self-chat
- Session data is encrypted
- No sensitive data in logs
- Secure Docker container

## 📝 License

Apache License 2.0 - see [LICENSE](LICENSE) file

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

- 🐛 [Report bugs](https://github.com/yourusername/WA-BOT/issues)
- 💬 [Discussions](https://github.com/yourusername/WA-BOT/discussions)
- 📧 Contact: support@cloudnextra.com

---

Made with ❤️ by [CloudNextra](https://cloudnextra.com)
