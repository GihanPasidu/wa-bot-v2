/**
 * CloudNextra WhatsApp Bot V2.0 - Settings Configuration
 * Enhanced settings management with V2.0 features
 */
module.exports = {
    // Bot settings - V2.0 Enhanced
    name: 'CloudNextra Bot V2.0',
    version: '2.0.0',
    author: 'CloudNextra',
    description: 'Professional WhatsApp Bot with Advanced Auto-Reply, Status Management, and Security Features',
    
    // Connection settings - Enhanced
    connection: {
        reconnectAttempts: 5,
        reconnectDelay: 5000,
        reconnectDelayOnAuthReset: 3000,
        reconnectDelayOnStreamError: 10000,
        keepAliveInterval: 600000,
        maxConnectionTime: 3600000, // 1 hour
        healthCheckInterval: 30000  // 30 seconds
    },
    
    // Commands - V2.0 Enhanced
    commands: {
        prefix: '.',
        caseSensitive: false,
        selfChatOnly: true,
        privateChatsOnly: true,
        enableRateLimit: true,
        maxCommandsPerMinute: 30
    },
    
    // Features - V2.0 New Features
    features: {
        autoRead: {
            enabled: false,
            statusOnly: true,
            excludeGroups: true
        },
        autoReply: {
            enabled: false,
            responseCount: 14,
            naturalDelays: true,
            privateChatsOnly: true
        },
        security: {
            callBlocking: false,
            antispam: true,
            rateLimiting: true
        },
        utilities: {
            stickerMaker: true,
            passwordGenerator: true,
            urlShortener: true,
            imageConverter: true
        }
    },
    
    // Performance - V2.0 Optimizations
    performance: {
        memoryOptimized: true,
        cacheEnabled: true,
        compressionEnabled: true,
        metricsEnabled: true
    },
    
    // UI/UX - V2.0 Professional Design
    ui: {
        professionalFormatting: true,
        unicodeBorders: true,
        emojiEnhanced: true,
        structuredMessages: true,
        theme: 'professional'
    }
};

// Enhanced Settings management for CloudNextra WhatsApp Bot V2.0
const fs = require('fs');
const path = require('path');

class Settings {
    constructor() {
        this.settingsPath = path.join(__dirname, 'settings.json');
        this.defaultSettings = {
            // V2.0 Enhanced Default Settings
            autoRead: false,
            alwaysOffline: false,
            commandPrefix: '.',
            language: 'en',
            timezone: 'UTC',
            
            // V2.0 New Features
            autoReply: false,
            autoView: false,
            callBlocking: false,
            professionalUI: true,
            
            // Performance Settings
            enableMetrics: true,
            enableCaching: true,
            logLevel: 'info',
            
            // Security Settings
            rateLimiting: true,
            antispam: true,
            selfChatOnly: true,
            
            // Feature Flags
            features: {
                stickerMaker: true,
                passwordGenerator: true,
                urlShortener: true,
                imageConverter: true,
                controlPanel: true
            }
        };
        this.settings = this.loadSettings();
        this.version = '2.0.0';
    }

    loadSettings() {
        try {
            if (fs.existsSync(this.settingsPath)) {
                const data = fs.readFileSync(this.settingsPath, 'utf8');
                const loadedSettings = JSON.parse(data);
                
                // Merge with defaults to ensure all V2.0 features are present
                return { 
                    ...this.defaultSettings, 
                    ...loadedSettings,
                    features: {
                        ...this.defaultSettings.features,
                        ...(loadedSettings.features || {})
                    }
                };
            }
        } catch (error) {
            console.error('[SETTINGS V2.0] Error loading settings:', error);
        }
        return { ...this.defaultSettings };
    }

    saveSettings() {
        try {
            const settingsToSave = {
                ...this.settings,
                version: this.version,
                lastUpdated: new Date().toISOString(),
                bot: {
                    name: 'CloudNextra Bot V2.0',
                    version: this.version
                }
            };
            
            fs.writeFileSync(this.settingsPath, JSON.stringify(settingsToSave, null, 2));
            console.log('[SETTINGS V2.0] Settings saved successfully');
            return true;
        } catch (error) {
            console.error('[SETTINGS V2.0] Error saving settings:', error);
            return false;
        }
    }

    get(key) {
        // Support nested key access (e.g., 'features.stickerMaker')
        if (key.includes('.')) {
            return this.getNestedValue(this.settings, key);
        }
        return this.settings[key];
    }

    set(key, value) {
        // Support nested key setting
        if (key.includes('.')) {
            this.setNestedValue(this.settings, key, value);
        } else {
            this.settings[key] = value;
        }
        return this.saveSettings();
    }

    toggle(key) {
        const currentValue = this.get(key);
        if (typeof currentValue === 'boolean') {
            this.set(key, !currentValue);
            return this.get(key);
        }
        return false;
    }

    // V2.0 Enhanced Methods
    getFeature(featureName) {
        return this.get(`features.${featureName}`);
    }

    toggleFeature(featureName) {
        return this.toggle(`features.${featureName}`);
    }

    getVersion() {
        return this.version;
    }

    getStats() {
        return {
            version: this.version,
            totalSettings: Object.keys(this.settings).length,
            enabledFeatures: Object.values(this.settings.features || {}).filter(Boolean).length,
            lastUpdated: this.settings.lastUpdated || 'Never',
            configSize: JSON.stringify(this.settings).length
        };
    }

    reset() {
        this.settings = { ...this.defaultSettings };
        return this.saveSettings();
    }

    resetFeatures() {
        this.settings.features = { ...this.defaultSettings.features };
        return this.saveSettings();
    }

    // Helper methods for nested access
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current && current[key], obj);
    }

    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!current[key]) current[key] = {};
            return current[key];
        }, obj);
        target[lastKey] = value;
    }

    // V2.0 Migration method
    migrateFromV1() {
        console.log('[SETTINGS V2.0] Migrating from V1.0 settings...');
        
        // Add any V1 to V2 migration logic here
        const migrationComplete = this.saveSettings();
        
        if (migrationComplete) {
            console.log('[SETTINGS V2.0] Migration completed successfully');
        }
        
        return migrationComplete;
    }
}

module.exports = new Settings();
