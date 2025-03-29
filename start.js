/**
 * WhatsApp Always Online Bot
 * A professional WhatsApp bot that maintains online presence and handles basic commands
 * Author: CloudNextra
 * License: Apache-2.0
 */

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    Browsers
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const config = require('./config');

// Add these utility functions at the top after the imports
const getTimestamp = () => new Date().toLocaleTimeString();
const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatUptime = (seconds) => {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
};

const log = {
    info: (msg) => console.log(`\x1b[36m[${getTimestamp()}] INFO\x1b[0m: ${msg}`),
    success: (msg) => console.log(`\x1b[32m[${getTimestamp()}] SUCCESS\x1b[0m: ${msg}`),
    warning: (msg) => console.log(`\x1b[33m[${getTimestamp()}] WARNING\x1b[0m: ${msg}`),
    error: (msg) => console.log(`\x1b[31m[${getTimestamp()}] ERROR\x1b[0m: ${msg}`),
    system: (msg) => console.log(`\x1b[35m[${getTimestamp()}] SYSTEM\x1b[0m: ${msg}`)
};

// Bot state configuration
const BOT_STATE = {
    isAlwaysOnline: true,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    reconnectDelay: 5000,
    presenceUpdateInterval: 10000, // 10 seconds
    presenceUpdateTimer: null
};

const COMMANDS = {
    '.online': async (sock, jid) => {
        BOT_STATE.isAlwaysOnline = true;
        await sock.sendMessage(jid, { 
            text: `╭━━━『 *STATUS UPDATE* 』━━━╮
│ 🟢 Mode: Always Online
│ ✨ Status: Activated
│ 🔄 Auto-Presence: Enabled
╰━━━━━━━━━━━━━━━━━━━━━╯` 
        });
        await sock.sendPresenceUpdate('available');
        startPresenceUpdates(sock);
    },
    '.offline': async (sock, jid) => {
        BOT_STATE.isAlwaysOnline = false;
        await sock.sendMessage(jid, { 
            text: `╭━━━『 *STATUS UPDATE* 』━━━╮
│ 🔴 Mode: Offline
│ 💤 Status: Deactivated
│ ⏸️ Auto-Presence: Disabled
╰━━━━━━━━━━━━━━━━━━━━━╯` 
        });
        await sock.sendPresenceUpdate('unavailable');
        stopPresenceUpdates();
    },
    '.logout': async (sock, jid) => {
        await sock.sendMessage(jid, { 
            text: `╭━━━『 *SYSTEM UPDATE* 』━━━╮
│ 🔄 Status: Logging Out
│ 🛑 Action: Shutting Down
│ 👋 Message: Goodbye!
╰━━━━━━━━━━━━━━━━━━━━━╯` 
        });
        stopPresenceUpdates();
        await sock.logout();
        process.exit(0);
    },
    '.menu': async (sock, jid) => {
        try {
            await sock.sendMessage(jid, { 
                text: `╭━━━『 *🤖 CLOUDNEXTRA BOT* 』━━━╮
│
├⦿ *📱 STATUS*
│ ┌────────────────
│ ├ 🟢 Online Mode: ${BOT_STATE.isAlwaysOnline ? 'Active' : 'Inactive'}
│ ├ ⚡ Version: 1.0.0
│ ├ 💻 Platform: ${process.platform}
│ └────────────────
│
├⦿ *⌨️ COMMANDS*
│ ┌────────────────
│ ├ .online  ▹ Enable always online
│ ├ .offline ▹ Disable always online
│ ├ .logout  ▹ Logout and stop bot
│ ├ .menu    ▹ Show this menu
│ └────────────────
│
├⦿ *📊 SYSTEM*
│ ┌────────────────
│ ├ ⏳ Uptime: ${formatUptime(process.uptime())}
│ ├ 💾 Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
│ └────────────────
│
╰━━━━『 ✨ CloudNextra Bot 』━━━╯` 
            });
            log.success('Menu displayed successfully');
        } catch (error) {
            log.error(`Failed to send menu: ${error.message}`);
            throw error;
        }
    }
};

// Start presence updates
function startPresenceUpdates(sock) {
    // Clear any existing timer
    if (BOT_STATE.presenceUpdateTimer) {
        clearInterval(BOT_STATE.presenceUpdateTimer);
    }

    // Set new timer
    BOT_STATE.presenceUpdateTimer = setInterval(async () => {
        if (!BOT_STATE.isAlwaysOnline) return;
        
        try {
            await sock.sendPresenceUpdate('available');
        } catch (error) {
            // Only log serious errors, ignore connection closed errors
            if (!error.message?.includes('Connection Closed')) {
                log.error(`[PRESENCE ERROR] ${error.message}`);
            }
        }
    }, BOT_STATE.presenceUpdateInterval);
}

