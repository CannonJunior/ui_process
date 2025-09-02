// Direct UI Test - tests the exact issue reported by user
console.log('🔍 === DIRECT UI TEST: DEBUGGING OPPORTUNITY CREATION ISSUE ===');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('📋 DOM loaded, starting test in 3 seconds...');
    
    setTimeout(() => {
        console.log('\n🧪 === TESTING UI OPPORTUNITY CREATION ===');
        
        // Check if processFlowDesigner exists
        if (!window.processFlowDesigner) {
            console.error('❌ processFlowDesigner not found!');
            return;
        }
        
        console.log('✅ processFlowDesigner found');
        
        // Test the createOpportunity method directly
        console.log('\n🎯 Testing createOpportunity method directly...');
        
        // Fill the form programmatically
        const titleField = document.getElementById('opportunityTitle');
        const descField = document.getElementById('opportunityDescription');
        const statusField = document.getElementById('opportunityStatus');
        
        if (titleField && descField && statusField) {
            titleField.value = 'Direct UI Test Opportunity';
            descField.value = 'Testing the direct UI creation flow';
            statusField.value = 'active';
            console.log('✅ Form fields populated');
            
            // Call createOpportunity directly
            console.log('🚀 Calling processFlowDesigner.createOpportunity() directly...');
            if (typeof window.processFlowDesigner.createOpportunity === 'function') {
                window.processFlowDesigner.createOpportunity();
                console.log('✅ createOpportunity() called successfully');
            } else {
                console.error('❌ createOpportunity method not found!');
            }
        } else {
            console.error('❌ Form fields not found!', {
                titleField: !!titleField,
                descField: !!descField,
                statusField: !!statusField
            });
        }
        
    }, 3000);
});

// Also run immediately if DOM already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('📋 DOM already loaded, running test immediately...');
    setTimeout(() => {
        document.dispatchEvent(new Event('DOMContentLoaded'));
    }, 1000);
}