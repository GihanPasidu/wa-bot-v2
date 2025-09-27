/**
 * CloudNextra WhatsApp Bot V2.0 - Keep-Alive Service
 * Enhanced keep-alive service with improved monitoring and error handling
 */
class KeepAliveService {
    constructor(options = {}) {
        this.version = '2.0.0';
        this.url = options.url || process.env.RENDER_EXTERNAL_URL || process.env.RENDER_URL;
        this.interval = options.interval || 10; // minutes
        this.endpoints = options.endpoints || ['/health', '/ping', '/wake'];
        this.userAgent = `CloudNextra-Bot-V2.0-KeepAlive/${this.version}`;
        this.timeout = options.timeout || 30000; // 30 seconds
        this.intervalId = null;
        this.retryAttempts = options.retryAttempts || 3;
        this.retryDelay = options.retryDelay || 5000; // 5 seconds
        
        // Enhanced V2.0 Statistics
        this.stats = {
            version: this.version,
            totalPings: 0,
            successfulPings: 0,
            failedPings: 0,
            consecutiveFailures: 0,
            lastPingTime: null,
            lastSuccessTime: null,
            lastFailureTime: null,
            averageResponseTime: 0,
            uptime: Date.now(),
            errors: [],
            endpoints: this.endpoints
        };

        // V2.0 Performance Tracking
        this.responseTimes = [];
        this.maxResponseTimeHistory = 100;
        
        console.log(`[KEEP-ALIVE V2.0] 🚀 Initialized CloudNextra Keep-Alive Service`);
    }

    // V2.0 Enhanced ping with retry logic and better error handling
    async ping(retryCount = 0) {
        if (!this.url) {
            console.log('[KEEP-ALIVE V2.0] ⚠️  No URL configured, skipping ping');
            return false;
        }

        const endpoint = this.endpoints[Math.floor(Math.random() * this.endpoints.length)];
        const targetUrl = `${this.url}${endpoint}`;
        const startTime = Date.now();
        
        this.stats.totalPings++;
        this.stats.lastPingTime = new Date().toISOString();

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
            
            const response = await fetch(targetUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': this.userAgent,
                    'X-Keep-Alive': 'true',
                    'X-Bot-Version': this.version,
                    'Cache-Control': 'no-cache'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            const responseTime = Date.now() - startTime;
            
            // Track response times for V2.0 analytics
            this.responseTimes.push(responseTime);
            if (this.responseTimes.length > this.maxResponseTimeHistory) {
                this.responseTimes.shift();
            }
            
            // Calculate average response time
            this.stats.averageResponseTime = Math.round(
                this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
            );

            if (response.ok) {
                this.stats.successfulPings++;
                this.stats.lastSuccessTime = new Date().toISOString();
                this.stats.consecutiveFailures = 0;
                
                console.log(`[KEEP-ALIVE V2.0] ✅ Ping successful: ${targetUrl} (${responseTime}ms)`);
                return true;
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
        } catch (error) {
            const responseTime = Date.now() - startTime;
            this.stats.failedPings++;
            this.stats.consecutiveFailures++;
            this.stats.lastFailureTime = new Date().toISOString();
            
            // Store error details for V2.0 diagnostics
            this.stats.errors.push({
                timestamp: new Date().toISOString(),
                error: error.message,
                endpoint: targetUrl,
                responseTime: responseTime,
                retryAttempt: retryCount
            });
            
            // Keep only last 10 errors
            if (this.stats.errors.length > 10) {
                this.stats.errors.shift();
            }
            
            console.error(`[KEEP-ALIVE V2.0] ❌ Ping failed (attempt ${retryCount + 1}/${this.retryAttempts + 1}): ${targetUrl}`, {
                error: error.message,
                responseTime: responseTime,
                consecutiveFailures: this.stats.consecutiveFailures
            });
            
            // V2.0 Retry Logic
            if (retryCount < this.retryAttempts) {
                console.log(`[KEEP-ALIVE V2.0] 🔄 Retrying in ${this.retryDelay}ms...`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                return this.ping(retryCount + 1);
            }
            
            return false;
        }
    }

    
    // V2.0 Enhanced start method with better initialization
    start() {
        if (!this.url) {
            console.log('[KEEP-ALIVE V2.0] ⚠️  Keep-alive disabled: No URL configured');
            return false;
        }

        // Schedule pings every N minutes using setInterval
        const intervalMs = this.interval * 60 * 1000; // Convert minutes to milliseconds
        this.intervalId = setInterval(() => {
            this.ping().catch(error => {
                console.error('[KEEP-ALIVE V2.0] Unhandled ping error:', error);
            });
        }, intervalMs);

        // Initial ping after 1 minute (V2.0 enhanced)
        setTimeout(() => {
            this.ping().catch(error => {
                console.error('[KEEP-ALIVE V2.0] Initial ping error:', error);
            });
        }, 60000);

        console.log(`[KEEP-ALIVE V2.0] 🚀 CloudNextra Keep-Alive Service started`);
        console.log(`[KEEP-ALIVE V2.0] ⚡ Version: ${this.version}`);
        console.log(`[KEEP-ALIVE V2.0] 🕒 Interval: ${this.interval} minutes`);
        console.log(`[KEEP-ALIVE V2.0] 🎯 Target URL: ${this.url}`);
        console.log(`[KEEP-ALIVE V2.0] 📡 Endpoints: ${this.endpoints.join(', ')}`);
        console.log(`[KEEP-ALIVE V2.0] 🔄 Retry attempts: ${this.retryAttempts}`);
        
        return true;
    }

    // V2.0 Enhanced stop method
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('[KEEP-ALIVE V2.0] 🛑 Keep-alive service stopped gracefully');
        }
    }

