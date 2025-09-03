/**
 * API Integration Service
 * Coordinates API client, sync service, and workflow API service
 */

console.log('📂 API Integration module started loading...');

import { getAPIClient } from './api-client.js';
import SyncService from './sync-service.js';
import WorkflowAPIService from './workflow-api-service.js';

console.log('📦 All imports loaded successfully');

class APIIntegration {
    constructor() {
        console.log('🚀 APIIntegration constructor called');
        this.apiClient = null;
        this.syncService = null;
        this.workflowAPIService = null;
        this.isInitialized = false;
        this.isIntegratedWithApp = false; // Prevent multiple integrations
        
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
        
        // Database health monitoring is now handled by health-manager.js
        // Conflicting database health checks have been disabled
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
        // DISABLED: Conflicting with api-health-handler.js - let the dedicated handler manage apiHealthIndicator
        // The api-health-handler.js already monitors and updates the apiHealthIndicator properly
        console.log('🔧 updateServiceHealthIndicators called with status:', status);
        console.log('ℹ️  API Health Indicator is managed by api-health-handler.js - skipping duplicate update');
        
        // Note: The apiHealthIndicator is now exclusively managed by api-health-handler.js
        // which checks http://localhost:3001/health every 10 seconds and applies proper styling
        
        // Database health is now managed by health-manager.js
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
        console.log('🔧 setupDatabaseHealthClickHandler() called');
        const dataHealthIndicator = document.getElementById('dataHealthIndicator');
        console.log('🔍 Element lookup result:', dataHealthIndicator ? 'FOUND' : 'NOT FOUND');
        
        if (dataHealthIndicator) {
            // Remove any existing listeners (in case of double setup)
            dataHealthIndicator.replaceWith(dataHealthIndicator.cloneNode(true));
            const refreshedElement = document.getElementById('dataHealthIndicator');
            
            refreshedElement.style.cursor = 'pointer';
            console.log('🎯 Adding click listener to dataHealthIndicator');
            
            const clickHandler = (event) => {
                console.log('🖱️ CLICK HANDLER TRIGGERED!', event);
                event.preventDefault();
                event.stopPropagation();
                // Use the modal from health-modals.js
                if (typeof window.showDataModal === 'function') {
                    window.showDataModal();
                } else {
                    this.showDatabaseDetails();
                }
            };
            
            refreshedElement.addEventListener('click', clickHandler, { capture: true });
            
            // Also add onclick as backup
            refreshedElement.onclick = clickHandler;
            
            // Add visual feedback on hover
            refreshedElement.addEventListener('mouseenter', () => {
                refreshedElement.style.opacity = '0.8';
                console.log('🐭 Mouse enter detected');
            });
            
            refreshedElement.addEventListener('mouseleave', () => {
                refreshedElement.style.opacity = '1';
                console.log('🐭 Mouse leave detected');
            });
            
            // Add debug border to show element is active
            refreshedElement.style.border = '2px solid #007bff';
            
            console.log('✅ Database health indicator click handler setup COMPLETE');
            console.log('✅ Element cursor style:', refreshedElement.style.cursor);
            console.log('✅ Element onclick:', refreshedElement.onclick ? 'SET' : 'NOT SET');
        } else {
            console.warn('⚠️ dataHealthIndicator not found - retrying in 1 second');
            setTimeout(() => this.setupDatabaseHealthClickHandler(), 1000);
        }
    }
    
