/**
 * Persistence Verification Script
 * Tests if frontend item creation triggers API persistence
 */

console.log('🧪 Starting Persistence Verification Tests...');

// Wait for the DOM to be ready and API integration to be loaded
async function testPersistence() {
    console.log('🔄 Waiting for API Integration to initialize...');
    
    // Give some time for the API integration to initialize
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🔍 Starting persistence tests...');
    
    // Test 1: Create a workflow node and check if it gets persisted
    try {
        console.log('📝 Test 1: Creating a test node...');
        
        // Dispatch a node creation event like the UI would
        const nodeData = {
            nodeId: 'test-node-persistence-' + Date.now(),
            type: 'process',
            name: 'Test Persistence Node',
            node: {
                style: {
                    left: '200px',
                    top: '300px'
                }
            }
        };
        
        // Fire the event that should trigger persistence
        const event = new CustomEvent('node.created', { 
            detail: nodeData 
        });
        document.dispatchEvent(event);
        
        console.log('✅ Node creation event dispatched:', nodeData);
        
        // Wait a bit for persistence to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('📋 Check the API logs and database to verify persistence...');
        
    } catch (error) {
        console.error('❌ Test 1 failed:', error);
    }
    
    // Test 2: Create a task and check if it gets persisted
    try {
        console.log('📝 Test 2: Creating a test task...');
        
        const taskData = {
            id: 'test-task-persistence-' + Date.now(),
            name: 'Test Persistence Task',
            text: 'Test task for persistence verification',
            status: 'pending',
            position: { x: 250, y: 350 }
        };
        
        // Fire the event that should trigger persistence
        const event = new CustomEvent('task.created', { 
            detail: taskData 
        });
        document.dispatchEvent(event);
        
        console.log('✅ Task creation event dispatched:', taskData);
        
        // Wait a bit for persistence to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        
    } catch (error) {
        console.error('❌ Test 2 failed:', error);
    }
    
    // Test 3: Create an opportunity and check if it gets persisted
    try {
        console.log('📝 Test 3: Creating a test opportunity...');
        
        const oppData = {
            id: 'test-opp-persistence-' + Date.now(),
            title: 'Test Persistence Opportunity',
            name: 'Test Persistence Opportunity',
            description: 'Test opportunity for persistence verification'
        };
        
        // Fire the event that should trigger persistence
        const event = new CustomEvent('opportunity.created', { 
            detail: oppData 
        });
        document.dispatchEvent(event);
        
        console.log('✅ Opportunity creation event dispatched:', oppData);
        
        // Wait a bit for persistence to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        
    } catch (error) {
        console.error('❌ Test 3 failed:', error);
    }
    
    console.log('🏁 Persistence verification tests completed!');
    console.log('📊 Check the browser console, API logs, and database to verify results');
}

// Start tests when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testPersistence);
} else {
    testPersistence();
}