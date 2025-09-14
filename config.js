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
    reconnectDelayOnAuthReset: 3000,
    reconnectDelayOnStreamError: 10000,
    keepAliveInterval: 600000,
    
    // Keep-alive settings for Render free plan
    keepAlive: {
        enabled: process.env.NODE_ENV === 'production',
        interval: 10, // minutes
        endpoints: ['/health', '/ping', '/wake'],
        timeout: 30000 // 30 seconds
    },
    
    // Logging settings
    logLevel: 'error',
    
    // Features
    defaultStatus: 'available',
    commands: {
        prefix: '.'
    }
};
