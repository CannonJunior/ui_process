class ChatInterface {
    constructor() {
        this.ollamaBaseUrl = 'http://localhost:11434';
        this.modelName = 'smollm2:135m';
        this.availableModels = [];
        this.isOpen = false;
        this.isConnected = false;
        this.documents = new Map(); // Store processed documents
        this.conversationHistory = [];
        
        // Note-taking system
        this.noteManager = null;
        
        // UI Elements
        this.chatSidebar = document.getElementById('chatSidebar');
        this.toggleButton = document.getElementById('toggleChatButton');
        this.closeButton = document.getElementById('closeChatButton');
        this.chatMessages = document.getElementById('chatMessages');
        this.chatInput = document.getElementById('chatInput');
        this.sendButton = document.getElementById('sendChatButton');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusText = document.getElementById('statusText');
        this.retryButton = document.getElementById('retryConnectionButton');
        this.modelSelect = document.getElementById('modelSelect');
        this.charCount = document.getElementById('charCount');
        this.sendButtonText = document.getElementById('sendButtonText');
        this.sendButtonLoader = document.getElementById('sendButtonLoader');
        this.canvas = document.getElementById('canvas');
        
        this.init();
    }
    
    async init() {
        console.log('ChatInterface: Starting initialization...');
        this.setupEventListeners();
        await this.loadDocuments();
        await this.initializeNoteManager();
        
        // Load available models and setup model selector
        await this.loadAvailableModels();
        
        // Don't await connection check to avoid blocking initialization
        this.checkOllamaConnection().catch(error => {
            console.error('ChatInterface: Connection check failed during init:', error);
        });
        
        this.updateUI();
        console.log('ChatInterface: Initialization complete');
    }
    
    /**
     * Initialize the note-taking system
     */
    async initializeNoteManager() {
        try {
            // Check if we have access to the main app instance for context
            const mainApp = window.app || window.processFlowApp;
            this.noteManager = new NoteManager(mainApp);
            await this.noteManager.initialize();
            console.log('ChatInterface: Note manager initialized');
        } catch (error) {
            console.error('ChatInterface: Failed to initialize note manager:', error);
            // Continue without note-taking functionality
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
            }
        });
        
        // Character counter
        this.chatInput.addEventListener('input', () => this.updateCharCounter());
        
        // Auto-resize input
        this.chatInput.addEventListener('input', () => this.autoResizeInput());
        
        // Retry connection button
        if (this.retryButton) {
            this.retryButton.addEventListener('click', () => this.retryConnection());
        }
        
        // Model selector
        if (this.modelSelect) {
            this.modelSelect.addEventListener('change', (e) => this.changeModel(e.target.value));
        }
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
    
    /**
     * Load available Ollama models and populate the selector
     */
    async loadAvailableModels() {
        try {
            console.log('ChatInterface: Loading available models...');
            
            const response = await fetch(`${this.ollamaBaseUrl}/api/tags`);
            if (response.ok) {
                const data = await response.json();
                this.availableModels = data.models || [];
                
                console.log('ChatInterface: Available models:', this.availableModels.map(m => m.name));
                
                // Update model selector
                if (this.modelSelect && this.availableModels.length > 0) {
                    this.updateModelSelector();
                }
            } else {
                console.warn('ChatInterface: Could not load models, using default');
                this.availableModels = [{ name: this.modelName, details: { parameter_size: 'Unknown' } }];
            }
        } catch (error) {
            console.error('ChatInterface: Error loading models:', error);
            this.availableModels = [{ name: this.modelName, details: { parameter_size: 'Unknown' } }];
        }
    }
    
    /**
     * Update the model selector dropdown with available models
     */
    updateModelSelector() {
        if (!this.modelSelect) return;
        
        // Clear existing options
        this.modelSelect.innerHTML = '';
        
        // Filter out embedding models and other non-text generation models
        const textModels = this.availableModels.filter(model => {
            const name = model.name.toLowerCase();
            return !name.includes('embed') && !name.includes('nomic');
        });
        
        // Sort models by parameter size (smallest first)
        textModels.sort((a, b) => {
            const getSizeValue = (model) => {
                const paramSize = model.details?.parameter_size || '0';
                const numMatch = paramSize.match(/(\d+(?:\.\d+)?)/);
                return numMatch ? parseFloat(numMatch[1]) : 0;
            };
            return getSizeValue(a) - getSizeValue(b);
        });
        
        // Add options
        textModels.forEach(model => {
            const option = document.createElement('option');
            option.value = model.name;
            
            // Format the display name with size info
            const paramSize = model.details?.parameter_size || 'Unknown size';
            const familyInfo = model.details?.family ? ` (${model.details.family})` : '';
            option.textContent = `${model.name} - ${paramSize}${familyInfo}`;
            
            // Set selected if this is the current model
            if (model.name === this.modelName) {
                option.selected = true;
            }
            
            this.modelSelect.appendChild(option);
        });
        
        console.log('ChatInterface: Model selector updated with', textModels.length, 'models');
    }
    
    /**
     * Change the active model
     * @param {string} modelName - New model name
     */
    async changeModel(modelName) {
        if (modelName === this.modelName) return;
        
        console.log('ChatInterface: Changing model from', this.modelName, 'to', modelName);
        
        const oldModel = this.modelName;
        this.modelName = modelName;
        
        // Update status to show we're switching models
        this.updateStatus('connecting', `Switching to ${modelName}...`);
        
        // Check connection with new model
        try {
            await this.checkOllamaConnection();
            console.log('ChatInterface: Successfully switched to model:', modelName);
        } catch (error) {
            console.error('ChatInterface: Failed to switch to model:', modelName, error);
            // Revert to old model on failure
            this.modelName = oldModel;
            this.modelSelect.value = oldModel;
            this.updateStatus('error', `Failed to switch to ${modelName}`);
        }
    }
    
    async checkOllamaConnection() {
        console.log('ChatInterface: checkOllamaConnection started');
        try {
            console.log('ChatInterface: Updating status to connecting...');
            this.updateStatus('connecting', 'Connecting to Ollama...');
            
            // Create an AbortController for timeout handling
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
            }, 10000); // 10 second timeout
            
            try {
                console.log('ChatInterface: Starting fetch to Ollama...');
                // Check if Ollama is running with timeout
                const response = await fetch(`${this.ollamaBaseUrl}/api/tags`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                console.log('ChatInterface: Fetch completed, response received');
                
                if (response.ok) {
                    const data = await response.json();
                    const hasModel = data.models && data.models.some(model => 
                        model.name.includes(this.modelName.split(':')[0])
                    );
                    
                    if (hasModel) {
                        this.isConnected = true;
                        this.updateStatus('connected', `Connected to ${this.modelName}`);
                        console.log(`ChatInterface: Successfully connected to Ollama with model ${this.modelName}`);
                    } else {
                        this.isConnected = false;
                        this.updateStatus('error', `Model ${this.modelName} not found. Run: ollama pull ${this.modelName}`);
                        console.warn(`ChatInterface: Model ${this.modelName} not available. Available models:`, 
                                   data.models?.map(m => m.name) || []);
                    }
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
            } catch (fetchError) {
                clearTimeout(timeoutId);
                console.log('ChatInterface: Fetch error occurred:', fetchError);
                
                if (fetchError.name === 'AbortError') {
                    throw new Error('Connection timeout - Ollama may not be running');
                } else if (fetchError.message.includes('NetworkError') || 
                          fetchError.message.includes('Failed to fetch')) {
                    throw new Error('Network error - Check if Ollama is running on port 11434');
                } else {
                    throw fetchError;
                }
            }
            
        } catch (error) {
            console.log('ChatInterface: Connection check caught error:', error);
            this.isConnected = false;
            
            // Provide specific error messages based on error type
            let errorMessage = 'Connection failed';
            let troubleshootingTip = '';
            
            if (error.message.includes('timeout')) {
                errorMessage = 'Connection timeout';
                troubleshootingTip = 'Start Ollama: ollama serve';
            } else if (error.message.includes('Network error')) {
                errorMessage = 'Ollama not accessible';
                troubleshootingTip = 'Check if Ollama is running';
            } else if (error.message.includes('CORS')) {
                errorMessage = 'CORS error';
                troubleshootingTip = 'Browser security restriction';
            } else {
                errorMessage = 'Ollama connection failed';
                troubleshootingTip = 'Check Ollama installation';
            }
            
            this.updateStatus('error', `${errorMessage} - ${troubleshootingTip}`);
            console.error('ChatInterface: Ollama connection error:', error.message);
            
            // Attempt retry after a delay
            setTimeout(() => {
                if (!this.isConnected) {
                    console.log('ChatInterface: Attempting automatic reconnection...');
                    this.checkOllamaConnection();
                }
            }, 15000); // Retry after 15 seconds
        }
    }
    
    updateStatus(status, message) {
        this.statusIndicator.className = `status-indicator ${status}`;
        this.statusText.textContent = message;
        
        // Update status indicator symbols
        switch (status) {
            case 'connected':
                this.statusIndicator.textContent = '●';
                if (this.retryButton) this.retryButton.style.display = 'none';
                break;
            case 'error':
                this.statusIndicator.textContent = '●';
                if (this.retryButton) this.retryButton.style.display = 'inline-block';
                break;
            case 'connecting':
                this.statusIndicator.textContent = '●';
                if (this.retryButton) this.retryButton.style.display = 'none';
                break;
            default:
                this.statusIndicator.textContent = '○';
                if (this.retryButton) this.retryButton.style.display = 'none';
        }
    }
    
    /**
     * Retry Ollama connection manually
     */
    async retryConnection() {
        console.log('ChatInterface: Manual connection retry requested');
        await this.checkOllamaConnection();
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
        console.log('ChatInterface: sendMessage called');
        console.log('ChatInterface: isConnected:', this.isConnected);
        console.log('ChatInterface: sendButton.disabled:', this.sendButton.disabled);
        
        if (!this.isConnected || this.sendButton.disabled) {
            console.log('ChatInterface: Cannot send message - not connected or button disabled');
            return;
        }
        
        const message = this.chatInput.value.trim();
        if (!message) return;
        
        // Clear input and update UI
        this.chatInput.value = '';
        this.updateCharCounter();
        this.autoResizeInput();
        
        // Add user message to chat
        this.addMessage('user', message);
        
        // Check if this is a note command
        if (this.noteManager && this.noteManager.isNoteCommand(message)) {
            await this.handleNoteCommand(message);
            return;
        }
        
        // Show loading state for LLM processing
        this.setLoading(true);
        
        try {
            // Get application context
            const context = this.getApplicationContext();
            
            // Get relevant documents based on the message
            const relevantDocs = this.findRelevantDocuments(message);
            
            // Prepare enhanced prompt with context and RAG
            const enhancedPrompt = this.buildEnhancedPrompt(message, context, relevantDocs);
            
            // Send to Ollama
            const response = await this.callOllama(enhancedPrompt);
            
            // Add assistant response
            this.addMessage('assistant', response);
            
            // Store in conversation history
            this.conversationHistory.push(
                { role: 'user', content: message },
                { role: 'assistant', content: response }
            );
            
            // Keep conversation history manageable
            if (this.conversationHistory.length > 20) {
                this.conversationHistory = this.conversationHistory.slice(-20);
            }
            
        } catch (error) {
            console.error('ChatInterface: Error sending message:', error);
            console.error('ChatInterface: Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            
            let errorMessage = 'Sorry, I encountered an error. ';
            
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                errorMessage += 'Cannot connect to Ollama. Please make sure Ollama is running.';
            } else if (error.message.includes('CORS')) {
                errorMessage += 'Browser security is blocking the request. Consider using a proxy server.';
            } else if (error.message.includes('Ollama API error')) {
                errorMessage += `Ollama API returned an error: ${error.message}`;
            } else {
                errorMessage += `Error details: ${error.message}`;
            }
            
            this.addMessage('error', errorMessage);
        } finally {
            this.setLoading(false);
        }
    }
    
    async callOllama(prompt) {
        console.log('ChatInterface: Calling Ollama API...');
        console.log('ChatInterface: URL:', `${this.ollamaBaseUrl}/api/generate`);
        console.log('ChatInterface: Model:', this.modelName);
        
        try {
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
                        max_tokens: 500,
                        stop: ['User:', 'Human:', '\\n\\n']
                    }
                })
            });
            
            console.log('ChatInterface: Response received:', {
                ok: response.ok,
                status: response.status,
                statusText: response.statusText
            });
            
            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('ChatInterface: Response data received:', {
                hasResponse: !!data.response,
                responseLength: data.response?.length || 0,
                model: data.model,
                done: data.done
            });
            
            return data.response || 'Sorry, I could not generate a response.';
            
        } catch (fetchError) {
            console.error('ChatInterface: Fetch error in callOllama:', fetchError);
            throw fetchError;
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
    
    buildEnhancedPrompt(userMessage, context, relevantDocs) {
        let prompt = `You are a helpful assistant for the Process Flow Designer application. `;
        prompt += `You help users create, manage, and understand process flow diagrams with nodes, tasks, and flowlines.\\n\\n`;
        
        // Add application context
        prompt += `CURRENT APPLICATION STATE:\\n${context}\\n`;
        
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
    
    addMessage(type, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        if (type === 'error') {
            contentDiv.textContent = content;
        } else {
            // Basic markdown-like formatting
            let formattedContent = content
                .replace(/\\n/g, '\\n')
                .replace(/`([^`]+)`/g, '<code>$1</code>')
                .replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>')
                .replace(/\\*([^*]+)\\*/g, '<em>$1</em>');
            
            contentDiv.innerHTML = formattedContent;
        }
        
        messageDiv.appendChild(contentDiv);
        
        // Add timestamp for all messages including errors
        const timestamp = document.createElement('div');
        timestamp.className = 'message-timestamp';
        timestamp.textContent = new Date().toLocaleTimeString();
        messageDiv.appendChild(timestamp);
        
        this.chatMessages.appendChild(messageDiv);
        
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

    /**
     * Handle note command processing
     */
    async handleNoteCommand(message) {
        try {
            // Update note manager context if we have access to main app
            if (this.noteManager && window.app) {
                this.updateNoteManagerContext();
            }

            // Process the note command
            const response = await this.noteManager.processCommand(message);
            
            // Add note response to chat
            this.addNoteResponse(response);
            
        } catch (error) {
            console.error('ChatInterface: Note command failed:', error);
            this.addMessage('assistant', `❌ Note command failed: ${error.message}`);
        }
    }

    /**
     * Update note manager with current application context
     */
    updateNoteManagerContext() {
        if (!window.app || !this.noteManager) return;

        const context = {};

        // Get current opportunity (if implemented)
        if (window.app.currentOpportunity) {
            context.opportunity = window.app.currentOpportunity;
        }

        // Get current workflow/task context
        if (window.app.selectedNode) {
            const selectedNode = window.app.selectedNode;
            
            if (selectedNode.dataset.type === 'task') {
                context.task = {
                    id: selectedNode.dataset.id,
                    name: selectedNode.querySelector('.node-text')?.textContent,
                    anchoredTo: selectedNode.dataset.anchoredTo
                };
                
                // If task is anchored to something, that might be our workflow context
                if (selectedNode.dataset.anchoredTo) {
                    const anchorNode = window.app.nodes?.find(n => n.dataset.id === selectedNode.dataset.anchoredTo);
                    if (anchorNode) {
                        context.workflow = {
                            id: anchorNode.dataset.id,
                            name: anchorNode.querySelector('.node-text')?.textContent,
                            type: anchorNode.dataset.type
                        };
                    }
                }
            } else {
                // Selected node might be a workflow node
                context.workflow = {
                    id: selectedNode.dataset.id,
                    name: selectedNode.querySelector('.node-text')?.textContent,
                    type: selectedNode.dataset.type
                };
            }
        }

        this.noteManager.setContext(context);
    }

    /**
     * Add note response to chat interface
     */
    addNoteResponse(response) {
        let messageClass = 'note-response';
        let icon = '📝';

        switch (response.status) {
            case 'success':
                messageClass += ' note-success';
                icon = '✅';
                break;
            case 'error':
                messageClass += ' note-error';
                icon = '❌';
                break;
            case 'info':
                messageClass += ' note-info';
                icon = 'ℹ️';
                break;
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message assistant ${messageClass}`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.innerHTML = `${icon} ${this.formatMarkdown(response.message)}`;
        
        messageDiv.appendChild(messageContent);
        
        // Add timestamp for note responses
        const timestamp = document.createElement('div');
        timestamp.className = 'message-timestamp';
        timestamp.textContent = new Date().toLocaleTimeString();
        messageDiv.appendChild(timestamp);
        
        this.chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    /**
     * Basic markdown formatting for messages
     */
    formatMarkdown(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/^• (.+)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
            .replace(/\n/g, '<br>');
    }
}

// Initialize chat interface when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for the main app to initialize first
    setTimeout(() => {
        window.chatInterface = new ChatInterface();
    }, 100);
});