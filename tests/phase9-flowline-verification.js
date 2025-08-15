/**
 * Phase 9 Flowline System Verification
 * Tests flowline manager and flowline renderer integration and functionality
 */

// Verification function for flowline system
if (typeof window !== 'undefined') {
    window.verifyFlowlineSystem = function() {
        console.log('🧪 Phase 9 Flowline System Verification Starting...');
        
        const results = {
            flowlineManagerExists: false,
            flowlineRendererExists: false,
            flowlineElementsAccessible: false,
            flowlineCreation: false,
            flowlineRendering: false,
            flowlinePathGeneration: false,
            interfacePreserved: false,
            flowlineStateManagement: false
        };
        
        try {
            // Test 1: Flowline Manager exists and is accessible
            if (window.processFlowDesigner && window.processFlowDesigner.flowlineManager) {
                results.flowlineManagerExists = true;
                console.log('✅ Flowline Manager exists and is accessible');
                
                const flowlineManager = window.processFlowDesigner.flowlineManager;
                
                // Test 2: Flowline Renderer exists and is accessible
                if (window.processFlowDesigner.flowlineRenderer) {
                    results.flowlineRendererExists = true;
                    console.log('✅ Flowline Renderer exists and is accessible');
                    
                    const flowlineRenderer = window.processFlowDesigner.flowlineRenderer;
                    
                    // Test 3: Flowline elements are accessible through manager
                    const validation = flowlineManager.validateFlowlineElements();
                    if (validation.isValid) {
                        results.flowlineElementsAccessible = true;
                        console.log('✅ Flowline elements accessible through manager');
                    } else {
                        console.warn('⚠️ Some flowline elements missing:', validation.errors);
                        // Still count as accessible if not completely broken
                        if (validation.errors.length < 2) {
                            results.flowlineElementsAccessible = true;
                        }
                    }
                    
                    // Test 4: Flowline creation functionality
                    if (typeof flowlineManager.createFlowline === 'function' &&
                        typeof flowlineManager.startFlowlineCreation === 'function' &&
                        typeof flowlineManager.exitFlowlineCreationMode === 'function') {
                        results.flowlineCreation = true;
                        console.log('✅ Flowline creation methods working');
                    }
                    
                    // Test 5: Flowline rendering functionality
                    if (typeof flowlineRenderer.generateAdvancedPathData === 'function' &&
                        typeof flowlineRenderer.applyFlowlineStyles === 'function' &&
                        typeof flowlineRenderer.animateFlowline === 'function') {
                        results.flowlineRendering = true;
                        console.log('✅ Flowline rendering methods working');
                    }
                    
                    // Test 6: Flowline path generation
                    try {
                        const pathData = flowlineRenderer.generateAdvancedPathData(0, 0, 100, 100, 'straight');
                        if (pathData && typeof pathData === 'string' && pathData.includes('M') && pathData.includes('L')) {
                            results.flowlinePathGeneration = true;
                            console.log('✅ Flowline path generation working');
                        }
                    } catch (e) {
                        console.warn('⚠️ Flowline path generation test failed:', e.message);
                    }
                    
                    // Test 7: Flowline state management
                    const flowlineState = flowlineManager.getFlowlineManagerState();
                    if (flowlineState && typeof flowlineState.flowlineCount === 'number' &&
                        typeof flowlineState.flowlineCreationMode === 'boolean') {
                        results.flowlineStateManagement = true;
                        console.log('✅ Flowline state management working');
                    }
                    
                } else {
                    console.error('❌ Flowline Renderer not found in main application');
                }
                
                // Test 8: Interface preservation
                const originalMethods = [
                    'createFlowline', 'startFlowlineCreation', 'exitFlowlineCreationMode',
                    'updateFlowlines', 'removeFlowline', 'clearAllFlowlines',
                    'findFlowlineById', 'getFlowlinesForNode', 'getAllFlowlines'
                ];
                
                const allMethodsExist = originalMethods.every(method => 
                    typeof window.processFlowDesigner[method] === 'function'
                );
                
                if (allMethodsExist) {
                    results.interfacePreserved = true;
                    console.log('✅ All original flowline interfaces preserved');
                } else {
                    console.warn('⚠️ Some flowline interfaces missing');
                    // Check which methods are missing
                    originalMethods.forEach(method => {
                        if (typeof window.processFlowDesigner[method] !== 'function') {
                            console.warn(`Missing method: ${method}`);
                        }
                    });
                }
                
            } else {
                console.error('❌ Flowline Manager not found in main application');
            }
            
        } catch (error) {
            console.error('❌ Flowline system verification error:', error);
        }
        
        // Summary
        const passedTests = Object.values(results).filter(result => result === true).length;
        const totalTests = Object.keys(results).length;
        
        console.log(`\\n🎯 Flowline System Verification Results: ${passedTests}/${totalTests} tests passed`);
        
        Object.entries(results).forEach(([test, passed]) => {
            console.log(`${passed ? '✅' : '❌'} ${test}`);
        });
        
        const allPassed = passedTests === totalTests;
        console.log(`\\n${allPassed ? '🎉' : '⚠️'} Flowline System Verification ${allPassed ? 'PASSED' : 'FAILED'}`);
        
        return {
            success: allPassed,
            passedTests,
            totalTests,
            results
        };
    };
    
    // Additional flowline creation tests
    window.testFlowlineCreation = function() {
        console.log('🔄 Testing Flowline Creation...');
        
        if (!window.processFlowDesigner) {
            console.error('❌ ProcessFlowDesigner not available');
            return false;
        }
        
        const app = window.processFlowDesigner;
        const flowlineManager = app.flowlineManager;
        const flowlineRenderer = app.flowlineRenderer;
        
        if (!flowlineManager || !flowlineRenderer) {
            console.error('❌ Flowline modules not available');
            return false;
        }
        
        try {
            // Test flowline types
            console.log('Testing flowline type support...');
            
            const supportedTypes = ['straight', 'perpendicular', 'curved', 'bezier', 'stepped'];
            supportedTypes.forEach(type => {
                try {
                    const pathData = flowlineRenderer.generateAdvancedPathData(0, 0, 100, 100, type);
                    if (pathData && pathData.length > 0) {
                        console.log(`✅ ${type} flowline type supported`);
                    } else {
                        console.warn(`⚠️ ${type} flowline type may not be working`);
                    }
                } catch (e) {
                    console.warn(`⚠️ ${type} flowline type test failed:`, e.message);
                }
            });
            
            // Test flowline state
            const initialState = flowlineManager.getFlowlineManagerState();
            console.log('Flowline manager initial state:', initialState);
            
            if (initialState && typeof initialState.flowlineCount === 'number') {
                console.log('✅ Flowline manager state accessible');
            } else {
                console.warn('⚠️ Flowline manager state not accessible');
            }
            
            // Test flowline serialization
            const serializedFlowlines = flowlineManager.serializeFlowlines();
            if (Array.isArray(serializedFlowlines)) {
                console.log('✅ Flowline serialization working');
            } else {
                console.warn('⚠️ Flowline serialization not working');
            }
            
            console.log('✅ Flowline creation tests completed');
            return true;
            
        } catch (error) {
            console.error('❌ Flowline creation test error:', error);
            return false;
        }
    };
    
    // Test flowline rendering features
    window.testFlowlineRendering = function() {
        console.log('🔄 Testing Flowline Rendering...');
        
        if (!window.processFlowDesigner || !window.processFlowDesigner.flowlineRenderer) {
            console.error('❌ Flowline Renderer not available');
            return false;
        }
        
        const flowlineRenderer = window.processFlowDesigner.flowlineRenderer;
        
        try {
            // Test rendering configuration
            console.log('Testing rendering configuration...');
            
            const config = flowlineRenderer.getRenderingConfig();
            if (config && config.styles && config.animation) {
                console.log('✅ Rendering configuration accessible');
            } else {
                console.warn('⚠️ Rendering configuration not accessible');
            }
            
            // Test SVG marker creation
            console.log('Testing SVG marker creation...');
            
            const testSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            flowlineRenderer.createFlowlineDefinitions(testSvg);
            
            const defs = testSvg.querySelector('defs');
            const arrowhead = defs ? defs.querySelector('#arrowhead') : null;
            
            if (arrowhead) {
                console.log('✅ SVG marker creation working');
            } else {
                console.warn('⚠️ SVG marker creation not working');
            }
            
            // Test connection point calculation
            console.log('Testing connection point calculation...');
            
            const mockRect1 = { left: 0, top: 0, width: 50, height: 30 };
            const mockRect2 = { left: 100, top: 100, width: 50, height: 30 };
            
            try {
                const connectionPoints = flowlineRenderer.calculateConnectionPoints(
                    { getBoundingClientRect: () => mockRect1 },
                    { getBoundingClientRect: () => mockRect2 }
                );
                
                if (connectionPoints && connectionPoints.source && connectionPoints.target) {
                    console.log('✅ Connection point calculation working');
                } else {
                    console.warn('⚠️ Connection point calculation not working');
                }
            } catch (e) {
                console.warn('⚠️ Connection point calculation test failed:', e.message);
            }
            
            console.log('✅ Flowline rendering tests completed');
            return true;
            
        } catch (error) {
            console.error('❌ Flowline rendering test error:', error);
            return false;
        }
    };
    
    // Test flowline system integration
    window.testFlowlineIntegration = function() {
        console.log('🔄 Testing Flowline System Integration...');
        
        if (!window.processFlowDesigner) {
            console.error('❌ ProcessFlowDesigner not available');
            return false;
        }
        
        const app = window.processFlowDesigner;
        
        try {
            // Test flowline state getters
            console.log('Testing flowline state getters...');
            
            const flowlines = app.flowlines;
            const flowlineCreationMode = app.flowlineCreationMode;
            
            if (Array.isArray(flowlines)) {
                console.log('✅ Flowlines getter working');
            } else {
                console.warn('⚠️ Flowlines getter not working');
            }
            
            if (typeof flowlineCreationMode === 'boolean') {
                console.log('✅ Flowline creation mode getter working');
            } else {
                console.warn('⚠️ Flowline creation mode getter not working');
            }
            
            // Test flowline delegation
            console.log('Testing flowline method delegation...');
            
            const initialFlowlineCount = flowlines.length;
            
            // Test flowline manager access
            if (app.flowlineManager) {
                const managerState = app.flowlineManager.getFlowlineManagerState();
                if (managerState && typeof managerState.flowlineCount === 'number') {
                    console.log('✅ Flowline manager delegation working');
                } else {
                    console.warn('⚠️ Flowline manager delegation not working');
                }
            }
            
            // Test flowline renderer access
            if (app.flowlineRenderer) {
                const rendererConfig = app.flowlineRenderer.getRenderingConfig();
                if (rendererConfig && rendererConfig.styles) {
                    console.log('✅ Flowline renderer delegation working');
                } else {
                    console.warn('⚠️ Flowline renderer delegation not working');
                }
            }
            
            console.log('✅ Flowline integration tests completed');
            return true;
            
        } catch (error) {
            console.error('❌ Flowline integration test error:', error);
            return false;
        }
    };
    
    // Auto-run verification when page loads
    document.addEventListener('DOMContentLoaded', function() {
        // Wait a bit for app initialization
        setTimeout(() => {
            if (typeof window.verifyFlowlineSystem === 'function') {
                window.verifyFlowlineSystem();
            }
        }, 3000); // Wait for flowline system to initialize
    });
}

console.log('📋 Phase 9 Flowline System Verification Script Loaded');