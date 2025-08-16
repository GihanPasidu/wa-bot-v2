const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });
function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}
try {
	// Load .env / config.env variables if dotenv is installed
	require('dotenv').config({ path: './config.env' });
} catch (e) {
	// dotenv not available — continue
}

// Export app config from config.js
module.exports = require('./config');
