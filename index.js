// CloudNextra WhatsApp Bot V2.0 - Main Application
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

// CloudNextra WhatsApp Bot V2.0 - Enhanced Authentication Functions
const BOT_VERSION = '2.0.0';
const BOT_NAME = 'CloudNextra Bot V2.0';
const BOT_DESCRIPTION = 'Professional WhatsApp Bot with Advanced Features';

// Helper function to check if auth_info is empty or invalid
function isAuthInfoEmpty() {
    try {
        const authPath = './auth_info';
        
        // Check if directory exists
        if (!fs.existsSync(authPath)) {
            console.log('[WA-BOT] 🔄 Auth directory does not exist, creating...');
            fs.mkdirSync(authPath, { recursive: true });
            return true;
        }

        // Check if directory is empty
        const files = fs.readdirSync(authPath);
        const authFiles = files.filter(file => 
            file.endsWith('.json') && 
            !file.startsWith('.') && 
            fs.statSync(path.join(authPath, file)).size > 0
        );

        if (authFiles.length === 0) {
            console.log('[WA-BOT] 📱 Auth directory is empty - New device registration required');
            return true;
        }

        // Check if creds.json exists and is valid
        const credsPath = path.join(authPath, 'creds.json');
        if (fs.existsSync(credsPath)) {
            try {
                const credsData = fs.readFileSync(credsPath, 'utf8');
                const creds = JSON.parse(credsData);
                
                // Check if essential fields exist
                if (!creds.noiseKey || !creds.signedIdentityKey || creds.registered === false) {
                    console.log('[WA-BOT] 🔄 Invalid or incomplete credentials - New registration needed');
                    return true;
                }
            } catch (error) {
                console.log('[WA-BOT] ❌ Corrupted credentials file - New registration needed');
                return true;
            }
        }

        console.log('[WA-BOT] ✅ Valid authentication found');
        return false;
    } catch (error) {
        console.error('[WA-BOT] Error checking auth info:', error);
        return true;
    }
}

// Helper function to clear auth_info for fresh registration
function clearAuthInfo() {
    try {
        const authPath = './auth_info';
        if (fs.existsSync(authPath)) {
            fs.rmSync(authPath, { recursive: true, force: true });
            console.log('[WA-BOT] 🗑️ Cleared auth_info directory');
        }
        fs.mkdirSync(authPath, { recursive: true });
        console.log('[WA-BOT] 📁 Created fresh auth_info directory');
        return true;
    } catch (error) {
        console.error('[WA-BOT] Error clearing auth info:', error);
        return false;
    }
}

// Express app for health checks and V2.0 web interface
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
const maxRetries = config.reconnectAttempts ?? 10; // Increased max retries
let lastConnectionTime = 0;
let consecutiveFailures = 0;

// Auto-view status functionality
let autoViewEnabled = process.env.AUTO_VIEW_STATUS === 'true' || false;
let viewedStatusCount = 0;

// Status download functionality
let statusDownloadEnabled = process.env.STATUS_DOWNLOAD === 'true' || false;

// Call blocking functionality
global.callBlockEnabled = false;

// Auto-reply functionality
let autoReplyEnabled = false;

// Bot status functionality
let botEnabled = true;
const autoReplyMessages = {
    'hi': '👋 Hello! How can I assist you today?',
    'hello': '👋 Hello! How can I assist you today?',
    'good morning': '🌅 Good morning! Wishing you a productive and successful day ahead!',
    'gm': '🌅 Good morning! Wishing you a productive and successful day ahead!',
    'good afternoon': '🌞 Good afternoon! Hope you\'re having an excellent day so far!',
    'good evening': '🌆 Good evening! Hope your day has been wonderful and fulfilling!',
    'good night': '🌙 Good night! Rest well and sweet dreams! See you tomorrow.',
    'gn': '🌙 Good night! Rest well and sweet dreams! See you tomorrow.',
    'thank you': '😊 You\'re most welcome! Happy to help anytime.',
    'thanks': '😊 You\'re most welcome! Happy to help anytime.',
    'bye': '👋 Goodbye! Take care and have a wonderful day ahead!',
    'see you': '👋 See you later! Looking forward to our next conversation.',
    'how are you': '😊 I\'m doing excellent, thank you for asking! How may I assist you today?',
    'what\'s up': '✨ Hello there! Everything\'s running smoothly. How can I help you?'
};
let autoReplyCount = 0;

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

