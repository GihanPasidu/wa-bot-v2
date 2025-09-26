// Load polyfills first
require('./polyfill');

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, downloadMediaMessage, getContentType } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const { Boom } = require('@hapi/boom');
const config = require('./config');
const express = require('express');
const QRCode = require('qrcode');
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

// Bot state variables - MOVED BEFORE USAGE
let isConnecting = false;
let currentSock = null;
let retryCount = 0;
let botId = null;
const maxRetries = config.reconnectAttempts ?? 5;

// Auto-view status functionality
let autoViewEnabled = process.env.AUTO_VIEW_STATUS === 'true' || false;
let viewedStatusCount = 0;

// Call blocking functionality
global.callBlockEnabled = false;

// Presence tracking
let currentPresence = 'available'; // Default to online

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
        connectionStatus: connectionStatus,
        autoView: autoViewEnabled,
        viewedStatusCount: viewedStatusCount,
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

// QR Code endpoint - FIXED to handle errors better
app.get('/qr', async (req, res) => {
    try {
        if (qrCodeData) {
            console.log('[WA-BOT] Generating QR code for web display');
            const qrImage = await QRCode.toDataURL(qrCodeData, {
                errorCorrectionLevel: 'M',
                type: 'image/png',
                quality: 0.92,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
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
        console.error('[WA-BOT] QR generation error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/status', (req, res) => {
    res.json({
        connected: !!currentSock && connectionStatus === 'connected',
        status: connectionStatus,
        autoView: autoViewEnabled,
        viewedStatusCount: viewedStatusCount,
        presence: currentPresence,
        uptime: Math.floor(process.uptime()),
        botId: botId,
        hasQR: !!qrCodeData
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
                        <strong>Auto View</strong><br>
                        <span id="autoview">${autoViewEnabled ? '✅ Enabled' : '❌ Disabled'}</span>
                    </div>
                    <div class="info-item">
                        <strong>Viewed Status</strong><br>
                        <span id="viewed-count">${viewedStatusCount}</span>
                    </div>
                    <div class="info-item">
                        <strong>Presence</strong><br>
                        <span id="presence">${currentPresence === 'available' ? '🟢 Online' : '🔴 Offline'}</span>
                    </div>
                </div>

                <div style="text-align: center; margin: 20px 0;">
                    <button class="refresh-btn" onclick="refreshStatus()">🔄 Refresh Status</button>
                    <button class="refresh-btn" onclick="location.reload()">↻ Reload Page</button>
                </div>

                <div class="footer">
                    <p><small>Made by CloudNextra</small></p>
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
                        const autoviewSpan = document.getElementById('autoview');
                        const viewedCountSpan = document.getElementById('viewed-count');
                        const presenceSpan = document.getElementById('presence');
                        
                        // Update uptime and autoview status
                        uptimeSpan.textContent = data.uptime + ' seconds';
                        autoviewSpan.textContent = data.autoView ? '✅ Enabled' : '❌ Disabled';
                        viewedCountSpan.textContent = data.viewedStatusCount || 0;
                        presenceSpan.textContent = data.presence === 'available' ? '🟢 Online' : '🔴 Offline';
                        
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

// Helper functions for status download functionality
function cleanOldStatusPosts() {
    // Clean status posts older than 24 hours (WhatsApp status duration)
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    for (const [key, status] of availableStatusPosts.entries()) {
        if (now - status.timestamp > oneDayMs) {
            availableStatusPosts.delete(key);
        }
    }
    
    console.log(`[WA-BOT] Cleaned old status posts. Available: ${availableStatusPosts.size}`);
}

function addStatusPost(message, senderInfo) {
    const statusKey = `${message.key.id}_${message.key.remoteJid}`;
    const messageType = getContentType(message.message);
    
    // Store status post info for later download
    availableStatusPosts.set(statusKey, {
        key: message.key,
        messageType: messageType,
        sender: senderInfo.pushName || senderInfo.notify || 'Unknown',
        senderId: message.key.participant || message.key.remoteJid,
        timestamp: Date.now(),
        message: message.message
    });
    
    // Clean old posts periodically
    if (availableStatusPosts.size % 10 === 0) {
        cleanOldStatusPosts();
    }
    
    console.log(`[WA-BOT] Added status post from ${senderInfo.pushName || 'Unknown'}. Total available: ${availableStatusPosts.size}`);
}

async function downloadStatusPost(sock, statusInfo, remoteJid) {
    try {
        let success = false;

        if (statusInfo.messageType === 'imageMessage') {
            const buffer = await downloadMediaMessage(
                { key: statusInfo.key, message: statusInfo.message },
                'buffer',
                {},
                { logger: console, reuploadRequest: sock.updateMediaMessage }
            );
            
            // Send image directly to WhatsApp instead of saving
            await sock.sendMessage(remoteJid, { 
                image: buffer,
                caption: `📸 *Status from:* ${statusInfo.sender}\n⏰ *Time:* ${new Date(statusInfo.timestamp).toLocaleString()}`
            });
            success = true;
        } else if (statusInfo.messageType === 'videoMessage') {
            const buffer = await downloadMediaMessage(
                { key: statusInfo.key, message: statusInfo.message },
                'buffer',
                {},
                { logger: console, reuploadRequest: sock.updateMediaMessage }
            );
            
            // Send video directly to WhatsApp instead of saving
            await sock.sendMessage(remoteJid, { 
                video: buffer,
                caption: `🎥 *Status from:* ${statusInfo.sender}\n⏰ *Time:* ${new Date(statusInfo.timestamp).toLocaleString()}`
            });
            success = true;
        } else if (statusInfo.messageType === 'extendedTextMessage' || statusInfo.messageType === 'conversation') {
            const text = statusInfo.message.extendedTextMessage?.text || statusInfo.message.conversation || '';
            
            // Send text status directly to WhatsApp
            await sock.sendMessage(remoteJid, { 
                text: `📝 *Text Status from:* ${statusInfo.sender}\n⏰ *Time:* ${new Date(statusInfo.timestamp).toLocaleString()}\n\n${text}`
            });
            success = true;
        }

        if (success) {
            downloadedStatusCount++;
            console.log(`[WA-BOT] Sent status post from: ${statusInfo.sender}`);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('[WA-BOT] Error sending status post:', error);
        return false;
    }
}

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

            // Handle QR code - IMPROVED LOGGING
            if (qr) {
                qrCodeData = qr;
                lastQRUpdate = new Date().toISOString();
                connectionStatus = 'qr_ready';
                console.log('[WA-BOT] ✅ QR Code generated and stored for web display');
                console.log('[WA-BOT] QR Code length:', qr.length);
            }

            if (connection === 'close') {
                connectionStatus = 'disconnected';
                qrCodeData = null;
                console.log('[WA-BOT] ❌ Connection closed, QR cleared');
                const rawError = lastDisconnect?.error;
                const statusCode = rawError?.output?.statusCode;
                const errorMsg = rawError?.message || JSON.stringify(rawError);
                
                const isDeviceRemoved = errorMsg?.toString().toLowerCase().includes('device_removed') || 
                                      errorMsg?.toString().toLowerCase().includes('device removed') || 
                                      (statusCode === 401 && errorMsg?.toString().toLowerCase().includes('conflict'));
                const isStreamRestartRequired = statusCode === 515 || /restart required/i.test(errorMsg) || /stream errored/i.test(errorMsg);

                const shouldReconnect = (statusCode !== DisconnectReason.loggedOut && statusCode !== 405) && !isDeviceRemoved;

                console.log('[WA-BOT] Connection closed:', errorMsg, 'Code:', statusCode, 'Reconnect:', shouldReconnect);

                // Non-recoverable device/session removal
                if (isDeviceRemoved || statusCode === 401) {
                    console.warn('[WA-BOT] Device/session removed. Clearing local auth and re-registering.');
                    try {
                        fs.rmSync(authPath, { recursive: true, force: true });
                        console.log('[WA-BOT] Local auth_info cleared.');
                    } catch (e) {
                        console.error('[WA-BOT] Failed to clear local auth:', e);
                    }

                    try { sock.end?.(); } catch (e) { /* ignore */ }
                    currentSock = null;

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

                // Stream restart required
                if (isStreamRestartRequired) {
                    console.warn('Stream error (restart required) detected — attempting controlled in-process restart.');
                    try { sock.end?.(); } catch (e) { /* ignore */ }
                    currentSock = null;

                    retryCount++;
                    if (retryCount < maxRetries) {
                        const delay = config.reconnectDelayOnStreamError ?? (config.reconnectDelay ?? 10000);
                        setTimeout(() => {
                            isConnecting = false;
                            connectToWhatsApp();
                        }, delay);
                    } else {
                        console.error('Exceeded max retries for stream errors — exiting to allow supervisor restart.');
                        setTimeout(() => process.exit(1), 1000);
                    }
                    return;
                }

                // Default reconnect path for recoverable disconnects
                if (shouldReconnect && retryCount < maxRetries) {
                    retryCount++;
                    try { sock.end?.(); } catch (e) { /* ignore */ }
                    setTimeout(() => {
                        isConnecting = false;
                        connectToWhatsApp();
                    }, config.reconnectDelay ?? 5000);
                } else {
                    console.error('[WA-BOT] Max reconnect attempts reached. Exiting.');
                    setTimeout(() => process.exit(1), 1000);
                }
            } else if (connection === 'open') {
                connectionStatus = 'connected';
                qrCodeData = null;
                botId = update?.me?.id || sock?.user?.id || botId;
                console.log(`[WA-BOT] ✅ Connected as ${botId}, QR cleared`);
            } else if (connection === 'connecting') {
                connectionStatus = 'connecting';
                console.log('[WA-BOT] 🔄 Connecting to WhatsApp...');
            }
        });

        // Message handler with all commands
        sock.ev.on('messages.upsert', async ({ messages }) => {
            const m = messages[0];
            if (!m?.message) return;

            const messageType = Object.keys(m.message)[0];
            const messageContent = m.message[messageType];

            // extract plain text for common message types
            let text = '';
            if (messageType === 'conversation') text = messageContent.conversation || '';
            else if (messageType === 'extendedTextMessage') text = messageContent.text || messageContent?.contextInfo?.quotedMessage?.conversation || '';
            else text = (messageContent?.caption || messageContent?.text) || '';

            // normalize prefix and command
            const prefix = config?.commands?.prefix ?? '.';
            const isCommand = text.startsWith(prefix);
            const parts = isCommand ? text.slice(prefix.length).trim().split(/\s+/) : [];
            const cmd = parts[0]?.toLowerCase();
            const args = parts.slice(1).join(' ');

            // Only respond to commands from self
            if (!isCommand || !m.key.fromMe) {
                // Handle status posts (not regular messages)
                if (!m.key.fromMe && m.key.remoteJid === 'status@broadcast') {
                    // Track status post for potential download
                    if (statusDownloadEnabled) {
                        addStatusPost(m, { pushName: m.pushName, notify: m.key.participant });
                    }
                    
                    // Auto-view status functionality - only for status updates, not regular messages
                    if (autoViewEnabled) {
                        try {
                            // Automatically view WhatsApp status updates
                            await sock.readMessages([m.key]);
                            viewedStatusCount++; // Increment the counter
                            console.log('[WA-BOT] ✅ Auto-viewed status update from:', m.pushName || 'Unknown');
                        } catch (e) {
                            console.error('[WA-BOT] Auto-view error:', e);
                        }
                    }
                }
                return;
            }

            try {
                // Handle .autoview command
                if (cmd === 'autoview') {
                    autoViewEnabled = !autoViewEnabled;
                    const statusText = autoViewEnabled ? 'enabled' : 'disabled';
                    const emoji = autoViewEnabled ? '✅' : '❌';
                    const replyText = `${emoji} Auto View Status has been *${statusText}*

👀 *Auto View Feature:*
${autoViewEnabled ? '✅ Will automatically view WhatsApp status updates' : '❌ Will NOT automatically view status updates'}

💡 This feature automatically marks status updates as viewed, similar to when you open WhatsApp and see status updates.`;
                    await sock.sendMessage(m.key.remoteJid, { text: replyText }, { quoted: m });
                    return;
                }

                // Handle .download command for status posts
                if (cmd === 'download') {
                    if (availableStatusPosts.size === 0) {
                        await sock.sendMessage(m.key.remoteJid, { 
                            text: '📭 *No Status Posts Available*\n\nNo status posts are currently available for download. Status posts appear here when contacts post them.' 
                        }, { quoted: m });
                        return;
                    }

                    let downloadCount = 0;
                    let maxDownloads = 5;
                    let targetContact = null;
                    
                    // Parse arguments: .download ContactName or .download ContactName 3 or .download 5
                    const argParts = args.trim().split(/\s+/);
                    
                    if (argParts.length > 0 && argParts[0]) {
                        // Check if first argument is a number (old behavior: .download 5)
                        if (!isNaN(argParts[0])) {
                            maxDownloads = Math.min(parseInt(argParts[0]), 10);
                        } else {
                            // First argument is contact name
                            targetContact = argParts[0].toLowerCase();
                            // Second argument might be number
                            if (argParts[1] && !isNaN(argParts[1])) {
                                maxDownloads = Math.min(parseInt(argParts[1]), 10);
                            }
                        }
                    }

                    // Filter posts by contact if specified
                    let filteredPosts = Array.from(availableStatusPosts.values());
                    
                    if (targetContact) {
                        filteredPosts = filteredPosts.filter(status => 
                            status.sender.toLowerCase().includes(targetContact) ||
                            status.senderId.includes(targetContact)
                        );
                        
                        if (filteredPosts.length === 0) {
                            // Show available contacts
                            const contacts = [...new Set(Array.from(availableStatusPosts.values()).map(s => s.sender))];
                            await sock.sendMessage(m.key.remoteJid, { 
                                text: `❌ *Contact Not Found*\n\nNo status posts found for: "${targetContact}"\n\n👥 *Available Contacts:*\n${contacts.slice(0, 10).map(c => `• ${c}`).join('\n')}${contacts.length > 10 ? `\n... and ${contacts.length - 10} more` : ''}\n\n💡 *Usage:* \`${prefix}download ContactName [number]\`` 
                            }, { quoted: m });
                            return;
                        }
                        
                        await sock.sendMessage(m.key.remoteJid, { 
                            text: `� *Sending to Mobile*\n\nSending up to ${maxDownloads} status posts from *${filteredPosts[0].sender}*...\n\n⏳ Please wait...` 
                        }, { quoted: m });
                    } else {
                        await sock.sendMessage(m.key.remoteJid, { 
                            text: `� *Sending to Mobile*\n\nSending up to ${maxDownloads} status posts from all contacts...\n\n⏳ Please wait...` 
                        }, { quoted: m });
                    }

                    // Sort by timestamp (newest first) and send to mobile
                    const sortedPosts = filteredPosts
                        .sort((a, b) => b.timestamp - a.timestamp)
                        .slice(0, maxDownloads);

                    for (const statusInfo of sortedPosts) {
                        const success = await downloadStatusPost(sock, statusInfo, m.key.remoteJid);
                        if (success) {
                            downloadCount++;
                        }
                    }

                    const downloadText = `✅ *Send Complete*

📊 *Results:*
• Sent to mobile: ${downloadCount} status posts${targetContact ? ` from *${filteredPosts[0]?.sender || targetContact}*` : ''}
• Failed: ${sortedPosts.length - downloadCount}
• Available from ${targetContact ? 'contact' : 'all contacts'}: ${filteredPosts.length}
• Status posts sent directly to your WhatsApp 📱`;

                    await sock.sendMessage(m.key.remoteJid, { text: downloadText }, { quoted: m });
                    return;
                }

                // Handle .statuslist command
                if (cmd === 'statuslist' || cmd === 'liststatus') {
                    if (availableStatusPosts.size === 0) {
                        await sock.sendMessage(m.key.remoteJid, { 
                            text: '📭 *No Status Posts Available*\n\nNo status posts are currently tracked for download.' 
                        }, { quoted: m });
                        return;
                    }

                    // Check if filtering by specific contact
                    const targetContact = args.trim().toLowerCase();
                    let filteredPosts = Array.from(availableStatusPosts.values());
                    
                    if (targetContact) {
                        filteredPosts = filteredPosts.filter(status => 
                            status.sender.toLowerCase().includes(targetContact) ||
                            status.senderId.includes(targetContact)
                        );
                        
                        if (filteredPosts.length === 0) {
                            const contacts = [...new Set(Array.from(availableStatusPosts.values()).map(s => s.sender))];
                            await sock.sendMessage(m.key.remoteJid, { 
                                text: `❌ *Contact Not Found*\n\nNo status posts found for: "${args.trim()}"\n\n👥 *Available Contacts:*\n${contacts.slice(0, 10).map(c => `• ${c}`).join('\n')}${contacts.length > 10 ? `\n... and ${contacts.length - 10} more` : ''}\n\n💡 *Usage:* \`${prefix}statuslist ContactName\`` 
                            }, { quoted: m });
                            return;
                        }
                    }

                    if (targetContact) {
                        // Show posts from specific contact
                        let listText = `📋 *Status Posts from ${filteredPosts[0]?.sender || targetContact}*\n\n`;
                        listText += `Total: ${filteredPosts.length} posts\n\n`;

                        const sortedPosts = filteredPosts
                            .sort((a, b) => b.timestamp - a.timestamp)
                            .slice(0, 15); // Show more for specific contact

                        sortedPosts.forEach((status, index) => {
                            const timeAgo = Math.floor((Date.now() - status.timestamp) / (1000 * 60));
                            const mediaType = status.messageType.includes('image') ? '🖼️' : 
                                             status.messageType.includes('video') ? '🎥' : '📝';
                            listText += `${index + 1}. ${mediaType} ${timeAgo} min ago\n`;
                        });

                        if (filteredPosts.length > 15) {
                            listText += `\n... and ${filteredPosts.length - 15} more posts`;
                        }

                        listText += `\n\n💡 Use \`${prefix}download ${targetContact}\` to download these posts`;
                        
                        await sock.sendMessage(m.key.remoteJid, { text: listText }, { quoted: m });
                        return;
                    } else {
                        // Group posts by contact and show summary
                        const postsByContact = new Map();
                        
                        Array.from(availableStatusPosts.values()).forEach(status => {
                            if (!postsByContact.has(status.sender)) {
                                postsByContact.set(status.sender, []);
                            }
                            postsByContact.get(status.sender).push(status);
                        });

                        let listText = `📋 *Available Status Posts by Contact*\n\n`;
                        listText += `Total: ${availableStatusPosts.size} posts from ${postsByContact.size} contacts\n\n`;

                        // Sort contacts by most recent post
                        const sortedContacts = Array.from(postsByContact.entries())
                            .sort((a, b) => Math.max(...b[1].map(p => p.timestamp)) - Math.max(...a[1].map(p => p.timestamp)))
                            .slice(0, 12); // Show top 12 contacts

                        sortedContacts.forEach(([contact, posts], index) => {
                            const latestPost = posts.sort((a, b) => b.timestamp - a.timestamp)[0];
                            const timeAgo = Math.floor((Date.now() - latestPost.timestamp) / (1000 * 60));
                            const mediaTypes = posts.map(p => 
                                p.messageType.includes('image') ? '🖼️' : 
                                p.messageType.includes('video') ? '🎥' : '📝'
                            ).slice(0, 3).join('');
                            
                            listText += `${index + 1}. *${contact}* (${posts.length} posts)\n   ${mediaTypes}${posts.length > 3 ? '...' : ''} • ${timeAgo} min ago\n\n`;
                        });

                        if (postsByContact.size > 12) {
                            listText += `... and ${postsByContact.size - 12} more contacts\n\n`;
                        }

                        listText += `💡 *Usage Examples:*\n`;
                        listText += `• \`${prefix}statuslist ContactName\` - View specific contact's posts\n`;
                        listText += `• \`${prefix}download ContactName\` - Download from specific contact`;
                        
                        await sock.sendMessage(m.key.remoteJid, { text: listText }, { quoted: m });
                        return;
                    }
                }

                // Handle .contacts command
                if (cmd === 'contacts') {
                    if (availableStatusPosts.size === 0) {
                        await sock.sendMessage(m.key.remoteJid, { 
                            text: '📭 *No Contacts with Status*\n\nNo status posts are currently available from any contacts.' 
                        }, { quoted: m });
                        return;
                    }

                    // Group posts by contact
                    const postsByContact = new Map();
                    Array.from(availableStatusPosts.values()).forEach(status => {
                        if (!postsByContact.has(status.sender)) {
                            postsByContact.set(status.sender, []);
                        }
                        postsByContact.get(status.sender).push(status);
                    });

                    let contactsText = `👥 *Contacts with Available Status*\n\n`;
                    contactsText += `Total: ${postsByContact.size} contacts with ${availableStatusPosts.size} posts\n\n`;

                    // Sort contacts by most recent post and most posts
                    const sortedContacts = Array.from(postsByContact.entries())
                        .sort((a, b) => {
                            const aLatest = Math.max(...a[1].map(p => p.timestamp));
                            const bLatest = Math.max(...b[1].map(p => p.timestamp));
                            return bLatest - aLatest; // Most recent first
                        });

                    sortedContacts.forEach(([contact, posts], index) => {
                        const latestPost = posts.sort((a, b) => b.timestamp - a.timestamp)[0];
                        const timeAgo = Math.floor((Date.now() - latestPost.timestamp) / (1000 * 60));
                        const mediaCount = {
                            images: posts.filter(p => p.messageType.includes('image')).length,
                            videos: posts.filter(p => p.messageType.includes('video')).length,
                            texts: posts.filter(p => !p.messageType.includes('image') && !p.messageType.includes('video')).length
                        };
                        
                        contactsText += `${index + 1}. *${contact}*\n`;
                        contactsText += `   📊 ${posts.length} posts (🖼️${mediaCount.images} 🎥${mediaCount.videos} 📝${mediaCount.texts})\n`;
                        contactsText += `   📅 Latest: ${timeAgo} min ago\n\n`;
                    });

                    contactsText += `💡 *Usage Examples:*\n`;
                    contactsText += `• \`${prefix}download ContactName\` - Download from specific contact\n`;
                    contactsText += `• \`${prefix}statuslist ContactName\` - View contact's posts`;
                    
                    await sock.sendMessage(m.key.remoteJid, { text: contactsText }, { quoted: m });
                    return;
                }

                // Handle .clearstatus command
                if (cmd === 'clearstatus') {
                    const count = availableStatusPosts.size;
                    availableStatusPosts.clear();
                    await sock.sendMessage(m.key.remoteJid, { 
                        text: `🗑️ *Status List Cleared*\n\nRemoved ${count} status posts from download queue.` 
                    }, { quoted: m });
                    return;
                }

                // Handle .info command
                if (cmd === 'info') {
                    const uptimeSeconds = Math.floor(process.uptime());
                    const hours = Math.floor(uptimeSeconds / 3600);
                    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
                    const seconds = uptimeSeconds % 60;
                    const uptimeFormatted = `${hours}h ${minutes}m ${seconds}s`;
                    
                    const infoText = 
`╔═════════════════════════════╗
║   CloudNextra Bot — Info    ║
╚═════════════════════════════╝

📊 *Bot Status:*
• Connection: ${connectionStatus === 'connected' ? '🟢 Connected' : '🔴 Disconnected'}
• Presence: ${currentPresence === 'available' ? '🟢 Online' : '🔴 Offline'}
• Uptime: ${uptimeFormatted}

⚙️ *Features:*
• Auto View Status: ${autoViewEnabled ? '✅ Enabled' : '❌ Disabled'}
• Call Blocking: ${global.callBlockEnabled ? '✅ Enabled' : '❌ Disabled'}
• Viewed Status Count: ${viewedStatusCount}
• Environment: ${process.env.NODE_ENV || 'development'}
• Version: 1.0.0

🛠️ *Core Commands:*
• ${prefix}info - Show bot information
• ${prefix}autoview - Toggle auto-view for status updates
• ${prefix}online - Set presence to online
• ${prefix}offline - Set presence to offline

🔧 *Utility Commands:*
• ${prefix}anticall - Toggle call blocking
• ${prefix}panel - Show control panel
• ${prefix}sticker - Create sticker from image
• ${prefix}toimg - Convert sticker to image
• ${prefix}shorturl - Shorten URL
• ${prefix}pass - Generate secure password

🔐 *Security:*
Commands work only in self-chat for security.`;
                    await sock.sendMessage(m.key.remoteJid, { text: infoText }, { quoted: m });
                    return;
                }

                // Handle .online command
                if (cmd === 'online') {
                    try {
                        await sock.sendPresenceUpdate('available', m.key.remoteJid);
                        currentPresence = 'available';
                        await sock.sendMessage(m.key.remoteJid, { 
                            text: '🟢 *Status Updated*\n\nPresence set to: *Online*' 
                        }, { quoted: m });
                        console.log('[WA-BOT] Presence set to online');
                    } catch (error) {
                        await sock.sendMessage(m.key.remoteJid, { 
                            text: '❌ Failed to set presence to online' 
                        }, { quoted: m });
                        console.error('[WA-BOT] Online command error:', error);
                    }
                    return;
                }

                // Handle .offline command
                if (cmd === 'offline') {
                    try {
                        await sock.sendPresenceUpdate('unavailable', m.key.remoteJid);
                        currentPresence = 'unavailable';
                        await sock.sendMessage(m.key.remoteJid, { 
                            text: '🔴 *Status Updated*\n\nPresence set to: *Offline*' 
                        }, { quoted: m });
                        console.log('[WA-BOT] Presence set to offline');
                    } catch (error) {
                        await sock.sendMessage(m.key.remoteJid, { 
                            text: '❌ Failed to set presence to offline' 
                        }, { quoted: m });
                        console.error('[WA-BOT] Offline command error:', error);
                    }
                    return;
                }

                // Handle .anticall command
                if (cmd === 'anticall') {
                    try {
                        // Toggle call blocking status (this would need to be implemented with actual call blocking logic)
                        const isCallBlockEnabled = !global.callBlockEnabled; // Toggle status
                        global.callBlockEnabled = isCallBlockEnabled;
                        
                        await sock.sendMessage(m.key.remoteJid, { 
                            text: `📞 *Call Blocking ${isCallBlockEnabled ? 'Enabled' : 'Disabled'}*\n\n${isCallBlockEnabled ? '✅ Incoming calls will be automatically rejected' : '❌ Incoming calls will be allowed'}` 
                        }, { quoted: m });
                        console.log(`[WA-BOT] Call blocking ${isCallBlockEnabled ? 'enabled' : 'disabled'}`);
                    } catch (error) {
                        await sock.sendMessage(m.key.remoteJid, { 
                            text: '❌ Failed to toggle call blocking' 
                        }, { quoted: m });
                        console.error('[WA-BOT] Anticall command error:', error);
                    }
                    return;
                }

                // Handle .panel command
                if (cmd === 'panel') {
                    try {
                        const uptime = process.uptime();
                        const uptimeHours = Math.floor(uptime / 3600);
                        const uptimeMinutes = Math.floor((uptime % 3600) / 60);
                        const uptimeFormatted = `${uptimeHours}h ${uptimeMinutes}m`;
                        
                        const panelText = 
`╔══════════════════════════════╗
║        Control Panel         ║
╚══════════════════════════════╝

🤖 *Bot Information:*
• Status: ${connectionStatus === 'connected' ? '🟢 Online' : '🔴 Offline'}
• Uptime: ${uptimeFormatted}
• Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB
• Auto View: ${autoViewEnabled ? '✅ ON' : '❌ OFF'}
• Call Block: ${global.callBlockEnabled ? '✅ ON' : '❌ OFF'}

📊 *Statistics:*
• Viewed Status: ${viewedStatusCount}
• Commands Executed: Available
• Environment: ${process.env.NODE_ENV || 'dev'}

⚙️ *Quick Actions:*
• ${prefix}anticall - Toggle call blocking
• ${prefix}autoview - Toggle auto status view
• ${prefix}online - Set online presence
• ${prefix}offline - Set offline presence

🔧 *Utilities:*
• ${prefix}sticker - Create sticker
• ${prefix}pass 12 - Generate password`;

                        await sock.sendMessage(m.key.remoteJid, { text: panelText }, { quoted: m });
                    } catch (error) {
                        await sock.sendMessage(m.key.remoteJid, { 
                            text: '❌ Failed to load control panel' 
                        }, { quoted: m });
                        console.error('[WA-BOT] Panel command error:', error);
                    }
                    return;
                }

                // Handle .sticker command
                if (cmd === 'sticker') {
                    try {
                        if (m.message?.imageMessage || m.quoted?.message?.imageMessage) {
                            const imageMsg = m.message?.imageMessage || m.quoted?.message?.imageMessage;
                            
                            await sock.sendMessage(m.key.remoteJid, { 
                                text: '🏷️ *Creating Sticker...*\n\nProcessing your image...' 
                            }, { quoted: m });
                            
                            try {
                                const media = await downloadMediaMessage(m.quoted || m, 'buffer', {});
                                
                                await sock.sendMessage(m.key.remoteJid, {
                                    sticker: media,
                                }, { quoted: m });
                                
                                console.log('[WA-BOT] Sticker created successfully');
                            } catch (downloadError) {
                                await sock.sendMessage(m.key.remoteJid, { 
                                    text: '❌ Failed to create sticker. Please try with a different image.' 
                                }, { quoted: m });
                                console.error('[WA-BOT] Sticker creation error:', downloadError);
                            }
                        } else {
                            await sock.sendMessage(m.key.remoteJid, { 
                                text: '🏷️ *Create Sticker*\n\n📷 Please send an image with the command:\n`.sticker` (with image)\n\nOr reply to an image with `.sticker`' 
                            }, { quoted: m });
                        }
                    } catch (error) {
                        await sock.sendMessage(m.key.remoteJid, { 
                            text: '❌ Failed to process sticker command' 
                        }, { quoted: m });
                        console.error('[WA-BOT] Sticker command error:', error);
                    }
                    return;
                }

                // Handle .toimg command
                if (cmd === 'toimg') {
                    try {
                        if (m.quoted?.message?.stickerMessage) {
                            await sock.sendMessage(m.key.remoteJid, { 
                                text: '🖼️ *Converting Sticker to Image...*\n\nProcessing...' 
                            }, { quoted: m });
                            
                            try {
                                const media = await downloadMediaMessage(m.quoted, 'buffer', {});
                                
                                await sock.sendMessage(m.key.remoteJid, {
                                    image: media,
                                    caption: '🖼️ *Converted to Image*'
                                }, { quoted: m });
                                
                                console.log('[WA-BOT] Sticker converted to image successfully');
                            } catch (downloadError) {
                                await sock.sendMessage(m.key.remoteJid, { 
                                    text: '❌ Failed to convert sticker. Please try with a different sticker.' 
                                }, { quoted: m });
                                console.error('[WA-BOT] Sticker to image conversion error:', downloadError);
                            }
                        } else {
                            await sock.sendMessage(m.key.remoteJid, { 
                                text: '🖼️ *Convert Sticker to Image*\n\n🏷️ Please reply to a sticker with:\n`.toimg`\n\nThis will convert the sticker to a regular image.' 
                            }, { quoted: m });
                        }
                    } catch (error) {
                        await sock.sendMessage(m.key.remoteJid, { 
                            text: '❌ Failed to process image conversion command' 
                        }, { quoted: m });
                        console.error('[WA-BOT] ToImg command error:', error);
                    }
                    return;
                }

                // Handle .shorturl command
                if (cmd === 'shorturl') {
                    try {
                        if (!args.trim()) {
                            await sock.sendMessage(m.key.remoteJid, { 
                                text: '🔗 *Shorten URL*\n\n📝 Usage: `.shorturl https://example.com`\n\nPlease provide a valid URL to shorten.' 
                            }, { quoted: m });
                            return;
                        }

                        const url = args.trim();
                        
                        // Basic URL validation
                        if (!url.startsWith('http://') && !url.startsWith('https://')) {
                            await sock.sendMessage(m.key.remoteJid, { 
                                text: '❌ *Invalid URL*\n\nPlease provide a valid URL starting with http:// or https://' 
                            }, { quoted: m });
                            return;
                        }

                        await sock.sendMessage(m.key.remoteJid, { 
                            text: '🔗 *URL Shortening Service*\n\n📋 Original URL:\n' + url + '\n\n⚠️ *Note:* This is a demo response. To implement actual URL shortening, integrate with services like:\n• bit.ly API\n• tinyurl.com API\n• is.gd API\n\n🔧 Implementation needed in bot code.' 
                        }, { quoted: m });
                        
                        console.log('[WA-BOT] URL shortening requested for:', url);
                    } catch (error) {
                        await sock.sendMessage(m.key.remoteJid, { 
                            text: '❌ Failed to process URL shortening' 
                        }, { quoted: m });
                        console.error('[WA-BOT] Shorturl command error:', error);
                    }
                    return;
                }

                // Handle .pass command
                if (cmd === 'pass') {
                    try {
                        let length = 12; // Default length
                        
                        if (args.trim()) {
                            const inputLength = parseInt(args.trim());
                            if (inputLength >= 4 && inputLength <= 50) {
                                length = inputLength;
                            } else {
                                await sock.sendMessage(m.key.remoteJid, { 
                                    text: '❌ *Invalid Length*\n\nPassword length must be between 4 and 50 characters.\n\n💡 Example: `.pass 16`' 
                                }, { quoted: m });
                                return;
                            }
                        }

                        // Character sets for password generation
                        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
                        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                        const numbers = '0123456789';
                        const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
                        
                        const allChars = lowercase + uppercase + numbers + symbols;
                        
                        let password = '';
                        
                        // Ensure at least one character from each set
                        password += lowercase[Math.floor(Math.random() * lowercase.length)];
                        password += uppercase[Math.floor(Math.random() * uppercase.length)];
                        password += numbers[Math.floor(Math.random() * numbers.length)];
                        password += symbols[Math.floor(Math.random() * symbols.length)];
                        
                        // Fill the remaining length
                        for (let i = password.length; i < length; i++) {
                            password += allChars[Math.floor(Math.random() * allChars.length)];
                        }
                        
                        // Shuffle the password
                        password = password.split('').sort(() => Math.random() - 0.5).join('');

                        const passText = 
`🔐 *Generated Password*

🔑 **Password:** \`${password}\`

📊 **Details:**
• Length: ${length} characters
• Strength: Strong 💪
• Contains: Letters, Numbers, Symbols

⚠️ **Security Tips:**
• Don't share this password
• Store it in a secure password manager
• Use unique passwords for each account

💡 **Usage:** \`.pass 16\` (custom length)`;

                        await sock.sendMessage(m.key.remoteJid, { text: passText }, { quoted: m });
                        console.log(`[WA-BOT] Password generated with length: ${length}`);
                    } catch (error) {
                        await sock.sendMessage(m.key.remoteJid, { 
                            text: '❌ Failed to generate password' 
                        }, { quoted: m });
                        console.error('[WA-BOT] Password command error:', error);
                    }
                    return;
                }

                // Unknown command
                if (cmd) {
                    await sock.sendMessage(m.key.remoteJid, { 
                        text: `❓ Unknown command: *${cmd}*\n\n🛠️ *Available Commands:*\n\n📱 *Core:*\n• ${prefix}info - Bot information\n• ${prefix}autoview - Toggle auto-view\n• ${prefix}online - Set online\n• ${prefix}offline - Set offline\n\n🔧 *Utilities:*\n• ${prefix}anticall - Toggle call blocking\n• ${prefix}panel - Control panel\n• ${prefix}sticker - Create sticker\n• ${prefix}toimg - Convert to image\n• ${prefix}shorturl - Shorten URL\n• ${prefix}pass - Generate password` 
                    }, { quoted: m });
                }

            } catch (error) {
                console.error('[WA-BOT] Command error:', error);
                await sock.sendMessage(m.key.remoteJid, { 
                    text: '❌ An error occurred while processing your command.' 
                }, { quoted: m });
            }

            // Log received messages
            console.log('[WA-BOT] Command executed:', {
                from: m.key.remoteJid,
                command: cmd,
                fromSelf: m.key.fromMe
            });
        });
    } catch (err) {
        connectionStatus = 'error';
        qrCodeData = null;
        console.error('[WA-BOT] Connection error:', err);
        
        retryCount++;
        if (retryCount >= maxRetries) {
            console.error('[WA-BOT] Max retries reached. Exiting.');
            setTimeout(() => process.exit(1), 1000);
        } else {
            isConnecting = false;
            setTimeout(connectToWhatsApp, config.reconnectDelay ?? 5000);
        }
    } finally {
        isConnecting = false;
    }
}

// Add error handler
process.on('unhandledRejection', error => {
    console.log('[WA-BOT] Unhandled rejection:', error);
});

// Start with error handling
connectToWhatsApp().catch(err => {
    console.error('[WA-BOT] Fatal error:', err);
    process.exit(1);
});
