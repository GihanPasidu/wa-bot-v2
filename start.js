/**
 * CloudNextra WhatsApp Bot Starter
 */

console.log('🚀 Starting CloudNextra WhatsApp Bot...');

// Load environment variables
require('dotenv').config({ path: './config.env' });

// Start the main bot
require('./index.js');