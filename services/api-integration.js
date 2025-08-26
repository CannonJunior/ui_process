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