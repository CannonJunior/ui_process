class ChatInterface {
    constructor() {
        this.ollamaBaseUrl = typeof PortConfig !== 'undefined' ? PortConfig.getOllamaUrl() : 'http://localhost:11434';
        this.modelName = 'qwen2.5:3b'; // Default model
        this.isOpen = false;
        this.isConnected = false;
        this.documents = new Map(); // Store processed documents
        this.conversationHistory = [];
        this.maxDocuments = 50; // Limit stored documents
        this.maxConversationHistory = 100; // Limit conversation history
        
        // Command history for input navigation
        this.commandHistory = [];
        this.maxCommandHistory = 50; // Limit command history
        this.commandHistoryIndex = -1; // Current position in history (-1 = not navigating)
        this.currentInputBackup = ''; // Backup of current input when navigating history
        
        // MCP Bridge for note-taking integration
        this.mcpBridge = null;
        this.mcpInitialized = false;
        
        // Health manager for service status
        this.healthManager = null;
        
        // Vector search service for enhanced context
        this.searchService = null;
        this.apiClient = null;
        
        // UI Elements
        this.chatSidebar = document.getElementById('chatSidebar');
        this.toggleButton = document.getElementById('toggleChatButton');
        this.closeButton = document.getElementById('closeChatButton');
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.sendButton = document.getElementById('sendChatButton');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusText = document.getElementById('statusText');
        this.charCount = document.getElementById('charCount');
        this.sendButtonText = document.getElementById('sendButtonText');
        this.sendButtonLoader = document.getElementById('sendButtonLoader');
        this.canvas = document.getElementById('canvas');
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        await this.loadDocuments();
        
        // Initialize health manager
        if (window.ServiceHealthManager) {
            this.healthManager = new ServiceHealthManager();
        }
        
        // Get saved model preference from health manager
        this.loadModelPreference();
        
        await this.checkOllamaConnection();
        await this.initializeMCPBridge();
        await this.initializeVectorSearch();
        this.updateUI();
    }
    
    async initializeMCPBridge() {
        try {
            // Initialize real MCP client
            this.mcpClient = new MCPClient();
            
            // Check if MCP service is available
            const healthCheck = await this.mcpClient.healthCheck();
            
            if (healthCheck.service_available) {
                this.mcpInitialized = true;
                console.log('MCP Client connected successfully:', healthCheck);
                
                // Update health manager
                if (this.healthManager) {
                    this.healthManager.setMCPClient(this.mcpClient);
                }
                
                // Create bridge interface that matches expected API
                this.mcpBridge = {
                    initialized: true,
                    parseMessage: (message) => this.mcpClient.parseMessage(message),
                    executeNoteCommand: (commandData) => this.mcpClient.executeNoteCommand(commandData),
                    analyzeContextForCommands: (text, history) => this.mcpClient.analyzeContextForCommands(text, history),
                    getCommandSuggestions: (partialInput) => this.mcpClient.getCommandSuggestions(partialInput)
                };
                
                // Show connection status in chat
                this.addMessage('info', '✅ MCP Services connected! Workflow commands and note-taking available. Type /help to see commands.');
            } else {
                throw new Error(healthCheck.error || 'MCP service not available');
            }
        } catch (error) {
            console.warn('MCP Client initialization failed:', error);
            this.mcpInitialized = false;
            
            // Create fallback bridge
            this.mcpBridge = {
                initialized: false,
                async parseMessage(message) {
                    if (message.startsWith('/')) {
                        return {
                            is_command: true,
                            type: 'service_unavailable',
                            error: 'Note-taking service not available. Start with: npm run mcp',
                            should_process_with_llm: false
                        };
                    }
                    return {
                        is_command: false,
                        should_process_with_llm: true
                    };
                },
                async executeNoteCommand() {
                    return {
                        status: 'error',
                        error: 'Note-taking service not available. Please start the MCP service with: npm run mcp'
                    };
                }
            };
            
            // Update health manager
            if (this.healthManager) {
                this.healthManager.setMCPClient(null);
            }
            
            // Show connection error in chat (but don't block other functionality)
            this.addMessage('info', '❌ MCP Services offline. Workflow commands not available. Start MCP service with: npm run mcp');
            
            // Set up retry mechanism
            this.setupMCPRetry();
        }
    }
    
    setupMCPRetry() {
        // Retry connection every 30 seconds if not connected
        if (this.mcpRetryInterval) {
            clearInterval(this.mcpRetryInterval);
        }
        
        this.mcpRetryInterval = setInterval(async () => {
            if (!this.mcpInitialized && this.mcpClient) {
                try {
                    const healthCheck = await this.mcpClient.healthCheck();
                    if (healthCheck.service_available) {
                        // Reconnect successful
                        this.mcpInitialized = true;
                        this.mcpBridge = {
                            initialized: true,
                            parseMessage: (message) => this.mcpClient.parseMessage(message),
                            executeNoteCommand: (commandData) => this.mcpClient.executeNoteCommand(commandData),
                            analyzeContextForCommands: (text, history) => this.mcpClient.analyzeContextForCommands(text, history),
                            getCommandSuggestions: (partialInput) => this.mcpClient.getCommandSuggestions(partialInput)
                        };
                        
                        this.addMessage('info', '✅ Note-taking system reconnected! Commands are now available.');
                        clearInterval(this.mcpRetryInterval);
                        this.mcpRetryInterval = null;
                    }
                } catch (error) {
                    // Still not available, continue retrying silently
                    console.log('MCP retry failed:', error.message);
                }
            }
        }, 30000); // 30 seconds
    }
    
    async attemptMCPReconnect() {
        try {
            if (!this.mcpClient) {
                this.mcpClient = new MCPClient();
            }
            
            const healthCheck = await this.mcpClient.healthCheck();
            
            if (healthCheck.service_available) {
                this.mcpInitialized = true;
                this.mcpBridge = {
                    initialized: true,
                    parseMessage: (message) => this.mcpClient.parseMessage(message),
                    executeNoteCommand: (commandData) => this.mcpClient.executeNoteCommand(commandData),
                    analyzeContextForCommands: (text, history) => this.mcpClient.analyzeContextForCommands(text, history),
                    getCommandSuggestions: (partialInput) => this.mcpClient.getCommandSuggestions(partialInput)
                };
                
                this.addMessage('info', '✅ Successfully reconnected to note-taking service!');
                
                // Stop retry interval if running
                if (this.mcpRetryInterval) {
                    clearInterval(this.mcpRetryInterval);
                    this.mcpRetryInterval = null;
                }
            } else {
                this.addMessage('error', 'Still unable to connect. Make sure the MCP service is running with: npm run mcp');
            }
        } catch (error) {
            this.addMessage('error', `Reconnection failed: ${error.message}`);
        }
    }
    
    async initializeVectorSearch() {
        try {
            console.log('🔍 Initializing vector search for chat enhancement...');
            
            // Import search services
            const { getSearchService } = await import('./services/search-service.js');
            const { getAPIClient } = await import('./services/api-client.js');
            
            // Initialize services
            this.searchService = getSearchService();
            this.apiClient = getAPIClient();
            
            // Test connection to search API
            const status = await this.searchService.getStatus();
            if (status.status === 'operational') {
                console.log('✅ Vector search services connected for chat enhancement');
                console.log(`   Provider: ${status.embeddingService?.provider || 'unknown'}`);
                console.log(`   Dimensions: ${status.embeddingService?.dimensions || 'unknown'}`);
            } else {
                throw new Error('Search service not operational');
            }
            
        } catch (error) {
            console.warn('Vector search initialization failed:', error);
            
            // Create fallback handlers
            this.searchService = {
                search: async () => ({ results: [], total: 0, searchType: 'disabled' }),
                semanticSearch: async () => ({ results: [], total: 0, searchType: 'disabled' }),
                isAvailable: () => false
            };
            
            this.apiClient = {
                isConnected: () => false
            };
        }
    }
    
    setupEventListeners() {
        // Toggle chat sidebar
        this.toggleButton.addEventListener('click', () => this.toggleChat());
        this.closeButton.addEventListener('click', () => this.closeChat());
        
        // Send message
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateCommandHistory('up');
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.navigateCommandHistory('down');
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.clearChatInput();
            }
        });
        
        // Character counter
        this.chatInput.addEventListener('input', () => this.updateCharCounter());
        
        // Auto-resize input
        this.chatInput.addEventListener('input', () => this.autoResizeInput());
    }
    
    async loadDocuments() {
        try {
            // Load documentation files
            const docFiles = [
                'assets/docs/process-flow-guide.md',
                'assets/docs/troubleshooting.md'
            ];
            
            for (const filePath of docFiles) {
                try {
                    const response = await fetch(filePath);
                    if (response.ok) {
                        const content = await response.text();
                        // Limit documents storage
                        if (this.documents.size >= this.maxDocuments) {
                            const firstKey = this.documents.keys().next().value;
                            this.documents.delete(firstKey);
                        }
                        
                        this.documents.set(filePath, {
                            content: content,
                            name: filePath.split('/').pop(),
                            processed: false
                        });
                        console.log(`Loaded document: ${filePath}`);
                    }
                } catch (error) {
                    console.warn(`Could not load document ${filePath}:`, error);
                }
            }
            
            console.log(`Loaded ${this.documents.size} documents for RAG`);
        } catch (error) {
            console.error('Error loading documents:', error);
        }
    }
    
    async checkOllamaConnection() {
        try {
            this.updateStatus('connecting', 'Connecting to Ollama...');
            
            // Check if Ollama is running
            const response = await fetch(`${this.ollamaBaseUrl}/api/tags`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const hasModel = data.models && data.models.some(model => 
                    model.name.includes(this.modelName.split(':')[0])
                );
                
                if (hasModel) {
                    this.isConnected = true;
                    this.updateStatus('connected', `Connected to ${this.modelName}`);
                } else {
                    this.isConnected = false;
                    this.updateStatus('error', `Model ${this.modelName} not found. Run: ollama pull ${this.modelName}`);
                }
            } else {
                throw new Error('Ollama not responding');
            }
        } catch (error) {
            this.isConnected = false;
            this.updateStatus('error', 'Ollama not running. Start Ollama service.');
            console.error('Ollama connection error:', error);
        }
    }
    
    loadModelPreference() {
        // Get model preference from localStorage or health manager
        const savedModel = localStorage.getItem('selectedOllamaModel');
        if (savedModel) {
            this.modelName = savedModel;
            console.log('Loaded saved model preference:', savedModel);
        }
    }
    
    setModel(modelName) {
        this.modelName = modelName;
        console.log('Chat interface model updated to:', modelName);
        
        // Update status display
        const modelShortName = modelName.split(':')[0];
        this.updateStatus('connected', `Switching to ${modelShortName}...`);
        
        // Clear conversation history when switching models
        this.conversationHistory = [];
        
        // Re-check connection with new model (async, non-blocking)
        this.checkOllamaConnection();
    }
    
    getCurrentModel() {
        return this.modelName;
    }
    
    /**
     * Set model with validation to ensure it's available
     */
    async setModelWithValidation(modelName) {
        try {
            await this.validateModel(modelName);
            this.setModel(modelName);
            console.log(`✅ Model validated and set to: ${modelName}`);
        } catch (error) {
            console.error(`❌ Failed to validate model ${modelName}:`, error);
            throw error;
        }
    }
    
    /**
     * Validate that a model is available in Ollama
     */
    async validateModel(modelName) {
        try {
            const response = await fetch(`${this.ollamaBaseUrl}/api/tags`);
            if (!response.ok) {
                throw new Error('Unable to fetch available models from Ollama');
            }
            
            const data = await response.json();
            const availableModels = data.models || [];
            
            const modelExists = availableModels.some(model => 
                model.name === modelName || model.name.startsWith(modelName + ':')
            );
            
            if (!modelExists) {
                const modelList = availableModels.map(m => m.name).join(', ');
                throw new Error(`Model '${modelName}' not found. Available models: ${modelList}`);
            }
            
            return true;
        } catch (error) {
            console.error('Model validation failed:', error);
            throw error;
        }
    }
    
    updateStatus(status, message) {
        this.statusIndicator.className = `status-indicator ${status}`;
        
        // Enhanced status message with model info
        if (status === 'connected' && this.modelName) {
            const modelShortName = this.modelName.split(':')[0];
            const modelVersion = this.modelName.split(':')[1] || '';
            this.statusText.textContent = `Connected to ${modelShortName}${modelVersion ? ' (' + modelVersion + ')' : ''}`;
        } else {
            this.statusText.textContent = message;
        }
        
        // Update health manager
        if (this.healthManager) {
            this.healthManager.setOllamaClient(this);
        }
        
        // Update status indicator symbols
        switch (status) {
            case 'connected':
                this.statusIndicator.textContent = '●';
                break;
            case 'error':
                this.statusIndicator.textContent = '●';
                break;
            case 'connecting':
                this.statusIndicator.textContent = '●';
                break;
            default:
                this.statusIndicator.textContent = '○';
        }
    }
    
    toggleChat() {
        if (this.isOpen) {
            this.closeChat();
        } else {
            this.openChat();
        }
    }
    
    openChat() {
        this.isOpen = true;
        this.chatSidebar.classList.add('open');
        this.canvas.classList.add('chat-open');
        this.toggleButton.classList.add('active');
        this.toggleButton.textContent = '💬 Close';
        
        // Focus input if connected
        if (this.isConnected) {
            setTimeout(() => this.chatInput.focus(), 300);
        }
    }
    
    closeChat() {
        this.isOpen = false;
        this.chatSidebar.classList.remove('open');
        this.canvas.classList.remove('chat-open');
        this.toggleButton.classList.remove('active');
        this.toggleButton.textContent = '💬 Chat';
    }
    
    updateCharCounter() {
        const length = this.chatInput.value.length;
        this.charCount.textContent = length;
        
        // Update send button state
        const isEmpty = length === 0;
        const isOverLimit = length > 1000;
        this.sendButton.disabled = isEmpty || isOverLimit || !this.isConnected;
        
        // Update char counter styling
        this.charCount.parentElement.classList.toggle('limit-warning', length > 900);
        this.charCount.parentElement.classList.toggle('limit-exceeded', isOverLimit);
    }
    
    autoResizeInput() {
        this.chatInput.style.height = 'auto';
        this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 100) + 'px';
    }
    
    updateUI() {
        this.updateCharCounter();
    }
    
    async sendMessage() {
        if (!this.isConnected || this.sendButton.disabled) return;
        
        const message = this.chatInput.value.trim();
        if (!message) return;
        
        // Add to command history
        this.addToCommandHistory(message);
        
        // Clear input and update UI
        this.chatInput.value = '';
        this.updateCharCounter();
        this.autoResizeInput();
        
        // Add user message to chat
        this.addMessage('user', message);
        
        // Show loading state
        this.setLoading(true);
        
        try {
            // Debug logging for command detection
            console.log(`🔍 Processing message: "${message}"`);
            console.log(`📡 MCP initialized: ${this.mcpInitialized}`);
            
            // Check if this is a command using MCP Bridge
            if (this.mcpInitialized) {
                console.log(`✅ MCP available, checking for workflow commands...`);
                
                // First check for workflow commands
                const workflowParseResult = await this.mcpClient.parseWorkflowCommand(message);
                console.log(`🔧 Workflow parse result:`, workflowParseResult);
                
                if (workflowParseResult.is_workflow_command) {
                    console.log(`✅ Recognized as workflow command: ${workflowParseResult.command_type}`);
                    // Handle as workflow command
                    await this.handleWorkflowCommand(workflowParseResult, message);
                    return;
                }
                
                // Then check for note commands
                const parseResult = await this.mcpBridge.parseMessage(message);
                console.log(`📝 Note parse result:`, parseResult);
                
                if (parseResult.is_command) {
                    console.log(`✅ Recognized as note command: ${parseResult.type}`);
                    // Handle as note command
                    await this.handleCommand(parseResult, message);
                    return;
                }
                
                // DISABLED: Command suggestions functionality disabled per user request
                // TODO: Mark for possible deletion - see ROADMAP.md
                // const contextAnalysis = await this.analyzeMessageContext(message);
                // if (contextAnalysis && contextAnalysis.suggested_commands && contextAnalysis.suggested_commands.length > 0) {
                //     this.addCommandSuggestions(contextAnalysis.suggested_commands);
                // }
            } else {
                console.log(`❌ MCP not initialized, checking for fallback command detection...`);
                
                // Basic fallback for workflow commands when MCP is offline
                if (message.startsWith('/')) {
                    console.log(`🔄 Detected command syntax but MCP offline`);
                    this.addMessage('error', '❌ Command detected but MCP services are offline. Please start MCP service with: npm run mcp');
                    
                    // Report to health manager
                    if (this.healthManager) {
                        this.healthManager.reportCommandIssue(message, 'MCP services offline');
                    }
                    return;
                }
            }
            
            console.log(`💬 Processing as LLM message`);
            // Process as regular LLM message
            await this.handleLLMMessage(message);
            
        } catch (error) {
            console.error('Error sending message:', error);
            console.error('Error stack:', error.stack);
            
            // Provide more specific error information
            let errorMessage = 'Sorry, I encountered an error. Please try again.';
            if (error.message) {
                errorMessage += `\n\nDetails: ${error.message}`;
            }
            
            this.addMessage('error', errorMessage);
            
            // Report to health manager if available
            if (this.healthManager) {
                this.healthManager.reportCommandIssue(message, error.message);
            }
        } finally {
            this.setLoading(false);
        }
    }
    
    async handleCommand(parseResult, originalMessage) {
        try {
            if (parseResult.type === 'unknown_command') {
                this.addMessage('error', `Unknown command: ${parseResult.command}. Type /help for available commands.`);
                if (parseResult.suggestion) {
                    this.addMessage('assistant', `Did you mean: ${parseResult.suggestion}?`);
                }
                return;
            }
            
            if (parseResult.type === 'service_unavailable') {
                this.addMessage('error', parseResult.error);
                
                // Add manual reconnect option
                if (originalMessage.trim() === '/reconnect' || originalMessage.trim() === '/connect') {
                    this.addMessage('info', 'Attempting to reconnect to note-taking service...');
                    await this.attemptMCPReconnect();
                }
                return;
            }
            
            // Execute command through MCP Bridge
            const result = await this.mcpBridge.executeNoteCommand(parseResult);
            
            // Debug logging for help command responses
            if (parseResult.action === 'show_help') {
                console.log(`🔍 Help command result:`, result);
                if (result.type === 'general_help') {
                    console.log(`📊 Categories found:`, Object.keys(result.categories || {}));
                    console.log(`📝 Total descriptions:`, Object.keys(result.descriptions || {}).length);
                    
                    // Check for workflow commands specifically
                    const nodeCommands = Object.keys(result.descriptions || {}).filter(cmd => cmd.startsWith('/node'));
                    const taskCommands = Object.keys(result.descriptions || {}).filter(cmd => cmd.startsWith('/task'));
                    console.log(`🏗️  Node commands in result:`, nodeCommands.length, nodeCommands);
                    console.log(`📋 Task commands in result:`, taskCommands.length, taskCommands);
                }
            }
            
            if (result.status === 'error') {
                this.addMessage('error', `Command failed: ${result.error}`);
            } else {
                this.formatCommandResponse(result, parseResult);
            }
            
        } catch (error) {
            console.error('Error handling command:', error);
            this.addMessage('error', 'Failed to execute command. Please try again.');
        }
    }

    async handleWorkflowCommand(parseResult, originalMessage) {
        try {
            if (parseResult.type === 'unknown_workflow_command') {
                this.addMessage('error', `Unknown workflow command: ${parseResult.command}. Type /workflow-help for available commands.`);
                if (parseResult.suggestion) {
                    this.addMessage('assistant', `Did you mean: ${parseResult.suggestion}?`);
                }
                return;
            }
            
            if (parseResult.type === 'error') {
                this.addMessage('error', parseResult.error);
                return;
            }
            
            // Validate command through MCP server
            const validationResult = await this.mcpClient.executeWorkflowCommand(parseResult);
            
            if (validationResult.status === 'error') {
                this.addMessage('error', `Command validation failed: ${validationResult.errors?.join(', ') || validationResult.error}`);
                if (validationResult.suggestions && validationResult.suggestions.length > 0) {
                    this.addMessage('info', `Suggestions: ${validationResult.suggestions.join(', ')}`);
                }
                return;
            }
            
            // Show warnings if any
            if (validationResult.validation?.warnings && validationResult.validation.warnings.length > 0) {
                this.addMessage('warning', `Warning: ${validationResult.validation.warnings.join(', ')}`);
            }
            
            // Execute command through WorkflowBridge
            if (validationResult.status === 'ready_for_execution' && window.workflowBridge) {
                const executionResult = await window.workflowBridge.executeCommand(validationResult.command_data);
                
                if (executionResult.status === 'success') {
                    this.addMessage('success', executionResult.message);
                    if (executionResult.result) {
                        this.formatWorkflowCommandResponse(executionResult);
                    }
                } else {
                    this.addMessage('error', `Command execution failed: ${executionResult.error}`);
                }
            } else {
                this.addMessage('error', 'Workflow bridge not available. The application may not be fully loaded.');
            }
            
        } catch (error) {
            console.error('Error handling workflow command:', error);
            this.addMessage('error', 'Failed to execute workflow command. Please try again.');
        }
    }
    
    async handleLLMMessage(message) {
        // RAG-enhanced LLM processing with database context
        
        // Get relevant context from database
        const databaseContext = await this.retrieveDatabaseContext(message);
        
        // Build conversation context
        const conversationContext = this.conversationHistory
            .slice(-6) // Last 3 exchanges (6 messages)
            .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
            .join('\n');
        
        // Build RAG-enhanced prompt
        let prompt = '';
        
        if (databaseContext && databaseContext.length > 0) {
            const contextSummary = databaseContext.map(ctx => ctx.context).join('\n');
            prompt = `You have access to the following relevant information from the database:

${contextSummary}

${conversationContext ? `Previous conversation:\n${conversationContext}\n\n` : ''}User: ${message}

Based on the database information and conversation context, provide a helpful response. Reference specific opportunities, tasks, or other data when relevant.`;
        } else {
            // Fallback to simple prompt without database context
            prompt = conversationContext ? 
                `Previous conversation:\n${conversationContext}\n\nUser: ${message}\n\nAssistant:` :
                `User: ${message}\n\nAssistant:`;
        }
        
        // Send to Ollama
        const response = await this.callOllama(prompt);
        
        // Add assistant response
        this.addMessage('assistant', response);
        
        // Store in conversation history
        this.conversationHistory.push(
            { role: 'user', content: message },
            { role: 'assistant', content: response }
        );
        
        // Keep conversation history manageable
        if (this.conversationHistory.length > this.maxConversationHistory) {
            this.conversationHistory = this.conversationHistory.slice(-this.maxConversationHistory);
        }
    }
    
    async retrieveDatabaseContext(message) {
        try {
            // Extract potential entity names or keywords from the message
            const keywords = this.extractKeywords(message);
            if (keywords.length === 0) return [];

            console.log(`🔍 Searching database for context: ${keywords.join(', ')}`);

            // Use direct database query for testing (bypasses authentication)
            const searchTerm = keywords.join(' ');
            const ragContext = [];

            // Search opportunities
            const oppResponse = await fetch('http://localhost:3002/api/v1/db/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: `
                        SELECT 'opportunity' as type, 
                               o.title, o.description, o.status, o.priority,
                               o.contact_person, o.notes, o.value, o.deadline,
                               array_agg(DISTINCT t.text) FILTER (WHERE t.text IS NOT NULL) as related_tasks,
                               COUNT(DISTINCT t.id) as task_count
                        FROM opportunities o
                        LEFT JOIN tasks t ON t.opportunity_id = o.id
                        WHERE o.title ILIKE '%${searchTerm}%' OR o.description ILIKE '%${searchTerm}%' OR o.notes ILIKE '%${searchTerm}%'
                        GROUP BY o.id, o.title, o.description, o.status, o.priority, o.contact_person, o.notes, o.value, o.deadline
                        ORDER BY o.updated_at DESC
                        LIMIT 3
                    `
                })
            });

            if (oppResponse.ok) {
                const oppData = await oppResponse.json();
                oppData.rows?.forEach(opp => {
                    ragContext.push({
                        type: 'opportunity',
                        title: opp.title,
                        description: opp.description,
                        status: opp.status,
                        priority: opp.priority,
                        value: opp.value,
                        contact_person: opp.contact_person,
                        notes: opp.notes,
                        task_count: opp.task_count,
                        related_tasks: opp.related_tasks || [],
                        context: `Opportunity "${opp.title}" is ${opp.status} with ${opp.priority} priority. ${opp.description || ''} ${opp.notes ? 'Notes: ' + opp.notes : ''} ${opp.task_count > 0 ? `Has ${opp.task_count} related tasks.` : ''}`.trim()
                    });
                });
            }

            // Search tasks
            const taskResponse = await fetch('http://localhost:3002/api/v1/db/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: `
                        SELECT 'task' as type,
                               t.text as title, t.description, t.status, t.priority,
                               t.due_date, t.assigned_to,
                               o.title as opportunity_title, o.description as opportunity_description
                        FROM tasks t
                        LEFT JOIN opportunities o ON t.opportunity_id = o.id
                        WHERE t.text ILIKE '%${searchTerm}%' OR t.description ILIKE '%${searchTerm}%'
                        ORDER BY t.updated_at DESC
                        LIMIT 3
                    `
                })
            });

            if (taskResponse.ok) {
                const taskData = await taskResponse.json();
                taskData.rows?.forEach(task => {
                    ragContext.push({
                        type: 'task',
                        title: task.title,
                        description: task.description,
                        status: task.status,
                        priority: task.priority,
                        assigned_to: task.assigned_to,
                        due_date: task.due_date,
                        opportunity_title: task.opportunity_title,
                        context: `Task "${task.title}" is ${task.status}${task.opportunity_title ? ` and relates to opportunity "${task.opportunity_title}"` : ''}. ${task.description || ''} ${task.opportunity_description ? 'Opportunity context: ' + task.opportunity_description : ''}`.trim()
                    });
                });
            }

            console.log(`✅ Found ${ragContext.length} relevant database items`);
            
            return ragContext;
        } catch (error) {
            console.warn('Database context retrieval failed:', error);
            return [];
        }
    }
    
    extractKeywords(message) {
        // Simple keyword extraction for entities
        // Look for potential opportunity/task names, proper nouns, etc.
        const words = message.toLowerCase().split(/\s+/);
        const keywords = [];
        
        // Add words that might be entity names (capitalized, 2+ chars, not common words)
        const commonWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'what', 'how', 'when', 'where', 'why', 'who']);
        
        words.forEach(word => {
            const cleanWord = word.replace(/[^\w]/g, '');
            if (cleanWord.length >= 2 && !commonWords.has(cleanWord)) {
                keywords.push(cleanWord);
            }
        });
        
        // Also check for potential acronyms or abbreviations (2-5 chars, uppercase)
        const acronyms = message.match(/\b[A-Z]{2,5}\b/g);
        if (acronyms) {
            keywords.push(...acronyms.map(a => a.toLowerCase()));
        }
        
        return [...new Set(keywords)]; // Remove duplicates
    }
    
    async analyzeMessageContext(message) {
        if (!this.mcpInitialized || !this.mcpBridge.analyzeContextForCommands) {
            return null;
        }
        
        try {
            return await this.mcpBridge.analyzeContextForCommands(message, this.conversationHistory);
        } catch (error) {
            console.warn('Context analysis failed:', error);
            return null;
        }
    }
    
    formatCommandResponse(result, parseResult) {
        switch (parseResult.action) {
            case 'create_note':
                if (result.status === 'created') {
                    this.addMessage('assistant', `✅ Note created successfully (ID: ${result.note_id})`);
                    if (result.associations && result.associations.suggestions) {
                        this.addMessage('info', 'Suggested associations found - consider linking to opportunities.');
                    }
                }
                break;
                
            case 'search_notes':
                if (result.results && result.results.length > 0) {
                    let response = `Found ${result.results.length} notes:\n\n`;
                    result.results.forEach(note => {
                        response += `📝 **${note.title || note.note_id}**\n${note.preview}\n\n`;
                    });
                    this.addMessage('assistant', response);
                } else {
                    this.addMessage('assistant', 'No notes found matching your search.');
                }
                break;
                
            case 'create_opportunity':
                if (result.status === 'created') {
                    this.addMessage('assistant', `🎯 Opportunity "${result.title}" created successfully (ID: ${result.opportunity_id})`);
                }
                break;
                
            case 'list_opportunities':
                if (result.opportunities && result.opportunities.length > 0) {
                    let response = `Found ${result.opportunities.length} opportunities:\n\n`;
                    result.opportunities.forEach(opp => {
                        response += `🎯 **${opp.title}** (${opp.note_count} notes)\n${opp.description || 'No description'}\n\n`;
                    });
                    this.addMessage('assistant', response);
                } else {
                    this.addMessage('assistant', 'No opportunities found.');
                }
                break;
                
            case 'show_help':
                this.formatHelpResponse(result);
                break;
                
            default:
                this.addMessage('assistant', JSON.stringify(result, null, 2));
        }
    }

    formatWorkflowCommandResponse(result) {
        if (!result.result) {
            return;
        }

        switch (result.action) {
            case 'create_node':
                if (result.result.node_id) {
                    let response = `✅ Created ${result.result.type} node`;
                    if (result.result.name) {
                        response += ` "${result.result.name}"`;
                    }
                    if (result.result.position) {
                        response += ` at position (${result.result.position.x}, ${result.result.position.y})`;
                    }
                    this.addMessage('info', response);
                }
                break;

            case 'create_task':
                if (result.result.task_id) {
                    let response = `✅ Created task "${result.result.name}"`;
                    if (result.result.anchored_to) {
                        response += ` and anchored to node "${result.result.anchored_to}"`;
                    }
                    this.addMessage('info', response);
                }
                break;

            case 'create_flowline':
                if (result.result.source && result.result.target) {
                    this.addMessage('info', `🔗 Connected "${result.result.source.name}" to "${result.result.target.name}" with ${result.result.type} flowline`);
                }
                break;

            case 'save_workflow':
                if (result.result.filename) {
                    this.addMessage('info', `💾 Workflow saved as "${result.result.filename}" (${result.result.stats.nodes} nodes, ${result.result.stats.tasks} tasks)`);
                }
                break;

            case 'show_workflow_status':
                if (result.result) {
                    const stats = result.result;
                    let response = `📊 **Workflow Status:**\n`;
                    response += `• Nodes: ${stats.nodes}\n`;
                    response += `• Tasks: ${stats.tasks}\n`;
                    response += `• Flowlines: ${stats.flowlines}\n`;
                    response += `• Tags: ${stats.tags}\n`;
                    if (stats.matrix_mode) {
                        response += `• Matrix Mode: Active\n`;
                    }
                    if (stats.selected_node) {
                        response += `• Selected: ${stats.selected_node.name || stats.selected_node.id}`;
                    }
                    this.addMessage('info', response);
                }
                break;

            case 'enter_matrix_mode':
                this.addMessage('info', '📊 Entered Eisenhower Matrix mode');
                break;

            case 'exit_matrix_mode':
                this.addMessage('info', '📋 Exited Eisenhower Matrix mode');
                break;

            case 'delete_node':
                if (result.result.deleted_node) {
                    this.addMessage('info', `🗑️ Deleted ${result.result.deleted_node.type} node "${result.result.deleted_node.name}"`);
                }
                break;

            case 'rename_node':
                if (result.result.old_name && result.result.new_name) {
                    this.addMessage('info', `✏️ Renamed node from "${result.result.old_name}" to "${result.result.new_name}"`);
                }
                break;

            case 'move_node':
                if (result.result.name && result.result.position) {
                    this.addMessage('info', `📍 Moved node "${result.result.name}" to (${result.result.position.x}, ${result.result.position.y})`);
                }
                break;

            default:
                this.addMessage('info', JSON.stringify(result.result, null, 2));
        }
    }
    
    formatHelpResponse(helpResult) {
        if (helpResult.type === 'general_help') {
            let response = "**Available Commands:**\n\n";
            
            console.log(`🔧 Formatting help response with ${Object.keys(helpResult.categories).length} categories`);
            
            for (const [category, commands] of Object.entries(helpResult.categories)) {
                console.log(`📁 Processing category: ${category} with ${commands.length} commands`);
                response += `**${category}:**\n`;
                commands.forEach(cmd => {
                    response += `• ${cmd} - ${helpResult.descriptions[cmd]}\n`;
                });
                response += "\n";
            }
            response += "**Getting Started:**\n";
            helpResult.getting_started.forEach(example => {
                response += `• ${example}\n`;
            });
            
            console.log(`💬 Final response length: ${response.length} characters`);
            console.log(`💬 First 200 chars: "${response.substring(0, 200)}"`);
            console.log(`💬 Last 200 chars: "${response.substring(response.length - 200)}"`);
            
            this.addMessage('assistant', response);
        } else if (helpResult.type === 'specific_help') {
            let response = `**Help for "${helpResult.query}":**\n\n`;
            helpResult.matches.forEach(match => {
                response += `• ${match.command} - ${match.description}\n`;
            });
            if (helpResult.examples && helpResult.examples.length > 0) {
                response += "\n**Examples:**\n";
                helpResult.examples.forEach(example => {
                    response += `• ${example}\n`;
                });
            }
            this.addMessage('assistant', response);
        }
    }
    
    addCommandSuggestions(suggestions) {
        if (suggestions.length === 0) return;
        
        let suggestionText = "💡 **Command suggestions based on your message:**\n\n";
        suggestions.forEach(suggestion => {
            suggestionText += `• ${suggestion.command} - ${suggestion.reason}\n`;
        });
        this.addMessage('info', suggestionText);
    }
    
    async callOllama(prompt) {
        try {
            // Validate model availability before making the API call
            await this.validateModel(this.modelName);
            
            const response = await fetch(`${this.ollamaBaseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.modelName,
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: 0.7,
                        top_p: 0.9,
                        max_tokens: 1000,
                        stop: ['User:', 'Human:', '\\n\\n']
                    }
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Ollama API error details:', errorText);
                
                // Provide more specific error messages
                if (response.status === 404) {
                    throw new Error(`Model '${this.modelName}' not found. Please run: ollama pull ${this.modelName}`);
                } else if (response.status === 500) {
                    throw new Error(`Ollama server error. The model '${this.modelName}' may be corrupted or incompatible. Try: ollama pull ${this.modelName}`);
                } else {
                    throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
                }
            }
            
            const data = await response.json();
            return data.response || 'Sorry, I could not generate a response.';
            
        } catch (error) {
            console.error('Error in callOllama:', error);
            
            // If model validation fails, try to fallback to default model
            if (error.message.includes('not found') && this.modelName !== 'llama2') {
                console.warn(`Attempting fallback to llama2 model...`);
                try {
                    await this.setModelWithValidation('llama2');
                    return await this.callOllama(prompt); // Retry with fallback model
                } catch (fallbackError) {
                    console.error('Fallback to llama2 also failed:', fallbackError);
                }
            }
            
            throw error; // Re-throw the original error
        }
    }
    
    getApplicationContext() {
        if (!window.processFlowDesigner) {
            return 'Process Flow Designer application is loading...';
        }
        
        const designer = window.processFlowDesigner;
        const nodeCount = designer.nodes ? designer.nodes.length : 0;
        const taskCount = designer.taskNodes ? designer.taskNodes.length : 0;
        const flowlineCount = designer.flowlines ? designer.flowlines.length : 0;
        
        let context = `Current Process Flow Application State:\\n`;
        context += `- Total nodes: ${nodeCount}\\n`;
        context += `- Total tasks: ${taskCount}\\n`;
        context += `- Total flowlines: ${flowlineCount}\\n`;
        
        // Add information about selected nodes
        if (designer.selectedNode) {
            const node = designer.selectedNode;
            const nodeType = node.dataset.type;
            const nodeName = node.querySelector('.node-text')?.textContent || 'Unnamed';
            context += `- Currently selected: ${nodeType} node "${nodeName}"\\n`;
        }
        
        // Add information about recent actions
        if (nodeCount === 1) {
            context += `- User has the default Start node only\\n`;
        } else if (nodeCount > 1) {
            context += `- User has created a process flow with multiple nodes\\n`;
        }
        
        return context;
    }
    
    findRelevantDocuments(query) {
        const queryLower = query.toLowerCase();
        const relevantDocs = [];
        
        // Simple keyword matching for now
        const keywords = [
            'node', 'task', 'flow', 'process', 'decision', 'terminal',
            'drag', 'create', 'connect', 'flowline', 'tag', 'advance',
            'save', 'load', 'error', 'problem', 'issue', 'help'
        ];
        
        const queryKeywords = keywords.filter(keyword => queryLower.includes(keyword));
        
        for (const [filePath, doc] of this.documents) {
            const contentLower = doc.content.toLowerCase();
            const relevanceScore = queryKeywords.reduce((score, keyword) => {
                const matches = (contentLower.match(new RegExp(keyword, 'g')) || []).length;
                return score + matches;
            }, 0);
            
            if (relevanceScore > 0) {
                relevantDocs.push({
                    name: doc.name,
                    content: doc.content.substring(0, 1500), // Truncate for prompt size
                    score: relevanceScore
                });
            }
        }
        
        // Sort by relevance and return top 2
        return relevantDocs.sort((a, b) => b.score - a.score).slice(0, 2);
    }
    
    async performVectorSearch(message) {
        try {
            console.log(`🔍 Performing vector search for chat context: "${message.slice(0, 50)}..."`);
            
            // First try to search session data (current workflow objects)
            const sessionResults = await this.searchSessionData(message);
            if (sessionResults && sessionResults.total > 0) {
                console.log(`✅ Session vector search completed: ${sessionResults.total} results found`);
                return sessionResults;
            }
            
            // Fallback to API search if no session data or search service available
            if (!this.searchService || !this.searchService.isAvailable()) {
                console.log('🔍 Vector search not available and no session data, skipping...');
                return { results: [], total: 0, searchType: 'disabled' };
            }
            
            // Perform hybrid search to get the best relevant context from API
            const searchResults = await this.searchService.search(message, {
                limit: 5, // Limit results for LLM context
                entityTypes: ['workflow', 'opportunity', 'node', 'task'] // Search all entity types
            });
            
            console.log(`✅ API vector search completed: ${searchResults.total} results found`);
            if (searchResults.breakdown) {
                console.log(`   📊 Breakdown: ${searchResults.breakdown.semantic} semantic, ${searchResults.breakdown.text} text`);
            }
            
            return searchResults;
            
        } catch (error) {
            console.warn('Vector search failed:', error);
            return { results: [], total: 0, searchType: 'error', error: error.message };
        }
    }
    
    async searchSessionData(message) {
        try {
            // Access the main app's workflow ingestion service
            const mainApp = window.app || window.processFlowDesigner;
            if (!mainApp || !mainApp.workflowIngestion) {
                console.log('🔍 No workflow ingestion service available');
                return { results: [], total: 0, searchType: 'no_session_service' };
            }
            
            // Search through session data
            const results = await mainApp.workflowIngestion.searchSessionData(message, {
                limit: 5,
                entityTypes: ['workflow', 'node', 'task', 'opportunity'],
                threshold: 0.7
            });
            
            if (results.total > 0) {
                console.log(`🎯 Found ${results.total} results in session data`);
                if (results.sessionStats) {
                    console.log(`   📊 Session contains: ${results.sessionStats.totalObjects} total objects`);
                }
            }
            
            return results;
            
        } catch (error) {
            console.warn('Session data search failed:', error);
            return { results: [], total: 0, searchType: 'session_error', error: error.message };
        }
    }
    
    buildEnhancedPrompt(userMessage, context, relevantDocs, vectorSearchResults = null) {
        let prompt = `You are a helpful assistant for the Process Flow Designer application. `;
        prompt += `You help users create, manage, and understand process flow diagrams with nodes, tasks, and flowlines.\\n\\n`;
        
        // Add application context
        prompt += `CURRENT APPLICATION STATE:\\n${context}\\n`;
        
        // Add vector search results for enhanced context
        if (vectorSearchResults && vectorSearchResults.results && vectorSearchResults.results.length > 0) {
            prompt += `RELATED CONTENT FROM YOUR WORKFLOWS:\\n`;
            vectorSearchResults.results.forEach(result => {
                const formatted = this.formatSearchResultForPrompt(result);
                prompt += `${formatted}\\n\\n`;
            });
        }
        
        // Add relevant documentation
        if (relevantDocs.length > 0) {
            prompt += `RELEVANT DOCUMENTATION:\\n`;
            relevantDocs.forEach(doc => {
                prompt += `From ${doc.name}:\\n${doc.content}\\n\\n`;
            });
        }
        
        // Add conversation history for context
        if (this.conversationHistory.length > 0) {
            prompt += `RECENT CONVERSATION:\\n`;
            this.conversationHistory.slice(-4).forEach(msg => {
                prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\\n`;
            });
            prompt += `\\n`;
        }
        
        prompt += `USER QUESTION: ${userMessage}\\n\\n`;
        prompt += `Please provide a helpful, concise response based on the application state and documentation. `;
        prompt += `Focus on practical guidance for using the Process Flow Designer. If the user is asking about `;
        prompt += `specific features, reference their current workflow state when relevant.\\n\\nAssistant:`;
        
        return prompt;
    }
    
    formatSearchResultForPrompt(result) {
        let formatted = '';
        
        switch (result.type) {
            case 'workflow':
                formatted = `📋 Workflow: "${result.title || result.name}"`;
                if (result.description) {
                    formatted += `\\n   Description: ${result.description}`;
                }
                if (result.version) {
                    formatted += `\\n   Version: ${result.version}`;
                }
                break;
                
            case 'opportunity':
                formatted = `💼 Opportunity: "${result.title}"`;
                if (result.description) {
                    formatted += `\\n   Description: ${result.description}`;
                }
                if (result.status) {
                    formatted += `\\n   Status: ${result.status}`;
                }
                if (result.priority) {
                    formatted += `\\n   Priority: ${result.priority}`;
                }
                break;
                
            case 'node':
                formatted = `🔹 Node: "${result.title || result.text}"`;
                if (result.type) {
                    formatted += `\\n   Type: ${result.type}`;
                }
                if (result.workflow_name) {
                    formatted += `\\n   Workflow: ${result.workflow_name}`;
                }
                break;
                
            case 'task':
                formatted = `✅ Task: "${result.title || result.text}"`;
                if (result.description) {
                    formatted += `\\n   Description: ${result.description}`;
                }
                if (result.status) {
                    formatted += `\\n   Status: ${result.status}`;
                }
                if (result.priority) {
                    formatted += `\\n   Priority: ${result.priority}`;
                }
                break;
                
            default:
                formatted = `📄 ${result.type}: "${result.title || result.name || 'Unknown'}"`;
                if (result.description) {
                    formatted += `\\n   ${result.description}`;
                }
        }
        
        // Add similarity score if available (for semantic search results)
        if (result.similarity && result.similarity > 0.7) {
            formatted += `\\n   (Highly relevant: ${Math.round(result.similarity * 100)}% match)`;
        }
        
        return formatted;
    }
    
    addMessage(type, content) {
        // Debug logging for help responses
        if (type === 'assistant' && content.includes('**Available Commands:**')) {
            console.log(`🖥️  addMessage received help content: ${content.length} characters`);
            console.log(`🖥️  Content starts with: "${content.substring(0, 100)}"`);
            console.log(`🖥️  Content ends with: "${content.substring(content.length - 100)}"`);
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        if (type === 'error') {
            contentDiv.textContent = content;
        } else {
            // Basic markdown-like formatting
            let formattedContent = content
                .replace(/\n/g, '<br>')
                .replace(/`([^`]+)`/g, '<code>$1</code>')
                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                .replace(/\*([^*]+)\*/g, '<em>$1</em>')
                .replace(/• /g, '• '); // Preserve bullet points
            
            // Debug logging for help responses after formatting
            if (type === 'assistant' && content.includes('**Available Commands:**')) {
                console.log(`🎨 Formatted content: ${formattedContent.length} characters`);
                console.log(`🎨 Formatted ends with: "${formattedContent.substring(formattedContent.length - 200)}"`);
            }
            
            contentDiv.innerHTML = formattedContent;
            
            // Debug logging after DOM insertion
            if (type === 'assistant' && content.includes('**Available Commands:**')) {
                console.log(`📄 DOM innerHTML: ${contentDiv.innerHTML.length} characters`);
                console.log(`📄 DOM textContent: ${contentDiv.textContent.length} characters`);
                console.log(`📄 DOM ends with: "${contentDiv.textContent.substring(contentDiv.textContent.length - 100)}"`);
                
                // Check if the DOM is actually displaying all content
                const actuallyVisible = contentDiv.offsetHeight < contentDiv.scrollHeight;
                console.log(`🖼️  Content is clipped (scrollHeight > offsetHeight): ${actuallyVisible}`);
                console.log(`🖼️  Element dimensions: ${contentDiv.offsetWidth}x${contentDiv.offsetHeight}, scroll: ${contentDiv.scrollWidth}x${contentDiv.scrollHeight}`);
                
                // Test if we can find workflow commands in the rendered DOM
                const domText = contentDiv.textContent;
                const hasNodeCommands = domText.includes('Node Commands:');
                const hasTaskCommands = domText.includes('Task Commands:');
                const hasWorkflowCommands = domText.includes('Workflow Commands:');
                console.log(`🔍 DOM contains Node Commands: ${hasNodeCommands}`);
                console.log(`🔍 DOM contains Task Commands: ${hasTaskCommands}`);  
                console.log(`🔍 DOM contains Workflow Commands: ${hasWorkflowCommands}`);
                
                // Log where the content appears to end
                const lines = domText.split('\n');
                const lastNonEmptyLine = lines.filter(line => line.trim()).pop();
                console.log(`📝 Last non-empty line in DOM: "${lastNonEmptyLine}"`);
                console.log(`📝 Total lines in DOM: ${lines.length}`);
            }
        }
        
        messageDiv.appendChild(contentDiv);
        
        // Add timestamp to all messages including errors
        const timestamp = document.createElement('div');
        timestamp.className = 'message-timestamp';
        timestamp.textContent = new Date().toLocaleTimeString();
        messageDiv.appendChild(timestamp);
        
        this.chatMessages.appendChild(messageDiv);
        
        // Fix for help command display - ensure proper rendering
        if (type === 'assistant' && content.includes('**Available Commands:**')) {
            // Force reflow to ensure element is properly rendered
            setTimeout(() => {
                console.log(`🔄 Post-render check: ${contentDiv.offsetWidth}x${contentDiv.offsetHeight}, scroll: ${contentDiv.scrollWidth}x${contentDiv.scrollHeight}`);
                const isStillClipped = contentDiv.scrollHeight > contentDiv.offsetHeight;
                console.log(`🔄 Content clipped after render: ${isStillClipped}`);
                
                if (isStillClipped) {
                    console.log(`🛠️  Applying height fix for clipped help content`);
                    contentDiv.style.maxHeight = 'none';
                    contentDiv.style.height = 'auto';
                    contentDiv.style.overflow = 'visible';
                }
            }, 100);
        }
        
        // Scroll to bottom
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    
    setLoading(loading) {
        this.sendButton.disabled = loading || !this.isConnected;
        
        if (loading) {
            this.sendButtonText.style.display = 'none';
            this.sendButtonLoader.style.display = 'inline';
        } else {
            this.sendButtonText.style.display = 'inline';
            this.sendButtonLoader.style.display = 'none';
        }
        
        this.updateCharCounter(); // Refresh send button state
    }
    
    // Command history management
    addToCommandHistory(command) {
        // Don't add empty commands or duplicates of the last command
        if (!command || command === this.commandHistory[this.commandHistory.length - 1]) {
            return;
        }
        
        // Add to history
        this.commandHistory.push(command);
        
        // Trim history if it gets too long
        if (this.commandHistory.length > this.maxCommandHistory) {
            this.commandHistory.shift();
        }
        
        // Reset navigation index
        this.commandHistoryIndex = -1;
        this.currentInputBackup = '';
    }
    
    navigateCommandHistory(direction) {
        if (this.commandHistory.length === 0) return;
        
        // If not currently navigating, backup the current input
        if (this.commandHistoryIndex === -1) {
            this.currentInputBackup = this.chatInput.value;
        }
        
        if (direction === 'up') {
            if (this.commandHistoryIndex < this.commandHistory.length - 1) {
                this.commandHistoryIndex++;
            }
        } else if (direction === 'down') {
            if (this.commandHistoryIndex > -1) {
                this.commandHistoryIndex--;
            }
        }
        
        // Update input field
        if (this.commandHistoryIndex === -1) {
            // Back to current input
            this.chatInput.value = this.currentInputBackup;
        } else {
            // Show command from history (from most recent backwards)
            const historyPosition = this.commandHistory.length - 1 - this.commandHistoryIndex;
            this.chatInput.value = this.commandHistory[historyPosition];
        }
        
        // Update UI
        this.updateCharCounter();
        this.autoResizeInput();
        
        // Place cursor at end
        this.chatInput.setSelectionRange(this.chatInput.value.length, this.chatInput.value.length);
    }
    
    clearChatInput() {
        this.chatInput.value = '';
        this.commandHistoryIndex = -1;
        this.currentInputBackup = '';
        this.updateCharCounter();
        this.autoResizeInput();
        this.chatInput.focus();
    }
}

// Initialize chat interface when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for the main app to initialize first
    setTimeout(() => {
        window.chatInterface = new ChatInterface();
    }, 100);
});
