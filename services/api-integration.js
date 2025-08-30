/**
 * API Integration Service
 * Coordinates API client, sync service, and workflow API service
 */

import { getAPIClient } from './api-client.js';
import SyncService from './sync-service.js';
import WorkflowAPIService from './workflow-api-service.js';

class APIIntegration {
    constructor() {
        this.apiClient = null;
        this.syncService = null;
        this.workflowAPIService = null;
        this.isInitialized = false;
        
        this.initialize();
    }
    
    async initialize() {
        console.log('🚀 Initializing API Integration...');
        
        try {
            // Initialize API client
            this.apiClient = getAPIClient();
            
            // Wait a moment for API client to test connection
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Initialize sync service
            this.syncService = new SyncService(this.apiClient);
            
            // Initialize workflow API service
            this.workflowAPIService = new WorkflowAPIService(this.apiClient, this.syncService);
            
            // Setup status monitoring
            this.setupStatusMonitoring();
            
            // Setup UI integration
            this.setupUIIntegration();
            
            this.isInitialized = true;
            console.log('✅ API Integration initialized successfully');
            
            // Dispatch ready event
            document.dispatchEvent(new CustomEvent('apiIntegrationReady', {
                detail: {
                    apiClient: this.apiClient,
                    syncService: this.syncService,
                    workflowAPIService: this.workflowAPIService
                }
            }));
            
        } catch (error) {
            console.error('❌ API Integration initialization failed:', error);
            
            // Dispatch error event
            document.dispatchEvent(new CustomEvent('apiIntegrationFailed', {
                detail: { error: error.message }
            }));
        }
    }
    
    setupStatusMonitoring() {
        // Create status indicator in the UI
        this.createStatusIndicator();
        
        // Listen for connection status changes
        document.addEventListener('apiConnectionEstablished', () => {
            this.updateStatusIndicator('online');
        });
        
        document.addEventListener('apiConnectionFailed', () => {
            this.updateStatusIndicator('offline');
        });
        
        document.addEventListener('syncCompleted', (event) => {
            this.updateStatusIndicator('synced', event.detail);
        });
        
        document.addEventListener('syncFailed', (event) => {
            this.updateStatusIndicator('sync-error', event.detail);
        });
        
        // Initialize database status check
        setTimeout(() => {
            this.checkDatabaseStatus();
        }, 1000);
        
        // Set up periodic database status checks (every 30 seconds)
        setInterval(() => {
            this.checkDatabaseStatus();
        }, 30000);
        
        // Add click handler for database health indicator
        setTimeout(() => {
            this.setupDatabaseHealthClickHandler();
        }, 1500);
    }
    
