/**
 * Direct API Integration Test
 * Tests the API integration service directly
 */

console.log('🧪 Direct API Integration Test starting...');

// Test the API integration service directly
setTimeout(async () => {
    console.log('🔍 Checking if APIIntegration services are available...');
    
    // Check if the global services are available
    if (typeof window !== 'undefined') {
        console.log('🌐 Window object available');
        
        // Check for common service names
        const serviceNames = ['apiClient', 'ApiClient', 'APIIntegration', 'apiIntegration'];
        let foundService = null;
        
        for (const name of serviceNames) {
            if (window[name]) {
                console.log(`✅ Found service: ${name}`, window[name]);
                foundService = window[name];
                break;
            }
        }
        
        if (!foundService) {
            console.log('❌ No API integration services found on window object');
            console.log('Available window properties:', Object.keys(window).filter(k => k.includes('api') || k.includes('Api') || k.includes('API')));
        }
        
        // Check if the APIIntegration service was initialized by looking for events
        const testEventListener = (event) => {
            console.log('📡 apiIntegrationReady event fired!', event.detail);
        };
        document.addEventListener('apiIntegrationReady', testEventListener);
        
        // Manually try to test API connection
        try {
            const testResponse = await fetch('http://localhost:3001/health');
            if (testResponse.ok) {
                console.log('✅ API server is reachable directly');
                const healthData = await testResponse.json();
                console.log('API Health:', healthData);
            }
        } catch (error) {
            console.error('❌ Could not reach API server directly:', error);
        }
        
        // Test if we can make a direct API call
        try {
            const workflowsResponse = await fetch('http://localhost:3001/api/v1/workflows');
            if (workflowsResponse.ok) {
                console.log('✅ Direct API call successful');
                const workflows = await workflowsResponse.json();
                console.log('Workflows from direct call:', workflows);
            }
        } catch (error) {
            console.error('❌ Direct API call failed:', error);
        }
        
    } else {
        console.log('❌ Window object not available');
    }
    
}, 5000); // Wait 5 seconds for everything to load

console.log('⏳ Waiting 5 seconds for services to initialize...');