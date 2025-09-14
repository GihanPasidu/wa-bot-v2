// Load polyfills first
require('./polyfill');

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const { Boom } = require('@hapi/boom');
const config = require('./config');
const express = require('express');
const QRCode = require('qrcode');
const cron = require('node-cron');
const KeepAliveService = require('./keep-alive');

// Express app for health checks
const app = express();
const PORT = process.env.PORT || 10000;

// Keep-alive configuration for Render free plan
const RENDER_URL = process.env.RENDER_EXTERNAL_URL || process.env.RENDER_URL;
const KEEP_ALIVE_INTERVAL = 10; // minutes

// Store QR code and connection status
let qrCodeData = null;
let connectionStatus = 'disconnected';
let lastQRUpdate = null;

// Initialize keep-alive service
const keepAliveService = new KeepAliveService({
    url: RENDER_URL,
    interval: KEEP_ALIVE_INTERVAL,
    endpoints: ['/health', '/ping', '/wake']
});

// Start keep-alive service
keepAliveService.start();

// Health endpoint with enhanced information
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        botConnected: !!currentSock,
        environment: process.env.NODE_ENV || 'development',
        connectionStatus: connectionStatus,
        keepAliveEnabled: !!RENDER_URL,
        memoryUsage: process.memoryUsage()
    });
});

// Keep-alive endpoint specifically for external services
app.get('/ping', (req, res) => {
    res.status(200).json({ 
        pong: true,
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        status: connectionStatus
    });
});

// Wake-up endpoint to prevent sleeping
app.get('/wake', (req, res) => {
    res.status(200).json({ 
        message: 'Bot is awake!',
        timestamp: new Date().toISOString(),
        botConnected: !!currentSock,
        connectionStatus: connectionStatus
    });
});

