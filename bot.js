const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason,
    downloadMediaMessage
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const crypto = require('crypto');
const axios = require('axios');
const http = require('http');
const QRCode = require('qrcode');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');

// Bot configuration
const config = {
    autoRead: false,
    antiCall: true,
    adminJids: [], // Will be auto-populated with QR scanner's account
    botEnabled: true
};

// Bot startup time for uptime calculation
const startTime = Date.now();

// QR code storage for web interface
let currentQRCode = null;
let connectionStatus = 'disconnected'; // 'disconnected', 'connecting', 'connected'

// Backup throttling to prevent excessive backup calls
let lastBackupTime = 0;
const BACKUP_COOLDOWN = 30000; // 30 seconds between backups

// Persistent auth storage for Render deployments
const PERSISTENT_AUTH_KEYS = [
    'BAILEYS_CREDS',
    'BAILEYS_KEYS'
];

// Enhanced auth persistence with multiple storage methods
function backupAuthToEnv(authState, forceBackup = false) {
    try {
        // Throttle backup calls to prevent spam (except when forced)
        const now = Date.now();
        if (!forceBackup && (now - lastBackupTime) < BACKUP_COOLDOWN) {
            console.log(`⏱️ Backup throttled (last backup ${Math.round((now - lastBackupTime) / 1000)}s ago)`);
            return;
        }
        
        if (authState.creds || authState.keys) {
            console.log('🔐 Backing up authentication credentials...');
            lastBackupTime = now;
            
            // Render-optimized backup locations with fallbacks
            const backupLocations = [
                './auth-backup',                         // Local backup (works on Render)
                '/tmp/auth-backup',                      // Temporary storage
                process.env.HOME ? `${process.env.HOME}/.wa-bot-backup` : null // Home directory
            ].filter(Boolean);
            
            let backupSuccess = false;
            let lastError = '';
            
            for (const authBackupDir of backupLocations) {
                try {
                    console.log(`📁 Attempting backup to: ${authBackupDir}`);
                    
                    // Ensure backup directory exists with proper permissions
                    if (!fs.existsSync(authBackupDir)) {
                        fs.mkdirSync(authBackupDir, { recursive: true, mode: 0o755 });
                        console.log(`📁 Created backup directory: ${authBackupDir}`);
                    }
                    
                    // Test write permissions
                    const testFile = path.join(authBackupDir, '.write-test');
                    fs.writeFileSync(testFile, 'test');
                    fs.unlinkSync(testFile);
                    console.log(`✅ Write permissions verified for: ${authBackupDir}`);
                    
                    // Create comprehensive backup object
                    const backupData = {
                        creds: authState.creds || null,
                        keys: authState.keys || {},
                        timestamp: Date.now(),
                        version: '2.0.0'
                    };
                    
                    // Save complete auth state
                    fs.writeFileSync(
                        path.join(authBackupDir, 'auth-complete-backup.json'), 
                        JSON.stringify(backupData, null, 2)
                    );
                    
                    // Save individual components for redundancy
                    if (authState.creds) {
                        fs.writeFileSync(
                            path.join(authBackupDir, 'creds-backup.json'), 
                            JSON.stringify(authState.creds, null, 2)
                        );
                    }
                    
                    if (authState.keys && Object.keys(authState.keys).length > 0) {
                        fs.writeFileSync(
                            path.join(authBackupDir, 'keys-backup.json'), 
                            JSON.stringify(authState.keys, null, 2)
                        );
                    }
                    
                    // Save metadata
                    fs.writeFileSync(
                        path.join(authBackupDir, 'backup-info.json'), 
                        JSON.stringify({
                            timestamp: Date.now(),
                            location: authBackupDir,
                            hasKeys: !!(authState.keys && Object.keys(authState.keys).length > 0),
                            hasCreds: !!authState.creds,
                            version: '2.0.0'
                        }, null, 2)
                    );
                    
                    backupSuccess = true;
                    console.log(`✅ Authentication data backed up to: ${authBackupDir}`);
                    
                    // Also backup to environment variables as secondary method
                    try {
                        if (authState.creds) {
                            process.env.BAILEYS_CREDS_BACKUP = Buffer.from(JSON.stringify(authState.creds)).toString('base64');
                        }
                        if (authState.keys && Object.keys(authState.keys).length > 0) {
                            process.env.BAILEYS_KEYS_BACKUP = Buffer.from(JSON.stringify(authState.keys)).toString('base64');
                        }
                        process.env.BAILEYS_BACKUP_TIMESTAMP = Date.now().toString();
                        console.log(`🔄 Also backed up to environment variables as fallback`);
                    } catch (envError) {
                        console.warn(`⚠️ Failed to backup to environment variables: ${envError.message}`);
                    }
                    
                    break; // Success, no need to try other locations
                    
                } catch (dirError) {
                    lastError = dirError.message;
                    console.warn(`⚠️ Failed to backup to ${authBackupDir}: ${dirError.message}`);
                    continue; // Try next location
                }
            }
            
            if (!backupSuccess) {
                console.error(`❌ All file backup locations failed. Last error: ${lastError}`);
                
                // Final fallback: environment variables only
                try {
                    if (authState.creds) {
                        process.env.BAILEYS_CREDS_BACKUP = Buffer.from(JSON.stringify(authState.creds)).toString('base64');
                    }
                    if (authState.keys && Object.keys(authState.keys).length > 0) {
                        process.env.BAILEYS_KEYS_BACKUP = Buffer.from(JSON.stringify(authState.keys)).toString('base64');
                    }
                    process.env.BAILEYS_BACKUP_TIMESTAMP = Date.now().toString();
                    console.log(`🔄 Used environment variables as final backup method`);
                } catch (envError) {
                    throw new Error(`All backup methods failed: Files: ${lastError}, Env: ${envError.message}`);
                }
            }
            
        } else {
            console.log('⚠️ No auth data to backup (creds and keys are empty)');
        }
    } catch (error) {
        console.error('❌ Error backing up auth data:', error.message);
    }
}

function restoreAuthFromBackup() {
    try {
        // Check multiple backup locations (Render-optimized)
        const backupLocations = [
            './auth-backup',                         // Local backup (works on Render)
            '/tmp/auth-backup',                      // Temporary storage
            process.env.HOME ? `${process.env.HOME}/.wa-bot-backup` : null // Home directory
        ].filter(Boolean);
        
        for (const authBackupDir of backupLocations) {
            try {
                const completeBackupPath = path.join(authBackupDir, 'auth-complete-backup.json');
                const credsBackupPath = path.join(authBackupDir, 'creds-backup.json');
                const keysBackupPath = path.join(authBackupDir, 'keys-backup.json');
                const infoPath = path.join(authBackupDir, 'backup-info.json');
                
                // Check if backup directory exists
                if (!fs.existsSync(authBackupDir)) {
                    continue;
                }
                
                let backupData = null;
                let backupAge = 0;
                
                // Try to restore from complete backup first
                if (fs.existsSync(completeBackupPath)) {
                    const completeData = JSON.parse(fs.readFileSync(completeBackupPath, 'utf8'));
                    backupAge = Date.now() - (completeData.timestamp || 0);
                    backupData = completeData;
                    console.log(`🔍 Found complete backup in: ${authBackupDir}`);
                }
                // Fallback to individual files
                else if (fs.existsSync(credsBackupPath)) {
                    const credsData = JSON.parse(fs.readFileSync(credsBackupPath, 'utf8'));
                    let keysData = {};
                    
                    if (fs.existsSync(keysBackupPath)) {
                        keysData = JSON.parse(fs.readFileSync(keysBackupPath, 'utf8'));
                    }
                    
                    // Get timestamp from info file or file modification time
                    if (fs.existsSync(infoPath)) {
                        const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
                        backupAge = Date.now() - (info.timestamp || 0);
                    } else {
                        const stats = fs.statSync(credsBackupPath);
                        backupAge = Date.now() - stats.mtime.getTime();
                    }
                    
                    backupData = {
                        creds: credsData,
                        keys: keysData,
                        timestamp: Date.now() - backupAge
                    };
                    console.log(`🔍 Found individual backup files in: ${authBackupDir}`);
                }
                
                if (backupData && backupData.creds) {
                    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
                    
                    if (backupAge < maxAge) {
                        console.log(`🔄 Restoring authentication from backup (age: ${Math.round(backupAge / (1000 * 60 * 60))} hours)...`);
                        
                        return {
                            creds: backupData.creds,
                            keys: backupData.keys || {},
                            isRestored: true,
                            backupLocation: authBackupDir,
                            backupAge: backupAge
                        };
                    } else {
                        console.log(`⏰ Auth backup is too old (${Math.round(backupAge / (1000 * 60 * 60 * 24))} days), cleaning up...`);
                        
                        // Clean up old backup files
                        try {
                            if (fs.existsSync(completeBackupPath)) fs.unlinkSync(completeBackupPath);
                            if (fs.existsSync(credsBackupPath)) fs.unlinkSync(credsBackupPath);
                            if (fs.existsSync(keysBackupPath)) fs.unlinkSync(keysBackupPath);
                            if (fs.existsSync(infoPath)) fs.unlinkSync(infoPath);
                            console.log(`🧹 Cleaned up old backup in: ${authBackupDir}`);
                        } catch (cleanupError) {
                            console.warn(`⚠️ Failed to cleanup old backup: ${cleanupError.message}`);
                        }
                    }
                }
                
            } catch (dirError) {
                console.warn(`⚠️ Error checking backup in ${authBackupDir}:`, dirError.message);
                continue;
            }
        }
        
        // Fallback: Check environment variables
        console.log('🔍 Checking environment variable backups...');
        try {
            const credsBackup = process.env.BAILEYS_CREDS_BACKUP;
            const keysBackup = process.env.BAILEYS_KEYS_BACKUP;
            const backupTimestamp = process.env.BAILEYS_BACKUP_TIMESTAMP;
            
            if (credsBackup && backupTimestamp) {
                const backupAge = Date.now() - parseInt(backupTimestamp);
                const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
                
                if (backupAge < maxAge) {
                    console.log(`🔄 Found environment variable backup (age: ${Math.round(backupAge / (1000 * 60 * 60))} hours)`);
                    
                    const creds = JSON.parse(Buffer.from(credsBackup, 'base64').toString());
                    let keys = {};
                    
                    if (keysBackup) {
                        keys = JSON.parse(Buffer.from(keysBackup, 'base64').toString());
                    }
                    
                    return {
                        creds: creds,
                        keys: keys,
                        isRestored: true,
                        backupLocation: 'environment-variables',
                        backupAge: backupAge
                    };
                } else {
                    console.log(`⏰ Environment backup is too old (${Math.round(backupAge / (1000 * 60 * 60 * 24))} days), clearing...`);
                    delete process.env.BAILEYS_CREDS_BACKUP;
                    delete process.env.BAILEYS_KEYS_BACKUP;
                    delete process.env.BAILEYS_BACKUP_TIMESTAMP;
                }
            }
        } catch (envError) {
            console.warn(`⚠️ Error checking environment variable backup: ${envError.message}`);
        }
        
        console.log('📝 No valid auth backup found in any location');
        return null;
        
    } catch (error) {
        console.error('❌ Error restoring auth backup:', error.message);
        return null;
    }
}

