# CloudNextra WhatsApp Bot

<div align="center">
  <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white"/>
  <img src="https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white"/>
  <img src="https://img.shields.io/badge/license-Apache--2.0-blue?style=for-the-badge"/>
</div>

## 📱 Always Online WhatsApp Bot

A professional WhatsApp bot that maintains online presence with advanced features and a clean interface. Built using Node.js and the latest WhatsApp Web API.

## ✨ Key Features

- 🟢 **Smart Presence Management**
  - Configurable always-online mode
  - Professional status updates
  - Automatic reconnection handling

- 🎮 **Simple Commands**
  ```
  .online  - Activate always online mode
  .offline - Deactivate always online mode
  .logout  - Safely logout and stop bot
  ```

- 📊 **Real-time Monitoring**
  - Memory usage tracking
  - Uptime monitoring
  - Connection status logs
  - Colorized terminal output

- 🛡️ **Robust Error Handling**
  - Automatic reconnection
  - Graceful shutdown
  - Error logging
  - Session persistence

## 🚀 Quick Start

1. **Clone & Install**
```bash
git clone https://github.com/yourusername/wa-bot.git
cd wa-bot
npm install
```

2. **Start the Bot**
```bash
npm start
```

3. **Scan QR Code**
- Open WhatsApp on your phone
- Go to Settings > Linked Devices
- Scan the QR code shown in terminal

## 🛠️ Development

```bash
# Run with auto-reload
npm run dev

# Run tests
npm test

# Check code style
npm run lint
```

## 🐋 Docker Support

```bash
# Build image
docker build -t cloudnextra-bot .

# Run container
docker run -d cloudnextra-bot
```

## ⚙️ Configuration

Create `config.env` with these options:
```env
SESSION_ID=your_session_id
AUTO_READ_STATUS=true
ALLWAYS_OFFLINE=false
```

## 📝 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repo
2. Create feature branch (`git checkout -b feature/name`)
3. Commit changes (`git commit -am 'Add feature'`)
4. Push branch (`git push origin feature/name`)
5. Create Pull Request

## 💬 Support

Join our WhatsApp group for support and updates: [Click Here](#)

---
<div align="center">
Made with ❤️ by CloudNextra
</div>
