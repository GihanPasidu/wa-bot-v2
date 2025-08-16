const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const { Boom } = require('@hapi/boom');
const config = require('./settings');

let isConnecting = false;
let currentSock = null;
let retryCount = 0;
let botId = null; // <-- new: store logged-in id
const maxRetries = config.reconnectAttempts ?? 5; // fallback if config missing

async function connectToWhatsApp() {
	// avoid parallel connects
	if (isConnecting) return;
	isConnecting = true;

	try {
		const { state, saveCreds } = await useMultiFileAuthState('auth_info');
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

			if (connection === 'close') {
				const rawError = lastDisconnect?.error;
				const statusCode = rawError?.output?.statusCode;
				const errorMsg = rawError?.message || JSON.stringify(rawError);
				// detect Baileys/ws stream:error attribute if available (some transports place code in trace)
				const isDeviceRemoved = errorMsg?.toString().toLowerCase().includes('device_removed') || errorMsg?.toString().toLowerCase().includes('device removed') || (statusCode === 401 && errorMsg?.toString().toLowerCase().includes('conflict'));
				const isStreamRestartRequired = statusCode === 515 || /restart required/i.test(errorMsg) || /stream errored/i.test(errorMsg);

				// decide if the library suggests reconnecting
				const shouldReconnect = (statusCode !== DisconnectReason.loggedOut && statusCode !== 405) && !isDeviceRemoved;

				console.log('Connection closed due to:', errorMsg, 'statusCode:', statusCode, 'Will attempt reconnect:', shouldReconnect);

				// Non-recoverable device/session removal — attempt to clear local auth and re-register
				if (isDeviceRemoved || statusCode === 401) {
					console.warn('Device/session removed or auth conflict detected. Clearing local auth state to allow re-registration (QR) and attempting reconnect.');
					try {
						// remove local multi-file auth state so useMultiFileAuthState will create a new one and trigger QR
						const authPath = path.join(process.cwd(), 'auth_info');
						fs.rmSync(authPath, { recursive: true, force: true });
						console.log('Local auth_info cleared:', authPath);
					} catch (e) {
						console.error('Failed to clear local auth state:', e);
					}

					// close socket & schedule reconnect to allow fresh registration
					try { sock.end?.(); } catch (e) { /* ignore */ }
					currentSock = null;

					// schedule reconnect (count it)
					retryCount++;
					if (retryCount < maxRetries) {
						const delay = config.reconnectDelayOnAuthReset ?? 3000;
						console.log(`Auth-reset reconnect attempt ${retryCount}/${maxRetries} in ${delay}ms`);
						setTimeout(() => {
							isConnecting = false;
							connectToWhatsApp();
						}, delay);
					} else {
						console.error('Exceeded max retries after auth reset — exiting to allow manual intervention.');
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
					retryCount++;
					if (retryCount < maxRetries) {
						const delay = config.reconnectDelayOnStreamError ?? (config.reconnectDelay ?? 10000);
						console.log(`Stream-error reconnect attempt ${retryCount}/${maxRetries} in ${delay}ms`);
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
					console.log(`Reconnect attempt ${retryCount}/${maxRetries} will start in ${config.reconnectDelay ?? 5000}ms`);
					try { sock.end?.(); } catch (e) { /* ignore */ }
					setTimeout(() => {
						isConnecting = false;
						connectToWhatsApp();
					}, config.reconnectDelay ?? 5000);
				} else {
					console.error('Reached max reconnect attempts or not reconnecting — exiting.');
					setTimeout(() => process.exit(1), 1000);
				}
			} else if (connection === 'open') {
				console.log('Connected successfully to WhatsApp');
				// prefer explicit me id from update, fallback to sock.user
				botId = update?.me?.id || sock?.user?.id || botId;
				console.log('Connected successfully to WhatsApp; botId=', botId);
			}
		});

		// Basic message handler - add simple command parsing (including .self)
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

			// handle .self command: echo/forward text back to same chat (works for self-chat too)
			if (cmd === 'self') {
				const replyText = args || 'Usage: .self <message>';
				try {
					await sock.sendMessage(m.key.remoteJid, { text: replyText }, { quoted: m });
				} catch (e) {
					console.error('Failed to send .self reply:', e);
				}
				return;
			}

			// New: handle .menu and .help commands
			if (cmd === 'menu' || cmd === 'help') {
				const p = prefix;
				const menuText =
`CloudNextra Bot — Menu

${p}menu          Show this menu
${p}self <text>   Echo back text to this chat
${p}help          Same as ${p}menu

Usage:
Send a message starting with "${p}" followed by a command.
`;
				try {
					await sock.sendMessage(m.key.remoteJid, { text: menuText }, { quoted: m });
				} catch (e) {
					console.error('Failed to send menu reply:', e);
				}
				return;
			}

			// ...existing logging or other handlers...
			console.log('Received message:', {
				from: m.key.remoteJid,
				type: messageType,
				contentPreview: text?.slice(0, 200)
			});
		});
	} catch (err) {
		console.error('connectToWhatsApp error:', err);
		// on unexpected error try again unless maxed out
		retryCount++;
		if (retryCount >= maxRetries) {
			console.error('Exceeded max retries during connect — exiting.');
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
	console.log('Unhandled rejection:', error);
});

// Start with error handling
connectToWhatsApp().catch(err => {
	console.error('Fatal error:', err);
	process.exit(1);
});
