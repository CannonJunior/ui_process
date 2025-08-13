/**
 * Centralized State Manager with observer pattern
 * Manages application state and notifies observers of changes
 */
export class StateManager {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.state = {};
        this.observers = new Map();
        
        // Create proxied state for automatic change detection
        this.state = new Proxy({}, {
            set: (target, prop, value) => {
                const oldValue = target[prop];
                target[prop] = value;
                this.notifyChange(prop, value, oldValue);
                return true;
            },
            deleteProperty: (target, prop) => {
                const oldValue = target[prop];
                delete target[prop];
                this.notifyChange(prop, undefined, oldValue);
                return true;
            }
        });
    }

    /**
     * Get state value
     * @param {string} path - State path (supports dot notation)
     * @returns {*} State value
     */
    get(path) {
        return this.getNestedValue(this.state, path);
    }

    /**
     * Set state value
     * @param {string} path - State path (supports dot notation)
     * @param {*} value - Value to set
     */
    set(path, value) {
        this.setNestedValue(this.state, path, value);
    }

    /**
     * Update state with partial object
     * @param {Object} updates - Object with updates
     */
    update(updates) {
        Object.entries(updates).forEach(([key, value]) => {
            this.set(key, value);
        });
    }

    /**
     * Subscribe to state changes
     * @param {string} path - State path to watch
     * @param {Function} callback - Callback function
     */
    subscribe(path, callback) {
        if (!this.observers.has(path)) {
            this.observers.set(path, []);
        }
        this.observers.get(path).push(callback);
    }

    /**
     * Unsubscribe from state changes
     * @param {string} path - State path
     * @param {Function} callback - Callback to remove
     */
    unsubscribe(path, callback) {
        if (this.observers.has(path)) {
            const callbacks = this.observers.get(path);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Get entire state (for debugging)
     */
    getState() {
        return JSON.parse(JSON.stringify(this.state));
    }

    /**
     * Reset state to initial values
     */
    reset() {
        Object.keys(this.state).forEach(key => {
            delete this.state[key];
        });
    }

    /**
     * Notify observers of state changes
     * @private
     */
    notifyChange(path, newValue, oldValue) {
        // Emit global state change event
        this.eventBus.emit('state.changed', { path, newValue, oldValue });

        // Notify specific path observers
        if (this.observers.has(path)) {
            this.observers.get(path).forEach(callback => {
                try {
                    callback(newValue, oldValue);
                } catch (error) {
                    console.error(`Error in state observer for '${path}':`, error);
                }
            });
        }
    }

    /**
     * Get nested value using dot notation
     * @private
     */
    getNestedValue(obj, path) {
        if (typeof path !== 'string') return obj[path];
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    /**
     * Set nested value using dot notation
     * @private
     */
    setNestedValue(obj, path, value) {
        if (typeof path !== 'string') {
            obj[path] = value;
            return;
        }

        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            return current[key];
        }, obj);
        
        target[lastKey] = value;
    }
}