// Health endpoint with enhanced monitoring information
app.get('/health', (req, res) => {
    const now = Date.now();
    const uptimeMs = process.uptime() * 1000;
    const memUsage = process.memoryUsage();
    
    // Calculate connection health score
    let healthScore = 100;
    if (connectionStatus !== 'connected') healthScore -= 50;
    if (consecutiveFailures > 0) healthScore -= Math.min(consecutiveFailures * 10, 30);
    if (retryCount > 0) healthScore -= Math.min(retryCount * 5, 20);
    
    const healthData = { 
        status: healthScore > 50 ? 'healthy' : (healthScore > 20 ? 'degraded' : 'unhealthy'),
        healthScore: Math.max(healthScore, 0),
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        uptimeMs: uptimeMs,
        
        // Connection status
        connectionStatus: connectionStatus,
        botConnected: !!currentSock,
        botId: botId,
        lastConnectionTime: lastConnectionTime,
        connectionAge: lastConnectionTime ? now - lastConnectionTime : null,
        
        // Retry information
        retryCount: retryCount,
        consecutiveFailures: consecutiveFailures,
        maxRetries: maxRetries,
        
        // Bot features
        autoView: autoViewEnabled,
        viewedStatusCount: viewedStatusCount,
        botEnabled: botEnabled,
        presence: currentPresence,
        
        // System information
        keepAliveEnabled: !!RENDER_URL,
        memoryUsage: {
            rss: Math.round(memUsage.rss / 1024 / 1024), // MB
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
            external: Math.round(memUsage.external / 1024 / 1024), // MB
            heapUsedPercent: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
        },
        
        // Platform information
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid
    };
    
    // Set appropriate HTTP status based on health
    const httpStatus = healthScore > 50 ? 200 : (healthScore > 20 ? 207 : 503);
    res.status(httpStatus).json(healthData);
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

// Enhanced monitoring endpoint for detailed diagnostics
app.get('/monitor', (req, res) => {
    const now = Date.now();
    const uptimeMs = process.uptime() * 1000;
    
    res.status(200).json({
        version: BOT_VERSION,
        name: BOT_NAME,
        timestamp: new Date().toISOString(),
        
        // Detailed connection information
        connection: {
            status: connectionStatus,
            connected: !!currentSock,
            botId: botId,
            lastConnectionTime: lastConnectionTime,
            connectionAge: lastConnectionTime ? now - lastConnectionTime : null,
            hasQR: !!qrCodeData,
            lastQRUpdate: lastQRUpdate,
            retryCount: retryCount,
            consecutiveFailures: consecutiveFailures,
            maxRetries: maxRetries,
            isConnecting: isConnecting
        },
        
        // Bot features status
        features: {
            autoView: autoViewEnabled,
            statusDownload: statusDownloadEnabled,
            autoReply: autoReplyEnabled,
            callBlocking: global.callBlockEnabled,
            botEnabled: botEnabled,
            presence: currentPresence
        },
        
        // Statistics
        stats: {
            uptime: Math.floor(process.uptime()),
            uptimeMs: uptimeMs,
            viewedStatusCount: viewedStatusCount,
            startTime: new Date(Date.now() - uptimeMs).toISOString()
        },
        
        // System health
        system: {
            memory: process.memoryUsage(),
            platform: process.platform,
            nodeVersion: process.version,
            pid: process.pid,
            keepAliveEnabled: !!RENDER_URL,
            renderUrl: RENDER_URL
        }
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
            <title>CloudNextra WhatsApp Bot V2.0</title>
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
                    <h1>🚀 CloudNextra WhatsApp Bot V2.0</h1>
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

// Add graceful restart handling for cloud platforms (Render, etc.)
let isShuttingDown = false;

process.on('SIGTERM', () => {
    console.log('[WA-BOT] Received SIGTERM. Gracefully restarting...');
    handleGracefulRestart();
});

process.on('SIGINT', () => {
    console.log('[WA-BOT] Received SIGINT. Gracefully shutting down...');
    if (currentSock) {
        currentSock.end();
    }
    process.exit(0);
});

// Handle graceful restart (for SIGTERM from cloud platforms)
async function handleGracefulRestart() {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    console.log('[WA-BOT] 🔄 Preparing for restart...');
    
    // Close current connection gracefully
    if (currentSock) {
        try {
            currentSock.end();
            console.log('[WA-BOT] ✅ WhatsApp connection closed');
        } catch (error) {
            console.log('[WA-BOT] ⚠️ Error closing connection:', error.message);
        }
    }
    
    // Reset connection state
    currentSock = null;
    isConnecting = false;
    connectionStatus = 'disconnected';
    qrCodeData = null;
    retryCount = 0;
    
    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('[WA-BOT] 🚀 Restarting WhatsApp connection...');
    isShuttingDown = false;
    
    // Restart connection
    connectToWhatsApp().catch(err => {
        console.error('[WA-BOT] Restart failed:', err);
        // If restart fails, try again after delay
        setTimeout(() => connectToWhatsApp(), 5000);
    });
}

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
        
        // Check if we need fresh registration (empty or invalid auth_info)
        if (isAuthInfoEmpty()) {
            console.log('[WA-BOT] 🆕 Fresh device registration required');
            console.log('[WA-BOT] 📱 New QR code will be generated');
            qrCodeData = null;
            connectionStatus = 'registering';
        }
        
        const { state, saveCreds } = await useMultiFileAuthState(authPath);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            printQRInTerminal: true,
            auth: state,
            connectTimeoutMs: 60_000,
            emitOwnEvents: true,
            retryRequestDelayMs: 2000,
            browser: ['CloudNextra Bot V2.0', 'Desktop', '2.0.0'],
        });

        // persist credentials on update
        sock.ev.on('creds.update', saveCreds);

        // Handle incoming calls for call blocking feature
        sock.ev.on('call', async (callUpdate) => {
            if (global.callBlockEnabled) {
                for (const call of callUpdate) {
                    if (call.status === 'offer') {
                        // Reject the incoming call
                        try {
                            await sock.rejectCall(call.id, call.from);
                            console.log(`[WA-BOT] 🚫 Blocked call from ${call.from}`);
                            
                            // Optional: Send a message to the caller explaining the call was blocked
                            try {
                                await sock.sendMessage(call.from, {
                                    text: `📞 *Call Blocked* - Automated Response


🛡️ *CALL PROTECTION ACTIVE*


Your call has been automatically blocked by CloudNextra Bot V2.0.

🔒 *Reason:* Call blocking is currently enabled
📱 *Alternative:* Please send a text message instead



⚡ Powered by CloudNextra Bot V2.0`
                                });
                                console.log(`[WA-BOT] 📩 Sent call blocking notification to ${call.from}`);
                            } catch (msgError) {
                                console.log(`[WA-BOT] ⚠️ Could not send blocking message to ${call.from}:`, msgError.message);
                            }
                        } catch (error) {
                            console.error(`[WA-BOT] ❌ Failed to block call from ${call.from}:`, error.message);
                        }
                    }
                }
            } else {
                // Log incoming calls when blocking is disabled (for debugging)
                for (const call of callUpdate) {
                    if (call.status === 'offer') {
                        console.log(`[WA-BOT] 📞 Incoming call from ${call.from} (blocking disabled)`);
                    }
                }
            }
        });

        // keep reference for safe close on reconnect
        if (currentSock && currentSock !== sock) {
            try { currentSock.end?.(); } catch (e) { /* ignore */ }
        }
        currentSock = sock;

        // reset retry counter when we successfully connect
        retryCount = 0;

        // store bot id when connection opens
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            // Handle QR code - ENHANCED FOR FRESH REGISTRATION
            if (qr) {
                qrCodeData = qr;
                lastQRUpdate = new Date().toISOString();
                connectionStatus = 'qr_ready';
                console.log('[WA-BOT] ✅ QR Code generated and stored for web display');
                console.log('[WA-BOT] 📱 Fresh device registration - Please scan QR code');
                console.log('[WA-BOT] 🌐 QR available at: http://localhost:' + PORT + '/qr');
                console.log('[WA-BOT] QR Code length:', qr.length);
                console.log('');
                console.log('┌─────────────────────────────────────┐');
                console.log('│       📱 NEW DEVICE REGISTRATION       │');
                console.log('├─────────────────────────────────────┤');
                console.log('│  1. Open WhatsApp on your phone       │');
                console.log('│  2. Go to Settings → Linked Devices   │');
                console.log('│  3. Tap "Link a Device"               │');
                console.log('│  4. Scan the QR code above            │');
                console.log('│  5. Or visit: http://localhost:' + PORT.toString().padEnd(4) + ' │');
                console.log('└─────────────────────────────────────┘');
                console.log('');
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

                // Enhanced 401/Device removal handling
                if (isDeviceRemoved || statusCode === 401) {
                    console.warn('[WA-BOT] 🚫 Device/session removed or authentication failed (401)');
                    console.log('[WA-BOT] 🗑️ Clearing local auth and preparing fresh registration...');
                    
                    // Clear authentication using helper function
                    if (clearAuthInfo()) {
                        console.log('[WA-BOT] ✅ Auth cleared successfully');
                        console.log('[WA-BOT] 📱 Fresh QR code will be generated on next connection');
                    }

                    try { sock.end?.(); } catch (e) { /* ignore */ }
                    currentSock = null;
                    consecutiveFailures++;

                    retryCount++;
                    if (retryCount < maxRetries) {
                        const delay = Math.min(config.reconnectDelayOnAuthReset ?? 3000 * consecutiveFailures, 30000);
                        console.log(`[WA-BOT] 🔄 Retrying connection in ${delay/1000}s (${retryCount}/${maxRetries})`);
                        setTimeout(() => {
                            isConnecting = false;
                            connectToWhatsApp();
                        }, delay);
                    } else {
                        console.error('[WA-BOT] ❌ Max retries after auth reset. Restarting process...');
                        setTimeout(() => process.exit(1), 1000);
                    }
                    return;
                }

                // Stream restart required
                if (isStreamRestartRequired) {
                    console.warn('[WA-BOT] Stream error (restart required) detected — attempting controlled restart.');
                    try { sock.end?.(); } catch (e) { /* ignore */ }
                    currentSock = null;
                    consecutiveFailures++;

                    retryCount++;
                    if (retryCount < maxRetries) {
                        const delay = Math.min((config.reconnectDelayOnStreamError ?? 10000) * consecutiveFailures, 60000);
                        console.log(`[WA-BOT] 🔄 Retrying after stream error in ${delay/1000}s (${retryCount}/${maxRetries})`);
                        setTimeout(() => {
                            isConnecting = false;
                            connectToWhatsApp();
                        }, delay);
                    } else {
                        console.error('[WA-BOT] ❌ Exceeded max retries for stream errors — restarting process.');
                        setTimeout(() => process.exit(1), 1000);
                    }
                    return;
                }

                // Default reconnect path for recoverable disconnects
                if (shouldReconnect && retryCount < maxRetries) {
                    retryCount++;
                    consecutiveFailures++;
                    try { sock.end?.(); } catch (e) { /* ignore */ }
                    
                    // Exponential backoff with jitter
                    const baseDelay = config.reconnectDelay ?? 5000;
                    const exponentialDelay = baseDelay * Math.pow(2, Math.min(consecutiveFailures - 1, 5));
                    const jitter = Math.random() * 1000; // Add randomness to prevent thundering herd
                    const finalDelay = Math.min(exponentialDelay + jitter, 120000); // Max 2 minutes
                    
                    console.log(`[WA-BOT] 🔄 Reconnecting in ${(finalDelay/1000).toFixed(1)}s (attempt ${retryCount}/${maxRetries})`);
                    setTimeout(() => {
                        isConnecting = false;
                        connectToWhatsApp();
                    }, finalDelay);
                } else {
                    console.error('[WA-BOT] Max reconnect attempts reached. Exiting.');
                    setTimeout(() => process.exit(1), 1000);
                }
            } else if (connection === 'open') {
                connectionStatus = 'connected';
                qrCodeData = null;
                botId = update?.me?.id || sock?.user?.id || botId;
                
                // Reset failure counters on successful connection
                retryCount = 0;
                consecutiveFailures = 0;
                lastConnectionTime = Date.now();
                
                console.log(`[WA-BOT] ✅ Connected as ${botId}, QR cleared`);
                console.log(`[WA-BOT] 🔧 Connection counters reset - ready for stable operation`);
                
                // Restore presence state after connection
                try {
                    await sock.sendPresenceUpdate(currentPresence);
                    console.log(`[WA-BOT] 👤 Presence restored to: ${currentPresence}`);
                } catch (e) {
                    console.error('[WA-BOT] ❌ Failed to restore presence:', e);
                }
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

                // Handle auto-reply for regular messages from other contacts (private chats only)
                if (!m.key.fromMe && autoReplyEnabled && m.key.remoteJid !== 'status@broadcast' && 
                    !m.key.remoteJid.endsWith('@g.us') && text.trim()) {
                    try {
                        const incomingText = text.toLowerCase().trim();
                        let replyMessage = null;
                        
                        // Check for exact matches first
                        if (autoReplyMessages[incomingText]) {
                            replyMessage = autoReplyMessages[incomingText];
                        } else {
                            // Check for partial matches (keywords contained in the message)
                            for (const [keyword, response] of Object.entries(autoReplyMessages)) {
                                if (incomingText.includes(keyword.toLowerCase())) {
                                    replyMessage = response;
                                    break;
                                }
                            }
                        }
                        
                        if (replyMessage) {
                            // Add a small delay to make it seem more natural
                            setTimeout(async () => {
                                await sock.sendMessage(m.key.remoteJid, { text: replyMessage });
                                autoReplyCount++;
                                console.log(`[WA-BOT] ✅ Auto-replied to: ${m.pushName || 'Unknown'} with: ${replyMessage}`);
                            }, 1000 + Math.random() * 2000); // 1-3 second delay
                        }
                    } catch (e) {
                        console.error('[WA-BOT] Auto-reply error:', e);
                    }
                }
                return;
            }

            try {
                // Check if bot is enabled (allow onbot, offbot, and info commands even when disabled)
                if (!botEnabled && cmd !== 'onbot' && cmd !== 'offbot' && cmd !== 'info') {
                    // Bot is disabled, ignore all commands except onbot, offbot, and info
                    return;
                }

                // Handle .autoview command
                if (cmd === 'autoview') {
                    autoViewEnabled = !autoViewEnabled;
                    const statusText = autoViewEnabled ? 'enabled' : 'disabled';
                    const emoji = autoViewEnabled ? '✅' : '❌';
                    const replyText = `${emoji} *Auto View Status Updated*


👀 *AUTO VIEW MANAGEMENT*


📋 *Current Status:* ${autoViewEnabled ? '✅ ACTIVE' : '❌ INACTIVE'}
${autoViewEnabled ? '🟢 Status updates will be automatically viewed' : '🔴 Status auto-viewing is currently disabled'}

📊 *Analytics:*
• 👁️ Status viewed: ${viewedStatusCount}
• 🎯 Target: WhatsApp status updates only

💡 *How it Works:*
• ✅ Automatically marks status updates as "viewed"
• 👀 Similar to opening WhatsApp and viewing stories
• 🚫 Does NOT view regular chat messages
• 🔒 Maintains your privacy in conversations

`;
                    await sock.sendMessage(m.key.remoteJid, { text: replyText }, { quoted: m });
                    return;
                }

                // Handle .autoreply command
                if (cmd === 'autoreply') {
                    autoReplyEnabled = !autoReplyEnabled;
                    const statusText = autoReplyEnabled ? 'enabled' : 'disabled';
                    const emoji = autoReplyEnabled ? '✅' : '❌';
                    
                    // Generate sample keywords list for display
                    const sampleKeywords = Object.keys(autoReplyMessages).slice(0, 6).join(', ');
                    
                    const replyText = `${emoji} *Auto Reply Status Updated*


🤖 *AUTO REPLY MANAGEMENT*


📋 *Current Status:* ${autoReplyEnabled ? '✅ ACTIVE' : '❌ INACTIVE'}
${autoReplyEnabled ? '🟢 System will automatically respond to keyword messages' : '🔴 Automatic responses are currently disabled'}

📝 *Supported Keywords:*
${sampleKeywords}... and more

📊 *Performance Analytics:*
• 📨 Total replies sent: ${autoReplyCount}
• 🔤 Keywords configured: ${Object.keys(autoReplyMessages).length}
• 🎯 Target: Private chats only

💡 *Important Notes:*
• ✅ Only responds to private chat messages
• ❌ Does not work in group chats
• 🚫 Ignores your own messages
• ⚡ Natural delay: 1-3 seconds

`;
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
`
        🚀 CLOUDNEXTRA BOT V2.0 INFO     


� *System Status:*

• 🤖 Bot Status: ${botEnabled ? '🟢 ACTIVE' : '🔴 INACTIVE'}
• 🌐 Connection: ${connectionStatus === 'connected' ? '🟢 ONLINE' : '🔴 OFFLINE'}
• 👤 Presence: ${currentPresence === 'available' ? '🟢 AVAILABLE' : '🔴 AWAY'}
• ⏰ Uptime: ${uptimeFormatted}
• 🔧 Version: ${BOT_VERSION} (V2.0 Professional)
• 🏢 Developer: CloudNextra Team
• 🌍 Environment: ${process.env.NODE_ENV || 'development'}

⚙️ *Feature Status:*

• 👀 Auto View Status: ${autoViewEnabled ? '✅ ACTIVE' : '❌ INACTIVE'}
• 🤖 Auto Reply: ${autoReplyEnabled ? '✅ ACTIVE' : '❌ INACTIVE'}
• 📞 Call Blocking: ${global.callBlockEnabled ? '✅ ACTIVE' : '❌ INACTIVE'}

📊 *Performance Analytics:*

• 👁️ Status Viewed: ${viewedStatusCount}
• 💬 Auto Replies Sent: ${autoReplyCount}
• ⚡ Commands Processed: Available

🛠️ *Core Commands:*

• ${prefix}onbot - 🟢 Enable bot services
• ${prefix}offbot - 🔴 Disable bot services
• ${prefix}newqr - 📱 Generate new QR code
• ${prefix}online - 🟢 Set presence to online
• ${prefix}offline - 🔴 Set presence to offline
• ${prefix}panel - 📋 Show control panel
• ${prefix}info - ℹ️ Show bot information
• ${prefix}autoview - 👀 Toggle auto-view status
• ${prefix}autoreply - 🤖 Toggle auto-reply
• ${prefix}anticall - 📞 Toggle call blocking

🔧 *Utility Commands:*

• ${prefix}newqr - 🔄 Generate new QR code
• ${prefix}resetauth - � Reset authentication

🔐 *Security Notice:*

All commands work exclusively in self-chat for maximum security and privacy.


           Powered by CloudNextra          
`;
                    await sock.sendMessage(m.key.remoteJid, { text: infoText }, { quoted: m });
                    return;
                }

                // Handle .online command
                if (cmd === 'online') {
                    try {
                        await sock.sendPresenceUpdate('available');
                        currentPresence = 'available';
                        await sock.sendMessage(m.key.remoteJid, { 
                            text: `🟢 *Presence Status Updated*


👤 *ONLINE STATUS ACTIVATED*


✅ Your WhatsApp presence is now set to: *ONLINE*
🌐 You will appear as available to your contacts
⚡ Status change applied successfully

` 
                        }, { quoted: m });
                        console.log('[WA-BOT] Presence set to online');
                    } catch (error) {
                        await sock.sendMessage(m.key.remoteJid, { 
                            text: `❌ *Presence Update Failed*


🔧 *SYSTEM ERROR*


⚠️ Unable to update presence to online
🔄 Please try again in a few moments
📞 If issue persists, check your connection

` 
                        }, { quoted: m });
                        console.error('[WA-BOT] Online command error:', error);
                    }
                    return;
                }

                // Handle .offline command
                if (cmd === 'offline') {
                    try {
                        await sock.sendPresenceUpdate('unavailable');
                        currentPresence = 'unavailable';
                        await sock.sendMessage(m.key.remoteJid, { 
                            text: `🔴 *Presence Status Updated*


👤 *OFFLINE STATUS ACTIVATED*


✅ Your WhatsApp presence is now set to: *OFFLINE*
🌙 You will appear as away to your contacts
⚡ Status change applied successfully

` 
                        }, { quoted: m });
                        console.log('[WA-BOT] Presence set to offline');
                    } catch (error) {
                        await sock.sendMessage(m.key.remoteJid, { 
                            text: `❌ *Presence Update Failed*


🔧 *SYSTEM ERROR*


⚠️ Unable to update presence to offline
🔄 Please try again in a few moments
📞 If issue persists, check your connection

` 
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
                            text: `📞 *Call Protection Status Updated*


🛡️ *CALL BLOCKING ${isCallBlockEnabled ? 'ACTIVATED' : 'DEACTIVATED'}*


📋 *Current Status:* ${isCallBlockEnabled ? '✅ ACTIVE' : '❌ INACTIVE'}
${isCallBlockEnabled ? '🔴 Incoming calls will be automatically rejected' : '🟢 Incoming calls will be accepted normally'}

💡 *Features:*
• 🚫 Auto-reject unwanted calls
• 📵 Protect your privacy
• ⚡ Instant call termination
• 🔒 Secure call management

` 
                        }, { quoted: m });
                        console.log(`[WA-BOT] Call blocking ${isCallBlockEnabled ? 'enabled' : 'disabled'}`);
                    } catch (error) {
                        await sock.sendMessage(m.key.remoteJid, { 
                            text: `❌ *Call Protection Update Failed*


🔧 *SYSTEM ERROR*


⚠️ Unable to toggle call blocking feature
🔄 Please try again in a few moments
📞 If issue persists, restart the bot

` 
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
`       🎛️ CONTROL PANEL DASHBOARD

⚙️ *Feature Controls:*

• 👀 Auto View: ${autoViewEnabled ? '🟢 ACTIVE' : '🔴 INACTIVE'}
• 🤖 Auto Reply: ${autoReplyEnabled ? '🟢 ACTIVE' : '🔴 INACTIVE'}
• 📞 Call Block: ${global.callBlockEnabled ? '🟢 ACTIVE' : '🔴 INACTIVE'}

📊 *Performance Analytics:*

• 👁️ Status Viewed: ${viewedStatusCount}
• 💬 Auto Replies: ${autoReplyCount}

🎯 *Quick Actions:*

• ${prefix}onbot - 🟢 Enable bot services
• ${prefix}offbot - 🔴 Disable bot services
• ${prefix}newqr - 📱 Generate new QR code
• ${prefix}online - 🟢 Set online presence
• ${prefix}offline - 🔴 Set offline presence
• ${prefix}info - ℹ️ Detailed bot information
• ${prefix}autoview - 👀 Toggle auto status view
• ${prefix}autoreply - 🤖 Toggle auto reply
• ${prefix}anticall - 📞 Toggle call blocking
• ${prefix}sticker - 🏷️ Create sticker from image
• ${prefix}toimg - 🖼️ Convert sticker to image
• ${prefix}shorturl - 🔗 Shorten any URL
• ${prefix}pass 12 - 🔐 Generate secure password`;

                        await sock.sendMessage(m.key.remoteJid, { text: panelText }, { quoted: m });
                    } catch (error) {
                        await sock.sendMessage(m.key.remoteJid, { 
                            text: `❌ *Control Panel Error*


🔧 *SYSTEM ERROR*


⚠️ Unable to load control panel
🔄 Please try again in a few moments
📞 If issue persists, restart the bot

` 
                        }, { quoted: m });
                        console.error('[WA-BOT] Panel command error:', error);
                    }
                    return;
                }

                // Handle .onbot command
                if (cmd === 'onbot') {
                    botEnabled = true;
                    const replyText = `✅ *Bot Status Updated*


🤖 *BOT MANAGEMENT SYSTEM*


📋 *Current Status:* ✅ ACTIVE
🟢 Bot is now fully operational and ready to serve

🔧 *Available Services:*
• 👀 Auto view status
• 🤖 Auto reply system  
• 📞 Call blocking
• 📊 Analytics panel
• ⚡ All commands enabled

💡 *Quick Start:*
• Type \`.panel\` for control dashboard
• Type \`.info\` for feature overview
• Type \`.offbot\` to disable bot




        CloudNextra Bot V2.0 ONLINE      
`;
                    await sock.sendMessage(m.key.remoteJid, { text: replyText }, { quoted: m });
                    console.log('[WA-BOT] Bot enabled by user');
                    return;
                }

                // Handle .offbot command
                if (cmd === 'offbot') {
                    botEnabled = false;
                    const replyText = `❌ *Bot Status Updated*


🤖 *BOT MANAGEMENT SYSTEM*


📋 *Current Status:* ❌ INACTIVE
🔴 Bot services have been temporarily disabled

🚫 *Disabled Services:*
• 👀 Auto view status
• 🤖 Auto reply system  
• 📞 Call blocking
• 📊 Analytics panel
• ⚡ Most commands disabled

✅ *Still Available:*
• \`.onbot\` - Re-enable bot
• \`.info\` - View bot information

💡 *To Reactivate:*
Simply type \`.onbot\` when you want to use the bot again




        CloudNextra Bot V2.0 OFFLINE     
`;
                    await sock.sendMessage(m.key.remoteJid, { text: replyText }, { quoted: m });
                    console.log('[WA-BOT] Bot disabled by user');
                    return;
                }

                // Handle .newqr command - Generate new QR code by clearing auth
                if (cmd === 'newqr' || cmd === 'resetauth') {
                    const replyText = `🔄 *Device Re-Registration*


🤖 *AUTHENTICATION RESET*


⚠️ *WARNING:* This will disconnect the current device!

📱 *What will happen:*
• Current WhatsApp session will be cleared
• Bot will restart and generate fresh QR code
• You'll need to scan new QR to reconnect
• All settings will be preserved

🔄 *This process will:*
1. Clear authentication data
2. Restart the connection
3. Generate new QR code
4. Wait for you to scan it

💡 *Use this if:*
• WhatsApp shows "Device not registered"
• Connection keeps failing
• Need to link new phone number



⏳ *Starting fresh registration in 3 seconds...*


     CloudNextra Bot V2.0 RESET       
`;

                    await sock.sendMessage(m.key.remoteJid, { text: replyText }, { quoted: m });
                    console.log('[WA-BOT] 🔄 Fresh QR generation requested by user');
                    
                    // Clear auth and restart connection after delay
                    setTimeout(async () => {
                        try {
                            // Clear authentication
                            if (clearAuthInfo()) {
                                console.log('[WA-BOT] ✅ Authentication cleared for fresh QR');
                                
                                // Close current connection
                                if (currentSock) {
                                    try { currentSock.end?.(); } catch (e) { /* ignore */ }
                                }
                                currentSock = null;
                                
                                // Reset connection state
                                isConnecting = false;
                                retryCount = 0;
                                qrCodeData = null;
                                connectionStatus = 'registering';
                                
                                // Start fresh connection
                                console.log('[WA-BOT] 🚀 Starting fresh connection with new QR...');
                                setTimeout(() => connectToWhatsApp(), 1000);
                            }
                        } catch (error) {
                            console.error('[WA-BOT] Error during auth reset:', error);
                        }
                    }, 3000);
                    
                    return;
                }

                // Unknown commands are now ignored (no response)

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
                fromSelf: m.key.fromMe,
                messageType: messageType,
                hasQuoted: !!m.message?.extendedTextMessage?.contextInfo?.quotedMessage
            });
        });
    } catch (err) {
        connectionStatus = 'error';
        qrCodeData = null;
        consecutiveFailures++;
        
        // Enhanced error classification
        const errorMsg = err?.message || err?.toString() || 'Unknown error';
        const isNetworkError = /network|timeout|dns|connection refused|econnreset|enotfound/i.test(errorMsg);
        const isAuthError = /401|unauthorized|authentication|creds/i.test(errorMsg);
        const isRateLimit = /429|rate.?limit|too many requests/i.test(errorMsg);
        
        console.error('[WA-BOT] Connection error:', {
            message: errorMsg,
            type: err?.name || 'UnknownError',
            code: err?.code,
            isNetwork: isNetworkError,
            isAuth: isAuthError,
            isRateLimit: isRateLimit,
            attempt: retryCount + 1,
            maxRetries
        });
        
        retryCount++;
        
        if (retryCount >= maxRetries) {
            console.error('[WA-BOT] ❌ Max retries reached. Attempting process restart...');
            setTimeout(() => process.exit(1), 1000);
        } else {
            // Calculate delay based on error type
            let delay = config.reconnectDelay ?? 5000;
            
            if (isRateLimit) {
                delay = Math.min(30000 * consecutiveFailures, 300000); // 30s to 5min for rate limits
                console.log(`[WA-BOT] ⏳ Rate limit detected, waiting ${delay/1000}s before retry`);
            } else if (isNetworkError) {
                delay = Math.min(10000 * consecutiveFailures, 120000); // 10s to 2min for network issues
                console.log(`[WA-BOT] 🌐 Network error detected, waiting ${delay/1000}s before retry`);
            } else if (isAuthError) {
                console.log('[WA-BOT] 🔑 Authentication error - clearing auth data');
                clearAuthInfo();
                delay = 5000; // Quick retry after auth clear
            } else {
                // General exponential backoff
                delay = Math.min(delay * Math.pow(2, consecutiveFailures - 1), 60000);
                console.log(`[WA-BOT] 🔄 General error, exponential backoff: ${delay/1000}s`);
            }
            
            isConnecting = false;
            setTimeout(connectToWhatsApp, delay);
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