    async showDatabaseDetails() {
        console.log('📊 showDatabaseDetails() called');
        try {
            // Get detailed database information
            const [healthResponse, schemaResponse, tablesResponse, connectionResponse] = await Promise.all([
                fetch('http://localhost:3001/health').catch(() => null),
                fetch('http://localhost:3001/api/v1/db/schema').catch(() => null),
                fetch('http://localhost:3001/api/v1/db/tables').catch(() => null),
                fetch('http://localhost:3001/api/v1/db/connection').catch(() => null)
            ]);

            let healthData = { database: 'disconnected' };
            let schemaData = null;
            let tablesData = null;
            let connectionData = null;

            if (healthResponse && healthResponse.ok) {
                healthData = await healthResponse.json();
            }

            if (schemaResponse && schemaResponse.ok) {
                schemaData = await schemaResponse.json();
            }

            if (tablesResponse && tablesResponse.ok) {
                tablesData = await tablesResponse.json();
            }

            if (connectionResponse && connectionResponse.ok) {
                connectionData = await connectionResponse.json();
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
            
            // Build connection information section
            let connectionSection = '';
            if (connectionData && connectionData.connection) {
                const conn = connectionData.connection;
                connectionSection = `
                    <div class="database-section">
                        <h4>🔗 Connection Information</h4>
                        <div class="connection-details">
                            <div class="connection-row">
                                <label>Database URL:</label>
                                <span class="connection-value">${conn.url}</span>
                            </div>
                            <div class="connection-row">
                                <label>Host:</label>
                                <span class="connection-value">${conn.host}</span>
                            </div>
                            <div class="connection-row">
                                <label>Port:</label>
                                <span class="connection-value">${conn.port}</span>
                            </div>
                            <div class="connection-row">
                                <label>Database Name:</label>
                                <span class="connection-value">${conn.database}</span>
                            </div>
                            <div class="connection-row">
                                <label>Username:</label>
                                <span class="connection-value">${conn.username}</span>
                            </div>
                            <div class="connection-row">
                                <label>API Endpoint:</label>
                                <span class="connection-value">${connectionData.api_endpoint}</span>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            let tablesSection = '';
            if (tablesData && tablesData.tables) {
                // Show all tables, organized by schema
                const tablesBySchema = {};
                tablesData.tables.forEach(table => {
                    if (!tablesBySchema[table.table_schema]) {
                        tablesBySchema[table.table_schema] = [];
                    }
                    tablesBySchema[table.table_schema].push(table);
                });
                
                const schemaTableList = Object.keys(tablesBySchema)
                    .map(schema => {
                        const tables = tablesBySchema[schema]
                            .map(table => `<li><strong>${table.table_name}</strong> (${table.table_type})</li>`)
                            .join('');
                        return `
                            <div class="schema-group">
                                <h5>Schema: ${schema}</h5>
                                <ul class="table-list">
                                    ${tables}
                                </ul>
                            </div>
                        `;
                    })
                    .join('');
                
                tablesSection = `
                    <div class="database-section">
                        <h4>📋 Database Tables (${tablesData.count} total)</h4>
                        ${schemaTableList}
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

                    ${connectionSection}
                    ${tablesSection}
                    ${schemaSection}

                    ${!isConnected ? `
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
                    
                    .connection-details {
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    }
                    
                    .connection-row {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 6px 0;
                        border-bottom: 1px solid var(--border-primary);
                    }
                    
                    .connection-row:last-child {
                        border-bottom: none;
                    }
                    
                    .connection-row label {
                        font-weight: bold;
                        color: var(--text-primary);
                        min-width: 120px;
                    }
                    
                    .connection-value {
                        font-family: 'Courier New', monospace;
                        color: var(--text-secondary);
                        word-break: break-all;
                        text-align: right;
                        flex: 1;
                        margin-left: 16px;
                    }
                    
                    .schema-group {
                        margin: 16px 0;
                    }
                    
                    .schema-group h5 {
                        margin: 0 0 8px 0;
                        color: var(--accent-primary);
                        font-size: 0.9em;
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
        console.log('🔧 setupUIIntegration() called');
        console.log('🔧 window.processFlowDesigner exists:', window.processFlowDesigner ? 'YES' : 'NO');
        console.log('🔧 window.app exists:', window.app ? 'YES' : 'NO');
        
        // Replace existing workflow methods in the main app
        const mainApp = window.processFlowDesigner || window.app;
        if (mainApp && typeof mainApp === 'object') {
            console.log('📱 Main app found, integrating immediately');
            this.integrateWithMainApp();
        } else {
            console.log('⏳ Main app not ready, setting up multiple fallback attempts');
            
            // Try multiple approaches to ensure integration happens
            // 1. DOMContentLoaded
            document.addEventListener('DOMContentLoaded', () => {
                console.log('📄 DOMContentLoaded fired, attempting integration');
                this.tryIntegration();
            });
            
            // 2. Immediate polling
            this.pollForMainApp();
            
            // 3. Window load event
            window.addEventListener('load', () => {
                console.log('🪟 Window load fired, attempting integration');
                this.tryIntegration();
            });
        }
    }
    
    pollForMainApp() {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max
        
        const poll = () => {
            attempts++;
            console.log(`🔍 Polling for main app (attempt ${attempts}/${maxAttempts})`);
            
            const mainApp = window.processFlowDesigner || window.app;
            if (mainApp && typeof mainApp === 'object') {
                console.log('✅ Main app found via polling!');
                this.integrateWithMainApp();
                return;
            }
            
            if (attempts < maxAttempts) {
                setTimeout(poll, 100);
            } else {
                console.log('⚠️ Polling timeout - falling back to event-only integration');
                this.setupFallbackIntegration();
            }
        };
        
        setTimeout(poll, 100); // Start polling after 100ms
    }
    
    tryIntegration() {
        console.log('🔄 tryIntegration() called');
        setTimeout(() => {
            const mainApp = window.processFlowDesigner || window.app;
            if (mainApp && typeof mainApp === 'object') {
                console.log('✅ Main app found in tryIntegration!');
                this.integrateWithMainApp();
            } else {
                console.log('❌ Main app still not found in tryIntegration');
            }
        }, 500);
    }
    
    integrateWithMainApp() {
        console.log('🔗 integrateWithMainApp() called');
        
        // Prevent multiple integrations
        if (this.isIntegratedWithApp) {
            console.log('ℹ️ Already integrated with main app, skipping');
            return;
        }
        
        console.log('🔗 ProcessFlowDesigner available:', typeof ProcessFlowDesigner !== 'undefined' ? 'YES' : 'NO');
        const mainApp = window.processFlowDesigner || window.app;
        console.log('🔗 mainApp found:', mainApp ? 'YES' : 'NO');
        console.log('🔗 mainApp is ProcessFlowDesigner:', mainApp instanceof ProcessFlowDesigner ? 'YES' : 'NO');
        
        // Check if ProcessFlowDesigner is available
        if (typeof ProcessFlowDesigner !== 'undefined' && mainApp instanceof ProcessFlowDesigner) {
            console.log('🔗 Integrating with ProcessFlowDesigner...');
            this.integrateWithProcessFlowDesigner(mainApp);
            this.isIntegratedWithApp = true;
        } else {
            console.log('⚠️ ProcessFlowDesigner not found, using fallback integration');
            this.setupFallbackIntegration();
        }
    }
    
    integrateWithProcessFlowDesigner(app) {
        console.log('🔗 INTEGRATION: integrateWithProcessFlowDesigner() called with app:', app ? 'PROVIDED' : 'NULL');
        console.log('🔗 INTEGRATION: App type:', typeof app);
        console.log('🔗 INTEGRATION: App constructor:', app ? app.constructor.name : 'N/A');
        
        // Store original methods
        const originalSaveWorkflow = app.saveWorkflow.bind(app);
        const originalLoadWorkflow = app.loadWorkflow.bind(app);
        const originalAppendWorkflow = app.appendWorkflow.bind(app);
        
        console.log('🔗 INTEGRATION: About to setup item persistence listeners...');
        // Setup event listeners for individual item persistence
        this.setupItemPersistenceListeners(app);
        console.log('🔗 INTEGRATION: Item persistence listeners setup completed');
        
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
    
    setupItemPersistenceListeners(app) {
        console.log('🔗 PERSISTENCE SETUP: Setting up item persistence listeners...');
        console.log('🔗 PERSISTENCE SETUP: App parameter:', app ? 'PROVIDED' : 'NULL');
        
        // Listen for node creation events
        document.addEventListener('node.created', async (event) => {
            console.log('📦 Node created event received:', event.detail);
            await this.persistNode(event.detail);
        });
        
        // Listen for task creation events
        document.addEventListener('task.created', async (event) => {
            console.log('📋 Task created event received:', event.detail);
            await this.persistTask(event.detail);
        });
        
        // Listen for opportunity creation events  
        document.addEventListener('opportunity.created', async (event) => {
            console.log('🎉 EVENT RECEIVED: opportunity.created event triggered!');
            console.log('🎉 Event timestamp:', new Date().toISOString());
            console.log('🎉 Event detail data:', event.detail);
            console.log('🎉 About to call persistOpportunity...');
            await this.persistOpportunity(event.detail);
            console.log('🎉 persistOpportunity call completed');
        });
        
        // Listen for flowline creation events
        document.addEventListener('flowline.created', async (event) => {
            console.log('🔗 Flowline created event received:', event.detail);
            await this.persistFlowline(event.detail);
        });
        
        // Also listen for generic DOM events if the above don't work
        if (app.eventBus) {
            app.eventBus.on('node.created', async (data) => {
                console.log('📦 Node created via eventBus:', data);
                await this.persistNode(data);
            });
            
            app.eventBus.on('task.created', async (data) => {
                console.log('📋 Task created via eventBus:', data);
                await this.persistTask(data);
            });
        }
        
        console.log('✅ Item persistence listeners setup complete');
    }
    
    async persistNode(nodeData) {
        if (!this.apiClient || !this.apiClient.isConnected()) {
            console.log('📦 API not connected, skipping node persistence');
            return;
        }
        
        try {
            const nodeApiData = {
                workflowId: await this.getCurrentWorkflowId(),
                type: nodeData.type,
                text: nodeData.name || this.getNodeText(nodeData.node),
                positionX: parseFloat(nodeData.node?.style?.left) || 50,
                positionY: parseFloat(nodeData.node?.style?.top) || 50,
                style: {},
                metadata: {
                    nodeId: nodeData.nodeId,
                    created_at: new Date().toISOString()
                }
            };
            
            console.log('📦 Persisting node to API:', nodeApiData);
            const result = await this.apiClient.createNode(nodeApiData);
            console.log('✅ Node persisted successfully:', result);
            
        } catch (error) {
            console.error('❌ Failed to persist node:', error);
        }
    }
    
    async persistTask(taskData) {
        if (!this.apiClient || !this.apiClient.isConnected()) {
            console.log('📋 API not connected, skipping task persistence');
            return;
        }
        
        try {
            const taskApiData = {
                workflowId: await this.getCurrentWorkflowId(),
                anchoredTo: this.getNodeIdForTask(taskData),
                text: taskData.name || taskData.text,
                description: taskData.description || '',
                status: this.mapTaskStatus(taskData.status || 'pending'),
                priority: taskData.priority || 'medium',
                positionX: parseFloat(taskData.position?.x) || 100,
                positionY: parseFloat(taskData.position?.y) || 100,
                slot: taskData.slot || 0
            };
            
            // Only add optional numeric fields if they exist and are valid
            if (taskData.estimatedHours && typeof taskData.estimatedHours === 'number') {
                taskApiData.estimatedHours = taskData.estimatedHours;
            }
            if (taskData.dueDate) {
                taskApiData.dueDate = taskData.dueDate;
            }
            if (taskData.assignedTo) {
                taskApiData.assignedTo = taskData.assignedTo;
            }
            if (taskData.opportunityId) {
                taskApiData.opportunityId = taskData.opportunityId;
            }
            
            console.log('📋 DETAILED: Persisting task to API with data:');
            console.log('📋 Original taskData:', JSON.stringify(taskData, null, 2));
            console.log('📋 Processed taskApiData:', JSON.stringify(taskApiData, null, 2));
            console.log('📋 anchoredTo value:', taskApiData.anchoredTo);
            console.log('📋 anchoredTo type:', typeof taskApiData.anchoredTo);
            
            const result = await this.apiClient.createTask(taskApiData);
            console.log('✅ Task persisted successfully:', result);
            
        } catch (error) {
            console.error('❌ Failed to persist task:', error);
        }
    }
    
    async persistOpportunity(opportunityData) {
        console.log('🔥 persistOpportunity() called with data:', opportunityData);
        console.log('🔍 API Client status:', this.apiClient ? 'EXISTS' : 'NULL');
        console.log('🔍 API Client connected:', this.apiClient ? this.apiClient.isConnected() : 'N/A');
        
        if (!this.apiClient || !this.apiClient.isConnected()) {
            console.log('❌ API not connected, skipping opportunity persistence');
            console.log('❌ API Client:', this.apiClient);
            console.log('❌ Is Connected:', this.apiClient ? this.apiClient.isConnected() : 'N/A');
            return;
        }
        
        try {
            console.log('🔄 Getting current workflow ID...');
            const workflowId = await this.getCurrentWorkflowId();
            console.log('📋 Current workflow ID:', workflowId);
            
            const oppApiData = {
                workflowId: workflowId,
                title: opportunityData.title || opportunityData.name,
                description: opportunityData.description || 'Opportunity created from UI',
                status: opportunityData.status || 'active',
                priority: opportunityData.metadata?.priority || 'medium', // Fix: Use metadata.priority
                tags: opportunityData.tags || []
            };
            
            // Only add optional fields if they exist and are valid
            if (opportunityData.metadata?.value && typeof opportunityData.metadata.value === 'number') {
                oppApiData.value = opportunityData.metadata.value;
            }
            if (opportunityData.metadata?.contact_person) {
                oppApiData.contactPerson = opportunityData.metadata.contact_person;
            }
            if (opportunityData.metadata?.notes) {
                oppApiData.notes = opportunityData.metadata.notes;
            }
            if (opportunityData.metadata?.deadline) {
                oppApiData.deadline = opportunityData.metadata.deadline;
            }
            
            console.log('🚀 CALLING API: Persisting opportunity to API with data:', oppApiData);
            console.log('🌐 API Client createOpportunity method exists:', typeof this.apiClient.createOpportunity === 'function');
            console.log('🌐 API Client methods available:', Object.getOwnPropertyNames(this.apiClient));
            
            if (typeof this.apiClient.createOpportunity !== 'function') {
                console.error('❌ API Client createOpportunity method not found!');
                console.error('❌ Available methods:', Object.getOwnPropertyNames(this.apiClient).filter(name => typeof this.apiClient[name] === 'function'));
                return;
            }
            
            console.log('🌐 Making API call now...');
            const result = await this.apiClient.createOpportunity(oppApiData);
            console.log('✅ Opportunity persisted successfully:', result);
            
        } catch (error) {
            console.error('❌ Failed to persist opportunity:', error);
        }
    }
    
    async persistFlowline(flowlineData) {
        // TODO: Individual flowline persistence not implemented yet
        // Flowlines are currently handled through full workflow saves
        console.log('🔗 Flowline creation detected but individual persistence not implemented yet:', flowlineData);
        console.log('💡 Flowlines will be persisted when the full workflow is saved');
        return;
    }
    
    // Helper methods
    async getCurrentWorkflowId() {
        console.log('🔍 getCurrentWorkflowId called');
        console.log('🔍 workflowAPIService exists:', !!this.workflowAPIService);
        console.log('🔍 current workflowId:', this.workflowAPIService?.currentWorkflowId);
        
        if (this.workflowAPIService?.currentWorkflowId) {
            console.log('✅ Using existing workflow ID:', this.workflowAPIService.currentWorkflowId);
            return this.workflowAPIService.currentWorkflowId;
        }
        
        console.log('⚠️ No existing workflow ID, creating default workflow...');
        const newWorkflowId = await this.createDefaultWorkflow();
        console.log('🆕 Created/received workflow ID:', newWorkflowId);
        return newWorkflowId;
    }
    
    async createDefaultWorkflow() {
        console.log('🔧 createDefaultWorkflow called');
        console.log('🔧 apiClient exists:', !!this.apiClient);
        console.log('🔧 apiClient connected:', this.apiClient?.isConnected());
        
        if (!this.apiClient || !this.apiClient.isConnected()) {
            console.log('❌ API client not available or not connected');
            return null;
        }
        
        try {
            const defaultWorkflow = {
                name: 'Unnamed Workflow',
                description: 'Auto-created workflow for items',
                version: '1.0.0',
                metadata: {
                    auto_created: true,
                    created_at: new Date().toISOString()
                }
            };
            
            console.log('🔧 Creating workflow with data:', JSON.stringify(defaultWorkflow, null, 2));
            const result = await this.apiClient.createWorkflow(defaultWorkflow);
            console.log('🔧 Workflow creation result:', JSON.stringify(result, null, 2));
            
            if (this.workflowAPIService) {
                this.workflowAPIService.currentWorkflowId = result.id;
                console.log('🔧 Set workflowAPIService.currentWorkflowId to:', result.id);
            } else {
                console.log('⚠️ workflowAPIService not available to store workflow ID');
            }
            
            console.log('✅ Created default workflow:', result.id);
            return result.id;
        } catch (error) {
            console.error('❌ Failed to create default workflow:', error);
            console.error('❌ Error details:', error.message, error.stack);
            return null;
        }
    }
    
    getNodeText(node) {
        if (!node) return 'Unnamed Node';
        const textElement = node.querySelector('.node-text');
        return textElement ? textElement.textContent : 'Unnamed Node';
    }
    
    getNodeIdForTask(taskData) {
        // Try to find the associated node for this task
        let anchoredToId = taskData.nodeId || taskData.anchoredTo;
        
        // If anchoredToId is not a valid UUID (contains only digits), we need to handle it
        if (anchoredToId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(anchoredToId)) {
            // This is likely a local node ID (counter), try to find a corresponding UUID
            // For now, we'll generate a placeholder UUID or return null to make it optional
            console.log(`⚠️ Task anchoredTo field "${anchoredToId}" is not a valid UUID, using null`);
            return null;
        }
        
        return anchoredToId;
    }
    
    mapTaskStatus(status) {
        // Map frontend task status to API expected values
        const statusMap = {
            'pending': 'not_started',
            'not_started': 'not_started',
            'in_progress': 'in_progress',
            'completed': 'completed',
            'on_hold': 'on_hold'
        };
        return statusMap[status] || 'not_started';
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
console.log('📦 API Integration module loading...');
const apiIntegration = getAPIIntegration();
console.log('📦 API Integration instance created:', apiIntegration);

// Make available globally
if (typeof window !== 'undefined') {
    console.log('🌐 Making API Integration available globally');
    window.APIIntegration = APIIntegration;
    window.getAPIIntegration = getAPIIntegration;
    window.apiIntegration = apiIntegration;
    console.log('✅ API Integration module loaded successfully');
} else {
    console.warn('⚠️ Window object not available - API Integration not made global');
}