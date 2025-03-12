const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, jidDecode, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const { Boom } = require('@hapi/boom');
const config = require('./settings');

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        printQRInTerminal: true,
        auth: state,
        browser: ['Chrome (Linux)', '', ''],
        connectTimeoutMs: 60_000,
        emitOwnEvents: true,
        retryRequestDelayMs: 2000,
        browser: ['CloudNextra Bot', 'Desktop', '1.0.0'],
    });

    // Handle connection updates with better retry logic
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if(connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut && 
                                  statusCode !== 405;
            
            console.log('Connection closed due to:', lastDisconnect?.error, 
                       'Reconnecting:', shouldReconnect);

            if(shouldReconnect) {
                setTimeout(() => {
                    console.log('Reconnecting to WhatsApp...');
                    connectToWhatsApp();
                }, 5000);
            }
        } else if(connection === 'open') {
            console.log('Connected successfully to WhatsApp');
        }
    });

    // Basic message handler
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message) return;
        
        const messageType = Object.keys(m.message)[0];
        const messageContent = m.message[messageType];
        
        console.log('Received message:', {
            from: m.key.remoteJid,
            type: messageType,
            content: messageContent
        });
    });
}

// Add error handler
process.on('unhandledRejection', error => {
    console.log('Unhandled rejection:', error);
});

// Start with error handling
connectToWhatsApp().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
