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

// Bot state configuration
const BOT_STATE = {
    isAlwaysOnline: true,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    reconnectDelay: 5000,
    presenceUpdateInterval: 10000, // 10 seconds
    presenceUpdateTimer: null
};

// Command handlers
const COMMANDS = {
    '.online': async (sock, jid) => {
        BOT_STATE.isAlwaysOnline = true;
        await sock.sendMessage(jid, { text: '🟢 Always online mode activated' });
        await sock.sendPresenceUpdate('available');
        startPresenceUpdates(sock);
    },
    '.offline': async (sock, jid) => {
        BOT_STATE.isAlwaysOnline = false;
        await sock.sendMessage(jid, { text: '🔴 Always online mode deactivated' });
        await sock.sendPresenceUpdate('unavailable');
        stopPresenceUpdates();
    },
    '.logout': async (sock, jid) => {
        await sock.sendMessage(jid, { text: '🔄 Logging out gracefully...' });
        stopPresenceUpdates();
        await sock.logout();
        process.exit(0);
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
                console.error('[PRESENCE ERROR]', error);
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
            // QR Code received, log instructions
            console.log('\n========= SCAN QR CODE ==========');
            console.log('1. Open WhatsApp on your phone');
            console.log('2. Tap Menu or Settings and select Linked Devices');
            console.log('3. Point your phone to this screen to capture the QR code');
            console.log('=================================\n');
        }
        
        if (connection === 'connecting') {
            console.log('[STATUS] Connecting to WhatsApp...');
        } else if (connection === 'close') {
            stopPresenceUpdates();
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            
            if (shouldReconnect && BOT_STATE.reconnectAttempts < BOT_STATE.maxReconnectAttempts) {
                BOT_STATE.reconnectAttempts++;
                console.log(`[RECONNECT] Attempt ${BOT_STATE.reconnectAttempts} of ${BOT_STATE.maxReconnectAttempts}`);
                setTimeout(connectToWhatsApp, BOT_STATE.reconnectDelay);
            } else if (statusCode === DisconnectReason.loggedOut) {
                console.log('[STATUS] Session ended - Please scan QR code again');
                // Optional: Remove auth_info folder to force new QR code
            }
        } else if (connection === 'open') {
            BOT_STATE.reconnectAttempts = 0;
            console.log('\n[STATUS] Connected successfully!');
            if (BOT_STATE.isAlwaysOnline) {
                await sock.sendPresenceUpdate('available');
                startPresenceUpdates(sock);
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
            const command = content.toLowerCase();
            if (COMMANDS[command]) {
                try {
                    await COMMANDS[command](sock, senderJid);
                } catch (error) {
                    console.error('[COMMAND ERROR]', error);
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
console.log('[STARTUP] Initializing WhatsApp connection...');
connectToWhatsApp().catch(err => {
    console.error('[FATAL ERROR]', err);
    process.exit(1);
});

// Global error handlers
process.on('SIGINT', () => {
    console.log('[SHUTDOWN] Stopping bot...');
    stopPresenceUpdates();
    process.exit(0);
});

process.on('uncaughtException', (err) => {
    console.error('[UNCAUGHT EXCEPTION]', err);
});

process.on('unhandledRejection', (err) => {
    console.error('[UNHANDLED REJECTION]', err);
});