// Stop presence updates
function stopPresenceUpdates() {
    if (BOT_STATE.presenceUpdateTimer) {
        clearInterval(BOT_STATE.presenceUpdateTimer);
        BOT_STATE.presenceUpdateTimer = null;
    }
}

/**
 * Establishes connection to WhatsApp and handles all core functionality
 */
async function connectToWhatsApp() {
    // Initialize auth state
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    // Create WhatsApp connection
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true, // This enables QR code in terminal
        logger: pino({ 
            level: 'silent',  // Reduce log noise
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true
                }
            }
        }),
        browser: Browsers.ubuntu('Chrome'),
        markOnlineOnConnect: true,
        connectTimeoutMs: 60000,
        retryRequestDelayMs: 5000
    });

    // Connection update handler with QR code handling
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if(qr) {
            log.system('\n┌──────────── SCAN QR CODE ────────────┐');
            log.system('│ 1. Open WhatsApp on your phone        │');
            log.system('│ 2. Go to Linked Devices > Link Device │');
            log.system('│ 3. Point camera to QR code below      │');
            log.system('└─────────────────────────────────────┘\n');
        }
        
        if (connection === 'connecting') {
            log.info('Establishing connection to WhatsApp...');
        } else if (connection === 'close') {
            stopPresenceUpdates();
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            
            if (shouldReconnect && BOT_STATE.reconnectAttempts < BOT_STATE.maxReconnectAttempts) {
                BOT_STATE.reconnectAttempts++;
                log.warning(`Connection lost. Attempt ${BOT_STATE.reconnectAttempts}/${BOT_STATE.maxReconnectAttempts}`);
                setTimeout(connectToWhatsApp, BOT_STATE.reconnectDelay);
            } else if (statusCode === DisconnectReason.loggedOut) {
                log.error('Session expired - Please scan QR code again');
            }
        } else if (connection === 'open') {
            BOT_STATE.reconnectAttempts = 0;
            
            // Get system stats
            const memory = process.memoryUsage();
            const uptime = process.uptime();
            
            log.success('\n┌──────── CONNECTION SUCCESSFUL ────────┐');
            log.success(`│ Status: Connected and Ready            │`);
            log.success(`│ Memory: ${formatBytes(memory.heapUsed)}/${formatBytes(memory.heapTotal)} │`);
            log.success(`│ Uptime: ${formatUptime(uptime)}                    │`);
            log.success('└─────────────────────────────────────┘\n');

            const ownJid = sock.user.id.replace(/:[0-9]+@/, '@');
            // Send menu on startup
            await COMMANDS['.menu'](sock, ownJid);
            
            if (BOT_STATE.isAlwaysOnline) {
                await sock.sendPresenceUpdate('available');
                startPresenceUpdates(sock);
                log.info('Always online mode activated');
            }
        }
    });

    // Message handler
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg?.message) return;

        const content = msg.message.conversation || 
                       (msg.message.extendedTextMessage?.text) || '';
        const senderJid = msg.key.remoteJid;
        const ownJid = sock.user.id.replace(/:[0-9]+@/, '@');

        // Process commands only from own chat
        if (senderJid === ownJid && content.startsWith('.')) {
            const [command, ...args] = content.toLowerCase().split(' ');
            if (command === '.msg') {
                try {
                    await COMMANDS['.msg'](sock, senderJid, args.join(' '));
                } catch (error) {
                    log.error(`Command execution failed: ${error.message}`);
                    await sock.sendMessage(senderJid, { 
                        text: '❌ Error executing command' 
                    });
                }
            } else if (COMMANDS[command]) {
                try {
                    log.info(`Executing command: ${command}`);
                    await COMMANDS[command](sock, senderJid);
                } catch (error) {
                    log.error(`Command execution failed: ${error.message}`);
                    await sock.sendMessage(senderJid, { 
                        text: '❌ Error executing command' 
                    });
                }
            }
        }
    });

    // Credential update handler
    sock.ev.on('creds.update', saveCreds);
}

// Start bot with error handling
log.system('Initializing CloudNextra WhatsApp Bot...');
connectToWhatsApp().catch(err => {
    log.error(`Fatal error: ${err.message}`);
    process.exit(1);
});

// Global error handlers
process.on('SIGINT', () => {
    log.system('Shutting down bot gracefully...');
    stopPresenceUpdates();
    process.exit(0);
});

process.on('uncaughtException', (err) => {
    log.error(`Uncaught Exception: ${err.message}`);
});

process.on('unhandledRejection', (err) => {
    log.error(`Unhandled Rejection: ${err.message}`);
});