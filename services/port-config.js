/**
 * Port Configuration
 * Centralized port definitions for all services
 */

class PortConfig {
    static get PORTS() {
        // Check if we're in Node.js or browser environment
        const isNode = typeof process !== 'undefined' && process.env;
        
        return {
            // Main application server
            APP_SERVER: isNode ? (process.env.PORT || 8000) : 8000,
            
            // PostgreSQL API server (workflows, tasks, KG data)
            DATABASE_API: isNode ? (process.env.API_PORT || 3002) : 3002,
            
            // MCP service (chat commands, note-taking)
            MCP_SERVICE: isNode ? (process.env.MCP_PORT || 3001) : 3001,
            
            // Ollama AI service (external)
            OLLAMA_AI: isNode ? (process.env.OLLAMA_PORT || 11434) : 11434
        };
    }
    
    static get BASE_URLS() {
        return {
            APP_SERVER: `http://localhost:${this.PORTS.APP_SERVER}`,
            DATABASE_API: `http://localhost:${this.PORTS.DATABASE_API}`,
            MCP_SERVICE: `http://localhost:${this.PORTS.MCP_SERVICE}`,
            OLLAMA_AI: `http://localhost:${this.PORTS.OLLAMA_AI}`
        };
    }
    
    static getDatabaseApiUrl() {
        return this.BASE_URLS.DATABASE_API;
    }
    
    static getMcpServiceUrl() {
        return this.BASE_URLS.MCP_SERVICE;
    }
    
    static getOllamaUrl() {
        return this.BASE_URLS.OLLAMA_AI;
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PortConfig;
} else {
    window.PortConfig = PortConfig;
}