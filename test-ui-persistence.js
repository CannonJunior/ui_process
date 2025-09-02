/**
 * UI Persistence Test Script
 * Simulates UI interactions to test if persistence events are fired
 */

console.log('🧪 Starting UI Persistence Tests...');

// Wait for everything to be loaded
setTimeout(async () => {
    console.log('🔍 Testing UI persistence integration...');
    
    try {
        // Test 1: Check if ProcessFlowDesigner is available
        if (typeof window.processFlowDesigner !== 'undefined') {
            console.log('✅ ProcessFlowDesigner found');
            const app = window.processFlowDesigner;
            
            // Test node creation through the app
            console.log('📝 Test 1: Creating node through ProcessFlowDesigner...');
            if (typeof app.createNode === 'function') {
                const node = app.createNode('process');
                console.log('✅ Node created via ProcessFlowDesigner:', node ? 'SUCCESS' : 'FAILED');
            } else {
                console.log('❌ createNode method not available on ProcessFlowDesigner');
            }
            
            // Test task creation 
            console.log('📝 Test 2: Creating task through ProcessFlowDesigner...');
            if (typeof app.createTaskNode === 'function') {
                const task = app.createTaskNode('Test UI Task');
                console.log('✅ Task created via ProcessFlowDesigner:', task ? 'SUCCESS' : 'FAILED');
            } else {
                console.log('❌ createTaskNode method not available on ProcessFlowDesigner');
            }
            
        } else {
            console.log('❌ ProcessFlowDesigner not found');
        }
        
        // Test 2: Check if API Integration is working
        if (typeof window.apiIntegration !== 'undefined') {
            console.log('✅ API Integration found');
            const integration = window.apiIntegration;
            console.log('API Integration initialized:', integration.isInitialized);
            console.log('API Integration connected to app:', integration.isIntegratedWithApp);
        } else {
            console.log('❌ API Integration not found on window');
        }
        
        // Test 3: Listen for events to see if they're being dispatched
        const eventListener = (event) => {
            console.log('🎉 Event received:', event.type, event.detail);
        };
        
        document.addEventListener('node.created', eventListener);
        document.addEventListener('task.created', eventListener); 
        document.addEventListener('opportunity.created', eventListener);
        
        console.log('🔄 Event listeners set up - create items through the UI to test');
        
        // Test 4: Simulate Add button click to trigger node creation
        setTimeout(() => {
            console.log('📝 Test 4: Simulating Add button click...');
            const addButton = document.getElementById('addButton');
            if (addButton) {
                console.log('✅ Add button found, simulating click...');
                addButton.click();
            } else {
                console.log('❌ Add button not found');
            }
        }, 2000);
        
    } catch (error) {
        console.error('❌ UI Persistence test error:', error);
    }
    
}, 3000); // Wait 3 seconds for everything to load