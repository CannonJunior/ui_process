/**
 * Memory Monitor - Track and cleanup memory usage
 */
class MemoryMonitor {
    constructor() {
        this.cleanupInterval = null;
        this.warningThreshold = 0.85; // 85% of heap limit
        this.criticalThreshold = 0.95; // 95% of heap limit
    }

    startMonitoring(intervalMs = 30000) {
        this.cleanupInterval = setInterval(() => {
            this.checkMemoryUsage();
        }, intervalMs);
        
        console.log('Memory monitoring started');
    }

    stopMonitoring() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }

    checkMemoryUsage() {
        const usage = process.memoryUsage();
        const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
        const usageRatio = usage.heapUsed / usage.heapTotal;

        if (usageRatio > this.criticalThreshold) {
            console.warn(`CRITICAL: Memory usage at ${Math.round(usageRatio * 100)}% (${heapUsedMB}MB/${heapTotalMB}MB)`);
            this.forceGarbageCollection();
        } else if (usageRatio > this.warningThreshold) {
            console.warn(`WARNING: Memory usage at ${Math.round(usageRatio * 100)}% (${heapUsedMB}MB/${heapTotalMB}MB)`);
        }

        return { heapUsedMB, heapTotalMB, usageRatio };
    }

    forceGarbageCollection() {
        if (global.gc) {
            global.gc();
            console.log('Forced garbage collection');
        } else {
            console.warn('Garbage collection not available. Start with --expose-gc flag.');
        }
    }

    getMemoryStats() {
        const usage = process.memoryUsage();
        return {
            heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
            external: Math.round(usage.external / 1024 / 1024),
            rss: Math.round(usage.rss / 1024 / 1024)
        };
    }
}

module.exports = MemoryMonitor;