app.get('/qr', async (req, res) => {
    try {
        if (qrCodeData) {
            const qrImage = await QRCode.toDataURL(qrCodeData);
            res.json({ 
                success: true, 
                qr: qrImage, 
                timestamp: lastQRUpdate,
                status: connectionStatus 
            });
        } else {
            res.json({ 
                success: false, 
                message: 'No QR code available',
                status: connectionStatus 
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/status', (req, res) => {
    res.json({
        connected: !!currentSock,
        status: connectionStatus,
        autoRead: autoReadEnabled,
        uptime: Math.floor(process.uptime()),
        botId: botId
    });
});

app.get('/keep-alive-stats', keepAliveService.getStatsEndpoint());

app.get('/', (req, res) => {
    res.send(`
        <html>
        <head>
            <title>CloudNextra WhatsApp Bot</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 0; 
                    padding: 20px; 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    min-height: 100vh;
                    color: #333;
                }
                .container { 
                    background: white; 
                    padding: 30px; 
                    border-radius: 15px; 
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                    max-width: 600px;
                    margin: 0 auto;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                }
                .status { 
                    padding: 15px; 
                    border-radius: 8px; 
                    margin: 15px 0; 
                    text-align: center;
                    font-weight: bold;
                }
                .online { background: #d4edda; color: #155724; border: 2px solid #c3e6cb; }
                .offline { background: #f8d7da; color: #721c24; border: 2px solid #f5c6cb; }
                .connecting { background: #fff3cd; color: #856404; border: 2px solid #ffeaa7; }
                .qr-section {
                    text-align: center;
                    margin: 20px 0;
                    padding: 20px;
                    background: #f8f9fa;
                    border-radius: 10px;
                }
                .qr-code {
                    max-width: 256px;
                    margin: 20px auto;
                    padding: 20px;
                    background: white;
                    border-radius: 10px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                }
                .qr-code img {
                    width: 100%;
                    height: auto;
                }
                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                    margin: 20px 0;
                }
                .info-item {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 8px;
                    text-align: center;
                }
                .refresh-btn {
                    background: #007bff;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 16px;
                    margin: 10px 5px;
                }
                .refresh-btn:hover {
                    background: #0056b3;
                }
                .loading {
                    display: inline-block;
                    width: 20px;
                    height: 20px;
                    border: 3px solid #f3f3f3;
                    border-top: 3px solid #3498db;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .footer {
                    text-align: center;
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #eee;
                    color: #666;
                }
                .keep-alive-info {
                    background: #e3f2fd;
                    border: 1px solid #2196f3;
                    border-radius: 8px;
                    padding: 15px;
                    margin: 15px 0;
                    text-align: center;
                }
                .badge {
                    display: inline-block;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: bold;
                    text-transform: uppercase;
                }
                .badge-success { background: #4caf50; color: white; }
                .badge-warning { background: #ff9800; color: white; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🤖 CloudNextra WhatsApp Bot</h1>
                    <p>Professional WhatsApp automation service</p>
                    ${RENDER_URL ? '<span class="badge badge-success">Keep-Alive Active</span>' : '<span class="badge badge-warning">Local Mode</span>'}
                </div>
                
                ${RENDER_URL ? `
                <div class="keep-alive-info">
                    <h4>🔄 Keep-Alive Status</h4>
                    <p>Automatic pings every ${KEEP_ALIVE_INTERVAL} minutes to prevent sleeping</p>
                    <p><strong>Service URL:</strong> ${RENDER_URL}</p>
                </div>
                ` : ''}
                
                <div id="status-section">
                    <div class="status connecting">
                        <span class="loading"></span> Loading connection status...
                    </div>
                </div>

                <div id="qr-section" class="qr-section" style="display: none;">
                    <h3>📱 Scan QR Code to Connect</h3>
                    <p>Open WhatsApp on your phone → Settings → Linked Devices → Link a Device</p>
                    <div class="qr-code">
                        <img id="qr-image" src="" alt="QR Code" />
                    </div>
                    <button class="refresh-btn" onclick="refreshQR()">🔄 Refresh QR Code</button>
                </div>

                <div class="info-grid">
                    <div class="info-item">
                        <strong>Uptime</strong><br>
                        <span id="uptime">${Math.floor(process.uptime())} seconds</span>
                    </div>
                    <div class="info-item">
                        <strong>Auto-read</strong><br>
                        <span id="autoread">${autoReadEnabled ? '✅ Enabled' : '❌ Disabled'}</span>
                    </div>
                    <div class="info-item">
                        <strong>Environment</strong><br>
                        <span>${process.env.NODE_ENV || 'development'}</span>
                    </div>
                    <div class="info-item">
                        <strong>Version</strong><br>
                        <span>1.0.0</span>
                    </div>
                </div>

                <div style="text-align: center; margin: 20px 0;">
                    <button class="refresh-btn" onclick="refreshStatus()">🔄 Refresh Status</button>
                    <button class="refresh-btn" onclick="location.reload()">↻ Reload Page</button>
                </div>

                <div class="footer">
                    <p><small>Made with ❤️ by CloudNextra</small></p>
                    <p><small>Last updated: <span id="last-update">${new Date().toLocaleString()}</span></small></p>
                </div>
            </div>

            <script>
                let refreshInterval;

                async function updateStatus() {
                    try {
                        const response = await fetch('/status');
                        const data = await response.json();
                        
                        const statusSection = document.getElementById('status-section');
                        const qrSection = document.getElementById('qr-section');
                        const uptimeSpan = document.getElementById('uptime');
                        const autoreadSpan = document.getElementById('autoread');
                        
                        // Update uptime
                        uptimeSpan.textContent = data.uptime + ' seconds';
                        autoreadSpan.textContent = data.autoRead ? '✅ Enabled' : '❌ Disabled';
                        
                        if (data.connected) {
                            statusSection.innerHTML = '<div class="status online">🟢 Connected to WhatsApp</div>';
                            qrSection.style.display = 'none';
                            if (refreshInterval) {
                                clearInterval(refreshInterval);
                                refreshInterval = null;
                            }
                        } else {
                            statusSection.innerHTML = '<div class="status offline">🔴 Disconnected from WhatsApp</div>';
                            await updateQR();
                        }
                        
                        // Update keep-alive info if present
                        const keepAliveSection = document.querySelector('.keep-alive-info');
                        if (keepAliveSection && data.keepAliveEnabled) {
                            const lastPing = new Date().toLocaleTimeString();
                            keepAliveSection.innerHTML += \`<p><small>Last check: \${lastPing}</small></p>\`;
                        }
                        
                        document.getElementById('last-update').textContent = new Date().toLocaleString();
                    } catch (error) {
                        console.error('Error updating status:', error);
                    }
                }

                async function updateQR() {
                    try {
                        const response = await fetch('/qr');
                        const data = await response.json();
                        const qrSection = document.getElementById('qr-section');
                        
                        if (data.success && data.qr) {
                            document.getElementById('qr-image').src = data.qr;
                            qrSection.style.display = 'block';
                        } else {
                            qrSection.style.display = 'none';
                        }
                    } catch (error) {
                        console.error('Error updating QR:', error);
                    }
                }

                async function refreshQR() {
                    await updateQR();
                }

                async function refreshStatus() {
                    await updateStatus();
                }

                // Initial load
                updateStatus();

                // Auto-refresh every 5 seconds when disconnected
                refreshInterval = setInterval(updateStatus, 5000);
            </script>
        </body>
        </html>
    `);
});

// Add graceful shutdown for Docker
process.on('SIGTERM', () => {
    console.log('[WA-BOT] Received SIGTERM. Gracefully shutting down...');
    if (currentSock) {
        currentSock.end();
    }
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('[WA-BOT] Received SIGINT. Gracefully shutting down...');
    if (currentSock) {
        currentSock.end();
    }
    process.exit(0);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[WA-BOT] Health server running on port ${PORT}`);
});

let isConnecting = false;
let currentSock = null;
let retryCount = 0;
let botId = null;
const maxRetries = config.reconnectAttempts ?? 5; // fallback if config missing

// Auto-read state (can be set via environment variable)
let autoReadEnabled = process.env.AUTO_READ_STATUS === 'true' || false;

// Auto-read functionality
async function connectToWhatsApp() {
	// avoid parallel connects
	if (isConnecting) return;
	isConnecting = true;

	try {
		// Use Docker-friendly auth path
		const authPath = process.env.RENDER ? '/app/auth_info' : 'auth_info';
		const { state, saveCreds } = await useMultiFileAuthState(authPath);
		const { version } = await fetchLatestBaileysVersion();

		const sock = makeWASocket({
			version,
			printQRInTerminal: true,
			auth: state,
			connectTimeoutMs: 60_000,
			emitOwnEvents: true,
			retryRequestDelayMs: 2000,
			browser: ['CloudNextra Bot', 'Desktop', '1.0.0'],
		});

		// persist credentials on update
		sock.ev.on('creds.update', saveCreds);

		// keep reference for safe close on reconnect
		if (currentSock && currentSock !== sock) {
			try { currentSock.end?.(); } catch (e) { /* ignore */ }
		}
		currentSock = sock;

		// reset retry counter when we successfully connect
		retryCount = 0;

		// store bot id when connection opens
		sock.ev.on('connection.update', (update) => {
			const { connection, lastDisconnect, qr } = update;

			// Handle QR code
			if (qr) {
				qrCodeData = qr;
				lastQRUpdate = new Date().toISOString();
				connectionStatus = 'qr_ready';
				console.log('[WA-BOT] QR Code updated, scan with WhatsApp');
			}

			if (connection === 'close') {
				connectionStatus = 'disconnected';
				qrCodeData = null;
				const rawError = lastDisconnect?.error;
				const statusCode = rawError?.output?.statusCode;
				const errorMsg = rawError?.message || JSON.stringify(rawError);
				// detect Baileys/ws stream:error attribute if available (some transports place code in trace)
				const isDeviceRemoved = errorMsg?.toString().toLowerCase().includes('device_removed') || errorMsg?.toString().toLowerCase().includes('device removed') || (statusCode === 401 && errorMsg?.toString().toLowerCase().includes('conflict'));
				const isStreamRestartRequired = statusCode === 515 || /restart required/i.test(errorMsg) || /stream errored/i.test(errorMsg);

				// decide if the library suggests reconnecting
				const shouldReconnect = (statusCode !== DisconnectReason.loggedOut && statusCode !== 405) && !isDeviceRemoved;

				console.log('[WA-BOT] Connection closed:', errorMsg, 'Code:', statusCode, 'Reconnect:', shouldReconnect);

				// Non-recoverable device/session removal — attempt to clear local auth and re-register
				if (isDeviceRemoved || statusCode === 401) {
					console.warn('[WA-BOT] Device/session removed. Clearing local auth and re-registering.');
					try {
						// remove local multi-file auth state so useMultiFileAuthState will create a new one and trigger QR
						fs.rmSync(authPath, { recursive: true, force: true });
						console.log('[WA-BOT] Local auth_info cleared.');
					} catch (e) {
						console.error('[WA-BOT] Failed to clear local auth:', e);
					}

					// close socket & schedule reconnect to allow fresh registration
					try { sock.end?.(); } catch (e) { /* ignore */ }
					currentSock = null;

					// schedule reconnect (count it)
					retryCount++;
					if (retryCount < maxRetries) {
						const delay = config.reconnectDelayOnAuthReset ?? 3000;
						setTimeout(() => {
							isConnecting = false;
							connectToWhatsApp();
						}, delay);
					} else {
						console.error('[WA-BOT] Max retries after auth reset. Exiting.');
						setTimeout(() => process.exit(1), 1000);
					}
					return;
				}

				// Special-case: stream errored & restart required (Baileys uses code 515 for certain recoverable stream errors)
				if (isStreamRestartRequired) {
					console.warn('Stream error (restart required) detected — attempting controlled in-process restart.');
					try { sock.end?.(); } catch (e) { /* ignore */ }
					currentSock = null;

					// schedule a reconnect attempt (count it)
						setTimeout(() => {
							isConnecting = false;ries) {
							connectToWhatsApp();reconnectDelayOnStreamError ?? (config.reconnectDelay ?? 10000);
						}, delay);(() => {
					} else {ecting = false;
						console.error('Exceeded max retries for stream errors — exiting to allow supervisor restart.');
						setTimeout(() => process.exit(1), 1000);
					} else {
					return;e.error('Exceeded max retries for stream errors — exiting to allow supervisor restart.');
				}	setTimeout(() => process.exit(1), 1000);
					}
				// Default reconnect path for recoverable disconnects
				if (shouldReconnect && retryCount < maxRetries) {
					retryCount++;
					try { sock.end?.(); } catch (e) { /* ignore */ }ects
					setTimeout(() => { && retryCount < maxRetries) {
						isConnecting = false;
						connectToWhatsApp(); catch (e) { /* ignore */ }
					}, config.reconnectDelay ?? 5000);
				} else {ecting = false;
					console.error('[WA-BOT] Max reconnect attempts reached. Exiting.');
					setTimeout(() => process.exit(1), 1000);
				} else {
			} else if (connection === 'open') {nect attempts reached. Exiting.');
				connectionStatus = 'connected';1), 1000);
				qrCodeData = null;
				botId = update?.me?.id || sock?.user?.id || botId;
				console.log(`[WA-BOT] Connected as ${botId}`);
			} else if (connection === 'connecting') {
				connectionStatus = 'connecting';user?.id || botId;
			}console.log(`[WA-BOT] Connected as ${botId}`);
		});else if (connection === 'connecting') {
				connectionStatus = 'connecting';
		// Message handler with all commands
		sock.ev.on('messages.upsert', async ({ messages }) => {
			const m = messages[0];
			if (!m?.message) return;ll commands
		sock.ev.on('messages.upsert', async ({ messages }) => {
			const messageType = Object.keys(m.message)[0];
			const messageContent = m.message[messageType];

			// extract plain text for common message types
			let text = '';ontent = m.message[messageType];
			if (messageType === 'conversation') text = messageContent.conversation || '';
			else if (messageType === 'extendedTextMessage') text = messageContent.text || messageContent?.contextInfo?.quotedMessage?.conversation || '';
			else text = (messageContent?.caption || messageContent?.text) || '';
			if (messageType === 'conversation') text = messageContent.conversation || '';
			// normalize prefix and commanddedTextMessage') text = messageContent.text || messageContent?.contextInfo?.quotedMessage?.conversation || '';
			const prefix = config?.commands?.prefix ?? '.';Content?.text) || '';
			const isCommand = text.startsWith(prefix);
			const parts = isCommand ? text.slice(prefix.length).trim().split(/\s+/) : [];
			const cmd = parts[0]?.toLowerCase();fix ?? '.';
			const args = parts.slice(1).join(' ');ix);
			const parts = isCommand ? text.slice(prefix.length).trim().split(/\s+/) : [];
			// Only respond to commands from self
			if (!isCommand || !m.key.fromMe) { ');
				// Auto-read functionality for non-command messages
				if (autoReadEnabled && !m.key.fromMe && m.key.remoteJid) {
					try {Command || !m.key.fromMe) {
						await sock.readMessages([m.key]);command messages
					} catch (e) {abled && !m.key.fromMe && m.key.remoteJid) {
						console.error('Auto-read error:', e);
					}await sock.readMessages([m.key]);
				}} catch (e) {
				return;le.error('Auto-read error:', e);
			}	}
				}
			try {rn;
				// Handle .autoread command
				if (cmd === 'autoread') {
					autoReadEnabled = !autoReadEnabled;
					const statusText = autoReadEnabled ? 'enabled' : 'disabled';
					const emoji = autoReadEnabled ? '✅' : '❌';
					const replyText = `${emoji} Auto Read has been *${statusText}*.`;
					await sock.sendMessage(m.key.remoteJid, { text: replyText }, { quoted: m });
					return;moji = autoReadEnabled ? '✅' : '❌';
				}const replyText = `${emoji} Auto Read has been *${statusText}*.`;
					await sock.sendMessage(m.key.remoteJid, { text: replyText }, { quoted: m });
				// Handle .online command
				if (cmd === 'online') {
					await sock.sendPresenceUpdate('available');
					await sock.sendMessage(m.key.remoteJid, { text: '🟢 WhatsApp status set to *Online*' }, { quoted: m });
					console.log('[WA-BOT] Presence updated to: available');
					return;ock.sendPresenceUpdate('available');
				}await sock.sendMessage(m.key.remoteJid, { text: '🟢 WhatsApp status set to *Online*' }, { quoted: m });
					console.log('[WA-BOT] Presence updated to: available');
				// Handle .offline command
				if (cmd === 'offline') {
					await sock.sendPresenceUpdate('unavailable');
					await sock.sendMessage(m.key.remoteJid, { text: '🔴 WhatsApp status set to *Offline*' }, { quoted: m });
					console.log('[WA-BOT] Presence updated to: unavailable');
					return;ock.sendPresenceUpdate('unavailable');
				}await sock.sendMessage(m.key.remoteJid, { text: '🔴 WhatsApp status set to *Offline*' }, { quoted: m });
					console.log('[WA-BOT] Presence updated to: unavailable');
				// Handle .panel command
				if (cmd === 'panel') {
					const panelText = 
`╔═════════════════════════════╗
║   CloudNextra Bot — Panel   ║
╚═════════════════════════════╝
`╔═════════════════════════════╗
📊 *Current Status:*— Panel   ║
• Auto Read: ${autoReadEnabled ? '✅ ON' : '❌ OFF'}
• Bot Status: 🟢 Online
📊 *Current Status:*
🛠️ *Available Commands:*abled ? '✅ ON' : '❌ OFF'}
• ${prefix}autoread - Toggle auto status view
• ${prefix}online - Set WhatsApp to online
• ${prefix}offline - Set WhatsApp to offline
• ${prefix}self <text> - Echo text backs view
• ${prefix}menu - Show main menu to online
• ${prefix}panel - Show this panelto offline
• ${prefix}self <text> - Echo text back
Commands work only in self-chat for security.`;
					await sock.sendMessage(m.key.remoteJid, { text: panelText }, { quoted: m });
					return;
				}nds work only in self-chat for security.`;
					await sock.sendMessage(m.key.remoteJid, { text: panelText }, { quoted: m });
				// Handle .self command
				if (cmd === 'self') {
					const replyText = args || 'Usage: .self <message>';
					await sock.sendMessage(m.key.remoteJid, { text: replyText }, { quoted: m });
					return;=== 'self') {
				}const replyText = args || 'Usage: .self <message>';
					await sock.sendMessage(m.key.remoteJid, { text: replyText }, { quoted: m });
				// Handle .menu and .help commands
				if (cmd === 'menu' || cmd === 'help') {
					const menuText = 
`╔═════════════════════════════╗mmands
║   CloudNextra Bot — Menu    ║== 'help') {
╚═════════════════════════════╝
`╔═════════════════════════════╗
🤖 *Main Commands:* — Menu    ║
• ${prefix}menu - Show this menu
• ${prefix}panel - Show control panel
• ${prefix}self <text> - Echo text to this chat
• ${prefix}menu - Show this menu
⚙️ *Settings:*el - Show control panel
• ${prefix}autoread - Toggle auto status viewat
• ${prefix}online - Set WhatsApp to online
• ${prefix}offline - Set WhatsApp to offline
• ${prefix}autoread - Toggle auto status view
💡 *Usage:*online - Set WhatsApp to online
Send a message starting with "${prefix}" followed by a command.
Commands work only in self-chat for security.
💡 *Usage:*
Made with ❤️ by CloudNextra`;"${prefix}" followed by a command.
					await sock.sendMessage(m.key.remoteJid, { text: menuText }, { quoted: m });
					return;
				}with ❤️ by CloudNextra`;
					await sock.sendMessage(m.key.remoteJid, { text: menuText }, { quoted: m });
				// Unknown command
				if (cmd) {
					await sock.sendMessage(m.key.remoteJid, { 
						text: `❓ Unknown command: *${cmd}*\nType ${prefix}menu to see available commands.` 
					}, { quoted: m });
				}await sock.sendMessage(m.key.remoteJid, { 
						text: `❓ Unknown command: *${cmd}*\nType ${prefix}menu to see available commands.` 
			} catch (error) {});
				console.error('[WA-BOT] Command error:', error);
				await sock.sendMessage(m.key.remoteJid, { 
					text: '❌ An error occurred while processing your command.' 
				}, { quoted: m });-BOT] Command error:', error);
			}await sock.sendMessage(m.key.remoteJid, { 
					text: '❌ An error occurred while processing your command.' 
			// Log received messages
			console.log('[WA-BOT] Command executed:', {
				from: m.key.remoteJid,
				command: cmd,d messages
				fromSelf: m.key.fromMeommand executed:', {
			});om: m.key.remoteJid,
		});ommand: cmd,
	} catch (err) {key.fromMe
		connectionStatus = 'error';
		qrCodeData = null;
		console.error('[WA-BOT] Connection error:', err);
		// on unexpected error try again unless maxed out
		retryCount++;null;
		if (retryCount >= maxRetries) {ion error:', err);
			console.error('[WA-BOT] Max retries reached. Exiting.');
			setTimeout(() => process.exit(1), 1000);
		} else {yCount >= maxRetries) {
			isConnecting = false;T] Max retries reached. Exiting.');
			setTimeout(connectToWhatsApp, config.reconnectDelay ?? 5000);
		} else {
	} finally {ing = false;
		isConnecting = false;WhatsApp, config.reconnectDelay ?? 5000);
	}}
}} finally {
		isConnecting = false;
// Add error handler
process.on('unhandledRejection', error => {
	console.log('[WA-BOT] Unhandled rejection:', error);
});Add error handler
process.on('unhandledRejection', error => {
// Start with error handlingdled rejection:', error);
connectToWhatsApp().catch(err => {
	console.error('[WA-BOT] Fatal error:', err);
	process.exit(1);or handling
});nectToWhatsApp().catch(err => {
process.on('unhandledRejection', error => {);
	console.log('[WA-BOT] Unhandled rejection:', error);
});
process.on('unhandledRejection', error => {
// Start with error handlingdled rejection:', error);
connectToWhatsApp().catch(err => {
	console.error('[WA-BOT] Fatal error:', err);
	process.exit(1);or handling
});nectToWhatsApp().catch(err => {
	console.error('[WA-BOT] Fatal error:', err);
	process.exit(1);
});
