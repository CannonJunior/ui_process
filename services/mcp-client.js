/**
 * MCP Client - Browser HTTP client for communicating with MCP service
 * Handles all communication between the browser chat interface and the Node.js MCP service
 */

class MCPClient {
    constructor(baseUrl = null) {
        this.baseUrl = baseUrl || (typeof PortConfig !== 'undefined' ? PortConfig.getMcpServiceUrl() : 'http://localhost:3002');
        this.isConnected = false;
        this.connectionCheckInterval = null;
        this.retryAttempts = 0;
        this.maxRetries = 3;
        this.retryDelay = 2000; // 2 seconds
        
        // Initialize connection check
        this.checkConnection();
        this.startConnectionMonitoring();
    }

    async checkConnection() {
        try {
            console.log(`Checking MCP connection to: ${this.baseUrl}/health`);
            const response = await fetch(`${this.baseUrl}/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log(`Response status: ${response.status}, ok: ${response.ok}`);
            
            if (response.ok) {
                this.isConnected = true;
                this.retryAttempts = 0;
                const status = await response.json();
                console.log('MCP Service connected:', status);
                return true;
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            this.isConnected = false;
            console.warn('MCP Service not available:', error.message);
            console.warn('Error details:', error);
            return false;
        }
    }

    startConnectionMonitoring() {
        // Check connection every 30 seconds
        this.connectionCheckInterval = setInterval(() => {
            this.checkConnection();
        }, 30000);
    }

    stopConnectionMonitoring() {
        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
            this.connectionCheckInterval = null;
        }
    }

    async makeRequest(endpoint, data = null, method = 'POST') {
        if (!this.isConnected) {
            // Try to reconnect
            const reconnected = await this.checkConnection();
            if (!reconnected) {
                throw new Error('MCP Service not available. Please start the MCP service with: npm run mcp');
            }
        }

        try {
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            if (data && method !== 'GET') {
                options.body = JSON.stringify(data);
            }

            const response = await fetch(`${this.baseUrl}${endpoint}`, options);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            // Handle network errors
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                this.isConnected = false;
                throw new Error('MCP Service connection lost. Please check if the service is running.');
            }
            throw error;
        }
    }

    async parseMessage(message) {
        try {
            // Preprocess message to handle quote escaping issues
            const processedMessage = this.preprocessCommandMessage(message);
            const result = await this.makeRequest('/api/mcp/parse-message', { message: processedMessage });
            return result;
        } catch (error) {
            console.error('Error parsing message:', error);
            return {
                is_command: false,
                type: 'error',
                error: error.message,
                should_process_with_llm: true
            };
        }
    }

    async executeNoteCommand(commandData) {
        try {
            const result = await this.makeRequest('/api/mcp/execute-command', { commandData });
            return result;
        } catch (error) {
            console.error('Error executing command:', error);
            return {
                status: 'error',
                error: error.message
            };
        }
    }

    async getCommandSuggestions(partialInput) {
        try {
            const result = await this.makeRequest('/api/mcp/suggest-commands', { partialInput });
            return result;
        } catch (error) {
            console.error('Error getting suggestions:', error);
            return { suggestions: [] };
        }
    }

    async analyzeContextForCommands(text, conversationHistory = []) {
        try {
            const result = await this.makeRequest('/api/mcp/analyze-context', { 
                text, 
                conversationHistory 
            });
            return result;
        } catch (error) {
            console.error('Error analyzing context:', error);
            return { entities: [], intent: 'unknown' };
        }
    }

    async getStatus() {
        try {
            const result = await this.makeRequest('/api/mcp/status', null, 'GET');
            return result;
        } catch (error) {
            console.error('Error getting status:', error);
            return {
                initialized: false,
                error: error.message
            };
        }
    }

    async initializeNb() {
        try {
            const result = await this.makeRequest('/api/mcp/init-nb');
            return result;
        } catch (error) {
            console.error('Error initializing nb:', error);
            return {
                status: 'error',
                error: error.message
            };
        }
    }

    async executeCLICommand(command, options = {}) {
        try {
            const result = await this.makeRequest('/api/mcp/execute-cli', { command, options });
            return result;
        } catch (error) {
            console.error('Error executing CLI command:', error);
            return {
                status: 'error',
                error: error.message
            };
        }
    }

    async parseWorkflowCommand(message) {
        try {
            // Preprocess message to handle quote escaping issues
            const processedMessage = this.preprocessCommandMessage(message);
            const result = await this.makeRequest('/api/mcp/parse-workflow-command', { message: processedMessage });
            return result;
        } catch (error) {
            console.error('Error parsing workflow command:', error);
            return {
                is_workflow_command: false,
                type: 'error',
                error: error.message,
                should_process_with_llm: true
            };
        }
    }

    async executeWorkflowCommand(commandData) {
        try {
            const result = await this.makeRequest('/api/mcp/execute-workflow-command', { commandData });
            return result;
        } catch (error) {
            console.error('Error executing workflow command:', error);
            return {
                status: 'error',
                error: error.message
            };
        }
    }

    async getWorkflowHelp(command = null) {
        try {
            const result = await this.makeRequest('/api/mcp/workflow-help', { command });
            return result;
        } catch (error) {
            console.error('Error getting workflow help:', error);
            return {
                type: 'error',
                error: error.message
            };
        }
    }

    // Utility method to retry failed operations
    async withRetry(operation, maxRetries = this.maxRetries) {
        let lastError;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                
                if (attempt < maxRetries) {
                    console.warn(`Attempt ${attempt + 1} failed, retrying in ${this.retryDelay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                    
                    // Try to reconnect before retry
                    await this.checkConnection();
                } else {
                    console.error('All retry attempts failed');
                }
            }
        }
        
        throw lastError;
    }

    // Health check with detailed information
    async healthCheck() {
        try {
            const health = await this.makeRequest('/health', null, 'GET');
            const status = await this.getStatus();
            
            return {
                service_available: true,
                service_status: health,
                mcp_status: status,
                connection_stable: this.isConnected
            };
        } catch (error) {
            return {
                service_available: false,
                error: error.message,
                connection_stable: false
            };
        }
    }

    // Preprocess command messages to handle quote escaping issues
    preprocessCommandMessage(message) {
        if (!message || !message.startsWith('/')) {
            return message;
        }

        // Handle common quote patterns that cause JSON parsing issues
        // Convert quoted parameters to unquoted ones for better compatibility
        
        // Pattern for /command "quoted content"
        const quotedPattern = /^(\/[\w-]+(?:\s+\w+)*)\s+"([^"]+)"(.*)$/;
        if (quotedPattern.test(message)) {
            return message.replace(quotedPattern, (match, command, content, rest) => {
                // Remove spaces and special characters from content to make it safe as unquoted
                const safeContent = content.replace(/\s+/g, '_').replace(/[^\w-_]/g, '');
                return `${command} ${safeContent}${rest}`;
            });
        }

        // Pattern for /command type "quoted content"
        const typeQuotedPattern = /^(\/[\w-]+\s+\w+)\s+"([^"]+)"(.*)$/;
        if (typeQuotedPattern.test(message)) {
            return message.replace(typeQuotedPattern, (match, commandType, content, rest) => {
                // Remove spaces and special characters from content to make it safe as unquoted
                const safeContent = content.replace(/\s+/g, '_').replace(/[^\w-_]/g, '');
                return `${commandType} ${safeContent}${rest}`;
            });
        }

        return message;
    }

    // Graceful shutdown
    destroy() {
        this.stopConnectionMonitoring();
        this.isConnected = false;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MCPClient;
} else {
    // Browser environment
    window.MCPClient = MCPClient;
}