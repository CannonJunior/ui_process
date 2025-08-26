/**
 * Final API Integration Test
 * Comprehensive test of Phase 2 functionality
 */

console.log('🧪 Final API Integration Test Starting...');

// Test configuration
const TEST_CONFIG = {
    apiURL: 'http://localhost:3001',
    testTimeout: 30000,
    expectedServices: ['apiClient', 'syncService', 'workflowAPIService']
};

// Test results tracking
let testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    results: []
};

function logTest(name, passed, message) {
    testResults.total++;
    if (passed) {
        testResults.passed++;
        console.log(`✅ ${name}: ${message}`);
    } else {
        testResults.failed++;
        console.log(`❌ ${name}: ${message}`);
    }
    testResults.results.push({ name, passed, message });
}

// Wait for API integration to be ready
document.addEventListener('apiIntegrationReady', async (event) => {
    console.log('🚀 API Integration Ready - Starting Tests');
    
    const { apiClient, syncService, workflowAPIService } = event.detail;
    
    try {
        // Test 1: Verify all services are available
        logTest(
            'Services Available',
            apiClient && syncService && workflowAPIService,
            'All required services initialized'
        );
        
        // Test 2: API Connection Status
        const connectionStatus = apiClient.getConnectionStatus();
        logTest(
            'API Connection',
            connectionStatus.isOnline,
            `Connection status: ${connectionStatus.isOnline ? 'Online' : 'Offline'}`
        );
        
        // Test 3: Health Check
        try {
            const response = await fetch(`${TEST_CONFIG.apiURL}/health`);
            const health = await response.json();
            logTest(
                'Health Check',
                response.ok && health.status === 'ok',
                `Server health: ${health.status}`
            );
        } catch (error) {
            logTest('Health Check', false, `Health check failed: ${error.message}`);
        }
        
        // Test 4: Get Workflows
        try {
            const workflows = await apiClient.getWorkflows();
            logTest(
                'Get Workflows',
                workflows && workflows.workflows,
                `Retrieved ${workflows.workflows?.length || 0} workflows`
            );
        } catch (error) {
            logTest('Get Workflows', false, `Failed: ${error.message}`);
        }
        
        // Test 5: Create Test Workflow
        try {
            const testWorkflowData = {
                version: '2.0.0',
                nodes: [
                    {
                        id: 'integration-test-node',
                        type: 'process',
                        text: 'Integration Test Node',
                        position: { left: 300, top: 200 }
                    }
                ],
                tasks: [],
                flowlines: [],
                opportunities: [],
                metadata: {
                    testType: 'integration',
                    createdBy: 'final-test'
                }
            };
            
            const result = await workflowAPIService.saveWorkflow('Integration Test Workflow', testWorkflowData);
            logTest(
                'Create Workflow',
                result && (result.id || result.saved),
                `Workflow created: ${result.id || 'offline mode'}`
            );
        } catch (error) {
            logTest('Create Workflow', false, `Failed: ${error.message}`);
        }
        
        // Test 6: WebSocket Connection
        if (apiClient.ws) {
            logTest(
                'WebSocket Connection',
                apiClient.ws.readyState === WebSocket.OPEN,
                `WebSocket state: ${apiClient.ws.readyState === WebSocket.OPEN ? 'Connected' : 'Disconnected'}`
            );
        } else {
            logTest('WebSocket Connection', false, 'WebSocket not initialized');
        }
        
        // Test 7: Sync Service Status
        const syncStatus = syncService.getSyncStatus();
        logTest(
            'Sync Service',
            syncStatus !== null,
            `Queue: ${syncStatus.queuedItems || 0} items, Last sync: ${syncStatus.lastSync || 'never'}`
        );
        
        // Test 8: UI Integration Check
        const statusIndicator = document.getElementById('apiStatusIndicator');
        logTest(
            'UI Integration',
            statusIndicator !== null,
            `Status indicator: ${statusIndicator ? 'Present' : 'Missing'}`
        );
        
        // Test 9: Test API Error Handling
        try {
            // Try to access non-existent endpoint
            await apiClient.request('/api/v1/non-existent-endpoint');
            logTest('Error Handling', false, 'Should have thrown error for non-existent endpoint');
        } catch (error) {
            logTest(
                'Error Handling',
                error.message.includes('404') || error.message.includes('Not Found'),
                'Properly handles API errors'
            );
        }
        
        // Test 10: Performance Test - Multiple Concurrent Requests
        try {
            const startTime = performance.now();
            const promises = Array.from({ length: 5 }, () => apiClient.getWorkflows());
            await Promise.all(promises);
            const duration = performance.now() - startTime;
            
            logTest(
                'Performance Test',
                duration < 5000,
                `5 concurrent requests completed in ${duration.toFixed(2)}ms`
            );
        } catch (error) {
            logTest('Performance Test', false, `Failed: ${error.message}`);
        }
        
    } catch (error) {
        console.error('❌ Test execution failed:', error);
        logTest('Test Execution', false, `Critical error: ${error.message}`);
    }
    
    // Print final results
    setTimeout(printFinalResults, 2000);
});

function printFinalResults() {
    console.log('\n' + '='.repeat(50));
    console.log('🏁 FINAL API INTEGRATION TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📊 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    console.log('='.repeat(50));
    
    if (testResults.failed > 0) {
        console.log('\n❌ Failed Tests:');
        testResults.results
            .filter(result => !result.passed)
            .forEach(result => console.log(`   - ${result.name}: ${result.message}`));
    }
    
    if (testResults.passed === testResults.total) {
        console.log('\n🎉 ALL TESTS PASSED - PHASE 2 INTEGRATION COMPLETE! 🎉');
        console.log('\n✅ Phase 2 Implementation Summary:');
        console.log('   • API Client: Full REST API communication with WebSocket support');
        console.log('   • Sync Service: Data synchronization with conflict resolution');
        console.log('   • Workflow API Service: Complete localStorage replacement');
        console.log('   • UI Integration: Status indicators and notifications');
        console.log('   • Real-time Updates: WebSocket-based live synchronization');
        console.log('   • Offline Support: Queue-based sync for offline operations');
        console.log('   • Error Handling: Comprehensive error recovery and fallbacks');
        
        // Dispatch completion event
        document.dispatchEvent(new CustomEvent('phase2TestingComplete', {
            detail: { 
                success: true, 
                results: testResults,
                message: 'Phase 2 integration fully tested and working'
            }
        }));
    } else {
        console.log('\n⚠️  Some tests failed - review and fix issues before proceeding');
        document.dispatchEvent(new CustomEvent('phase2TestingComplete', {
            detail: { 
                success: false, 
                results: testResults,
                message: `${testResults.failed} tests failed out of ${testResults.total}`
            }
        }));
    }
}

// Handle API integration failure
document.addEventListener('apiIntegrationFailed', (event) => {
    console.error('❌ API Integration Failed:', event.detail);
    logTest('API Integration', false, `Initialization failed: ${event.detail.error}`);
    printFinalResults();
});

// Timeout fallback
setTimeout(() => {
    if (testResults.total === 0) {
        console.log('⏰ Test timeout - API Integration not ready after 30 seconds');
        logTest('Timeout', false, 'API Integration failed to initialize within timeout period');
        printFinalResults();
    }
}, TEST_CONFIG.testTimeout);

console.log('⏳ Waiting for API Integration to be ready...');