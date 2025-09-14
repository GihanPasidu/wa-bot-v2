# CloudNextra WhatsApp Bot

A professional WhatsApp bot built with Baileys library featuring auto-read functionality and online/offline presence control.

## Features

- **Auto Read**: Toggle automatic message reading with `.autoread`
- **Presence Control**: Set online/offline status with `.online` and `.offline`
- **Self-Chat Only**: All commands work only in self-chat for security
- **Health Monitoring**: Built-in health check endpoint at `/health`
- **Docker Ready**: Optimized for containerized deployment
- **Render Compatible**: Easy deployment to Render.com

## Commands

- `.autoread` - Toggle auto-read functionality on/off
- `.online` - Set WhatsApp status to online/available
- `.offline` - Set WhatsApp status to offline/unavailable
- `.panel` - Show control panel with current status
- `.menu` - Show available commands
- `.self <text>` - Echo text back to chat

## Deployment on Render with Docker

### Quick Deploy
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

### Manual Deployment

1. **Fork this repository** to your GitHub account

2. **Create a new Web Service** on [Render](https://render.com/)
   - Connect your GitHub repository
   - Choose "Docker" environment
   - Use Dockerfile: `./Dockerfile`

3. **Set Environment Variables:**
   ```
   NODE_ENV=production
   SESSION_ID=your_session_here (optional)
   AUTO_READ_STATUS=false
   PORT=10000
   ```

4. **Add Persistent Disk** (Recommended):
   - Name: `wa-bot-storage`
   - Mount Path: `/app/auth_info`
   - Size: 1GB

5. **Deploy** your service

### Local Docker Development

1. **Build the Docker image:**
   ```bash
   docker build -t wa-bot .
   ```

2. **Run the container:**
   ```bash
   docker run -p 3000:10000 -e PORT=10000 wa-bot
   ```

3. **With persistent storage:**
   ```bash
   docker run -p 3000:10000 -v $(pwd)/auth_info:/app/auth_info wa-bot
   ```

### Environment Variables

- `SESSION_ID` - WhatsApp session data (optional, will generate QR if not set)
- `AUTO_READ_STATUS` - Enable auto-read on startup (`true`/`false`)
- `NODE_ENV` - Environment mode (`production`/`development`)
- `PORT` - Server port (default: 10000 for Render)

## Health Check

The bot includes a health check endpoint at `/health` that returns:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600,
  "botConnected": true,
  "environment": "production"
}
```

## Usage

1. After deployment, scan the QR code that appears in logs
2. Once connected, send commands in your own chat (self-chat)
3. All commands are restricted to self-chat for security

## Troubleshooting

### Common Issues

1. **Bot not responding**: Check if commands are sent from self-chat
2. **Connection issues**: Check environment variables and restart service
3. **Session expired**: Delete auth_info and scan QR code again
4. **Docker build fails**: Ensure all dependencies are in package.json

### Render-Specific Issues

1. **Health check failing**: Ensure PORT is set to 10000
2. **Persistent storage**: Mount disk to `/app/auth_info`
3. **Build timeout**: Use `render.yaml` for configuration

## License

Apache-2.0 License - see [LICENSE](LICENSE) file for details.

## Made by CloudNextra

Professional bot development services available.

---
<div align="center">
Made with ❤️ by CloudNextra
</div>
---
<div align="center">
Made with ❤️ by CloudNextra
</div>
