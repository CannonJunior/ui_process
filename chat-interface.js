class ChatInterface {
    constructor() {
        this.ollamaBaseUrl = 'http://localhost:11434';
        this.modelName = 'qwen2.5:3b';
        this.isOpen = false;
        this.isConnected = false;
        this.documents = new Map(); // Store processed documents
        this.conversationHistory = [];
        
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
        await this.checkOllamaConnection();
        this.updateUI();
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
    
    updateStatus(status, message) {
        this.statusIndicator.className = `status-indicator ${status}`;
        this.statusText.textContent = message;
        
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
        
        // Clear input and update UI
        this.chatInput.value = '';
        this.updateCharCounter();
        this.autoResizeInput();
        
        // Add user message to chat
        this.addMessage('user', message);
        
        // Show loading state
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
            console.error('Error sending message:', error);
            this.addMessage('error', 'Sorry, I encountered an error. Please make sure Ollama is running and try again.');
        } finally {
            this.setLoading(false);
        }
    }
    
    async callOllama(prompt) {
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
        
        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.response || 'Sorry, I could not generate a response.';
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
        
        // Add timestamp for non-error messages
        if (type !== 'error') {
            const timestamp = document.createElement('div');
            timestamp.className = 'message-timestamp';
            timestamp.textContent = new Date().toLocaleTimeString();
            messageDiv.appendChild(timestamp);
        }
        
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
}

// Initialize chat interface when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for the main app to initialize first
    setTimeout(() => {
        window.chatInterface = new ChatInterface();
    }, 100);
});