    // V2.0 Enhanced statistics with more detailed information
    getStats() {
        const uptime = Date.now() - this.stats.uptime;
        const uptimeHours = Math.floor(uptime / (1000 * 60 * 60));
        const uptimeMinutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
        
        return {
            version: this.version,
            ...this.stats,
            successRate: this.stats.totalPings > 0 
                ? Math.round((this.stats.successfulPings / this.stats.totalPings) * 100) 
                : 0,
            failureRate: this.stats.totalPings > 0 
                ? Math.round((this.stats.failedPings / this.stats.totalPings) * 100) 
                : 0,
            isActive: !!this.intervalId,
            url: this.url,
            interval: this.interval,
            retryAttempts: this.retryAttempts,
            uptime: {
                ms: uptime,
                hours: uptimeHours,
                minutes: uptimeMinutes,
                formatted: `${uptimeHours}h ${uptimeMinutes}m`
            },
            health: {
                status: this.stats.consecutiveFailures > 5 ? 'unhealthy' : 'healthy',
                consecutiveFailures: this.stats.consecutiveFailures,
                lastError: this.stats.errors[this.stats.errors.length - 1] || null
            }
        };
    }

    // V2.0 Enhanced stats endpoint with better formatting
    getStatsEndpoint() {
        return (req, res) => {
            const stats = this.getStats();
            res.json({
                service: 'CloudNextra Keep-Alive V2.0',
                timestamp: new Date().toISOString(),
                ...stats
            });
        };
    }

    // V2.0 New method: Get health status
    getHealthStatus() {
        const stats = this.getStats();
        return {
            status: stats.health.status,
            consecutiveFailures: stats.consecutiveFailures,
            successRate: stats.successRate,
            isActive: stats.isActive
        };
    }

    // V2.0 New method: Reset statistics
    resetStats() {
        this.stats = {
            version: this.version,
            totalPings: 0,
            successfulPings: 0,
            failedPings: 0,
            consecutiveFailures: 0,
            lastPingTime: null,
            lastSuccessTime: null,
            lastFailureTime: null,
            averageResponseTime: 0,
            uptime: Date.now(),
            errors: [],
            endpoints: this.endpoints
        };
        this.responseTimes = [];
        console.log('[KEEP-ALIVE V2.0] 📊 Statistics reset successfully');
    }
}

module.exports = KeepAliveService;
