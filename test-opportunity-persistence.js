/**
 * Opportunity Persistence Test
 * Tests the full opportunity creation and persistence flow
 */

console.log('🧪 Opportunity Persistence Test starting...');

// Wait for everything to load
setTimeout(() => {
    console.log('🔍 Testing opportunity persistence...');
    
    // Test if ProcessFlowDesigner is available
    if (typeof window.processFlowDesigner !== 'undefined') {
        console.log('✅ ProcessFlowDesigner found');
        const app = window.processFlowDesigner;
        
        // Test if opportunity creation method exists
        if (typeof app.createOpportunity === 'function') {
            console.log('✅ createOpportunity method exists');
            
            // Fill in the opportunity form with test data
            const titleField = document.getElementById('opportunityTitle');
            const descField = document.getElementById('opportunityDescription'); 
            const statusField = document.getElementById('opportunityStatus');
            
            if (titleField && descField && statusField) {
                console.log('📝 Filling opportunity form...');
                titleField.value = 'Test Opportunity from Console';
                descField.value = 'This is a test opportunity created via console to test persistence';
                statusField.value = 'active';
                
                console.log('✅ Form filled, calling createOpportunity...');
                
                // Call the opportunity creation method
                try {
                    app.createOpportunity();
                    console.log('✅ createOpportunity() called successfully');
                } catch (error) {
                    console.error('❌ Error calling createOpportunity:', error);
                }
            } else {
                console.log('❌ Opportunity form fields not found');
                console.log('Title field:', titleField ? 'FOUND' : 'MISSING');
                console.log('Description field:', descField ? 'FOUND' : 'MISSING');
                console.log('Status field:', statusField ? 'FOUND' : 'MISSING');
            }
        } else {
            console.log('❌ createOpportunity method not found on ProcessFlowDesigner');
        }
    } else {
        console.log('❌ ProcessFlowDesigner not found');
    }
    
    // Also test by manually dispatching the event
    console.log('🔄 Testing manual event dispatch...');
    const testOpportunity = {
        opportunity_id: 'test-opp-' + Date.now(),
        title: 'Manual Test Opportunity',
        description: 'Manually dispatched test opportunity',
        status: 'active',
        created_at: new Date().toISOString()
    };
    
    console.log('🚀 Manually dispatching opportunity.created event:', testOpportunity);
    document.dispatchEvent(new CustomEvent('opportunity.created', {
        detail: testOpportunity
    }));
    console.log('✅ Manual event dispatched');
    
}, 5000); // Wait 5 seconds for everything to load