    createStatusIndicator() {
        // Check if status indicator already exists
        if (document.getElementById('apiStatusIndicator')) {
            return;
        }
        
        // Create status indicator element
        const statusIndicator = document.createElement('div');
        statusIndicator.id = 'apiStatusIndicator';
        statusIndicator.className = 'api-status-indicator';
        statusIndicator.innerHTML = `
            <div class="status-dot offline"></div>
            <div class="status-text">Connecting...</div>
            <div class="status-details"></div>
        `;
        
        // Add to toolbar or create a floating indicator
        const toolbar = document.querySelector('.toolbar');
        if (toolbar) {
            toolbar.appendChild(statusIndicator);
        } else {
            // Create floating indicator
            statusIndicator.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: white;
                border: 1px solid #ccc;
                border-radius: 6px;
                padding: 8px 12px;
                font-size: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                z-index: 1000;
                display: flex;
                align-items: center;
                gap: 6px;
            `;
            document.body.appendChild(statusIndicator);
        }
        
        // Add click handler for status details
        statusIndicator.addEventListener('click', () => {
            this.showStatusDetails();
        });
    }
    
    updateStatusIndicator(status, details = {}) {
        const indicator = document.getElementById('apiStatusIndicator');
        if (!indicator) return;
        
        const dot = indicator.querySelector('.status-dot');
        const text = indicator.querySelector('.status-text');
        const detailsEl = indicator.querySelector('.status-details');
        
        // Update dot and text based on status
        switch (status) {
            case 'online':
                dot.className = 'status-dot online';
                text.textContent = 'API Connected';
                detailsEl.textContent = '';
                break;
                
            case 'offline':
                dot.className = 'status-dot offline';
                text.textContent = 'Offline Mode';
                detailsEl.textContent = 'Changes will sync when online';
                break;
                
            case 'synced':
                dot.className = 'status-dot synced';
                text.textContent = 'Synchronized';
                detailsEl.textContent = `Last sync: ${new Date(details.timestamp).toLocaleTimeString()}`;
                break;
                
            case 'sync-error':
                dot.className = 'status-dot error';
                text.textContent = 'Sync Error';
                detailsEl.textContent = details.error || 'Failed to synchronize';
                break;
                
            case 'syncing':
                dot.className = 'status-dot syncing';
                text.textContent = 'Synchronizing...';
                detailsEl.textContent = '';
                break;
        }
        
        // Also update the service health indicators
        this.updateServiceHealthIndicators(status, details);
    }
    
    updateServiceHealthIndicators(status, details = {}) {
        // Update API health indicator in service health section
        const apiHealthIndicator = document.getElementById('apiHealthIndicator');
        if (apiHealthIndicator) {
            const apiHealthDot = apiHealthIndicator.querySelector('.health-dot');
            const apiHealthStatus = apiHealthIndicator.querySelector('.health-status');
            
            if (apiHealthDot && apiHealthStatus) {
                // Map status to health indicator classes
                switch (status) {
                    case 'online':
                    case 'synced':
                        apiHealthDot.className = 'health-dot online';
                        apiHealthStatus.textContent = 'API';
                        break;
                    case 'syncing':
                        apiHealthDot.className = 'health-dot connecting';
                        apiHealthStatus.textContent = 'API';
                        break;
                    case 'offline':
                    case 'sync-error':
                    default:
                        apiHealthDot.className = 'health-dot offline';
                        apiHealthStatus.textContent = 'API';
                        break;
                }
            }
        }
        
        // Check and update database status
        this.checkDatabaseStatus();
    }
    
    async checkDatabaseStatus() {
        try {
            // Call the API health endpoint to get database status
            const response = await fetch('http://localhost:3001/health');
            const healthData = await response.json();
            
            const dataHealthIndicator = document.getElementById('dataHealthIndicator');
            if (dataHealthIndicator) {
                const dataHealthDot = dataHealthIndicator.querySelector('.health-dot');
                const dataHealthStatus = dataHealthIndicator.querySelector('.health-status');
                
                if (dataHealthDot && dataHealthStatus) {
                    const dbConnected = healthData.database === 'connected';
                    
                    if (dbConnected) {
                        dataHealthDot.className = 'health-dot online';
                    } else {
                        dataHealthDot.className = 'health-dot offline';
                    }
                    dataHealthStatus.textContent = 'Data';
                }
            }
        } catch (error) {
            console.error('Failed to check database status:', error);
            
            // Set database status to offline if API call fails
            const dataHealthIndicator = document.getElementById('dataHealthIndicator');
            if (dataHealthIndicator) {
                const dataHealthDot = dataHealthIndicator.querySelector('.health-dot');
                const dataHealthStatus = dataHealthIndicator.querySelector('.health-status');
                
                if (dataHealthDot && dataHealthStatus) {
                    dataHealthDot.className = 'health-dot offline';
                    dataHealthStatus.textContent = 'Data';
                }
            }
        }
    }
    
    setupDatabaseHealthClickHandler() {
        const dataHealthIndicator = document.getElementById('dataHealthIndicator');
        if (dataHealthIndicator) {
            dataHealthIndicator.style.cursor = 'pointer';
            dataHealthIndicator.addEventListener('click', () => {
                this.showDatabaseDetails();
            });
            
            // Add visual feedback on hover
            dataHealthIndicator.addEventListener('mouseenter', () => {
                dataHealthIndicator.style.opacity = '0.8';
            });
            
            dataHealthIndicator.addEventListener('mouseleave', () => {
                dataHealthIndicator.style.opacity = '1';
            });
            
            console.log('✅ Database health indicator click handler setup');
        } else {
            console.warn('⚠️ dataHealthIndicator not found - retrying in 1 second');
            setTimeout(() => this.setupDatabaseHealthClickHandler(), 1000);
        }
    }
    
    async showDatabaseDetails() {
        try {
            // Get detailed database information
            const [healthResponse, schemaResponse, tablesResponse] = await Promise.all([
                fetch('http://localhost:3001/health').catch(() => null),
                fetch('http://localhost:3001/api/v1/db/schema').catch(() => null),
                fetch('http://localhost:3001/api/v1/db/tables').catch(() => null)
            ]);

            let healthData = { database: 'disconnected' };
            let schemaData = null;
            let tablesData = null;

            if (healthResponse && healthResponse.ok) {
                healthData = await healthResponse.json();
            }

            if (schemaResponse && schemaResponse.ok) {
                schemaData = await schemaResponse.json();
            }

            if (tablesResponse && tablesResponse.ok) {
                tablesData = await tablesResponse.json();
            }

            // Create or update database details modal
            let modal = document.getElementById('databaseDetailsModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'databaseDetailsModal';
                modal.className = 'modal';
                document.body.appendChild(modal);
            }

            // Build the modal content
            const isConnected = healthData.database === 'connected';
            const connectionStatus = isConnected ? '🟢 Connected' : '🔴 Disconnected';
            
            let tablesSection = '';
            if (tablesData && tablesData.tables) {
                const tableList = tablesData.tables
                    .slice(0, 15) // Show first 15 tables
                    .map(table => `<li><strong>${table.table_name}</strong> (${table.table_type})</li>`)
                    .join('');
                
                tablesSection = `
                    <div class="database-section">
                        <h4>📋 Database Tables (${tablesData.count} total)</h4>
                        <ul class="table-list">
                            ${tableList}
                            ${tablesData.count > 15 ? `<li><em>... and ${tablesData.count - 15} more tables</em></li>` : ''}
                        </ul>
                    </div>
                `;
            }

            let schemaSection = '';
            if (schemaData && schemaData.schema) {
                const schemaInfo = Object.keys(schemaData.schema)
                    .map(schema => {
                        const tableCount = Object.keys(schemaData.schema[schema]).length;
                        return `<li><strong>${schema}</strong>: ${tableCount} tables</li>`;
                    })
                    .join('');
                
                schemaSection = `
                    <div class="database-section">
                        <h4>🏗️ Database Schema</h4>
                        <ul class="schema-list">
                            ${schemaInfo}
                        </ul>
                        <p class="schema-stats">Total columns: ${schemaData.columnCount}</p>
                    </div>
                `;
            }

            modal.innerHTML = `
                <div class="modal-content database-modal">
                    <h3>🗄️ PostgreSQL Database Details</h3>
                    
                    <div class="database-status">
                        <div class="status-item">
                            <label>Connection Status:</label>
                            <span class="status-value ${isConnected ? 'connected' : 'disconnected'}">
                                ${connectionStatus}
                            </span>
                        </div>
                        <div class="status-item">
                            <label>Database Type:</label>
                            <span class="status-value">PostgreSQL</span>
                        </div>
                        <div class="status-item">
                            <label>Last Check:</label>
                            <span class="status-value">${new Date().toLocaleString()}</span>
                        </div>
                    </div>

                    ${tablesSection}
                    ${schemaSection}

                    ${isConnected ? `
                        <div class="database-section">
                            <h4>💡 Quick Commands</h4>
                            <div class="quick-commands">
                                <button class="quick-cmd-btn" onclick="navigator.clipboard.writeText('/sql &quot;SELECT table_name FROM information_schema.tables WHERE table_schema = \\'public\\'&quot;')">
                                    📋 Copy: List Tables Query
                                </button>
                                <button class="quick-cmd-btn" onclick="navigator.clipboard.writeText('/sql &quot;SELECT COUNT(*) FROM workflows&quot;')">
                                    📋 Copy: Count Workflows
                                </button>
                                <button class="quick-cmd-btn" onclick="navigator.clipboard.writeText('/db-query &quot;SELECT * FROM opportunities LIMIT 5&quot;')">
                                    📋 Copy: View Opportunities
                                </button>
                            </div>
                            <p class="help-text">💬 Use these commands in chat to query the database directly!</p>
                        </div>
                    ` : `
                        <div class="database-section error-section">
                            <h4>⚠️ Connection Issue</h4>
                            <p>Unable to connect to the PostgreSQL database. This could be due to:</p>
                            <ul>
                                <li>Database server is not running</li>
                                <li>API server is not running</li>
                                <li>Network connectivity issues</li>
                                <li>Database configuration problems</li>
                            </ul>
                            <p>Please check the server status and try again.</p>
                        </div>
                    `}
                    
                    <div class="modal-buttons">
                        <button id="refreshDbStatus" class="modal-button secondary">🔄 Refresh</button>
                        <button id="databaseModalClose" class="modal-button primary">Close</button>
                    </div>
                </div>
            `;

            // Add modal styles if they don't exist
            if (!document.getElementById('database-modal-styles')) {
                const style = document.createElement('style');
                style.id = 'database-modal-styles';
                style.textContent = `
                    .database-modal {
                        max-width: 700px;
                        max-height: 80vh;
                        overflow-y: auto;
                    }
                    
                    .database-status {
                        background: var(--bg-secondary);
                        border: 1px solid var(--border-primary);
                        border-radius: 6px;
                        padding: 16px;
                        margin: 16px 0;
                    }
                    
                    .database-section {
                        margin: 20px 0;
                        padding: 16px;
                        background: var(--bg-secondary);
                        border-radius: 6px;
                        border-left: 3px solid var(--accent-primary);
                    }
                    
                    .database-section h4 {
                        margin: 0 0 12px 0;
                        color: var(--text-primary);
                    }
                    
                    .table-list, .schema-list {
                        margin: 0;
                        padding-left: 20px;
                        max-height: 200px;
                        overflow-y: auto;
                    }
                    
                    .table-list li, .schema-list li {
                        margin: 4px 0;
                        color: var(--text-secondary);
                    }
                    
                    .schema-stats {
                        margin: 12px 0 0 0;
                        font-size: 0.9em;
                        color: var(--text-secondary);
                        font-style: italic;
                    }
                    
                    .quick-commands {
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                        margin: 12px 0;
                    }
                    
                    .quick-cmd-btn {
                        background: var(--accent-primary);
                        color: white;
                        border: none;
                        padding: 8px 12px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 0.9em;
                        transition: background-color 0.2s ease;
                    }
                    
                    .quick-cmd-btn:hover {
                        background: var(--accent-hover);
                    }
                    
                    .help-text {
                        margin: 12px 0 0 0;
                        font-size: 0.85em;
                        color: var(--text-secondary);
                        font-style: italic;
                    }
                    
                    .error-section {
                        border-left-color: #ef4444;
                        background: #fef2f2;
                    }
                    
                    .error-section h4 {
                        color: #dc2626;
                    }
                    
                    .status-value.connected {
                        color: #10b981;
                        font-weight: bold;
                    }
                    
                    .status-value.disconnected {
                        color: #ef4444;
                        font-weight: bold;
                    }
                `;
                document.head.appendChild(style);
            }

            // Show modal
            modal.style.display = 'block';
            
            // Add event listeners
            document.getElementById('databaseModalClose').onclick = () => {
                modal.style.display = 'none';
            };
            
            document.getElementById('refreshDbStatus').onclick = async () => {
                document.getElementById('refreshDbStatus').textContent = '🔄 Refreshing...';
                await this.checkDatabaseStatus();
                modal.style.display = 'none';
                setTimeout(() => this.showDatabaseDetails(), 500);
            };

            // Close modal when clicking outside
            modal.onclick = (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            };
            
        } catch (error) {
            console.error('Error showing database details:', error);
            alert('Failed to load database details. Please try again.');
        }
    }
    
    showStatusDetails() {
        const status = this.getDetailedStatus();
        
        // Create or update status modal
        let modal = document.getElementById('apiStatusModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'apiStatusModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }
        
        modal.innerHTML = `
            <div class="modal-content">
                <h3>API Connection Status</h3>
                <div class="status-details-content">
                    <div class="status-item">
                        <label>API Connection:</label>
                        <span class="status-value ${status.api.isOnline ? 'online' : 'offline'}">
                            ${status.api.isOnline ? 'Connected' : 'Offline'}
                        </span>
                    </div>
                    <div class="status-item">
                        <label>WebSocket:</label>
                        <span class="status-value ${status.websocket.connected ? 'online' : 'offline'}">
                            ${status.websocket.connected ? 'Connected' : 'Disconnected'}
                        </span>
                    </div>
                    <div class="status-item">
                        <label>Last Sync:</label>
                        <span class="status-value">
                            ${status.sync.lastSync ? new Date(status.sync.lastSync).toLocaleString() : 'Never'}
                        </span>
                    </div>
                    <div class="status-item">
                        <label>Queued Items:</label>
                        <span class="status-value">
                            ${status.sync.queuedItems} pending
                        </span>
                    </div>
                    <div class="status-actions">
                        <button id="forceSyncBtn" ${!status.api.isOnline ? 'disabled' : ''}>
                            Force Sync Now
                        </button>
                        <button id="clearQueueBtn">
                            Clear Queue
                        </button>
                    </div>
                </div>
                <div class="modal-buttons">
                    <button id="statusModalClose" class="modal-button">Close</button>
                </div>
            </div>
        `;
        
        // Show modal
        modal.style.display = 'block';
        
        // Add event listeners
        document.getElementById('statusModalClose').onclick = () => {
            modal.style.display = 'none';
        };
        
        document.getElementById('forceSyncBtn').onclick = async () => {
            try {
                this.updateStatusIndicator('syncing');
                await this.syncService.forceSyncNow();
            } catch (error) {
                alert('Sync failed: ' + error.message);
            }
        };
        
        document.getElementById('clearQueueBtn').onclick = () => {
            if (confirm('Clear all queued sync items? This cannot be undone.')) {
                this.syncService.clearSyncQueue();
                this.showStatusDetails(); // Refresh
            }
        };
    }
    
    setupUIIntegration() {
        // Replace existing workflow methods in the main app
        if (window.app && typeof window.app === 'object') {
            this.integrateWithMainApp();
        } else {
            // Wait for main app to be available
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => this.integrateWithMainApp(), 1000);
            });
        }
    }
    
    integrateWithMainApp() {
        // Check if ProcessFlowDesigner is available
        if (typeof ProcessFlowDesigner !== 'undefined' && window.app instanceof ProcessFlowDesigner) {
            console.log('🔗 Integrating with ProcessFlowDesigner...');
            this.integrateWithProcessFlowDesigner(window.app);
        } else {
            console.log('⚠️ ProcessFlowDesigner not found, using fallback integration');
            this.setupFallbackIntegration();
        }
    }
    
    integrateWithProcessFlowDesigner(app) {
        // Store original methods
        const originalSaveWorkflow = app.saveWorkflow.bind(app);
        const originalLoadWorkflow = app.loadWorkflow.bind(app);
        const originalAppendWorkflow = app.appendWorkflow.bind(app);
        
        // Replace workflow methods
        app.saveWorkflow = async () => {
            try {
                if (this.workflowAPIService.isOnline()) {
                    // Get current workflow data from the app
                    const workflowData = this.extractWorkflowDataFromApp(app);
                    const result = await this.workflowAPIService.saveWorkflow('Current Workflow', workflowData);
                    console.log('✅ Workflow saved to API:', result);
                    
                    // Show success message
                    this.showNotification('Workflow saved successfully!', 'success');
                } else {
                    // Fallback to original method
                    await originalSaveWorkflow();
                    this.showNotification('Workflow saved locally (will sync when online)', 'warning');
                }
            } catch (error) {
                console.error('Failed to save workflow:', error);
                
                // Fallback to original method
                try {
                    await originalSaveWorkflow();
                    this.showNotification('Saved locally due to API error', 'warning');
                } catch (fallbackError) {
                    this.showNotification('Failed to save workflow', 'error');
                }
            }
        };
        
        app.loadWorkflow = async (event) => {
            try {
                const file = event.target.files[0];
                if (!file) return;
                
                const workflowData = await this.workflowAPIService.loadWorkflow(file);
                
                // Apply the loaded data to the app
                this.applyWorkflowDataToApp(app, workflowData);
                
                this.showNotification('Workflow loaded successfully!', 'success');
            } catch (error) {
                console.error('Failed to load workflow:', error);
                
                // Fallback to original method
                try {
                    await originalLoadWorkflow(event);
                    this.showNotification('Workflow loaded locally', 'warning');
                } catch (fallbackError) {
                    this.showNotification('Failed to load workflow', 'error');
                }
            }
        };
        
        app.appendWorkflow = async (event) => {
            try {
                const file = event.target.files[0];
                if (!file) return;
                
                const workflowData = await this.workflowAPIService.appendWorkflow(file);
                
                // Apply the merged data to the app
                this.applyWorkflowDataToApp(app, workflowData);
                
                this.showNotification('Workflow appended successfully!', 'success');
            } catch (error) {
                console.error('Failed to append workflow:', error);
                
                // Fallback to original method
                try {
                    await originalAppendWorkflow(event);
                    this.showNotification('Workflow appended locally', 'warning');
                } catch (fallbackError) {
                    this.showNotification('Failed to append workflow', 'error');
                }
            }
        };
        
        console.log('✅ ProcessFlowDesigner integration complete');
    }
    
    setupFallbackIntegration() {
        // Listen for workflow-related events and handle them
        document.addEventListener('workflowSaveRequested', async (event) => {
            try {
                const workflowData = event.detail;
                await this.workflowAPIService.saveWorkflow('Current Workflow', workflowData);
                this.showNotification('Workflow saved successfully!', 'success');
            } catch (error) {
                console.error('Failed to save workflow:', error);
                this.showNotification('Failed to save workflow', 'error');
            }
        });
        
        console.log('✅ Fallback integration setup complete');
    }
    
    extractWorkflowDataFromApp(app) {
        // Extract current workflow data from the ProcessFlowDesigner app
        return {
            version: '2.0.0',
            nodes: this.extractNodesFromApp(app),
            tasks: this.extractTasksFromApp(app),
            flowlines: this.extractFlowlinesFromApp(app),
            opportunities: this.extractOpportunitiesFromApp(app),
            metadata: {
                extractedAt: new Date().toISOString(),
                extractedBy: 'api-integration'
            }
        };
    }
    
    extractNodesFromApp(app) {
        const nodes = [];
        if (app.nodeManager && app.nodeManager.nodes) {
            app.nodeManager.nodes.forEach(node => {
                nodes.push({
                    id: node.id,
                    type: node.type,
                    text: node.text,
                    position: node.position,
                    style: node.style,
                    metadata: node.metadata
                });
            });
        }
        return nodes;
    }
    
    extractTasksFromApp(app) {
        const tasks = [];
        if (app.taskNodes) {
            app.taskNodes.forEach(taskNode => {
                // Extract task data from DOM elements
                const taskData = this.extractTaskDataFromElement(taskNode);
                tasks.push(taskData);
            });
        }
        return tasks;
    }
    
    extractFlowlinesFromApp(app) {
        const flowlines = [];
        if (app.flowlineManager && app.flowlineManager.flowlines) {
            app.flowlineManager.flowlines.forEach(flowline => {
                flowlines.push({
                    id: flowline.id,
                    type: flowline.type,
                    source: flowline.source,
                    target: flowline.target,
                    path: flowline.path,
                    style: flowline.style,
                    metadata: flowline.metadata
                });
            });
        }
        return flowlines;
    }
    
    extractOpportunitiesFromApp(app) {
        const opportunities = [];
        if (app.opportunityController) {
            const oppData = app.opportunityController.getAllOpportunities();
            opportunities.push(...oppData);
        }
        return opportunities;
    }
    
    extractTaskDataFromElement(taskElement) {
        // Extract task data from DOM element
        return {
            id: taskElement.dataset.id,
            text: taskElement.querySelector('.task-text, .node-text')?.textContent || 'Unnamed Task',
            anchoredTo: taskElement.dataset.anchoredTo,
            opportunityId: taskElement.dataset.opportunityId,
            status: taskElement.dataset.status || 'not_started',
            priority: taskElement.dataset.priority || 'medium',
            position: {
                left: parseFloat(taskElement.style.left) || 0,
                top: parseFloat(taskElement.style.top) || 0
            },
            slot: parseInt(taskElement.dataset.slot) || 0
        };
    }
    
    applyWorkflowDataToApp(app, workflowData) {
        // Apply loaded workflow data to the app
        // This is a simplified version - the actual implementation would need
        // to properly reconstruct all DOM elements and app state
        
        console.log('Applying workflow data to app:', workflowData);
        
        // Dispatch event to notify app of new data
        document.dispatchEvent(new CustomEvent('workflowDataLoaded', {
            detail: workflowData
        }));
    }
    
    showNotification(message, type = 'info') {
        // Create or update notification
        let notification = document.getElementById('apiNotification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'apiNotification';
            notification.style.cssText = `
                position: fixed;
                top: 70px;
                right: 20px;
                padding: 12px 16px;
                border-radius: 6px;
                color: white;
                font-size: 14px;
                z-index: 2000;
                opacity: 0;
                transition: opacity 0.3s ease;
                max-width: 300px;
            `;
            document.body.appendChild(notification);
        }
        
        // Set style based on type
        switch (type) {
            case 'success':
                notification.style.backgroundColor = '#10B981';
                break;
            case 'warning':
                notification.style.backgroundColor = '#F59E0B';
                break;
            case 'error':
                notification.style.backgroundColor = '#EF4444';
                break;
            default:
                notification.style.backgroundColor = '#3B82F6';
        }
        
        notification.textContent = message;
        notification.style.opacity = '1';
        
        // Hide after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
        }, 3000);
    }
    
    // ===== PUBLIC METHODS =====
    
    getDetailedStatus() {
        return {
            api: this.apiClient ? this.apiClient.getConnectionStatus() : { isOnline: false },
            websocket: {
                connected: this.apiClient?.ws?.readyState === WebSocket.OPEN
            },
            sync: this.syncService ? this.syncService.getSyncStatus() : {
                lastSync: null,
                queuedItems: 0
            }
        };
    }
    
    async forceSync() {
        if (this.syncService) {
            await this.syncService.forceSyncNow();
        }
    }
    
    setConflictResolutionStrategy(strategy) {
        if (this.syncService) {
            this.syncService.setConflictResolutionStrategy(strategy);
        }
    }
    
    getServices() {
        return {
            apiClient: this.apiClient,
            syncService: this.syncService,
            workflowAPIService: this.workflowAPIService
        };
    }
}

// Create singleton instance
let apiIntegrationInstance = null;

export function getAPIIntegration() {
    if (!apiIntegrationInstance) {
        apiIntegrationInstance = new APIIntegration();
    }
    return apiIntegrationInstance;
}

export { APIIntegration };

// Initialize automatically when module is loaded
const apiIntegration = getAPIIntegration();

// Make available globally
if (typeof window !== 'undefined') {
    window.APIIntegration = APIIntegration;
    window.getAPIIntegration = getAPIIntegration;
    window.apiIntegration = apiIntegration;
}