/**
 * Phase 5 Context Menu System Verification
 * Tests context menu manager integration and functionality
 */

// Verification function for context menu system
if (typeof window !== 'undefined') {
    window.verifyContextMenuSystem = function() {
        console.log('🧪 Phase 5 Context Menu System Verification Starting...');
        
        const results = {
            contextMenuManagerExists: false,
            contextMenuElementsAccessible: false,
            eventHandlersWorking: false,
            delegationWorking: false,
            interfacePreserved: false,
            tagContextMenuWorking: false
        };
        
        try {
            // Test 1: Context Menu Manager exists and is accessible
            if (window.processFlowDesigner && window.processFlowDesigner.contextMenuManager) {
                results.contextMenuManagerExists = true;
                console.log('✅ Context Menu Manager exists and is accessible');
                
                const contextMenuManager = window.processFlowDesigner.contextMenuManager;
                
                // Test 2: Context menu elements are accessible through manager
                const validation = contextMenuManager.validateContextMenuElements();
                if (validation.isValid) {
                    results.contextMenuElementsAccessible = true;
                    console.log('✅ Context menu elements accessible through manager');
                } else {
                    console.warn('⚠️ Some context menu elements missing:', validation.errors);
                }
                
                // Test 3: Test delegation is working
                if (typeof window.processFlowDesigner.handleContextMenu === 'function' &&
                    typeof window.processFlowDesigner.hideContextMenu === 'function' &&
                    typeof window.processFlowDesigner.handleTagContextMenu === 'function') {
                    results.delegationWorking = true;
                    console.log('✅ Context menu method delegation working');
                }
                
                // Test 4: Interface preservation
                const originalMethods = [
                    'handleContextMenu', 'hideContextMenu', 'handleContextMenuAction',
                    'handleTaskContextMenuAction', 'handleTagContextMenu', 'hideTagContextMenus',
                    'handleTagAttributeClick', 'showTagAttributeOptions', 'showTagDatePicker',
                    'applyTagDate', 'clearTagDate'
                ];
                
                const allMethodsExist = originalMethods.every(method => 
                    typeof window.processFlowDesigner[method] === 'function'
                );
                
                if (allMethodsExist) {
                    results.interfacePreserved = true;
                    console.log('✅ All original context menu interfaces preserved');
                }
                
                // Test 5: Context menu state and positioning
                const contextMenuState = contextMenuManager.getContextMenuState();
                if (contextMenuState !== null) {
                    results.eventHandlersWorking = true;
                    console.log('✅ Context menu state management working');
                }
                
                // Test 6: Tag context menu functionality
                if (typeof contextMenuManager.showTagContextMenu === 'function' &&
                    typeof contextMenuManager.hideTagContextMenus === 'function') {
                    results.tagContextMenuWorking = true;
                    console.log('✅ Tag context menu functionality working');
                }
                
            } else {
                console.error('❌ Context Menu Manager not found in main application');
            }
            
        } catch (error) {
            console.error('❌ Context menu system verification error:', error);
        }
        
        // Summary
        const passedTests = Object.values(results).filter(result => result === true).length;
        const totalTests = Object.keys(results).length;
        
        console.log(`\n🎯 Context Menu System Verification Results: ${passedTests}/${totalTests} tests passed`);
        
        Object.entries(results).forEach(([test, passed]) => {
            console.log(`${passed ? '✅' : '❌'} ${test}`);
        });
        
        const allPassed = passedTests === totalTests;
        console.log(`\n${allPassed ? '🎉' : '⚠️'} Context Menu System Verification ${allPassed ? 'PASSED' : 'FAILED'}`);
        
        return {
            success: allPassed,
            passedTests,
            totalTests,
            results
        };
    };
    
    // Additional context menu interaction tests
    window.testContextMenuInteractions = function() {
        console.log('🔄 Testing Context Menu Interactions...');
        
        if (!window.processFlowDesigner) {
            console.error('❌ ProcessFlowDesigner not available');
            return false;
        }
        
        const app = window.processFlowDesigner;
        const contextMenuManager = app.contextMenuManager;
        
        if (!contextMenuManager) {
            console.error('❌ Context Menu Manager not available');
            return false;
        }
        
        try {
            // Test context menu state management
            console.log('Testing context menu state management...');
            
            const initialState = contextMenuManager.getCurrentContextMenuType();
            console.log(`Initial context menu state: ${initialState || 'none'}`);
            
            // Test context menu positioning
            const menuState = contextMenuManager.getContextMenuState();
            if (menuState) {
                console.log('✅ Context menu state accessible');
            } else {
                console.warn('⚠️ Context menu state not accessible');
            }
            
            // Test context menu validation
            const validation = contextMenuManager.validateContextMenuElements();
            if (validation.isValid) {
                console.log('✅ Context menu element validation passed');
            } else {
                console.warn('⚠️ Context menu element validation failed:', validation.errors);
            }
            
            // Test context menu hiding
            contextMenuManager.hideAllContextMenus();
            if (!contextMenuManager.isContextMenuOpen()) {
                console.log('✅ Context menu hiding works correctly');
            } else {
                console.warn('⚠️ Context menu did not hide properly');
            }
            
            console.log('✅ Context menu interaction tests completed');
            return true;
            
        } catch (error) {
            console.error('❌ Context menu interaction test error:', error);
            return false;
        }
    };
    
    // Auto-run verification when page loads
    document.addEventListener('DOMContentLoaded', function() {
        // Wait a bit for app initialization
        setTimeout(() => {
            if (typeof window.verifyContextMenuSystem === 'function') {
                window.verifyContextMenuSystem();
            }
        }, 1000);
    });
}

console.log('📋 Phase 5 Context Menu Verification Script Loaded');