// Enhanced auth state management with persistence
async function getAuthState() {
    const authDir = './auth';
    
    // Ensure auth directory exists
    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
        console.log('📁 Created auth directory');
    }
    
    try {
        // First try to use existing auth files
        const authState = await useMultiFileAuthState(authDir);
        
        // Check if we have valid credentials
        if (authState.creds && Object.keys(authState.creds).length > 0) {
            console.log('✅ Using existing authentication data from auth directory');
            return authState;
        }
        
        // If no valid local auth, try to restore from backup
        console.log('🔍 No local auth found, checking for backups...');
        const restoredAuth = restoreAuthFromBackup();
        
        if (restoredAuth && restoredAuth.creds) {
            console.log(`🔄 Restoring authentication from backup location: ${restoredAuth.backupLocation}`);
            
            try {
                // Write restored credentials to auth directory
                if (restoredAuth.creds) {
                    fs.writeFileSync(
                        path.join(authDir, 'creds.json'), 
                        JSON.stringify(restoredAuth.creds, null, 2)
                    );
                    console.log('� Restored credentials to auth directory');
                }
                
                // Write restored keys if available
                if (restoredAuth.keys && Object.keys(restoredAuth.keys).length > 0) {
                    // Write each key file individually (Baileys expects separate files)
                    for (const [keyName, keyData] of Object.entries(restoredAuth.keys)) {
                        if (keyData && typeof keyData === 'object') {
                            fs.writeFileSync(
                                path.join(authDir, `${keyName}.json`),
                                JSON.stringify(keyData, null, 2)
                            );
                        }
                    }
                    console.log(`💾 Restored ${Object.keys(restoredAuth.keys).length} key files to auth directory`);
                }
                
                // Return fresh auth state with restored data
                const newAuthState = await useMultiFileAuthState(authDir);
                console.log('✅ Successfully restored authentication from backup');
                return newAuthState;
                
            } catch (restoreError) {
                console.error('❌ Error writing restored auth data:', restoreError.message);
                console.log('🔄 Falling back to fresh authentication');
            }
        }
        
        console.log('🆕 No valid backup found, will generate new QR code');
        return authState;
        
    } catch (error) {
        console.error('❌ Error setting up auth state:', error.message);
        console.log('🔄 Falling back to fresh auth state');
        
        // Fallback to fresh auth state
        try {
            return await useMultiFileAuthState(authDir);
        } catch (fallbackError) {
            console.error('❌ Critical error: Cannot create auth state:', fallbackError.message);
            throw fallbackError;
        }
    }
}

// Function to verify backup integrity
function verifyBackupIntegrity() {
    console.log('🔍 Verifying backup integrity...');
    
    const backupLocations = [
        './auth-backup',                         // Local backup (works on Render)
        '/tmp/auth-backup',                      // Temporary storage
        process.env.HOME ? `${process.env.HOME}/.wa-bot-backup` : null // Home directory
    ].filter(Boolean);
    
    let foundBackups = 0;
    
    for (const location of backupLocations) {
        try {
            if (fs.existsSync(location)) {
                const completeBackup = path.join(location, 'auth-complete-backup.json');
                const credsBackup = path.join(location, 'creds-backup.json');
                const infoFile = path.join(location, 'backup-info.json');
                
                let status = '❌ Invalid';
                let hasComplete = fs.existsSync(completeBackup);
                let hasCreds = fs.existsSync(credsBackup);
                let hasInfo = fs.existsSync(infoFile);
                
                if (hasComplete || hasCreds) {
                    try {
                        if (hasComplete) {
                            const data = JSON.parse(fs.readFileSync(completeBackup, 'utf8'));
                            if (data.creds && data.timestamp) {
                                const age = Date.now() - data.timestamp;
                                status = age < (7 * 24 * 60 * 60 * 1000) ? '✅ Valid' : '⏰ Expired';
                                foundBackups++;
                            }
                        } else if (hasCreds) {
                            JSON.parse(fs.readFileSync(credsBackup, 'utf8'));
                            status = '✅ Valid (partial)';
                            foundBackups++;
                        }
                    } catch (parseError) {
                        status = '❌ Corrupted';
                    }
                }
                
                console.log(`📁 ${location}: ${status} (Complete: ${hasComplete}, Creds: ${hasCreds}, Info: ${hasInfo})`);
            } else {
                console.log(`📁 ${location}: Not found`);
            }
        } catch (error) {
            console.log(`📁 ${location}: Error - ${error.message}`);
        }
    }
    
    // Check environment variable backups
    try {
        const credsBackup = process.env.BAILEYS_CREDS_BACKUP;
        const backupTimestamp = process.env.BAILEYS_BACKUP_TIMESTAMP;
        
        if (credsBackup && backupTimestamp) {
            const backupAge = Date.now() - parseInt(backupTimestamp);
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
            
            if (backupAge < maxAge) {
                foundBackups++;
                const ageHours = Math.round(backupAge / (1000 * 60 * 60));
                console.log(`📁 Environment Variables: ✅ Valid (${ageHours}h old)`);
            } else {
                const ageDays = Math.round(backupAge / (1000 * 60 * 60 * 24));
                console.log(`📁 Environment Variables: ⏰ Expired (${ageDays}d old)`);
            }
        } else {
            console.log(`📁 Environment Variables: ❌ Not found`);
        }
    } catch (envError) {
        console.log(`📁 Environment Variables: Error - ${envError.message}`);
    }
    
    console.log(`📊 Backup Summary: ${foundBackups} valid backup(s) found`);
    return foundBackups > 0;
}

function getTextFromMessage(msg) {
    const m = msg.message || {};
    return (
        m.conversation ||
        (m.extendedTextMessage && m.extendedTextMessage.text) ||
        (m.imageMessage && m.imageMessage.caption) ||
        (m.videoMessage && m.videoMessage.caption) ||
        ''
    );
}

function isImageMessage(msg) {
    const m = msg.message || {};
    if (m.imageMessage) return true;
    if (m.ephemeralMessage && m.ephemeralMessage.message?.imageMessage) return true;
    if (m.viewOnceMessage && m.viewOnceMessage.message?.imageMessage) return true;
    if (m.viewOnceMessageV2 && m.viewOnceMessageV2.message?.imageMessage) return true;
    return false;
}

function isGifMessage(msg) {
    const m = msg.message || {};
    
    // Check for video message with gifPlayback flag OR just video (WhatsApp sends GIFs as MP4)
    if (m.videoMessage) {
        // Accept any video that might be a GIF (including MP4)
        if (m.videoMessage.gifPlayback || m.videoMessage.mimetype?.includes('mp4')) return true;
    }
    
    if (m.ephemeralMessage && m.ephemeralMessage.message?.videoMessage) {
        const video = m.ephemeralMessage.message.videoMessage;
        if (video.gifPlayback || video.mimetype?.includes('mp4')) {
            return true;
        }
    }
    if (m.viewOnceMessage && m.viewOnceMessage.message?.videoMessage) {
        const video = m.viewOnceMessage.message.videoMessage;
        if (video.gifPlayback || video.mimetype?.includes('mp4')) {
            return true;
        }
    }
    if (m.viewOnceMessageV2 && m.viewOnceMessageV2.message?.videoMessage) {
        const video = m.viewOnceMessageV2.message.videoMessage;
        if (video.gifPlayback || video.mimetype?.includes('mp4')) {
            return true;
        }
    }
    
    return false;
}

function isStickerMessage(msg) {
    const m = msg.message || {};
    if (m.stickerMessage) return true;
    if (m.ephemeralMessage && m.ephemeralMessage.message?.stickerMessage) return true;
    if (m.viewOnceMessage && m.viewOnceMessage.message?.stickerMessage) return true;
    if (m.viewOnceMessageV2 && m.viewOnceMessageV2.message?.stickerMessage) return true;
    return false;
}

function extractImageMessage(msg) {
    const m = msg.message || {};
    if (m.imageMessage) return msg;
    if (m.ephemeralMessage && m.ephemeralMessage.message?.imageMessage) {
        return { ...msg, message: { imageMessage: m.ephemeralMessage.message.imageMessage } };
    }
    if (m.viewOnceMessage && m.viewOnceMessage.message?.imageMessage) {
        return { ...msg, message: { imageMessage: m.viewOnceMessage.message.imageMessage } };
    }
    if (m.viewOnceMessageV2 && m.viewOnceMessageV2.message?.imageMessage) {
        return { ...msg, message: { imageMessage: m.viewOnceMessageV2.message.imageMessage } };
    }
    return null;
}

function extractGifMessage(msg) {
    const m = msg.message || {};
    if (m.videoMessage && m.videoMessage.gifPlayback) return msg;
    if (m.ephemeralMessage && m.ephemeralMessage.message?.videoMessage?.gifPlayback) {
        return { ...msg, message: { videoMessage: m.ephemeralMessage.message.videoMessage } };
    }
    if (m.viewOnceMessage && m.viewOnceMessage.message?.videoMessage?.gifPlayback) {
        return { ...msg, message: { videoMessage: m.viewOnceMessage.message.videoMessage } };
    }
    if (m.viewOnceMessageV2 && m.viewOnceMessageV2.message?.videoMessage?.gifPlayback) {
        return { ...msg, message: { videoMessage: m.viewOnceMessageV2.message.videoMessage } };
    }
    return null;
}

