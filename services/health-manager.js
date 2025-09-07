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
                client: null,
                models: [],
                selectedModel: 'qwen2.5:3b',
                baseUrl: 'http://localhost:11434'
            },
            api: {
                element: null,
                dot: null,
                status: 'offline',
                baseUrl: 'http://localhost:3001'
            },
            data: {
                element: null,
                dot: null,
                status: 'offline',
                baseUrl: 'http://localhost:3002'
            }
        };
        
        this.modelSelector = null;
        
        this.init();
    }

    init() {
        // Get DOM elements
        this.services.mcp.element = document.getElementById('mcpHealthIndicator');
        this.services.mcp.dot = this.services.mcp.element?.querySelector('.health-dot');
        
        this.services.ollama.element = document.getElementById('ollamaHealthIndicator');
        this.services.ollama.dot = this.services.ollama.element?.querySelector('.health-dot');
        
        this.services.api.element = document.getElementById('apiHealthIndicator');
        this.services.api.dot = this.services.api.element?.querySelector('.health-dot');
        
        this.services.data.element = document.getElementById('dataHealthIndicator');
        this.services.data.dot = this.services.data.element?.querySelector('.health-dot');
        
        // Add click handlers for more details
        if (this.services.mcp.element) {
            this.services.mcp.element.addEventListener('click', () => this.showMCPStatus());
        }
        
        if (this.services.ollama.element) {
            this.services.ollama.element.addEventListener('click', () => this.showOllamaModels());
        }
        
        if (this.services.api.element) {
            this.services.api.element.addEventListener('click', () => this.showApiStatus());
        }
        
        if (this.services.data.element) {
            this.services.data.element.addEventListener('click', () => this.showDataStatus());
        }
        
        // Create model selector interface
        this.createModelSelector();
        
        // Load saved model preference
        this.loadModelPreference();
        
        // Start API and Data health monitoring
        this.startApiHealthMonitoring();
        this.startDataHealthMonitoring();
        
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
        
        // console.log(`Health: ${service} → ${status}`);
    }

    startMCPMonitoring() {
        // Initial check
        this.checkMCPHealth();
        
        // Monitor at configured interval (default 10 seconds)
        const mcpHealthInterval = window.AppConfig?.healthCheck?.mcpHealthInterval || 10000;
        setInterval(() => {
            this.checkMCPHealth();
        }, mcpHealthInterval);
    }

    startOllamaMonitoring() {
        // Initial check
        this.checkOllamaHealth();
        
        // Monitor at configured interval (default 10 seconds)
        const ollamaHealthInterval = window.AppConfig?.healthCheck?.ollamaHealthInterval || 10000;
        setInterval(() => {
            this.checkOllamaHealth();
        }, ollamaHealthInterval);
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

    async checkOllamaHealth() {
        try {
            this.updateServiceStatus('ollama', 'connecting');
            
            // Check Ollama server and detect models
            const response = await fetch(`${this.services.ollama.baseUrl}/api/tags`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.services.ollama.models = data.models || [];
                
                if (this.services.ollama.models.length > 0) {
                    this.updateServiceStatus('ollama', 'online');
                    this.updateModelSelector();
                    
                    // Update health indicator with model count
                    const element = this.services.ollama.element;
                    if (element) {
                        element.title = `Ollama AI: ${this.services.ollama.models.length} models available`;
                        
                        // Update status text to show model count
                        const statusSpan = element.querySelector('.health-status');
                        if (statusSpan) {
                            statusSpan.textContent = `AI (${this.services.ollama.models.length})`;
                        }
                    }
                } else {
                    this.updateServiceStatus('ollama', 'offline');
                    this.updateOllamaTooltip('No models available');
                }
            } else {
                throw new Error('Ollama server not responding');
            }
        } catch (error) {
            this.services.ollama.models = [];
            this.updateServiceStatus('ollama', 'offline');
            this.updateOllamaTooltip('Ollama server not running');
        }
    }

    createModelSelector() {
        // Create model selector dropdown if it doesn't exist
        let selector = document.getElementById('ollamaModelSelector');
        if (!selector) {
            selector = document.createElement('select');
            selector.id = 'ollamaModelSelector';
            selector.className = 'model-selector';
            selector.style.cssText = `
                position: fixed;
                top: 60px;
                right: 20px;
                background: #24252c;
                border: 2px solid #575969;
                border-radius: 4px;
                color: #a3a7ad;
                font-family: 'IBM Plex Mono', monospace;
                font-size: 11px;
                padding: 4px 8px;
                min-width: 150px;
                z-index: 9999;
                display: none;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            `;
            
            // Add default option
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Loading models...';
            selector.appendChild(defaultOption);
            
            // Add to document body (using fixed positioning)
            document.body.appendChild(selector);
            
            // Handle model selection
            selector.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.selectModel(e.target.value);
                }
            });
        }
        
        this.modelSelector = selector;
    }

    updateModelSelector() {
        if (!this.modelSelector) return;
        
        // Clear existing options
        this.modelSelector.innerHTML = '';
        
        if (this.services.ollama.models.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No models available';
            this.modelSelector.appendChild(option);
            return;
        }
        
        // Add available models
        this.services.ollama.models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.name;
            option.textContent = `${model.name} (${this.formatSize(model.size)})`;
            
            // Mark as selected if it matches current selection
            if (model.name === this.services.ollama.selectedModel) {
                option.selected = true;
            }
            
            this.modelSelector.appendChild(option);
        });
        
        // Auto-select first model if none selected
        if (!this.services.ollama.selectedModel && this.services.ollama.models.length > 0) {
            this.services.ollama.selectedModel = this.services.ollama.models[0].name;
            this.modelSelector.value = this.services.ollama.selectedModel;
        }
    }

    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    selectModel(modelName) {
        this.services.ollama.selectedModel = modelName;
        console.log('Selected Ollama model:', modelName);
        
        // Hide selector
        if (this.modelSelector) {
            this.modelSelector.style.display = 'none';
        }
        
        // Update chat interface if available
        if (this.services.ollama.client && this.services.ollama.client.setModel) {
            this.services.ollama.client.setModel(modelName);
        }
        
        // Update status displays
        this.updateChatConnectionStatus();
        
        // Store preference
        localStorage.setItem('selectedOllamaModel', modelName);
        
        // Show confirmation
        this.showModelSelectionConfirmation(modelName);
    }

    updateChatConnectionStatus() {
        const statusText = document.getElementById('statusText');
        if (statusText && this.services.ollama.selectedModel) {
            const modelShortName = this.services.ollama.selectedModel.split(':')[0];
            statusText.textContent = `Connected to ${modelShortName}`;
        }
    }

    updateOllamaTooltip(message) {
        const element = this.services.ollama.element;
        if (element) {
            element.title = `Ollama AI: ${message}`;
        }
    }

    showModelSelectionConfirmation(modelName) {
        // Create temporary notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 60px;
            right: 20px;
            background: rgba(36, 37, 44, 0.95);
            border: 2px solid #76b3fa;
            border-radius: 6px;
            padding: 12px;
            color: #a3a7ad;
            font-family: 'IBM Plex Mono', monospace;
            font-size: 12px;
            z-index: 10000;
            animation: slideInRight 0.3s ease-out;
        `;
        notification.innerHTML = `
            <div style="color: #76b3fa; font-weight: bold; margin-bottom: 4px;">🤖 Model Selected</div>
            <div>${modelName}</div>
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showOllamaModels() {
        const models = this.services.ollama.models;
        const status = this.services.ollama.status;
        
        if (status === 'offline') {
            const message = '❌ Ollama AI: Disconnected\n\nTo fix:\n1. Install Ollama from https://ollama.ai\n2. Run "ollama serve" in terminal\n3. Pull a model: "ollama pull qwen2.5:3b"\n4. Refresh the page';
            alert(message);
            return;
        }
        
        if (models.length === 0) {
            const message = '⚠️ Ollama AI: No Models Available\n\nTo install models:\n1. ollama pull qwen2.5:3b\n2. ollama pull llama3.2:3b\n3. ollama pull smollm2:135m\n4. Refresh the page';
            alert(message);
            return;
        }
        
        // Show/hide model selector
        if (this.modelSelector) {
            const isVisible = this.modelSelector.style.display === 'block';
            this.modelSelector.style.display = isVisible ? 'none' : 'block';
            
            if (!isVisible) {
                // Auto-hide after 5 seconds
                setTimeout(() => {
                    if (this.modelSelector) {
                        this.modelSelector.style.display = 'none';
                    }
                }, 5000);
            }
        }
    }

    // Load saved model preference
    loadModelPreference() {
        const saved = localStorage.getItem('selectedOllamaModel');
        if (saved) {
            this.services.ollama.selectedModel = saved;
        }
    }

    // Get current selected model
    getSelectedModel() {
        return this.services.ollama.selectedModel;
    }

    // Get available models
    getAvailableModels() {
        return this.services.ollama.models;
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

    startApiHealthMonitoring() {
        // Initial check
        this.checkApiHealth();
        
        // Monitor at configured interval (default 10 seconds)
        const apiHealthInterval = window.AppConfig?.healthCheck?.apiHealthInterval || 10000;
        setInterval(() => {
            this.checkApiHealth();
        }, apiHealthInterval);
    }

    startDataHealthMonitoring() {
        // Initial check
        this.checkDataHealth();
        
        // Monitor at configured interval (default 10 seconds)
        const dataHealthInterval = window.AppConfig?.healthCheck?.dataHealthInterval || 10000;
        setInterval(() => {
            this.checkDataHealth();
        }, dataHealthInterval);
    }

    async checkApiHealth() {
        try {
            this.updateServiceStatus('api', 'connecting');
            
            // Check API health endpoint
            const response = await fetch(`${this.services.api.baseUrl}/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.updateServiceStatus('api', 'online');
                
                // Update health indicator with additional info
                const element = this.services.api.element;
                if (element) {
                    element.title = `API Server: ${data.status} (${data.version || 'Unknown version'})`;
                }
            } else {
                throw new Error('API server not responding');
            }
        } catch (error) {
            this.updateServiceStatus('api', 'offline');
            
            // Update tooltip with error info
            const element = this.services.api.element;
            if (element) {
                element.title = `API Server: Offline - ${error.message}`;
            }
        }
    }

    async checkDataHealth() {
        try {
            this.updateServiceStatus('data', 'connecting');
            
            // Check database connection through API
            const response = await fetch(`${this.services.data.baseUrl}/api/v1/db/connection`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.updateServiceStatus('data', 'online');
                
                // Update health indicator with database info
                const element = this.services.data.element;
                if (element) {
                    const dbType = data.connection?.version || 'PostgreSQL';
                    const extensions = data.connection?.extensions?.includes('vector') ? ' + pgvector' : '';
                    element.title = `Database: Connected (${dbType}${extensions})`;
                }
            } else {
                throw new Error('Database not responding');
            }
        } catch (error) {
            this.updateServiceStatus('data', 'offline');
            
            // Update tooltip with error info
            const element = this.services.data.element;
            if (element) {
                element.title = `Database: Offline - ${error.message}`;
            }
        }
    }

    showApiStatus() {
        if (typeof window.showApiModal === 'function') {
            window.showApiModal();
        } else {
            const status = this.services.api.status;
            let message = '';
            
            switch (status) {
                case 'online':
                    message = '✅ API Server: Connected\n\nAll API endpoints are available.';
                    break;
                case 'connecting':
                    message = '🔄 API Server: Connecting...\n\nPlease wait while we check the connection.';
                    break;
                case 'offline':
                    message = '❌ API Server: Disconnected\n\nAPI endpoints are not available.\n\nTo fix:\n1. Check if API server is running on port 3001\n2. Run "npm run dev" in the api directory\n3. Refresh the page';
                    break;
            }
            
            alert(message);
        }
    }

    showDataStatus() {
        if (typeof window.showDataModal === 'function') {
            window.showDataModal();
        } else {
            const status = this.services.data.status;
            let message = '';
            
            switch (status) {
                case 'online':
                    message = '✅ Database: Connected\n\nPostgreSQL database is available with pgvector extension.';
                    break;
                case 'connecting':
                    message = '🔄 Database: Connecting...\n\nPlease wait while we check the database connection.';
                    break;
                case 'offline':
                    message = '❌ Database: Disconnected\n\nPostgreSQL database is not available.\n\nTo fix:\n1. Check if PostgreSQL is running\n2. Verify database configuration in .env\n3. Run "docker-compose up -d" if using Docker\n4. Refresh the page';
                    break;
            }
            
            alert(message);
        }
    }
}

// Export for use in other modules
window.ServiceHealthManager = ServiceHealthManager;