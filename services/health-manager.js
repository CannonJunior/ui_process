/**
 * Service Health Manager
 * Manages service health indicators in the toolbar
 */

class ServiceHealthManager {
    constructor() {
        this.services = {
            mcp: {
                element: null,
                dot: null,
                status: 'offline',
                client: null
            },
            ollama: {
                element: null,
                dot: null,
                status: 'offline',
                client: null
            }
        };
        
        this.init();
    }

    init() {
        // Get DOM elements
        this.services.mcp.element = document.getElementById('mcpHealthIndicator');
        this.services.mcp.dot = this.services.mcp.element?.querySelector('.health-dot');
        
        this.services.ollama.element = document.getElementById('ollamaHealthIndicator');
        this.services.ollama.dot = this.services.ollama.element?.querySelector('.health-dot');
        
        // Add click handlers for more details
        if (this.services.mcp.element) {
            this.services.mcp.element.addEventListener('click', () => this.showMCPStatus());
        }
        
        if (this.services.ollama.element) {
            this.services.ollama.element.addEventListener('click', () => this.showOllamaStatus());
        }
        
        console.log('ServiceHealthManager initialized');
    }

    setMCPClient(mcpClient) {
        this.services.mcp.client = mcpClient;
        this.startMCPMonitoring();
    }

    setOllamaClient(chatInterface) {
        this.services.ollama.client = chatInterface;
        this.startOllamaMonitoring();
    }

    updateServiceStatus(service, status) {
        if (!this.services[service] || !this.services[service].dot) return;
        
        const dot = this.services[service].dot;
        const element = this.services[service].element;
        
        // Remove all status classes
        dot.classList.remove('online', 'offline', 'connecting');
        
        // Add new status class
        dot.classList.add(status);
        
        // Update tooltip
        const serviceNames = {
            mcp: 'MCP Services',
            ollama: 'Ollama AI'
        };
        
        const statusText = {
            online: 'Connected',
            offline: 'Disconnected',
            connecting: 'Connecting...'
        };
        
        element.title = `${serviceNames[service]}: ${statusText[status]}`;
        
        this.services[service].status = status;
        
        console.log(`Health: ${service} → ${status}`);
    }

    startMCPMonitoring() {
        // Initial check
        this.checkMCPHealth();
        
        // Monitor every 30 seconds
        setInterval(() => {
            this.checkMCPHealth();
        }, 30000);
    }

    startOllamaMonitoring() {
        // Initial check
        this.checkOllamaHealth();
        
        // Monitor every 30 seconds
        setInterval(() => {
            this.checkOllamaHealth();
        }, 30000);
    }

    async checkMCPHealth() {
        if (!this.services.mcp.client) {
            this.updateServiceStatus('mcp', 'offline');
            return;
        }

        try {
            this.updateServiceStatus('mcp', 'connecting');
            const health = await this.services.mcp.client.healthCheck();
            
            if (health.service_available) {
                this.updateServiceStatus('mcp', 'online');
            } else {
                this.updateServiceStatus('mcp', 'offline');
            }
        } catch (error) {
            this.updateServiceStatus('mcp', 'offline');
        }
    }

    checkOllamaHealth() {
        if (!this.services.ollama.client) {
            this.updateServiceStatus('ollama', 'offline');
            return;
        }

        const isConnected = this.services.ollama.client.isConnected;
        this.updateServiceStatus('ollama', isConnected ? 'online' : 'offline');
    }

    showMCPStatus() {
        const status = this.services.mcp.status;
        let message = '';
        
        switch (status) {
            case 'online':
                message = '✅ MCP Services: Connected\n\nWorkflow commands and note-taking features are available.';
                break;
            case 'connecting':
                message = '🔄 MCP Services: Connecting...\n\nPlease wait while we establish connection.';
                break;
            case 'offline':
                message = '❌ MCP Services: Disconnected\n\nWorkflow commands are not available.\n\nTo fix:\n1. Run "npm run mcp" in terminal\n2. Refresh the page';
                break;
        }
        
        alert(message);
    }

    showOllamaStatus() {
        const status = this.services.ollama.status;
        let message = '';
        
        switch (status) {
            case 'online':
                message = '✅ Ollama AI: Connected\n\nChat assistant is available for process flow help.';
                break;
            case 'offline':
                message = '❌ Ollama AI: Disconnected\n\nChat assistant is not available.\n\nTo fix:\n1. Install Ollama from https://ollama.ai\n2. Run "ollama serve" in terminal\n3. Pull a model: "ollama pull qwen2.5:3b"\n4. Refresh the page';
                break;
        }
        
        alert(message);
    }

    // Method to get overall health status
    getOverallHealth() {
        const mcpHealth = this.services.mcp.status;
        const ollamaHealth = this.services.ollama.status;
        
        return {
            mcp: mcpHealth,
            ollama: ollamaHealth,
            overall: (mcpHealth === 'online' || ollamaHealth === 'online') ? 'partial' : 'offline'
        };
    }

    // Method for chat interface to report command processing issues
    reportCommandIssue(command, issue) {
        console.warn(`Health Manager: Command issue reported - ${command}: ${issue}`);
        
        // If workflow command failed and MCP shows online, there might be a parsing issue
        if (command.startsWith('/') && this.services.mcp.status === 'online') {
            // Force a health check
            this.checkMCPHealth();
        }
    }
}

// Export for use in other modules
window.ServiceHealthManager = ServiceHealthManager;