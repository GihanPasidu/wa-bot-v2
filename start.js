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
    reconnectDelay: 5000
};

// Command handlers
const COMMANDS = {
    '.online': async (sock, jid) => {
        BOT_STATE.isAlwaysOnline = true;
        await sock.sendMessage(jid, { text: '🟢 Always online mode activated' });
        await sock.sendPresenceUpdate('available');
    },
    '.offline': async (sock, jid) => {
        BOT_STATE.isAlwaysOnline = false;
        await sock.sendMessage(jid, { text: '🔴 Always online mode deactivated' });
        await sock.sendPresenceUpdate('unavailable');
    },
    '.logout': async (sock, jid) => {
        await sock.sendMessage(jid, { text: '🔄 Logging out gracefully...' });
        await sock.logout();
        process.exit(0);
    }
};

/**
 * Establishes connection to WhatsApp and handles all core functionality
 */
async function connectToWhatsApp() {
    // Initialize auth state
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    // Create WhatsApp connection
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ 
            level: 'error',
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true
                }
            }
        }),
        browser: Browsers.ubuntu('Chrome'),
        markOnlineOnConnect: true,
        keepAliveIntervalMs: 1000 * 60 * 10,
    });

    // Connection update handler
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom)
                ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
                : true;
            
            console.log('[CONNECTION] Closed due to:', lastDisconnect?.error);
            
            if (shouldReconnect && BOT_STATE.reconnectAttempts < BOT_STATE.maxReconnectAttempts) {
                BOT_STATE.reconnectAttempts++;
                console.log(`[RECONNECT] Attempt ${BOT_STATE.reconnectAttempts} of ${BOT_STATE.maxReconnectAttempts}`);
                setTimeout(connectToWhatsApp, BOT_STATE.reconnectDelay);
            }
        } else if (connection === 'open') {
            BOT_STATE.reconnectAttempts = 0;
            console.log('[CONNECTION] Successfully connected to WhatsApp');
            if (BOT_STATE.isAlwaysOnline) {
                await sock.sendPresenceUpdate('available');
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
    
    // Presence updater
    setInterval(async () => {
        if (BOT_STATE.isAlwaysOnline) {
            try {
                await sock.sendPresenceUpdate('available');
            } catch (error) {
                console.error('[PRESENCE ERROR]', error);
            }
        }
    }, 60000);
}

// Start bot with error handling
console.log('[STARTUP] Initializing WhatsApp connection...');
connectToWhatsApp().catch(err => {
    console.error('[FATAL ERROR]', err);
    process.exit(1);
});

// Global error handlers
process.on('uncaughtException', (err) => {
    console.error('[UNCAUGHT EXCEPTION]', err);
});

process.on('unhandledRejection', (err) => {
    console.error('[UNHANDLED REJECTION]', err);
});