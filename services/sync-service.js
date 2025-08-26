/**
 * Sync Service
 * Handles synchronization between frontend localStorage and PostgreSQL backend
 */

class SyncService {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.isInitialized = false;
        this.syncInProgress = false;
        this.lastSyncTimestamp = null;
        this.conflictResolutionStrategy = 'server-wins'; // 'client-wins', 'server-wins', 'merge'
        
        // Sync queue for offline operations
        this.syncQueue = [];
        
        this.initialize();
    }
    
    async initialize() {
        console.log('🔄 Initializing sync service...');
        
        // Load last sync timestamp
        this.loadSyncState();
        
        // Listen for API connection events
        document.addEventListener('apiConnectionEstablished', () => {
            this.performInitialSync();
        });
        
        document.addEventListener('apiConnectionFailed', () => {
            console.log('📴 API offline, enabling offline mode');
        });
        
        // Listen for data changes to queue for sync
        this.setupChangeListeners();
        
        this.isInitialized = true;
        console.log('✅ Sync service initialized');
    }
    
    loadSyncState() {
        try {
            const syncState = localStorage.getItem('ui_process_sync_state');
            if (syncState) {
                const state = JSON.parse(syncState);
                this.lastSyncTimestamp = state.lastSyncTimestamp;
                this.syncQueue = state.syncQueue || [];
            }
        } catch (error) {
            console.warn('Could not load sync state:', error);
        }
    }
    
    saveSyncState() {
        try {
            const syncState = {
                lastSyncTimestamp: this.lastSyncTimestamp,
                syncQueue: this.syncQueue
            };
            localStorage.setItem('ui_process_sync_state', JSON.stringify(syncState));
        } catch (error) {
            console.warn('Could not save sync state:', error);
        }
    }
    
    setupChangeListeners() {
        // Listen for workflow changes
        document.addEventListener('workflowDataChanged', (event) => {
            this.queueForSync('workflow', event.detail);
        });
        
        document.addEventListener('nodeCreated', (event) => {
            this.queueForSync('node', { action: 'create', data: event.detail });
        });
        
        document.addEventListener('taskCreated', (event) => {
            this.queueForSync('task', { action: 'create', data: event.detail });
        });
        
        document.addEventListener('opportunityCreated', (event) => {
            this.queueForSync('opportunity', { action: 'create', data: event.detail });
        });
    }
    
    queueForSync(type, data) {
        if (!this.apiClient.isConnected()) {
            console.log(`📋 Queuing ${type} for sync:`, data);
            this.syncQueue.push({
                type,
                data,
                timestamp: new Date().toISOString(),
                retryCount: 0
            });
            this.saveSyncState();
        } else {
            // If online, sync immediately
            this.syncItem(type, data);
        }
    }
    
    async performInitialSync() {
        if (this.syncInProgress) {
            console.log('⏳ Sync already in progress, skipping');
            return;
        }
        
        console.log('🔄 Starting initial sync...');
        this.syncInProgress = true;
        
        try {
            // Step 1: Check if we have local data
            const hasLocalData = this.hasLocalWorkflowData();
            
            if (hasLocalData) {
                // Step 2: Check for existing workflows on server
                const serverWorkflows = await this.apiClient.getWorkflows();
                
                if (serverWorkflows.workflows.length === 0) {
                    // No server data, upload local data
                    await this.uploadLocalDataToServer();
                } else {
                    // Both have data, need conflict resolution
                    await this.resolveDataConflicts(serverWorkflows.workflows);
                }
            } else {
                // No local data, download from server
                await this.downloadServerDataToLocal();
            }
            
            // Step 3: Process any queued changes
            await this.processSyncQueue();
            
            this.lastSyncTimestamp = new Date().toISOString();
            this.saveSyncState();
            
            console.log('✅ Initial sync completed');
            
            // Dispatch sync completed event
            document.dispatchEvent(new CustomEvent('syncCompleted', {
                detail: { 
                    timestamp: this.lastSyncTimestamp,
                    type: 'initial'
                }
            }));
            
        } catch (error) {
            console.error('❌ Initial sync failed:', error);
            
            // Dispatch sync failed event
            document.dispatchEvent(new CustomEvent('syncFailed', {
                detail: { 
                    error: error.message,
                    type: 'initial'
                }
            }));
        } finally {
            this.syncInProgress = false;
        }
    }
    
    hasLocalWorkflowData() {
        try {
            const workflows = localStorage.getItem('workflows');
            return workflows && JSON.parse(workflows).length > 0;
        } catch (error) {
            return false;
        }
    }
    
    async uploadLocalDataToServer() {
        console.log('📤 Uploading local data to server...');
        
        try {
            // Get local workflow data
            const localWorkflows = this.getLocalWorkflows();
            
            for (const workflow of localWorkflows) {
                console.log(`📤 Uploading workflow: ${workflow.name}`);
                
                // Convert local format to API format if needed
                const apiWorkflow = this.convertLocalToAPIFormat(workflow);
                
                try {
                    await this.apiClient.importWorkflow(apiWorkflow);
                    console.log(`✅ Uploaded workflow: ${workflow.name}`);
                } catch (error) {
                    console.error(`❌ Failed to upload workflow ${workflow.name}:`, error);
                    // Continue with other workflows
                }
            }
            
        } catch (error) {
            console.error('Failed to upload local data:', error);
            throw error;
        }
    }
    
    async downloadServerDataToLocal() {
        console.log('📥 Downloading server data to local...');
        
        try {
            const serverWorkflows = await this.apiClient.getWorkflows();
            
            if (serverWorkflows.workflows.length === 0) {
                console.log('No server data to download');
                return;
            }
            
            // Clear local data first
            this.clearLocalWorkflowData();
            
            for (const workflow of serverWorkflows.workflows) {
                console.log(`📥 Downloading workflow: ${workflow.name}`);
                
                // Get full workflow data
                const fullWorkflow = await this.apiClient.exportWorkflow(workflow.id);
                
                // Convert to local format and store
                const localWorkflow = this.convertAPIToLocalFormat(fullWorkflow);
                this.storeLocalWorkflow(localWorkflow);
            }
            
            console.log(`✅ Downloaded ${serverWorkflows.workflows.length} workflows`);
            
        } catch (error) {
            console.error('Failed to download server data:', error);
            throw error;
        }
    }
    
    async resolveDataConflicts(serverWorkflows) {
        console.log('⚖️ Resolving data conflicts...');
        
        const localWorkflows = this.getLocalWorkflows();
        
        switch (this.conflictResolutionStrategy) {
            case 'server-wins':
                console.log('📥 Using server data (server-wins strategy)');
                await this.downloadServerDataToLocal();
                break;
                
            case 'client-wins':
                console.log('📤 Using local data (client-wins strategy)');
                await this.uploadLocalDataToServer();
                break;
                
            case 'merge':
                console.log('🔀 Attempting to merge data');
                await this.mergeWorkflowData(localWorkflows, serverWorkflows);
                break;
                
            default:
                // Default to server-wins
                await this.downloadServerDataToLocal();
        }
    }
    
    async mergeWorkflowData(localWorkflows, serverWorkflows) {
        // Simple merge strategy: keep both, rename conflicts
        for (const localWorkflow of localWorkflows) {
            const serverMatch = serverWorkflows.find(sw => 
                sw.name === localWorkflow.name ||
                this.isSimilarWorkflow(localWorkflow, sw)
            );
            
            if (!serverMatch) {
                // No conflict, upload local workflow
                await this.apiClient.importWorkflow(this.convertLocalToAPIFormat(localWorkflow));
            } else {
                // Conflict: rename local workflow and upload
                localWorkflow.name += ' (Local Copy)';
                await this.apiClient.importWorkflow(this.convertLocalToAPIFormat(localWorkflow));
            }
        }
        
        // Download server data to get the complete merged dataset
        await this.downloadServerDataToLocal();
    }
    
    isSimilarWorkflow(local, server) {
        // Simple similarity check based on node count and task count
        const localNodeCount = local.nodes?.length || 0;
        const serverNodeCount = server.node_count || 0;
        const localTaskCount = local.tasks?.length || 0;
        const serverTaskCount = server.task_count || 0;
        
        return Math.abs(localNodeCount - serverNodeCount) <= 1 && 
               Math.abs(localTaskCount - serverTaskCount) <= 1;
    }
    
    async processSyncQueue() {
        if (this.syncQueue.length === 0) {
            return;
        }
        
        console.log(`🔄 Processing ${this.syncQueue.length} queued sync items...`);
        
        const processedItems = [];
        
        for (const item of this.syncQueue) {
            try {
                await this.syncItem(item.type, item.data);
                processedItems.push(item);
                console.log(`✅ Synced queued ${item.type}`);
            } catch (error) {
                console.error(`❌ Failed to sync queued ${item.type}:`, error);
                
                item.retryCount++;
                if (item.retryCount >= 3) {
                    console.error(`🚫 Dropping ${item.type} after 3 failed attempts`);
                    processedItems.push(item);
                }
            }
        }
        
        // Remove processed items from queue
        this.syncQueue = this.syncQueue.filter(item => !processedItems.includes(item));
        this.saveSyncState();
    }
    
    async syncItem(type, data) {
        switch (type) {
            case 'workflow':
                return this.syncWorkflow(data);
            case 'node':
                return this.syncNode(data);
            case 'task':
                return this.syncTask(data);
            case 'opportunity':
                return this.syncOpportunity(data);
            default:
                console.warn('Unknown sync item type:', type);
        }
    }
    
    async syncWorkflow(data) {
        if (data.action === 'create') {
            return this.apiClient.createWorkflow(data.data);
        } else if (data.action === 'update') {
            return this.apiClient.updateWorkflow(data.id, data.data);
        }
        // Handle other actions as needed
    }
    
    async syncNode(data) {
        if (data.action === 'create') {
            return this.apiClient.createNode(data.data);
        }
        // Handle other actions as needed
    }
    
    async syncTask(data) {
        if (data.action === 'create') {
            return this.apiClient.createTask(data.data);
        }
        // Handle other actions as needed
    }
    
    async syncOpportunity(data) {
        if (data.action === 'create') {
            return this.apiClient.createOpportunity(data.data);
        }
        // Handle other actions as needed
    }
    
    // ===== DATA FORMAT CONVERSION =====
    
    convertLocalToAPIFormat(localWorkflow) {
        // Convert from frontend localStorage format to API import format
        return {
            name: localWorkflow.name || 'Imported Workflow',
            version: localWorkflow.version || '2.0.0',
            nodes: localWorkflow.nodes || [],
            tasks: localWorkflow.tasks || [],
            flowlines: localWorkflow.flowlines || [],
            opportunities: localWorkflow.opportunities || [],
            relationships: localWorkflow.relationships,
            metadata: {
                ...localWorkflow.metadata,
                importedFrom: 'localStorage',
                originalVersion: localWorkflow.version
            }
        };
    }
    
    convertAPIToLocalFormat(apiWorkflow) {
        // Convert from API export format to frontend localStorage format
        return {
            name: apiWorkflow.name,
            version: apiWorkflow.version,
            created_at: apiWorkflow.created_at,
            updated_at: apiWorkflow.updated_at,
            nodes: apiWorkflow.nodes || [],
            tasks: apiWorkflow.tasks || [],
            flowlines: apiWorkflow.flowlines || [],
            opportunities: apiWorkflow.opportunities || [],
            relationships: apiWorkflow.relationships,
            metadata: {
                ...apiWorkflow.metadata,
                syncedFrom: 'api',
                apiId: apiWorkflow.id
            }
        };
    }
    
    // ===== LOCAL DATA MANAGEMENT =====
    
    getLocalWorkflows() {
        try {
            const workflows = localStorage.getItem('workflows');
            return workflows ? JSON.parse(workflows) : [];
        } catch (error) {
            console.error('Failed to get local workflows:', error);
            return [];
        }
    }
    
    storeLocalWorkflow(workflow) {
        try {
            const workflows = this.getLocalWorkflows();
            workflows.push(workflow);
            localStorage.setItem('workflows', JSON.stringify(workflows));
        } catch (error) {
            console.error('Failed to store local workflow:', error);
        }
    }
    
    clearLocalWorkflowData() {
        try {
            localStorage.removeItem('workflows');
            localStorage.removeItem('nodes');
            localStorage.removeItem('tasks');
            localStorage.removeItem('opportunities');
        } catch (error) {
            console.error('Failed to clear local data:', error);
        }
    }
    
    // ===== PUBLIC METHODS =====
    
    async forceSyncNow() {
        if (this.apiClient.isConnected()) {
            await this.performInitialSync();
        } else {
            throw new Error('Cannot sync: API is offline');
        }
    }
    
    setConflictResolutionStrategy(strategy) {
        this.conflictResolutionStrategy = strategy;
        this.saveSyncState();
    }
    
    getSyncStatus() {
        return {
            isInitialized: this.isInitialized,
            syncInProgress: this.syncInProgress,
            lastSyncTimestamp: this.lastSyncTimestamp,
            queuedItems: this.syncQueue.length,
            isOnline: this.apiClient.isConnected()
        };
    }
    
    clearSyncQueue() {
        this.syncQueue = [];
        this.saveSyncState();
    }
}

// Export for use
export default SyncService;