function extractStickerMessage(msg) {
    const m = msg.message || {};
    if (m.stickerMessage) return msg;
    if (m.ephemeralMessage && m.ephemeralMessage.message?.stickerMessage) {
        return { ...msg, message: { stickerMessage: m.ephemeralMessage.message.stickerMessage } };
    }
    if (m.viewOnceMessage && m.viewOnceMessage.message?.stickerMessage) {
        return { ...msg, message: { stickerMessage: m.viewOnceMessage.message.stickerMessage } };
    }
    if (m.viewOnceMessageV2 && m.viewOnceMessageV2.message?.stickerMessage) {
        return { ...msg, message: { stickerMessage: m.viewOnceMessageV2.message.stickerMessage } };
    }
    return null;
}

// Helper function to handle self-chat message sending
function getSelfChatTargetJid(senderJid, fromJid) {
    // If sender is linked device, redirect to phone number format for self-chat
    if (senderJid === '11837550653588@lid' && fromJid === '11837550653588@lid') {
        return '94788006269@s.whatsapp.net';
    }
    return fromJid;
}

// Helper function to send error messages to users
async function sendErrorMessage(sock, senderJid, fromJid, errorType, commandName = '') {
    const targetJid = getSelfChatTargetJid(senderJid, fromJid);
    const isUserAdmin = config.adminJids.includes(senderJid);
    
    let errorMessage = '';
    switch (errorType) {
        case 'STICKER_FAILED':
            if (isUserAdmin) {
                errorMessage = `❌ *Sticker Creation Failed*\n\n🔧 *Admin Debug Info:*\n• Image format: Check if JPEG/PNG/WEBP\n• File size: Max 10MB recommended\n• Processing: Sharp library error\n• Network: API connectivity issue\n\n💡 *Admin Actions:* Check server logs, verify Sharp installation`;
            } else {
                errorMessage = `❌ *Sticker Creation Failed*\n\n🔧 *What to try:*\n• Send a clear JPEG or PNG image\n• Make sure image isn't too large\n• Try again in a moment\n\n💡 *Tip:* JPG and PNG work best!`;
            }
            break;
        case 'TOIMG_FAILED':
            if (isUserAdmin) {
                errorMessage = `❌ *Image Conversion Failed*\n\n🔧 *Admin Debug Info:*\n• Sticker format: WebP/AVIF conversion issue\n• Buffer processing: Sharp conversion error\n• Memory: Possible memory limitation\n\n💡 *Admin Actions:* Check memory usage, verify file integrity`;
            } else {
                errorMessage = `❌ *Image Conversion Failed*\n\n� *What to try:*\n• Reply to a different sticker\n• Make sure it's an animated sticker\n• Try again in a moment\n\n💡 *Tip:* Some stickers work better than others!`;
            }
            break;
        case 'TOGIF_FAILED':
            if (isUserAdmin) {
                errorMessage = `❌ *GIF Conversion Failed*\n\n🔧 *Admin Debug Info:*\n• Sticker format: WebP to GIF conversion issue\n• Animation: Possible animation processing error\n• Memory: Buffer processing limitation\n• Sharp: GIF encoding error\n\n💡 *Admin Actions:* Check Sharp GIF support, verify memory usage`;
            } else {
                errorMessage = `❌ *GIF Conversion Failed*\n\n🔧 *What to try:*\n• Try with a different sticker\n• Animated stickers work better\n• Try again in a moment\n\n💡 *Tip:* Some stickers may not convert to GIF format!`;
            }
            break;
        case 'MEDIA_DOWNLOAD_FAILED':
            if (isUserAdmin) {
                errorMessage = `❌ *Media Download Failed*\n\n🔧 *Admin Debug Info:*\n• Baileys API: Download stream error\n• Network: Connection timeout\n• File: Corrupted or unavailable\n• Server: WhatsApp media server issue\n\n💡 *Admin Actions:* Check network logs, verify Baileys version`;
            } else {
                errorMessage = `❌ *Media Download Failed*\n\n� *What to try:*\n• Send the media file again\n• Check your internet connection\n• Try a different file\n\n💡 *Tip:* Sometimes media files expire, try sending fresh ones!`;
            }
            break;
        case 'BOT_ADMIN_REQUIRED':
            if (isUserAdmin) {
                errorMessage = `⚠️ *Verification Error*\n\n🤖 *Bot Admin Notice:*\nYou should have access to this command. This might be a bug.\n\n� *Debug Info:*\n• Your JID: ${senderJid}\n• Admin List: ${config.adminJids.join(', ')}\n• Command: ${commandName}\n\n💡 *Contact:* Developer for investigation`;
            } else {
                errorMessage = `�🚫 *Access Denied*\n\n🤖 *Required:* Bot administrator privileges\n\n💡 *Note:* This command is restricted to bot admins only\n\n🤝 *Contact:* A bot administrator if you need this feature`;
            }
            break;
        case 'COMMAND_ERROR':
            if (isUserAdmin) {
                errorMessage = `❌ *Command Processing Error*\n\n🔧 *Admin Debug Info:*\n• Command: ${commandName}\n• Error Type: Processing failure\n• Possible Causes: Syntax error, API failure, server issue\n• Timestamp: ${new Date().toISOString()}\n\n💡 *Admin Actions:* Check server logs, verify command syntax`;
            } else {
                errorMessage = `❌ *Command Error*\n\n🔧 *Command:* ${commandName}\n\n💡 *Try:* Check your command spelling and try again\n\n🤝 *Help:* Contact an admin if this keeps happening`;
            }
            break;
        case 'NETWORK_ERROR':
            if (isUserAdmin) {
                errorMessage = `🌐 *Network Error*\n\n🔧 *Admin Debug Info:*\n• Connection: API timeout or failure\n• Status: Network connectivity issue\n• Service: External API unreachable\n• Time: ${new Date().toLocaleString()}\n\n💡 *Admin Actions:* Check internet connection, verify API endpoints`;
            } else {
                errorMessage = `🌐 *Network Error*\n\n🔧 *Issue:* Connection problem\n\n💡 *Try:* Check your internet and try again in a moment\n\n⏰ *Usually fixes itself:* Network issues are often temporary`;
            }
            break;
        default:
            if (isUserAdmin) {
                errorMessage = `❌ *Unknown Error (Admin)*\n\n🔧 *Debug Info:*\n• Error Type: ${errorType}\n• Command: ${commandName}\n• User: Bot Admin\n• JID: ${senderJid}\n\n💡 *Admin Actions:* Check logs, report to developer if persistent`;
            } else {
                errorMessage = `❌ *Something went wrong*\n\n🔧 *Error:* An unexpected error occurred\n\n💡 *Try:* Please try again in a moment\n\n🤝 *Contact:* An admin if this problem continues`;
            }
    }
    
    try {
        await sock.sendMessage(targetJid, { text: errorMessage });
    } catch (sendError) {
        console.error(`Failed to send error message:`, sendError);
    }
}

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

// Function to convert MP4 video to animated WebP sticker
async function convertMP4ToAnimatedWebP(buffer) {
    return new Promise((resolve, reject) => {
        console.log('🎬 Starting MP4 to animated WebP conversion...');
        const tempVideoPath = path.join(__dirname, `temp_video_${Date.now()}.mp4`);
        const tempGifPath = path.join(__dirname, `temp_gif_${Date.now()}.gif`);
        
        try {
            // Write video buffer to temporary file
            console.log('📁 Writing video buffer to temp file...');
            fs.writeFileSync(tempVideoPath, buffer);
            console.log('✅ Video file written successfully');
            
            // Convert MP4 to GIF first using FFmpeg with optimized settings for smaller file size
            console.log('🔄 Starting FFmpeg MP4 to GIF conversion...');
            ffmpeg(tempVideoPath)
                .output(tempGifPath)
                .outputOptions([
                    '-vf', 'scale=512:512:force_original_aspect_ratio=decrease',
                    '-t', '5',     // Limit to 5 seconds (shorter duration)
                    '-r', '10',    // 10 FPS (lower framerate for smaller size)
                    '-f', 'gif'
                ])
                .on('start', (commandLine) => {
                    console.log('🚀 FFmpeg command started:', commandLine);
                })
                .on('progress', (progress) => {
                    console.log('⏳ Processing:', progress.percent + '%');
                })
                .on('end', async () => {
                    try {
                        console.log('✅ FFmpeg conversion completed, reading GIF...');
                        // Read the GIF and convert to animated WebP using Sharp with optimized settings
                        const gifBuffer = fs.readFileSync(tempGifPath);
                        console.log('📊 GIF file size:', gifBuffer.length, 'bytes');
                        
                        console.log('🔄 Converting GIF to animated WebP with Sharp...');
                        const webpBuffer = await sharp(gifBuffer, { animated: true })
                            .resize(512, 512, { 
                                fit: 'contain', 
                                background: { r: 0, g: 0, b: 0, alpha: 0 } 
                            })
                            .webp({ 
                                quality: 60,     // Lower quality for smaller file size
                                effort: 6,       // Higher effort for better compression
                                method: 6        // Better compression method
                            })
                            .toBuffer();
                        
                        console.log('✅ Sharp conversion completed, WebP size:', webpBuffer.length, 'bytes');
                        
                        // Check if file is still too large
                        if (webpBuffer.length > 500000) { // 500KB limit
                            console.log('⚠️ File still too large, applying additional compression...');
                            // Try with even lower quality and smaller size
                            const compressedWebpBuffer = await sharp(gifBuffer, { animated: true })
                                .resize(400, 400, { 
                                    fit: 'contain', 
                                    background: { r: 0, g: 0, b: 0, alpha: 0 } 
                                })
                                .webp({ 
                                    quality: 40,     // Much lower quality
                                    effort: 6,
                                    method: 6
                                })
                                .toBuffer();
                            
                            console.log('✅ Compressed WebP size:', compressedWebpBuffer.length, 'bytes');
                            
                            // Clean up temporary files
                            if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
                            if (fs.existsSync(tempGifPath)) fs.unlinkSync(tempGifPath);
                            console.log('🧹 Temporary files cleaned up');
                            
                            resolve(compressedWebpBuffer);
                        } else {
                            // Clean up temporary files
                            if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
                            if (fs.existsSync(tempGifPath)) fs.unlinkSync(tempGifPath);
                            console.log('🧹 Temporary files cleaned up');
                            
                            resolve(webpBuffer);
                        }
                    } catch (error) {
                        console.error('❌ Error during Sharp conversion:', error);
                        // Clean up on error
                        if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
                        if (fs.existsSync(tempGifPath)) fs.unlinkSync(tempGifPath);
                        reject(error);
                    }
                })
                .on('error', (err) => {
                    console.error('❌ FFmpeg conversion error:', err);
                    // Clean up temporary files on error
                    if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
                    if (fs.existsSync(tempGifPath)) fs.unlinkSync(tempGifPath);
                    reject(err);
                })
                .run();
        } catch (error) {
            console.error('❌ File operation error:', error);
            reject(error);
        }
    });
}

