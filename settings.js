/**
 * Bot Settings Configuration
 */
module.exports = {
    // Bot settings
    name: 'CloudNextra Bot',
    version: '1.0.0',
    
    // Connection settings
    reconnectAttempts: 5,
    reconnectDelay: 5000,
    reconnectDelayOnAuthReset: 3000,
    reconnectDelayOnStreamError: 10000,
    keepAliveInterval: 600000,
    
    // Commands
    commands: {
        prefix: '.'
    },
    
    // Features
    autoRead: {
        enabled: false
    }
};
