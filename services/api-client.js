/**
 * API Client Service
 * Handles communication between frontend and PostgreSQL backend
 */

class APIClient {
    constructor(baseURL = 'http://localhost:3001') {
        this.baseURL = baseURL;
        this.isOnline = false;
        this.authToken = null;
        this.refreshToken = null;
        
        // WebSocket connection for real-time updates
        this.ws = null;
        this.wsReconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        
        // Initialize connection
        this.initialize();
    }
    
    async initialize() {
        console.log('🔌 Initializing API client...');
        
        // Load stored tokens
        this.loadTokens();
        
        // Test connection
        await this.testConnection();
        
        // Initialize WebSocket if online
        if (this.isOnline) {
            this.initializeWebSocket();
        }
    }
    
    loadTokens() {
        try {
            this.authToken = localStorage.getItem('ui_process_auth_token');
            this.refreshToken = localStorage.getItem('ui_process_refresh_token');
        } catch (error) {
            console.warn('Could not load stored tokens:', error);
        }
    }
    
    saveTokens(authToken, refreshToken) {
        try {
            this.authToken = authToken;
            this.refreshToken = refreshToken;
            localStorage.setItem('ui_process_auth_token', authToken);
            localStorage.setItem('ui_process_refresh_token', refreshToken);
        } catch (error) {
            console.warn('Could not save tokens:', error);
        }
    }
    
    clearTokens() {
        this.authToken = null;
        this.refreshToken = null;
        try {
            localStorage.removeItem('ui_process_auth_token');
            localStorage.removeItem('ui_process_refresh_token');
        } catch (error) {
            console.warn('Could not clear tokens:', error);
        }
    }
    
