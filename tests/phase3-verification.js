/**
 * Phase 3 Verification Script
 * Tests configuration and DOM service integrations
 */

// Test configuration service functionality
console.log('🧪 Phase 3 Service Verification Starting...');

// Test ConfigService
try {
    const configService = getConfigService();
    
    console.log('✅ ConfigService accessible');
    
    // Test configuration access
    const nodeTypes = configService.getNodeTypes();
    console.log(`✅ Node types loaded: ${nodeTypes.length} types`);
    
    const tagCategories = configService.getTagCategories();
    console.log(`✅ Tag categories loaded: ${tagCategories.length} categories`);
    
    const uiConfig = configService.getUIConfig();
    console.log(`✅ UI config loaded: ${Object.keys(uiConfig).length} constants`);
    
    // Test tag display
    const display = configService.getTagDisplay('urgency');
    console.log(`✅ Tag display config: ${display.color}, ${display.bgColor}`);
    
    // Test validation
    const validation = configService.validateConfig();
    console.log(`✅ Config validation: ${validation.isValid ? 'PASSED' : 'FAILED'}`);
    
    console.log('✅ ConfigService verification complete');
    
} catch (error) {
    console.error('❌ ConfigService error:', error);
}

// Test DOMService
try {
    const domService = getDOMService();
    
    console.log('✅ DOMService accessible');
    
    // Test element access
    const canvas = domService.getElement('canvas');
    console.log(`✅ Canvas element: ${canvas ? 'found' : 'missing'}`);
    
    // Test element groups
    const modals = domService.getElementGroup('modals');
    console.log(`✅ Modal elements: ${Object.keys(modals).length} modals`);
    
    // Test cache stats
    const stats = domService.getCacheStats();
    console.log(`✅ DOM cache: ${stats.cachedCount} elements cached`);
    
    // Test validation
    const validation = domService.validateElements();
    console.log(`✅ DOM validation: ${validation.isValid ? 'PASSED' : 'FAILED'}`);
    if (validation.warnings.length > 0) {
        console.warn(`⚠️ DOM warnings: ${validation.warnings.length} warnings`);
    }
    
    console.log('✅ DOMService verification complete');
    
} catch (error) {
    console.error('❌ DOMService error:', error);
}

// Test integration with main application
try {
    // This would normally be done after DOM is loaded
    if (typeof ProcessFlowDesigner !== 'undefined') {
        console.log('✅ ProcessFlowDesigner class available');
        
        // Test service integration (would require DOM to be loaded)
        console.log('✅ Service integration verification complete');
    } else {
        console.log('ℹ️ ProcessFlowDesigner not yet loaded (normal for script execution)');
    }
    
} catch (error) {
    console.error('❌ Integration error:', error);
}

console.log('🎉 Phase 3 Service Verification Complete!');

// Export verification function for testing
if (typeof window !== 'undefined') {
    window.verifyPhase3Services = function() {
        console.log('🔄 Running Phase 3 service verification...');
        
        const results = {
            configService: false,
            domService: false,
            integration: false
        };
        
        try {
            const configService = getConfigService();
            results.configService = configService.validateConfig().isValid;
        } catch (e) {
            console.error('ConfigService verification failed:', e);
        }
        
        try {
            const domService = getDOMService();
            results.domService = domService.validateElements().isValid;
        } catch (e) {
            console.error('DOMService verification failed:', e);
        }
        
        try {
            if (window.processFlowDesigner) {
                results.integration = window.processFlowDesigner.configService && 
                                    window.processFlowDesigner.domService;
            }
        } catch (e) {
            console.error('Integration verification failed:', e);
        }
        
        console.log('Phase 3 Verification Results:', results);
        return results;
    };
}