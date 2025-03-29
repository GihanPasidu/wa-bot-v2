/**
 * Bot Configuration
 */
module.exports = {
    // Bot settings
    name: 'CloudNextra Bot',
    version: '1.0.0',
    
    // Connection settings
    reconnectAttempts: 5,
    reconnectDelay: 5000,
    keepAliveInterval: 600000,
    
    // Logging settings
    logLevel: 'error',
    
    // Features
    defaultStatus: 'available',
    commands: {
        prefix: '.'
    }
};
