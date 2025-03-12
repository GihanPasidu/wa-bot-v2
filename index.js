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
        browser: ['CloudNextra Bot', 'Safari', '1.0.0'],
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error instanceof Boom)
                ? lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut
                : true;

            console.log('Connection closed due to:', lastDisconnect.error);

            if (shouldReconnect) {
                console.log('Reconnecting...');
                connectToWhatsApp();
            } else {
                console.log('Connection closed. Not reconnecting.');
            }
        } else if (connection === 'open') {
            console.log('Connected successfully!');
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

// Start the connection
connectToWhatsApp().catch(err => console.log('Error:', err));