async function createStickerFromImageBuffer(buffer) {
    // Convert to webp using sharp with proper sticker dimensions and optimized compression
    const webpBuffer = await sharp(buffer)
        .resize(512, 512, { 
            fit: 'contain', 
            background: { r: 0, g: 0, b: 0, alpha: 0 } 
        })
        .webp({ 
            quality: 80,    // Good quality but compressed
            effort: 6,      // Higher effort for better compression
            method: 6       // Better compression method
        })
        .toBuffer();
    
    // Check if file is too large for WhatsApp
    if (webpBuffer.length > 500000) { // 500KB limit
        console.log('⚠️ Static sticker too large, applying compression...');
        // Try with lower quality
        const compressedBuffer = await sharp(buffer)
            .resize(512, 512, { 
                fit: 'contain', 
                background: { r: 0, g: 0, b: 0, alpha: 0 } 
            })
            .webp({ 
                quality: 60,    // Lower quality for smaller file
                effort: 6,
                method: 6
            })
            .toBuffer();
        console.log('✅ Compressed static sticker size:', compressedBuffer.length, 'bytes');
        return compressedBuffer;
    }
    
    return webpBuffer;
}

async function createAnimatedStickerFromGif(buffer) {
    try {
        // Check file format - could be GIF or MP4 (WhatsApp sends GIFs as MP4)
        const firstBytes = buffer.toString('ascii', 0, 10);
        let isActualGif = firstBytes.startsWith('GIF');
        let isMp4 = buffer.includes(Buffer.from('ftyp')) || firstBytes.includes('ftyp');
        
        if (isMp4) {
            // For MP4 videos, convert directly to animated WebP
            const animatedWebpBuffer = await convertMP4ToAnimatedWebP(buffer);
            return animatedWebpBuffer;
        }
        
        // Handle actual GIF files with Sharp
        if (isActualGif) {
            const animatedWebpBuffer = await sharp(buffer)
                .resize(512, 512, { 
                    fit: 'contain', 
                    background: { r: 0, g: 0, b: 0, alpha: 0 } 
                })
                .webp({ quality: 90 })
                .toBuffer();
            return animatedWebpBuffer;
        }
        
        // If we can't determine the format, try generic conversion with Sharp
        const webpBuffer = await sharp(buffer)
            .resize(512, 512, { 
                fit: 'contain', 
                background: { r: 0, g: 0, b: 0, alpha: 0 } 
            })
            .webp({ quality: 90 })
            .toBuffer();
        return webpBuffer;
        
    } catch (error) {
        throw new Error('Failed to convert media to sticker format: ' + error.message);
    }
}

async function convertStickerToImage(buffer) {
    // Convert webp sticker to jpeg using sharp
    const jpegBuffer = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
    return jpegBuffer;
}

async function convertStickerToGif(buffer) {
    // Convert WebP sticker to GIF
    try {
        console.log('🔄 Attempting WebP to GIF conversion with Sharp...');
        
        // First, let's check if it's an animated WebP
        const metadata = await sharp(buffer).metadata();
        console.log('📊 Sticker metadata:', {
            format: metadata.format,
            width: metadata.width,
            height: metadata.height,
            pages: metadata.pages
        });
        
        if (metadata.pages && metadata.pages > 1) {
            // It's animated - Sharp can handle this
            console.log('🎬 Detected animated WebP with', metadata.pages, 'frames');
            const gifBuffer = await sharp(buffer, { animated: true })
                .gif()
                .toBuffer();
            console.log('✅ Animated WebP to GIF conversion successful');
            return gifBuffer;
        } else {
            // Static sticker - convert normally
            console.log('🖼️ Detected static WebP');
            const gifBuffer = await sharp(buffer)
                .gif()
                .toBuffer();
            console.log('✅ Static WebP to GIF conversion successful');
            return gifBuffer;
        }
    } catch (error) {
        console.error('❌ WebP to GIF conversion failed:', error.message);
        
        // Fallback: try converting through PNG first
        try {
            console.log('🔄 Trying fallback PNG conversion...');
            const pngBuffer = await sharp(buffer)
                .png()
                .toBuffer();
            
            // Then convert PNG to GIF
            const gifBuffer = await sharp(pngBuffer)
                .gif()
                .toBuffer();
            console.log('✅ PNG fallback conversion successful');
            return gifBuffer;
        } catch (pngError) {
            console.error('❌ PNG intermediate conversion also failed:', pngError.message);
            throw new Error('Failed to convert sticker to GIF format: ' + pngError.message);
        }
    }
}

