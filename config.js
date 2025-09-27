/**
 * CloudNextra WhatsApp Bot V2.0 - Configuration
 * Enhanced configuration system with V2.0 features
 */
module.exports = {
    // Bot Information
    bot: {
        name: 'CloudNextra Bot',
        version: '2.0.0',
        author: 'CloudNextra',
        description: 'Professional WhatsApp Bot with Advanced Features'
    },
    
    // Connection settings - Enhanced for V2.0
    connection: {
        reconnectAttempts: 5,
        reconnectDelay: 5000,
        reconnectDelayOnAuthReset: 3000,
        reconnectDelayOnStreamError: 10000,
        maxReconnectDelay: 30000,
        keepAliveInterval: 600000, // 10 minutes
        qrRefreshInterval: 30000,  // 30 seconds
        connectionTimeout: 60000   // 1 minute
    },
    
    // Commands configuration
    commands: {
        prefix: '.',
        caseSensitive: false,
        allowInGroups: false,      // Commands only in private chats
        selfChatOnly: true,        // Commands only work in self chat
        rateLimitWindow: 60000,    // 1 minute window
        rateLimitMax: 30           // Max 30 commands per minute
    },
    
    // Auto-reply system - V2.0 Enhanced
    autoReply: {
        enabled: false,
        privateChatsOnly: true,
        minDelay: 1000,           // 1 second
        maxDelay: 3000,           // 3 seconds
        keywords: [
            'hi', 'hello', 'good morning', 'gm', 
            'good afternoon', 'good evening', 
            'good night', 'gn', 'thank you', 'thanks',
            'bye', 'see you', 'how are you', 'what\'s up'
        ]
    },
    
    // Auto-view settings
    autoView: {
        enabled: false,
        statusOnly: true,          // Only view status, not messages
        excludeGroups: true,       // Don't view group status
        viewDelay: 2000           // 2 second delay
    },
    
    // Security settings - V2.0 Enhanced
    security: {
        callBlocking: {
            enabled: false,
            autoBlock: true,
            logBlocked: true
        },
        rateLimiting: {
            enabled: true,
            windowMs: 60000,       // 1 minute
            maxRequests: 50
        },
        antispam: {
            enabled: true,
            maxDuplicates: 3,
            timeWindow: 30000      // 30 seconds
        }
    },
    
    // Features configuration
    features: {
        sticker: {
            enabled: true,
            maxFileSize: 5242880,  // 5MB
            supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp']
        },
        passwordGenerator: {
            enabled: true,
            minLength: 4,
            maxLength: 50,
            defaultLength: 12
        },
        urlShortener: {
            enabled: true,
            service: 'tinyurl',    // Ready for API integration
            validateUrls: true
        }
    },
    
    // Web interface settings
    web: {
        port: process.env.PORT || 10000,
        host: '0.0.0.0',
        enableQR: true,
        qrRefreshRate: 30000,     // 30 seconds
        showStats: true,
        theme: 'professional'
    },
    
    // Logging configuration
    logging: {
        level: 'info',
        enableConsole: true,
        enableFile: false,
        maxFileSize: 10485760,    // 10MB
        maxFiles: 5
    },
    
    // Performance settings
    performance: {
        maxMemoryUsage: 512,      // 512MB
        gcInterval: 300000,       // 5 minutes
        cacheSize: 1000,
        enableMetrics: true
    }
};
