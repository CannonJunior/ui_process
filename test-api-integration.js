/**
 * API Integration Test Script
 * Tests the Phase 2 API integration functionality
 */

console.log('🧪 Starting API Integration Tests...');

// Wait for API integration to be ready
document.addEventListener('apiIntegrationReady', async (event) => {
    console.log('✅ API Integration Ready:', event.detail);
    
    const { apiClient, syncService, workflowAPIService } = event.detail;
    
    // Test 1: Check API connection
    console.log('🔍 Test 1: API Connection Status');
    const connectionStatus = apiClient.getConnectionStatus();
    console.log('Connection Status:', connectionStatus);
    
    // Test 2: Test API client methods
    console.log('🔍 Test 2: API Client Methods');
    try {
        const workflows = await apiClient.getWorkflows();
        console.log('✅ API Client - Get Workflows:', workflows);
    } catch (error) {
        console.log('❌ API Client Error:', error.message);
    }
    
    // Test 3: Test sync status
    console.log('🔍 Test 3: Sync Service Status');
    const syncStatus = syncService.getSyncStatus();
    console.log('Sync Status:', syncStatus);
    
    // Test 4: Test workflow creation through API service
    console.log('🔍 Test 4: Workflow API Service');
    try {
        const testWorkflowData = {
            version: '2.0.0',
            nodes: [
                {
                    id: 'test-node-1',
                    type: 'process',
                    text: 'Test Node',
                    position: { left: 100, top: 100 }
                }
            ],
            tasks: [],
            flowlines: [],
            opportunities: [],
            metadata: {
                testData: true,
                createdBy: 'api-integration-test'
            }
        };
        
        const result = await workflowAPIService.saveWorkflow('API Test Workflow', testWorkflowData);
        console.log('✅ Workflow API Service - Save Workflow:', result);
    } catch (error) {
        console.log('❌ Workflow API Service Error:', error.message);
    }
    
    // Test 5: Test WebSocket connection
    console.log('🔍 Test 5: WebSocket Connection');
    if (apiClient.ws) {
        console.log('WebSocket State:', apiClient.ws.readyState);
        console.log('WebSocket URL:', apiClient.ws.url);
        
        // Send a test ping
        if (apiClient.ws.readyState === WebSocket.OPEN) {
            apiClient.ws.send(JSON.stringify({ type: 'ping' }));
            console.log('✅ Sent WebSocket ping');
        }
    } else {
        console.log('❌ WebSocket not initialized');
    }
    
    console.log('🎉 API Integration Tests Completed');
});

document.addEventListener('apiIntegrationFailed', (event) => {
    console.log('❌ API Integration Failed:', event.detail);
});

// Test status updates
document.addEventListener('apiConnectionEstablished', () => {
    console.log('📡 API Connection Established');
});

document.addEventListener('apiConnectionFailed', (event) => {
    console.log('📡 API Connection Failed:', event.detail);
});

document.addEventListener('syncCompleted', (event) => {
    console.log('🔄 Sync Completed:', event.detail);
});

document.addEventListener('syncFailed', (event) => {
    console.log('🔄 Sync Failed:', event.detail);
});

// Manual test functions for browser console
window.testAPIIntegration = {
    async testConnection() {
        const apiClient = window.apiIntegration.getServices().apiClient;
        await apiClient.testConnection();
    },
    
    async createTestWorkflow() {
        const workflowAPIService = window.apiIntegration.getServices().workflowAPIService;
        const testData = {
            version: '2.0.0',
            nodes: [
                { id: 'manual-test-node', type: 'process', text: 'Manual Test Node', position: { left: 200, top: 150 } }
            ],
            tasks: [],
            flowlines: [],
            opportunities: [
                {
                    opportunity_id: 'manual-test-opp',
                    title: 'Manual Test Opportunity',
                    description: 'This is a test opportunity created manually',
                    status: 'active',
                    tags: ['test', 'manual']
                }
            ],
            metadata: { manualTest: true }
        };
        
        return await workflowAPIService.saveWorkflow('Manual Test Workflow', testData);
    },
    
    getStatus() {
        return window.apiIntegration.getDetailedStatus();
    },
    
    async forceSync() {
        await window.apiIntegration.forceSync();
    }
};

console.log('🛠️ Test functions available in window.testAPIIntegration');
console.log('   - testConnection()');
console.log('   - createTestWorkflow()'); 
console.log('   - getStatus()');
console.log('   - forceSync()');

setTimeout(() => {
    if (!window.apiIntegration) {
        console.log('⚠️ API Integration not loaded after 5 seconds');
    }
}, 5000);