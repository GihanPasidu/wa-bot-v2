# CloudNextra WhatsApp Bot

A powerful WhatsApp bot created using Node.js with several useful features.

## 🚀 Features

- Auto-read status
- Voice message conversion
- Auto sticker creation
- Anti-bad word filter
- Anti-link protection
- Anti-call protection 
- Delete message tracking
- Anti-bot protection
- Welcome/Goodbye messages
- Auto read commands
- AI chat capabilities
- Auto reactions
- News sender
- TikTok video sender

## 🛠️ Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/WA-BOT.git
cd WA-BOT
```

2. Install the dependencies:
```bash
npm install
```

3. Configure environment variables:
   - Copy `settings.js.example` to `settings.js`
   - Update the settings as needed

4. Start the bot:
```bash
npm start
```

## 🔧 Configuration

The following environment variables can be configured in `settings.js`:

| Variable | Description | Default |
|----------|-------------|---------|
| SESSION_ID | WhatsApp session ID | cloudnextra=xxx |
| PREFIX | Command prefix | . |
| SUDO | Admin number | 94767219661 |
| AUTO_READ_STATUS | Auto read status | true |
| ANTI_LINK | Anti-link protection | true |
| ANTI_BOT | Anti-bot protection | true |
| AI_CHAT | Enable AI chat | false |
| NEWS_SEND_JID | News channel/group JID | "" |
| TIKTOK_SEND_JID | TikTok channel/group JID | "" |

## 🐳 Docker

You can also run this bot using Docker:

```bash
docker build -t wa-bot .
docker run -d --name wa-bot wa-bot
```

## 📝 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## ⭐ Contributing

Contributions, issues and feature requests are welcome! Feel free to check the [issues page](../../issues).

## 📧 Contact

For questions and support, please join our WhatsApp group: [Join Group](#)

## 🔰 Disclaimer

This project is not affiliated with WhatsApp. Use at your own risk.