// Advanced Tools Functions
function generatePassword(length = 12) {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const allChars = uppercase + lowercase + numbers + symbols;
    
    let password = '';
    
    // Ensure at least one character from each type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

async function shortenUrl(url) {
    try {
        // TinyURL API integration
        const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
        
        // Check if TinyURL returned a valid shortened URL
        if (response.data && response.data.startsWith('https://tinyurl.com/')) {
            return response.data;
        } else {
            throw new Error('Invalid response from TinyURL');
        }
    } catch (error) {
        console.error('TinyURL Error:', error.message);
        // Fallback to local hash-based shortener if TinyURL fails
        const hash = crypto.createHash('md5').update(url).digest('hex').substring(0, 8);
        return `https://short.ly/${hash}`;
    }
}

function getColorInfo(colorName) {
    const colors = {
        // Basic Colors
        'red': { hex: '#FF0000', rgb: 'rgb(255, 0, 0)', hsl: 'hsl(0, 100%, 50%)' },
        'green': { hex: '#008000', rgb: 'rgb(0, 128, 0)', hsl: 'hsl(120, 100%, 25%)' },
        'blue': { hex: '#0000FF', rgb: 'rgb(0, 0, 255)', hsl: 'hsl(240, 100%, 50%)' },
        'yellow': { hex: '#FFFF00', rgb: 'rgb(255, 255, 0)', hsl: 'hsl(60, 100%, 50%)' },
        'orange': { hex: '#FFA500', rgb: 'rgb(255, 165, 0)', hsl: 'hsl(39, 100%, 50%)' },
        'purple': { hex: '#800080', rgb: 'rgb(128, 0, 128)', hsl: 'hsl(300, 100%, 25%)' },
        'pink': { hex: '#FFC0CB', rgb: 'rgb(255, 192, 203)', hsl: 'hsl(350, 100%, 88%)' },
        'cyan': { hex: '#00FFFF', rgb: 'rgb(0, 255, 255)', hsl: 'hsl(180, 100%, 50%)' },
        'magenta': { hex: '#FF00FF', rgb: 'rgb(255, 0, 255)', hsl: 'hsl(300, 100%, 50%)' },
        'lime': { hex: '#00FF00', rgb: 'rgb(0, 255, 0)', hsl: 'hsl(120, 100%, 50%)' },
        
        // Neutral Colors
        'black': { hex: '#000000', rgb: 'rgb(0, 0, 0)', hsl: 'hsl(0, 0%, 0%)' },
        'white': { hex: '#FFFFFF', rgb: 'rgb(255, 255, 255)', hsl: 'hsl(0, 0%, 100%)' },
        'gray': { hex: '#808080', rgb: 'rgb(128, 128, 128)', hsl: 'hsl(0, 0%, 50%)' },
        'grey': { hex: '#808080', rgb: 'rgb(128, 128, 128)', hsl: 'hsl(0, 0%, 50%)' },
        'silver': { hex: '#C0C0C0', rgb: 'rgb(192, 192, 192)', hsl: 'hsl(0, 0%, 75%)' },
        
        // Dark Colors
        'darkred': { hex: '#8B0000', rgb: 'rgb(139, 0, 0)', hsl: 'hsl(0, 100%, 27%)' },
        'darkgreen': { hex: '#006400', rgb: 'rgb(0, 100, 0)', hsl: 'hsl(120, 100%, 20%)' },
        'darkblue': { hex: '#00008B', rgb: 'rgb(0, 0, 139)', hsl: 'hsl(240, 100%, 27%)' },
        'darkgray': { hex: '#A9A9A9', rgb: 'rgb(169, 169, 169)', hsl: 'hsl(0, 0%, 66%)' },
        
        // Light Colors
        'lightred': { hex: '#FFB6C1', rgb: 'rgb(255, 182, 193)', hsl: 'hsl(351, 100%, 86%)' },
        'lightgreen': { hex: '#90EE90', rgb: 'rgb(144, 238, 144)', hsl: 'hsl(120, 73%, 75%)' },
        'lightblue': { hex: '#ADD8E6', rgb: 'rgb(173, 216, 230)', hsl: 'hsl(195, 53%, 79%)' },
        'lightgray': { hex: '#D3D3D3', rgb: 'rgb(211, 211, 211)', hsl: 'hsl(0, 0%, 83%)' },
        
        // Popular Colors
        'gold': { hex: '#FFD700', rgb: 'rgb(255, 215, 0)', hsl: 'hsl(51, 100%, 50%)' },
        'navy': { hex: '#000080', rgb: 'rgb(0, 0, 128)', hsl: 'hsl(240, 100%, 25%)' },
        'maroon': { hex: '#800000', rgb: 'rgb(128, 0, 0)', hsl: 'hsl(0, 100%, 25%)' },
        'olive': { hex: '#808000', rgb: 'rgb(128, 128, 0)', hsl: 'hsl(60, 100%, 25%)' },
        'teal': { hex: '#008080', rgb: 'rgb(0, 128, 128)', hsl: 'hsl(180, 100%, 25%)' },
        'aqua': { hex: '#00FFFF', rgb: 'rgb(0, 255, 255)', hsl: 'hsl(180, 100%, 50%)' },
        'fuchsia': { hex: '#FF00FF', rgb: 'rgb(255, 0, 255)', hsl: 'hsl(300, 100%, 50%)' }
    };
    
    return colors[colorName.toLowerCase()] || null;
}

function getCurrentDateTime() {
    // Sri Lanka timezone (GMT+5:30)
    const sriLankaOffset = 5.5 * 60; // 5 hours 30 minutes in minutes
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const sriLankaTime = new Date(utc + (sriLankaOffset * 60000));
    
    // Sri Lanka timezone info
    const timezone = 'GMT+5:30 (Sri Lanka Standard Time)';
    
    // Format date and time for Sri Lanka
    const date = sriLankaTime.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const time = sriLankaTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
    
    // Additional info
    const unixTimestamp = Math.floor(sriLankaTime.getTime() / 1000);
    const dayOfYear = Math.floor((sriLankaTime - new Date(sriLankaTime.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    const weekNumber = Math.ceil(dayOfYear / 7);
    
    return {
        date,
        time,
        timezone,
        unixTimestamp,
        dayOfYear,
        weekNumber,
        iso: sriLankaTime.toISOString(),
        location: 'Sri Lanka',
        localeDateString: sriLankaTime.toLocaleDateString(),
        localeString: sriLankaTime.toLocaleString()
    };
}

// Helper function to get Sri Lanka time as Date object
function getSriLankaTime() {
    const sriLankaOffset = 5.5 * 60; // 5 hours 30 minutes in minutes
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + (sriLankaOffset * 60000));
}

async function startBot() {
    console.log('🔍 Checking for existing auth backups...');
    verifyBackupIntegrity();
    
    // Use enhanced auth state management with persistence
    const { state, saveCreds } = await getAuthState();
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['CloudNextra Bot', 'Desktop', '2.0.0']
    });

    // Enhanced credentials saving with backup
    const originalSaveCreds = saveCreds;
    const enhancedSaveCreds = async () => {
        try {
            // Save credentials normally first
            await originalSaveCreds();
            console.log('💾 Auth credentials saved to local files');
            
            // Then backup for persistence across deployments (throttled)
            setTimeout(() => {
                try {
                    backupAuthToEnv({ 
                        creds: state.creds, 
                        keys: state.keys 
                    }); // Use throttled backup for automatic saves
                } catch (backupError) {
                    console.error('❌ Failed to backup auth data:', backupError.message);
                }
            }, 1000); // Small delay to ensure files are written
            
        } catch (saveError) {
            console.error('❌ Failed to save credentials:', saveError.message);
            // Still try to backup what we have (throttled)
            try {
                backupAuthToEnv({ 
                    creds: state.creds, 
                    keys: state.keys 
                }); // Use throttled backup for automatic saves
            } catch (backupError) {
                console.error('❌ Failed to backup auth data after save error:', backupError.message);
            }
        }
    };

    // QR handling with persistence awareness
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log('📱 QR Code Generated — Please scan with WhatsApp:');
            qrcode.generate(qr, { small: true });
            console.log('\n📱 Steps: Open WhatsApp → Settings → Linked Devices → Link a Device');
            console.log('⏱️  QR Code expires in 60 seconds...');
            
            // Show QR webpage link prominently
            const baseURL = process.env.NODE_ENV === 'production' && process.env.RENDER_EXTERNAL_URL 
                ? process.env.RENDER_EXTERNAL_URL 
                : `http://localhost:${process.env.PORT || 10000}`;
            
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`🌐 WEB QR CODE: ${baseURL}`);
            console.log(`📊 DASHBOARD: ${baseURL}/qr`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            
            // Generate base64 QR code for web interface
            try {
                const qrImageBuffer = await QRCode.toBuffer(qr, {
                    type: 'png',
                    width: 300,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                });
                currentQRCode = qrImageBuffer.toString('base64');
                connectionStatus = 'connecting';
            } catch (error) {
                console.error('❌ Error generating web QR code:', error.message);
            }
        }
        if (connection === 'open') {
            console.log('🚀 CloudNextra Bot Successfully Connected!');
            console.log('🤖 Bot Status: Online and Ready');
            
            // Auto-detect and set bot owner (the account that scanned QR)
            try {
                const ownerJid = sock.user?.id;
                if (ownerJid) {
                    // Update config to only allow the bot owner
                    config.adminJids = [ownerJid];
                    console.log('👑 Bot Owner Auto-Detected:', ownerJid);
                    console.log('🔒 Bot restricted to owner only');
                } else {
                    console.log('⚠️ Could not detect owner JID, using default admin list');
                }
            } catch (error) {
                console.log('⚠️ Error detecting owner:', error.message);
            }
            
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            // Update connection status for web interface
            connectionStatus = 'connected';
            currentQRCode = null;
            
            // Backup authentication data on successful connection with retry
            setTimeout(async () => {
                for (let attempt = 1; attempt <= 3; attempt++) {
                    try {
                        backupAuthToEnv({ 
                            creds: state.creds, 
                            keys: state.keys 
                        }, true); // Force backup on connection
                        console.log(`💾 Authentication data backed up successfully (attempt ${attempt}/3)`);
                        break; // Success, exit retry loop
                    } catch (error) {
                        console.error(`❌ Failed to backup auth data (attempt ${attempt}/3):`, error.message);
                        if (attempt < 3) {
                            console.log(`🔄 Retrying backup in ${attempt * 2} seconds...`);
                            await new Promise(resolve => setTimeout(resolve, attempt * 2000));
                        } else {
                            console.error('❌ All backup attempts failed. Auth data may not persist across deployments.');
                        }
                    }
                }
            }, 2000); // Wait 2 seconds for connection to stabilize
        } else if (connection === 'close') {
            connectionStatus = 'disconnected';
            currentQRCode = null;
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('⚠️  Connection Lost. Attempting Reconnection:', shouldReconnect);
            if (shouldReconnect) startBot();
        }
    });

    sock.ev.on('creds.update', enhancedSaveCreds);

    // Messages
    sock.ev.on('messages.upsert', async ({ type, messages }) => {
        if (type !== 'notify') return;
        for (const msg of messages) {
            const from = msg.key.remoteJid;
            if (!from) continue;
            // Handle status updates: mark as read if autoRead, then skip further processing
            if (from === 'status@broadcast') {
                if (config.autoRead) {
                    try { await sock.readMessages([msg.key]); } catch (_) {}
                }
                continue;
            }

            const senderJid = (msg.key.participant || msg.key.remoteJid);
            const body = getTextFromMessage(msg) || '';
            
            // Check if user is a bot admin
            const isBotAdmin = config.adminJids.includes(senderJid);

            // Auto-read normal messages
            if (config.autoRead) {
                try { await sock.readMessages([msg.key]); } catch (_) {}
            }

            if (body.startsWith('.')) {
                const fullCommand = body.trim().toLowerCase();
                const command = fullCommand.split(' ')[0]; // Get just the command part
                const text = body.trim(); // Add text variable for command arguments
                console.log(`Received command: ${fullCommand} from ${from}`);
                console.log(`Parsed command: "${command}"`);
                console.log(`Is Bot Admin: ${isBotAdmin}`);
                
                // If bot is OFF, only allow .on command
                if (!config.botEnabled && command !== '.on') {
                    await sock.sendMessage(from, { text: '🛑 The bot is currently OFF. Only bot admins can send `.on` to enable it.' }, { quoted: msg });
                    continue;
                }
                
                // Only allow commands from the bot owner (QR scanner)
                if (!isBotAdmin) {
                    await sock.sendMessage(from, { 
                        text: '🔒 *Access Restricted*\n\n❌ This bot only responds to the account that scanned the QR code.\n\n🤖 *CloudNextra Bot V2.0* - Owner Only Mode' 
                    }, { quoted: msg });
                    continue;
                }
                
                console.log(`Processing command: "${command}"`);
                switch (command) {
                    case '.test': {
                        await sock.sendMessage(from, { text: '✅ Test command works!' }, { quoted: msg });
                        break;
                    }
                    case '.on': {
                        if (!isBotAdmin) {
                            await sendErrorMessage(sock, senderJid, from, 'BOT_ADMIN_REQUIRED', '.on');
                            break;
                        }
                        config.botEnabled = true;
                        await sock.sendMessage(from, { text: '🚀 *Bot Status Updated*\n\n✅ Bot is now **ONLINE** and ready to serve!\n\n💡 *Tip:* Send `.panel` to explore all features.' }, { quoted: msg });
                        break;
                    }
                    case '.off': {
                        if (!isBotAdmin) {
                            await sendErrorMessage(sock, senderJid, from, 'BOT_ADMIN_REQUIRED', '.off');
                            break;
                        }
                        config.botEnabled = false;
                        await sock.sendMessage(from, { text: '⏸️ *Bot Status Updated*\n\n🛑 Bot is now **OFFLINE** for maintenance.\n\n🔧 Only bot admins can use `.on` to reactivate.' }, { quoted: msg });
                        break;
                    }
                    case '.panel': {
                        // Create different panel content based on user role
                        const isAdmin = isBotAdmin;
                        let panelText;
                        
                        if (isAdmin) {
                            // Admin Panel - Full access
                            panelText = `
🤖  *WhatsApp Bot — Admin Control Panel*
────────────────────────────────────────

👑  *Welcome, Administrator!*
You have full access to all bot features and controls.

📌  *Bot Management* (Admin Only)
• \`.panel\` — Show this admin panel
• \`.autoread\` — Toggle auto view status (${config.autoRead ? '✅ ON' : '❌ OFF'})
• \`.anticall\` — Toggle call blocking (${config.antiCall ? '✅ ON' : '❌ OFF'})
• \`.on\` / \`.off\` — Enable/disable bot

🔍  *Information Commands*
• \`.status\` — Debug & system information
• \`.backuptest\` — Test auth backup system

🎨  *Media Commands*
• \`.sticker\` — Convert image/GIF to sticker
• \`.toimg\` — Convert sticker to image
• \`.togif\` — Convert sticker to GIF

🛠️  *Advanced Tools*
• \`.shorturl [url]\` — URL shortener
• \`.color [name]\` — Color code lookup  
• \`.time\` — Current time & date
• \`.pass [12]\` — Password generator

📊  *System Status*
• Bot: ${config.botEnabled ? '✅ ONLINE' : '🛑 OFFLINE'}
• Auto Read: ${config.autoRead ? '✅ Enabled' : '❌ Disabled'}
• Anti Call: ${config.antiCall ? '✅ Enabled' : '❌ Disabled'}

⚡  *Admin Privileges Active*
`;
                        } else {
                            // User Panel - Limited access
                            panelText = `
🤖  *WhatsApp Bot — User Menu*
──────────────────────────────

👋  *Welcome, User!*
Here are the commands available to you:

🔍  *Information Commands*
• \`.status\` — Bot status & information

🎨  *Media Commands*
• \`.sticker\` — Convert image/GIF to sticker
• \`.toimg\` — Convert sticker to image
• \`.togif\` — Convert sticker to GIF

🛠️  *Utility Tools*
• \`.shorturl [url]\` — Shorten long URLs
• \`.color [name]\` — Get color codes (hex, rgb, hsl)
• \`.time\` — Current time & date
• \`.pass [12]\` — Generate secure password

  *How to Use*
• Send image + \`.sticker\` to create sticker
• Reply to sticker with \`.toimg\` to convert
• Commands work in any chat type

💡  *Need Help?*
Contact a bot administrator for advanced features!
`;
                        }
                        
                        try {
                            // Fix for self-chat: get correct target JID
                            const targetJid = getSelfChatTargetJid(senderJid, from);
                            if (targetJid !== from) {
                                console.log(`🔄 Redirecting self-chat message from ${from} to ${targetJid}`);
                            }
                            
                            await sock.sendMessage(targetJid, { text: panelText }, { quoted: msg });
                            console.log(`✅ ${isAdmin ? 'Admin' : 'User'} panel sent successfully to: ${targetJid}`);
                        } catch (sendError) {
                        console.error(`❌ Failed to send panel message to ${from}:`, sendError);
                        // Try sending without quoted message for self-chat
                        try {
                            await sock.sendMessage(from, { text: panelText });
                            console.log(`✅ Panel message sent (without quote) to: ${from}`);
                        } catch (fallbackError) {
                            console.error(`❌ Fallback send also failed:`, fallbackError);
                        }
                    }
                        break;
                    }
                    case '.status': {
                        const statusText = `
🔍 *Bot Debug Information*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 *Your Status:*
• 👤 JID: \`${senderJid}\`
• 🏷️ Chat Type: ${isGroup ? 'Group' : 'Private'}
• 🤖 Bot Admin: ${isBotAdmin ? '✅ Yes' : '❌ No'}

⚙️ *Bot Configuration:*
• 🟢 Bot Enabled: ${config.botEnabled ? 'Yes' : 'No'}
• 👀 Auto Read: ${config.autoRead ? 'Yes' : 'No'}
• 📵 Anti Call: ${config.antiCall ? 'Yes' : 'No'}

📋 *Configured Admins:*
${config.adminJids.map(jid => `• ${jid}`).join('\n')}

${isBotAdmin ? '✅ *You have bot admin privileges*' : '⚠️ *You are not a bot admin*'}
`;
                        const targetJid = getSelfChatTargetJid(senderJid, from);
                        await sock.sendMessage(targetJid, { text: statusText }, { quoted: msg });
                        break;
                    }
                    case '.backuptest': {
                        if (!isBotAdmin) {
                            await sendErrorMessage(sock, senderJid, from, 'BOT_ADMIN_REQUIRED', '.backuptest');
                            break;
                        }
                        
                        const targetJid = getSelfChatTargetJid(senderJid, from);
                        
                        try {
                            // Get current environment info
                            const envInfo = {
                                platform: process.platform,
                                arch: process.arch,
                                nodeVersion: process.version,
                                cwd: process.cwd(),
                                home: process.env.HOME || 'undefined',
                                user: process.env.USER || process.env.USERNAME || 'undefined',
                                render: process.env.RENDER ? 'Yes' : 'No'
                            };
                            
                            // Run backup verification
                            const hasValidBackup = verifyBackupIntegrity();
                            
                            // Create a test backup to verify the system is working
                            console.log('🧪 Creating test backup...');
                            backupAuthToEnv({ 
                                creds: state.creds, 
                                keys: state.keys 
                            }, true); // Force backup for testing
                            
                            // Check again after backup
                            const hasValidBackupAfter = verifyBackupIntegrity();
                            
                            // Check environment variable backup status
                            const envBackupStatus = {
                                hasCreds: !!process.env.BAILEYS_CREDS_BACKUP,
                                hasKeys: !!process.env.BAILEYS_KEYS_BACKUP,
                                hasTimestamp: !!process.env.BAILEYS_BACKUP_TIMESTAMP
                            };
                            
                            const statusText = `
🔍 *Auth Backup System Test*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🖥️ *Environment Info:*
• Platform: ${envInfo.platform}
• Architecture: ${envInfo.arch}
• Node.js: ${envInfo.nodeVersion}
• Working Dir: ${envInfo.cwd}
• Home Dir: ${envInfo.home}
• Render Deploy: ${envInfo.render}

📊 *Test Results:*
• 🔍 Before Test: ${hasValidBackup ? '✅ Valid backup found' : '❌ No valid backup'}
• 🧪 Test Backup: ✅ Attempted
• 🔍 After Test: ${hasValidBackupAfter ? '✅ Valid backup found' : '❌ No valid backup'}

🗂️ *Backup Locations Checked:*
• ./auth-backup (Local - works on Render)
• /tmp/auth-backup (Temporary)
• ~/.wa-bot-backup (Home directory)

🌐 *Environment Variable Backup:*
• Creds: ${envBackupStatus.hasCreds ? '✅ Present' : '❌ Missing'}
• Keys: ${envBackupStatus.hasKeys ? '✅ Present' : '❌ Missing'}
• Timestamp: ${envBackupStatus.hasTimestamp ? '✅ Present' : '❌ Missing'}

📝 *Auth State Info:*
• 🔑 Has Creds: ${state.creds ? '✅ Yes' : '❌ No'}
• 🗝️ Has Keys: ${state.keys && Object.keys(state.keys).length > 0 ? `✅ Yes (${Object.keys(state.keys).length})` : '❌ No'}

${hasValidBackupAfter ? '🎉 *Backup system is working!*' : '⚠️ *Backup system may have issues*'}

💡 *Note:* Check console logs for detailed backup information.
`;
                            
                            await sock.sendMessage(targetJid, { text: statusText }, { quoted: msg });
                            
                        } catch (error) {
                            console.error('❌ Backup test failed:', error);
                            await sock.sendMessage(targetJid, { 
                                text: `❌ *Backup Test Failed*\n\nError: ${error.message}\n\nCheck console logs for more details.` 
                            }, { quoted: msg });
                        }
                        break;
                    }
                    case '.autoread': {
                        if (!isBotAdmin) {
                            await sendErrorMessage(sock, senderJid, from, 'BOT_ADMIN_REQUIRED', '.autoread');
                            break;
                        }
                        config.autoRead = !config.autoRead;
                        const status = config.autoRead ? '🟢 *ENABLED*' : '🔴 *DISABLED*';
                        const icon = config.autoRead ? '👀' : '🙈';
                        const description = config.autoRead ? 'Messages will be automatically marked as read' : 'Manual read confirmation required';
                        await sock.sendMessage(from, { 
                            text: `${icon} *Auto-Read Feature Updated*\n\n� Status: ${status}\n💬 ${description}\n\n✨ Your privacy settings have been updated!` 
                        }, { quoted: msg });
                        break;
                    }
                    case '.anticall': {
                        if (!isBotAdmin) {
                            await sendErrorMessage(sock, senderJid, from, 'BOT_ADMIN_REQUIRED', '.anticall');
                            break;
                        }
                        config.antiCall = !config.antiCall;
                        const status = config.antiCall ? '🟢 *ENABLED*' : '🔴 *DISABLED*';
                        const icon = config.antiCall ? '📵' : '📞';
                        const description = config.antiCall ? 'Incoming calls will be automatically rejected' : 'All calls will be accepted normally';
                        await sock.sendMessage(from, { 
                            text: `${icon} *Call Protection Updated*\n\n🛡️ Status: ${status}\n📲 ${description}\n\n🔒 Your call preferences have been saved!` 
                        }, { quoted: msg });
                        break;
                    }
                    case '.sticker': {
                        // Check for image or GIF in the triggering message or quoted message
                        let mediaMsg = null;
                        let isGif = false;
                        
                        // Check direct message for image or GIF
                        if (isImageMessage(msg)) {
                            mediaMsg = extractImageMessage(msg);
                        } else if (isGifMessage(msg)) {
                            mediaMsg = extractGifMessage(msg);
                            isGif = true;
                        }
                        
                        // If not found, check quoted message
                        if (!mediaMsg && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                            const quoted = msg.message.extendedTextMessage.contextInfo.quotedMessage;
                            
                            // Check for image in quoted message
                            if (quoted.imageMessage) {
                                mediaMsg = { ...msg, message: { imageMessage: quoted.imageMessage } };
                            } else if (quoted.ephemeralMessage?.message?.imageMessage) {
                                mediaMsg = { ...msg, message: { imageMessage: quoted.ephemeralMessage.message.imageMessage } };
                            } else if (quoted.viewOnceMessage?.message?.imageMessage) {
                                mediaMsg = { ...msg, message: { imageMessage: quoted.viewOnceMessage.message.imageMessage } };
                            } else if (quoted.viewOnceMessageV2?.message?.imageMessage) {
                                mediaMsg = { ...msg, message: { imageMessage: quoted.viewOnceMessageV2.message.imageMessage } };
                            }
                            // Check for video/GIF in quoted message
                            else if (quoted.videoMessage) {
                                mediaMsg = { ...msg, message: { videoMessage: quoted.videoMessage } };
                                isGif = true; // Treat any quoted video as potential GIF
                            } else if (quoted.ephemeralMessage?.message?.videoMessage) {
                                mediaMsg = { ...msg, message: { videoMessage: quoted.ephemeralMessage.message.videoMessage } };
                                isGif = true;
                            } else if (quoted.viewOnceMessage?.message?.videoMessage) {
                                mediaMsg = { ...msg, message: { videoMessage: quoted.viewOnceMessage.message.videoMessage } };
                                isGif = true;
                            } else if (quoted.viewOnceMessageV2?.message?.videoMessage) {
                                mediaMsg = { ...msg, message: { videoMessage: quoted.viewOnceMessageV2.message.videoMessage } };
                                isGif = true;
                            }
                        }
                        
                        if (!mediaMsg) {
                            await sock.sendMessage(from, { 
                                text: '🎨 *Sticker Creator*\n\n❌ No supported media detected!\n\n📷 *How to use:*\n• Send **image/video** with caption `.sticker`\n• Reply to any **image/video** with `.sticker`\n\n✅ *Supports:* JPG, PNG, WEBP, GIF files, and MP4 videos\n\n💡 *Tip:* MP4 videos will be converted to static stickers using the first frame!' 
                            }, { quoted: msg });
                            break;
                        }
                        
                        try {
                            const buffer = await downloadMediaMessage(
                                mediaMsg,
                                'buffer',
                                {},
                                { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage }
                            );
                            
                            let stickerBuffer;
                            let successMessage;
                            
                            if (isGif) {
                                // Convert GIF to animated sticker
                                stickerBuffer = await createAnimatedStickerFromGif(buffer);
                                const fileSizeKB = Math.round(stickerBuffer.length / 1024);
                                successMessage = `🎭 *Animated Sticker Created!*\n\n✨ Your GIF has been converted to an animated sticker\n📊 File size: ${fileSizeKB}KB (optimized for WhatsApp)\n🚀 Ready to use in chats!\n\n💫 *Enjoy your new animated sticker!*`;
                            } else {
                                // Convert image to static sticker
                                stickerBuffer = await createStickerFromImageBuffer(buffer);
                                const fileSizeKB = Math.round(stickerBuffer.length / 1024);
                                successMessage = `🎨 *Sticker Created Successfully!*\n\n✨ Your image has been converted to a sticker\n📊 File size: ${fileSizeKB}KB (optimized for WhatsApp)\n🚀 Ready to use in chats!\n\n💫 *Enjoy your new sticker!*`;
                            }
                            
                            await sock.sendMessage(from, { sticker: stickerBuffer }, { quoted: msg });
                            await sock.sendMessage(from, { text: successMessage }, { quoted: msg });
                            
                        } catch (e) {
                            console.error('Error creating sticker:', e);
                            await sendErrorMessage(sock, senderJid, from, 'STICKER_FAILED');
                        }
                        break;
                    }
                    case '.toimg': {
                        // Check if the triggering message includes a sticker, or check quoted message
                        let stickerMsg = isStickerMessage(msg) ? extractStickerMessage(msg) : null;
                        if (!stickerMsg && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                            const quoted = msg.message.extendedTextMessage.contextInfo.quotedMessage;
                            if (quoted.stickerMessage) stickerMsg = { ...msg, message: { stickerMessage: quoted.stickerMessage } };
                            else if (quoted.ephemeralMessage?.message?.stickerMessage) stickerMsg = { ...msg, message: { stickerMessage: quoted.ephemeralMessage.message.stickerMessage } };
                            else if (quoted.viewOnceMessage?.message?.stickerMessage) stickerMsg = { ...msg, message: { stickerMessage: quoted.viewOnceMessage.message.stickerMessage } };
                            else if (quoted.viewOnceMessageV2?.message?.stickerMessage) stickerMsg = { ...msg, message: { stickerMessage: quoted.viewOnceMessageV2.message.stickerMessage } };
                        }
                        if (!stickerMsg) {
                            await sock.sendMessage(from, { 
                                text: '🖼️ *Image Converter*\n\n❌ No sticker detected!\n\n🎯 *How to use:*\n• Send sticker with caption `.toimg`\n• Reply to any sticker with `.toimg`\n\n🔄 Convert stickers back to images easily!' 
                            }, { quoted: msg });
                            break;
                        }
                        try {
                            const buffer = await downloadMediaMessage(
                                stickerMsg,
                                'buffer',
                                {},
                                { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage }
                            );
                            const jpeg = await convertStickerToImage(buffer);
                            await sock.sendMessage(from, { 
                                image: jpeg,
                                caption: '🖼️ *Conversion Complete!*\n\n✅ Sticker successfully converted to image\n📱 Now you can save, edit, or share it!\n\n🎨 *Enjoy your image!*'
                            }, { quoted: msg });
                        } catch (e) {
                            console.error('Error converting sticker to image:', e);
                            await sendErrorMessage(sock, senderJid, from, 'TOIMG_FAILED');
                        }
                        break;
                    }
                    case '.togif': {
                        // Check if the triggering message includes a sticker, or check quoted message
                        let stickerMsg = isStickerMessage(msg) ? extractStickerMessage(msg) : null;
                        if (!stickerMsg && msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                            const quoted = msg.message.extendedTextMessage.contextInfo.quotedMessage;
                            if (quoted.stickerMessage) stickerMsg = { ...msg, message: { stickerMessage: quoted.stickerMessage } };
                            else if (quoted.ephemeralMessage?.message?.stickerMessage) stickerMsg = { ...msg, message: { stickerMessage: quoted.ephemeralMessage.message.stickerMessage } };
                            else if (quoted.viewOnceMessage?.message?.stickerMessage) stickerMsg = { ...msg, message: { stickerMessage: quoted.viewOnceMessage.message.stickerMessage } };
                            else if (quoted.viewOnceMessageV2?.message?.stickerMessage) stickerMsg = { ...msg, message: { stickerMessage: quoted.viewOnceMessageV2.message.stickerMessage } };
                        }
                        if (!stickerMsg) {
                            await sock.sendMessage(from, { 
                                text: '🎭 *GIF Converter*\n\n❌ No sticker detected!\n\n🎯 *How to use:*\n• Send sticker with caption `.togif`\n• Reply to any sticker with `.togif`\n\n🔄 Convert stickers to animated GIFs!\n💡 *Works best with animated stickers*' 
                            }, { quoted: msg });
                            break;
                        }
                        try {
                            console.log('🎭 Starting sticker to GIF conversion...');
                            const buffer = await downloadMediaMessage(
                                stickerMsg,
                                'buffer',
                                {},
                                { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage }
                            );
                            console.log('📥 Downloaded sticker buffer, size:', buffer.length, 'bytes');
                            const gifBuffer = await convertStickerToGif(buffer);
                            console.log('✅ GIF conversion completed, size:', gifBuffer.length, 'bytes');
                            await sock.sendMessage(from, { 
                                video: gifBuffer,
                                gifPlayback: true,
                                caption: '🎭 *GIF Conversion Complete!*\n\n✅ Sticker successfully converted to GIF\n📱 Perfect for sharing animations!\n\n🎨 *Enjoy your GIF!*'
                            }, { quoted: msg });
                        } catch (e) {
                            console.error('Error converting sticker to GIF:', e);
                            await sendErrorMessage(sock, senderJid, from, 'TOGIF_FAILED');
                        }
                        break;
                    }
                    
                    // Advanced Tools Commands
                    case '.shorturl': {
                        const url = text.substring(9).trim();
                        if (!url) {
                            await sock.sendMessage(from, { 
                                text: '🔗 *URL Shortener Service*\n\n❌ No URL provided!\n\n📝 *Usage:*\n`.shorturl https://example.com`\n\n🌐 *Supported:* HTTP & HTTPS links\n💡 *Perfect for long URLs!*' 
                            }, { quoted: msg });
                            break;
                        }
                        
                        // Basic URL validation
                        if (!url.startsWith('http://') && !url.startsWith('https://')) {
                            await sock.sendMessage(from, { 
                                text: '⚠️ *Invalid URL Format*\n\n❌ URL must start with http:// or https://\n\n✅ *Correct format:*\n`https://www.example.com`\n\n🔒 *We support secure links only!*' 
                            }, { quoted: msg });
                            break;
                        }
                        
                        try {
                            const shortUrl = await shortenUrl(url);
                            const response = `🔗 *URL Shortening Complete!*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

� *Original URL:*
${url}

⚡ *Shortened URL:*
${shortUrl}

📊 *Service:* ${shortUrl.includes('tinyurl.com') ? 'TinyURL (Official)' : 'Fallback Service'}
✨ *Benefits:*
• ${Math.round((1 - shortUrl.length / url.length) * 100)}% shorter length
• Easy to share & remember
• Professional appearance
• Permanent redirect link

${shortUrl.includes('tinyurl.com') ? '🌐 *Powered by TinyURL*' : '⚠️ *Fallback used - TinyURL unavailable*'}`;
                            
                            const targetJid = getSelfChatTargetJid(senderJid, from);
                            await sock.sendMessage(targetJid, { text: response }, { quoted: msg });
                        } catch (e) {
                            console.error('Error shortening URL:', e);
                            await sendErrorMessage(sock, senderJid, from, 'COMMAND_ERROR', 'shorturl');
                        }
                        break;
                    }
                    
                    case '.color': {
                        const colorName = text.substring(6).trim();
                        if (!colorName) {
                            await sock.sendMessage(from, { 
                                text: '🎨 *Color Code Lookup*\n\n❌ No color name provided!\n\n📝 *Usage:*\n`.color red`\n\n🌈 *Popular colors:*\n• red, green, blue, yellow\n• orange, purple, pink, cyan\n• black, white, gray, gold\n• navy, maroon, olive, teal\n\n💡 *50+ colors available!*' 
                            }, { quoted: msg });
                            break;
                        }
                        
                        const colorInfo = getColorInfo(colorName);
                        if (!colorInfo) {
                            await sock.sendMessage(from, { 
                                text: `❌ *Color Not Found*\n\n🔍 "${colorName}" is not in our database\n\n🎨 *Try these instead:*\n• Basic: red, green, blue, yellow\n• Dark: darkred, darkgreen, darkblue\n• Light: lightred, lightgreen, lightblue\n• Special: gold, navy, maroon, teal\n\n📚 *Database:* 50+ color codes available` 
                            }, { quoted: msg });
                            break;
                        }
                        
                        const response = `🎨 *Color Database: ${colorName.toUpperCase()}*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

� *HEX Code:* \`${colorInfo.hex}\`
� *RGB Value:* \`${colorInfo.rgb}\`
� *HSL Format:* \`${colorInfo.hsl}\`

🎯 *Professional Usage:*
• 🌐 Web Design → Copy HEX
• 💻 Programming → Use RGB
• 🎨 Design Tools → HSL format
• 📱 App Development → Any format

✨ *Perfect for designers & developers!*`;
                        
                        await sock.sendMessage(from, { text: response }, { quoted: msg });
                        break;
                    }
                    
                    case '.time': {
                        try {
                            const timeInfo = getCurrentDateTime();
                            const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
                            const uptimeMinutes = Math.floor(uptimeSeconds / 60);
                            const uptimeHours = Math.floor(uptimeMinutes / 60);
                            
                            const response = `🕐 *Sri Lanka Time Service*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 *Current Date:*
${timeInfo.date}

⏰ *Local Time:*
${timeInfo.time}

🌍 *Timezone:*
${timeInfo.timezone}

🏝️ *Location:*
${timeInfo.location}

📊 *Detailed Information:*
• 📆 Day of Year: ${timeInfo.dayOfYear}
• 🗓️ Week Number: ${timeInfo.weekNumber}
• ⚡ Unix Timestamp: ${timeInfo.unixTimestamp}
• 🔗 ISO Format: ${timeInfo.iso}

🤖 *Bot Performance:*
• ⏱️ Uptime: ${uptimeHours}h ${uptimeMinutes % 60}m ${uptimeSeconds % 60}s
• 🟢 Status: Active & Responsive

�🇰 *Sri Lanka Standard Time (SLST)*`;
                            
                            await sock.sendMessage(from, { text: response }, { quoted: msg });
                        } catch (e) {
                            console.error('Error getting time:', e);
                            await sendErrorMessage(sock, senderJid, from, 'COMMAND_ERROR', 'time');
                        }
                        break;
                    }
                    
                    case '.pass': {
                        const lengthArg = text.substring(5).trim();
                        let length = 12; // default length
                        
                        if (lengthArg) {
                            const parsedLength = parseInt(lengthArg);
                            if (isNaN(parsedLength) || parsedLength < 4 || parsedLength > 50) {
                                await sock.sendMessage(from, { 
                                    text: '⚠️ *Invalid Password Length*\n\n❌ Length must be 4-50 characters\n\n📝 *Usage Examples:*\n• `.pass` (default 12 chars)\n• `.pass 16` (custom length)\n• `.pass 8` (short password)\n\n🔒 *Recommended:* 12-16 characters' 
                                }, { quoted: msg });
                                break;
                            }
                            length = parsedLength;
                        }
                        
                        try {
                            const password = generatePassword(length);
                            const response = `🔐 *Secure Password Generator*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔑 *Generated Password:*
\`${password}\`

� *Specifications:*
• 📏 Length: ${length} characters
• 🔤 Uppercase: A-Z
• 🔡 Lowercase: a-z  
• 🔢 Numbers: 0-9
• 🔣 Symbols: Special chars

🛡️ *Security Level:* Military Grade
🔒 *Encryption:* Cryptographically secure
⚡ *Strength:* Maximum protection

⚠️ *IMPORTANT SECURITY NOTICE:*
• Copy immediately after viewing
• Never share via insecure channels
• Change default passwords instantly
• Store in secure password manager

🔰 *Your digital security matters!*`;
                            
                            await sock.sendMessage(from, { text: response }, { quoted: msg });
                        } catch (e) {
                            console.error('Error generating password:', e);
                            await sendErrorMessage(sock, senderJid, from, 'COMMAND_ERROR', 'pass');
                        }
                        break;
                    }
                    
                    // Basic Commands
                    
                    
                    case '.stats': {
                        try {
                            const targetJid = getSelfChatTargetJid(senderJid, from);
                            const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
                            const uptimeMinutes = Math.floor(uptimeSeconds / 60);
                            const uptimeHours = Math.floor(uptimeMinutes / 60);
                            const uptimeDays = Math.floor(uptimeHours / 24);
                            
                            let uptimeString = '';
                            if (uptimeDays > 0) uptimeString += `${uptimeDays}d `;
                            if (uptimeHours % 24 > 0) uptimeString += `${uptimeHours % 24}h `;
                            if (uptimeMinutes % 60 > 0) uptimeString += `${uptimeMinutes % 60}m `;
                            uptimeString += `${uptimeSeconds % 60}s`;
                            
                            const memoryUsage = process.memoryUsage();
                            const memoryMB = (memoryUsage.rss / 1024 / 1024).toFixed(2);
                            
                            const statsText = `📊 *Bot Statistics & Performance*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏱️ **Uptime Information:**
• 🚀 Started: ${getSriLankaTime().toLocaleString()} (SLST)
• ⏰ Running: ${uptimeString.trim()}
• 📅 Current: ${getSriLankaTime().toLocaleString()} (SLST)

💻 **System Performance:**
• 🧠 Memory Usage: ${memoryMB} MB
• 🔄 Node.js Version: ${process.version}
• 🏗️ Platform: ${process.platform}

🤖 **Bot Status:**
• 🟢 Status: Active & Responsive
• 📡 Connection: Stable
• 🛡️ Auto view status: ${config.autoRead ? 'Enabled' : 'Disabled'}
• 📵 Anti Call: ${config.antiCall ? 'Enabled' : 'Disabled'}

📈 **Feature Statistics:**
• 🎵 Audio Processing: Active
• � Image Processing: Enabled
• 🔐 Security: Enhanced

⚡ **Performance Metrics:**
• 🚀 Response Time: Optimized
• 💾 Cache Status: Active
• 🔧 Error Handling: Comprehensive
• 📱 Self-Chat: Supported

🌟 *Bot running smoothly and ready to serve!*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
                            
                            await sock.sendMessage(targetJid, { text: statsText }, { quoted: msg });
                        } catch (e) {
                            console.error('Error showing stats:', e);
                            await sendErrorMessage(sock, senderJid, from, 'COMMAND_ERROR', 'stats');
                        }
                        break;
                    }
                    
                    
                    
                    
                    
                    default: {
                        console.log(`Unknown command: "${command}"`);
                        const targetJid = getSelfChatTargetJid(senderJid, from);
                        const isUserAdmin = isBotAdmin;
                        
                        let helpMessage;
                        if (isUserAdmin) {
                            helpMessage = `❓ *Command Not Recognized (Admin)*\n\n🤖 The command "${command}" is not available\n\n🔧 *Admin Debug Info:*\n• Command: ${command}\n• From: ${senderJid}\n• Context: Private\n\n📋 *Get Help:*\n• Send \`.panel\` for admin control panel\n• Check command spelling and syntax\n\n💡 *Admin Note:* If this should be a valid command, check the code or contact the developer!`;
                        } else {
                            helpMessage = `❓ *Command Not Recognized*\n\n🤖 The command "${command}" is not available to you\n\n📋 *Get Help:*\n• Send \`.panel\` for available commands\n• Check your spelling and try again\n\n💡 *Tips:*\n• Some commands are admin-only\n• Make sure you're typing the command correctly\n• Contact a bot admin if you need special features!`;
                        }
                        
                        await sock.sendMessage(targetJid, { text: helpMessage }, { quoted: msg });
                    }
                }
            }
        }
    });

    // Call handling (anti-call)
    sock.ev.on('call', async (calls) => {
        try {
            for (const call of calls) {
                if (!config.antiCall) continue;
                if (call.status === 'offer') {
                    // Some Baileys versions expose rejectCall; if not, just notify
                    if (typeof sock.rejectCall === 'function') {
                        try { await sock.rejectCall(call.id, call.from); } catch (_) {}
                    }
                    await sock.sendMessage(call.from, { text: '🚫 Calls are not allowed. Your call was rejected.' });
                }
            }
        } catch (err) {
            console.error('Call handling error:', err);
        }
    });
}

