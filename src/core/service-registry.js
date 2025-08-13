/**
 * Service Registry - Simple service locator pattern
 * Manages service registration and dependency resolution
 */
export class ServiceRegistry {
    constructor() {
        this.services = new Map();
        this.factories = new Map();
        this.singletons = new Map();
        this.initializing = new Set();
    }

    /**
     * Register a service factory
     * @param {string} name - Service name
     * @param {Function} factory - Factory function
     * @param {boolean} singleton - Whether service should be singleton
     */
    register(name, factory, singleton = true) {
        this.factories.set(name, { factory, singleton });
    }

    /**
     * Register a service instance
     * @param {string} name - Service name
     * @param {*} instance - Service instance
     */
    registerInstance(name, instance) {
        this.services.set(name, instance);
    }

    /**
     * Resolve a service by name
     * @param {string} name - Service name
     * @returns {*} Service instance
     */
    resolve(name) {
        // Return existing instance if available
        if (this.services.has(name)) {
            return this.services.get(name);
        }

        // Check for singleton instance
        if (this.singletons.has(name)) {
            return this.singletons.get(name);
        }

        // Prevent circular dependencies
        if (this.initializing.has(name)) {
            throw new Error(`Circular dependency detected for service: ${name}`);
        }

        // Resolve from factory
        const serviceConfig = this.factories.get(name);
        if (!serviceConfig) {
            throw new Error(`Service not registered: ${name}`);
        }

        try {
            this.initializing.add(name);
            const instance = serviceConfig.factory(this);
            
            if (serviceConfig.singleton) {
                this.singletons.set(name, instance);
            }

            this.initializing.delete(name);
            return instance;
        } catch (error) {
            this.initializing.delete(name);
            throw new Error(`Failed to resolve service '${name}': ${error.message}`);
        }
    }

    /**
     * Check if service is registered
     * @param {string} name - Service name
     * @returns {boolean}
     */
    has(name) {
        return this.services.has(name) || 
               this.singletons.has(name) || 
               this.factories.has(name);
    }

    /**
     * Get all registered service names
     * @returns {string[]}
     */
    getServiceNames() {
        const names = new Set();
        this.services.forEach((_, name) => names.add(name));
        this.singletons.forEach((_, name) => names.add(name));
        this.factories.forEach((_, name) => names.add(name));
        return Array.from(names);
    }

    /**
     * Clear all services
     */
    clear() {
        this.services.clear();
        this.factories.clear();
        this.singletons.clear();
        this.initializing.clear();
    }
}