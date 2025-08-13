/**
 * Event Bus for inter-module communication
 * Provides publish-subscribe pattern for loose coupling between modules
 */
export class EventBus {
    constructor() {
        this.events = {};
        this.onceEvents = {};
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    /**
     * Subscribe to an event that fires only once
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    once(event, callback) {
        if (!this.onceEvents[event]) {
            this.onceEvents[event] = [];
        }
        this.onceEvents[event].push(callback);
    }

    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function to remove
     */
    off(event, callback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    }

    /**
     * Emit an event to all subscribers
     * @param {string} event - Event name
     * @param {*} data - Data to pass to callbacks
     */
    emit(event, data = null) {
        // Handle regular events
        if (this.events[event]) {
            this.events[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event handler for '${event}':`, error);
                }
            });
        }

        // Handle once events
        if (this.onceEvents[event]) {
            this.onceEvents[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in once event handler for '${event}':`, error);
                }
            });
            delete this.onceEvents[event];
        }
    }

    /**
     * Clear all event listeners
     */
    clear() {
        this.events = {};
        this.onceEvents = {};
    }

    /**
     * Get list of events with subscriber counts
     */
    getEventStats() {
        const stats = {};
        for (const [event, callbacks] of Object.entries(this.events)) {
            stats[event] = callbacks.length;
        }
        return stats;
    }
}