console.log('🤖 Initializing CloudNextra Bot V2.0...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔧 Built with Baileys Library');
console.log('🔒 Owner-Only Mode: Bot restricted to QR scanner account');
console.log('⚡ Loading modules and establishing connection...\n');

// Health check server for Render
const server = http.createServer((req, res) => {
    // Set CORS headers for all requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            status: 'healthy', 
            uptime: Date.now() - startTime,
            timestamp: new Date().toISOString()
        }));
    } else if (req.url === '/' || req.url === '/qr') {
        // Serve the QR code webpage
        const fs = require('fs');
        const path = require('path');
        try {
            const htmlContent = fs.readFileSync(path.join(__dirname, 'public', 'qr.html'), 'utf8');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(htmlContent);
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error loading QR page');
        }
    } else if (req.url === '/qr-data') {
        // Serve QR code data as JSON
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            qr: currentQRCode,
            status: connectionStatus,
            timestamp: new Date().toISOString()
        }));
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`🌐 Health check server running on port ${PORT}`);
    
    // Show QR webpage URLs for easy access
    if (process.env.NODE_ENV === 'production' && process.env.RENDER_EXTERNAL_URL) {
        console.log(`📱 QR Code Webpage: ${process.env.RENDER_EXTERNAL_URL}`);
        console.log(`📡 Health Check: ${process.env.RENDER_EXTERNAL_URL}/health`);
        console.log(`🔗 API Endpoint: ${process.env.RENDER_EXTERNAL_URL}/qr-data`);
    } else {
        console.log(`📱 QR Code Webpage: http://localhost:${PORT}`);
        console.log(`📡 Health Check: http://localhost:${PORT}/health`);
        console.log(`🔗 API Endpoint: http://localhost:${PORT}/qr-data`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});

