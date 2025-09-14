# 🤖 CloudNextra WhatsApp Bot

A professional WhatsApp automation bot built with Baileys library, featuring **QR code web interface** for easy setup.

## ✨ Features

- 🔐 Multi-device WhatsApp connection
- 📱 **QR code web interface** - No need to check terminal!
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

## 📱 QR Code Web Interface

The bot automatically displays the QR code on the web interface at:
- **Local**: http://localhost:10000
- **Production**: Your deployed URL

Features:
- ✅ Auto-refresh QR code
- ✅ Real-time connection status
- ✅ Mobile-friendly interface
- ✅ No terminal access needed

## 🎮 Bot Commands

| Command | Description |
|---------|-------------|
| `.menu` | Show available commands |
| `.panel` | Show control panel |
| `.autoread` | Toggle auto-read status |
| `.online` | Set presence to online |
| `.offline` | Set presence to offline |
| `.self <text>` | Echo text back |

---

Made with ❤️ by [CloudNextra](https://cloudnextra.com)
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
NODE_ENV=production
```

### Config Options

Edit `config.js` to customize:
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
