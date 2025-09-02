// Test script for the UI opportunity creation flow
// This simulates the user clicking through the UI: Click '💼 Opportunities' → Fill form → Click 'Create'

function testOpportunityCreationFlow() {
    console.log('\n🧪 === TESTING OPPORTUNITY UI CREATION FLOW ===');
    
    // Step 1: Check if main app is loaded
    if (!window.processFlowDesigner) {
        console.error('❌ ERROR: processFlowDesigner not found in window');
        return;
    }
    console.log('✅ processFlowDesigner found');
    
    // Step 2: Simulate clicking the add button to show context menu
    console.log('\n🎯 Step 2: Simulating add button click...');
    const addButton = document.querySelector('.add-button');
    if (!addButton) {
        console.error('❌ ERROR: Add button not found');
        return;
    }
    console.log('✅ Add button found, clicking...');
    addButton.click();
    
    // Small delay to let UI update
    setTimeout(() => {
        // Step 3: Simulate clicking the opportunity option
        console.log('\n🎯 Step 3: Clicking opportunity option...');
        const oppMenuItem = document.querySelector('[data-add-type="opportunity"]');
        if (!oppMenuItem) {
            console.error('❌ ERROR: Opportunity menu item not found');
            return;
        }
        console.log('✅ Opportunity menu item found, clicking...');
        oppMenuItem.click();
        
        // Small delay for modal to show
        setTimeout(() => {
            // Step 4: Fill the form
            console.log('\n📝 Step 4: Filling opportunity form...');
            const titleField = document.getElementById('opportunityTitle');
            const descField = document.getElementById('opportunityDescription');
            const statusField = document.getElementById('opportunityStatus');
            
            if (!titleField || !descField || !statusField) {
                console.error('❌ ERROR: Required form fields not found');
                console.log('Title field:', !!titleField);
                console.log('Description field:', !!descField);
                console.log('Status field:', !!statusField);
                return;
            }
            
            // Fill form
            titleField.value = 'UI Test Opportunity';
            descField.value = 'This is a test opportunity created through the UI';
            statusField.value = 'active';
            
            console.log('✅ Form filled with test data');
            console.log('- Title:', titleField.value);
            console.log('- Description:', descField.value);
            console.log('- Status:', statusField.value);
            
            // Step 5: Click create button
            setTimeout(() => {
                console.log('\n🖱️ Step 5: Clicking Create button...');
                const createButton = document.getElementById('opportunityModalCreate');
                if (!createButton) {
                    console.error('❌ ERROR: Create button not found');
                    return;
                }
                console.log('✅ Create button found, clicking...');
                console.log('🎬 === CLICKING CREATE BUTTON NOW ===');
                createButton.click();
                
                console.log('🏁 Test complete! Check console logs above for the full flow...');
            }, 500);
        }, 300);
    }, 300);
}

// Export for manual testing
window.testOpportunityCreationFlow = testOpportunityCreationFlow;

console.log('🧪 Test function loaded. Run window.testOpportunityCreationFlow() to test the UI flow');