// Self-ping mechanism to keep the service active on Render
let selfPingInterval = null;
if (process.env.NODE_ENV === 'production') {
    const SELF_PING_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    
    // More aggressive keep-alive: ping every 3 minutes instead of 5
    selfPingInterval = setInterval(async () => {
        try {
            const response = await axios.get(`${SELF_PING_URL}/health`, {
                timeout: 10000,
                headers: { 
                    'User-Agent': 'WhatsApp-Bot-KeepAlive',
                    'Cache-Control': 'no-cache'
                }
            });
            console.log(`🏓 Keep-alive ping: ${response.status} - ${new Date().toISOString()}`);
        } catch (error) {
            console.log(`⚠️ Keep-alive ping failed: ${error.message} - ${new Date().toISOString()}`);
            // Try alternative endpoint if health fails
            try {
                await axios.get(`${SELF_PING_URL}/`, { timeout: 5000 });
                console.log(`🏓 Fallback ping successful - ${new Date().toISOString()}`);
            } catch (fallbackError) {
                console.log(`❌ Both ping attempts failed - ${new Date().toISOString()}`);
            }
        }
    }, 3 * 60 * 1000); // Every 3 minutes for better reliability
    
    console.log('🏓 Enhanced keep-alive mechanism activated (3-minute interval)');
}

startBot().catch((e) => {
    console.error('❌ Failed to start bot:', e);
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log('\n🛑 Received shutdown signal (SIGINT)');
    console.log('🧹 Cleaning up resources...');
    if (selfPingInterval) {
        clearInterval(selfPingInterval);
        console.log('🏓 Self-ping mechanism stopped');
    }
    server.close(() => {
        console.log('🌐 Health check server closed');
        console.log('👋 Bot shutdown complete. Goodbye!');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received termination signal (SIGTERM)');
    console.log('🧹 Cleaning up resources...');
    if (selfPingInterval) {
        clearInterval(selfPingInterval);
        console.log('🏓 Self-ping mechanism stopped');
    }
    server.close(() => {
        console.log('🌐 Health check server closed');
        console.log('👋 Bot terminated successfully. Goodbye!');
        process.exit(0);
    });
});
