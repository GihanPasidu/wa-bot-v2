/**
 * CloudNextra WhatsApp Bot Starter
 */

// Simple start script for the WhatsApp bot
console.log('🚀 Starting CloudNextra WhatsApp Bot...');

// Load environment variables
require('dotenv').config({ path: './config.env' });

// Start the main bot
require('./index.js');