    async testConnection() {
        try {
            const response = await fetch(`${this.baseURL}/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                this.isOnline = true;
                console.log('✅ API connection established');
                
                // Dispatch event for other components
                document.dispatchEvent(new CustomEvent('apiConnectionEstablished'));
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            this.isOnline = false;
            console.warn('⚠️ API connection failed, using offline mode:', error.message);
            
            // Dispatch event for offline mode
            document.dispatchEvent(new CustomEvent('apiConnectionFailed', { 
                detail: { error: error.message } 
            }));
        }
    }
    
    initializeWebSocket() {
        try {
            const wsURL = this.baseURL.replace('http', 'ws');
            this.ws = new WebSocket(wsURL);
            
            this.ws.onopen = () => {
                console.log('🔌 WebSocket connected');
                this.wsReconnectAttempts = 0;
                
                // Subscribe to workflow updates if we have a current workflow
                const currentWorkflowId = this.getCurrentWorkflowId();
                if (currentWorkflowId) {
                    this.subscribeToWorkflow(currentWorkflowId);
                }
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleWebSocketMessage(data);
                } catch (error) {
                    console.error('WebSocket message error:', error);
                }
            };
            
            this.ws.onclose = () => {
                console.log('🔌 WebSocket disconnected');
                this.attemptWebSocketReconnect();
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
            
        } catch (error) {
            console.error('Failed to initialize WebSocket:', error);
        }
    }
    
    attemptWebSocketReconnect() {
        if (this.wsReconnectAttempts < this.maxReconnectAttempts && this.isOnline) {
            this.wsReconnectAttempts++;
            console.log(`🔄 Attempting WebSocket reconnect (${this.wsReconnectAttempts}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => {
                this.initializeWebSocket();
            }, this.reconnectDelay * this.wsReconnectAttempts);
        }
    }
    
    handleWebSocketMessage(data) {
        console.log('📨 WebSocket message:', data);
        
        switch (data.type) {
            case 'workflow_updated':
                document.dispatchEvent(new CustomEvent('workflowUpdated', {
                    detail: data.workflow
                }));
                break;
                
            case 'workflow_deleted':
                document.dispatchEvent(new CustomEvent('workflowDeleted', {
                    detail: { workflowId: data.workflowId }
                }));
                break;
                
            case 'node_updated':
                document.dispatchEvent(new CustomEvent('nodeUpdated', {
                    detail: data.node
                }));
                break;
                
            case 'task_updated':
                document.dispatchEvent(new CustomEvent('taskUpdated', {
                    detail: data.task
                }));
                break;
                
            case 'opportunity_updated':
                document.dispatchEvent(new CustomEvent('opportunityUpdated', {
                    detail: data.opportunity
                }));
                break;
                
            default:
                console.log('Unknown WebSocket message type:', data.type);
        }
    }
    
    subscribeToWorkflow(workflowId) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'subscribe',
                workflowId: workflowId
            }));
        }
    }
    
    getCurrentWorkflowId() {
        // This would be implemented based on how the frontend tracks current workflow
        // For now, return null
        return null;
    }
    
    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseURL}/api/v1${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        // Add auth token if available and not disabled
        if (this.authToken && !options.skipAuth) {
            headers.Authorization = `Bearer ${this.authToken}`;
        }
        
        try {
            const response = await fetch(url, {
                ...options,
                headers
            });
            
            // Handle token refresh if needed
            if (response.status === 401 && this.refreshToken && !options.skipAuth) {
                const refreshed = await this.refreshAuthToken();
                if (refreshed) {
                    // Retry the request with new token
                    headers.Authorization = `Bearer ${this.authToken}`;
                    const retryResponse = await fetch(url, {
                        ...options,
                        headers
                    });
                    return this.handleResponse(retryResponse);
                }
            }
            
            return this.handleResponse(response);
        } catch (error) {
            console.error('API request failed:', error);
            throw new Error(`Network error: ${error.message}`);
        }
    }
    
    async handleResponse(response) {
        const contentType = response.headers.get('content-type');
        
        let data;
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }
        
        if (!response.ok) {
            throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        return data;
    }
    
    async refreshAuthToken() {
        if (!this.refreshToken) {
            return false;
        }
        
        try {
            const response = await this.makeRequest('/auth/refresh', {
                method: 'POST',
                body: JSON.stringify({ refreshToken: this.refreshToken }),
                skipAuth: true
            });
            
            this.saveTokens(response.tokens.accessToken, response.tokens.refreshToken);
            return true;
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.clearTokens();
            return false;
        }
    }
    
    // ===== WORKFLOW API METHODS =====
    
    async getWorkflows(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `/workflows${queryString ? '?' + queryString : ''}`;
        return this.makeRequest(endpoint);
    }
    
    async getWorkflow(id) {
        return this.makeRequest(`/workflows/${id}`);
    }
    
    async createWorkflow(workflowData) {
        return this.makeRequest('/workflows', {
            method: 'POST',
            body: JSON.stringify(workflowData)
        });
    }
    
    async updateWorkflow(id, workflowData) {
        return this.makeRequest(`/workflows/${id}`, {
            method: 'PUT',
            body: JSON.stringify(workflowData)
        });
    }
    
    async deleteWorkflow(id) {
        return this.makeRequest(`/workflows/${id}`, {
            method: 'DELETE'
        });
    }
    
    async importWorkflow(workflowData) {
        return this.makeRequest('/workflows/import', {
            method: 'POST',
            body: JSON.stringify(workflowData)
        });
    }
    
    async exportWorkflow(id) {
        return this.makeRequest(`/workflows/${id}/export`);
    }
    
    // ===== NODE API METHODS =====
    
    async getNodes(workflowId) {
        return this.makeRequest(`/nodes?workflowId=${workflowId}`);
    }
    
    async createNode(nodeData) {
        return this.makeRequest('/nodes', {
            method: 'POST',
            body: JSON.stringify(nodeData)
        });
    }
    
    // ===== TASK API METHODS =====
    
    async getTasks(workflowId) {
        return this.makeRequest(`/tasks?workflowId=${workflowId}`);
    }
    
    async createTask(taskData) {
        return this.makeRequest('/tasks', {
            method: 'POST',
            body: JSON.stringify(taskData)
        });
    }
    
    // ===== OPPORTUNITY API METHODS =====
    
    async getOpportunities(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `/opportunities${queryString ? '?' + queryString : ''}`;
        return this.makeRequest(endpoint);
    }
    
    async createOpportunity(opportunityData) {
        return this.makeRequest('/opportunities', {
            method: 'POST',
            body: JSON.stringify(opportunityData)
        });
    }
    
    // ===== SEARCH API METHODS =====
    
    async textSearch(query, options = {}) {
        return this.makeRequest('/search/text', {
            method: 'POST',
            body: JSON.stringify({ query, ...options })
        });
    }
    
    async semanticSearch(query, options = {}) {
        return this.makeRequest('/search/semantic', {
            method: 'POST',
            body: JSON.stringify({ query, ...options })
        });
    }
    
    // ===== UTILITY METHODS =====
    
    isConnected() {
        return this.isOnline;
    }
    
    getConnectionStatus() {
        return {
            isOnline: this.isOnline,
            hasAuth: !!this.authToken,
            wsConnected: this.ws && this.ws.readyState === WebSocket.OPEN
        };
    }
}

// Create singleton instance
let apiClientInstance = null;

export function getAPIClient() {
    if (!apiClientInstance) {
        apiClientInstance = new APIClient();
    }
    return apiClientInstance;
}

// Export for direct use
export { APIClient };

// Make available globally
if (typeof window !== 'undefined') {
    window.APIClient = APIClient;
    window.getAPIClient = getAPIClient;
}