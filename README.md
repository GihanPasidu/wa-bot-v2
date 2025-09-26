# 🤖 CloudNextra WhatsApp Bot

A professional WhatsApp bot built with Baileys library, featuring **QR code web interface** and **auto-view status** functionality.

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

| Command | Description |
|---------|-------------|
| `.info` | Show bot information and statistics |
| `.autoview` | Toggle auto-view for status updates |
| `.online` | Set presence to online |
| `.offline` | Set presence to offline |

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
