/**
 * CloudNextra WhatsApp Bot Starter
 */

const { spawn } = require('child_process');

console.log('🚀 Starting CloudNextra WhatsApp Bot...');

// Start the main bot process
const botProcess = spawn('node', ['index.js'], {
    cwd: __dirname,
    stdio: 'inherit'
});

botProcess.on('close', (code) => {
    console.log(`\n💤 Bot process exited with code ${code}`);
    if (code !== 0) {
        console.log('🔄 Restarting in 5 seconds...');
        setTimeout(() => {
            console.log('🚀 Restarting CloudNextra WhatsApp Bot...');
            require(__filename); // Restart this script
        }, 5000);
    }
});

botProcess.on('error', (error) => {
    console.error('❌ Failed to start bot process:', error);
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT. Shutting down gracefully...');
    botProcess.kill('SIGINT');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM. Shutting down gracefully...');
    botProcess.kill('SIGTERM');
    process.exit(0);
});