/**
 * Direct API Call Test
 * Bypasses all event systems and directly tests API persistence
 */

console.log('🧪 Direct API Call Test starting...');

// Wait for everything to load
setTimeout(async () => {
    console.log('🔍 Testing direct API persistence...');
    
    try {
        // Test 1: Direct fetch call to create opportunity
        console.log('📝 Test 1: Direct fetch call to API...');
        const testOpportunityData = {
            workflowId: '23854ca3-e4e4-4b7f-8b93-87f34f52411d', // Use the test workflow ID
            title: 'Direct API Test Opportunity',
            description: 'Created via direct API call to test persistence'
        };
        
        console.log('🚀 Making direct API call:', testOpportunityData);
        const response = await fetch('http://localhost:3001/api/v1/opportunities', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testOpportunityData)
        });
        
        console.log('📡 API Response status:', response.status);
        console.log('📡 API Response headers:', response.headers);
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Direct API call successful:', result);
        } else {
            const error = await response.text();
            console.error('❌ Direct API call failed:', error);
        }
        
        // Test 2: Check if API Integration is working
        if (window.apiIntegration) {
            console.log('📝 Test 2: Testing via API Integration...');
            console.log('API Integration available:', !!window.apiIntegration);
            console.log('API Integration initialized:', window.apiIntegration.isInitialized);
            
            if (window.apiIntegration.isInitialized) {
                console.log('🔄 Calling persistOpportunity directly...');
                await window.apiIntegration.persistOpportunity({
                    title: 'API Integration Test Opportunity',
                    description: 'Created via API Integration direct call',
                    status: 'active'
                });
                console.log('✅ API Integration direct call completed');
            }
        } else {
            console.log('❌ API Integration not available on window');
        }
        
    } catch (error) {
        console.error('❌ Direct API test error:', error);
    }
    
}, 3000); // Wait 3 seconds