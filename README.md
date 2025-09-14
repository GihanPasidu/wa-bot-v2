# 🤖 CloudNextra WhatsApp Bot

A professional WhatsApp automation bot built with Baileys library, featuring Docker support and Render deployment.

## ✨ Features

- 🔐 Multi-device WhatsApp connection
- ⚡ Fast and reliable message handling
- 🔄 Auto-reconnection with retry logic
- 📱 QR code generation for easy setup
- 🌐 Web dashboard with real-time status
- 🐳 Docker containerization
- ☁️ Render deployment ready
- 🔧 Keep-alive service for free hosting

## 🚀 Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/WA-BOT.git
   cd WA-BOT
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the bot**
   ```bash
   npm start
   ```

4. **Scan QR code**
   - Open http://localhost:10000 in your browser
   - Scan the QR code with your WhatsApp

### Docker Deployment

1. **Build the image**
   ```bash
   docker build -t wa-bot .
   ```

2. **Run the container**
   ```bash
   docker run -p 10000:10000 wa-bot
   ```

### Render Deployment

1. **Fork this repository**
2. **Connect to Render**
3. **Deploy using render.yaml**
4. **Set environment variables**

## 🎮 Bot Commands

| Command | Description |
|---------|-------------|
| `.menu` | Show available commands |
| `.panel` | Show control panel |
| `.autoread` | Toggle auto-read status |
| `.online` | Set presence to online |
| `.offline` | Set presence to offline |
| `.self <text>` | Echo text back |

## ⚙️ Configuration

### Environment Variables

```env
SESSION_ID=your_session_id
AUTO_READ_STATUS=true
PORT=10000
NODE_ENV=production
```

### Config Options

Edit `config.js` to customize:
- Reconnection attempts
- Command prefix
- Keep-alive settings
- Logging levels

## 📡 API Endpoints

- `GET /` - Web dashboard
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
