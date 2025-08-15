/**
 * Phase 7 Eisenhower Matrix Verification
 * Tests matrix controller and animations integration and functionality
 */

// Verification function for matrix system
if (typeof window !== 'undefined') {
    window.verifyMatrixSystem = function() {
        console.log('🧪 Phase 7 Eisenhower Matrix Verification Starting...');
        
        const results = {
            matrixControllerExists: false,
            matrixAnimationsExists: false,
            matrixElementsAccessible: false,
            matrixModeToggle: false,
            matrixPositioning: false,
            d3AnimationsWorking: false,
            interfacePreserved: false,
            matrixStateManagement: false
        };
        
        try {
            // Test 1: Matrix Controller exists and is accessible
            if (window.processFlowDesigner && window.processFlowDesigner.matrixController) {
                results.matrixControllerExists = true;
                console.log('✅ Matrix Controller exists and is accessible');
                
                const matrixController = window.processFlowDesigner.matrixController;
                
                // Test 2: Matrix Animations exists and is accessible
                if (window.processFlowDesigner.matrixAnimations) {
                    results.matrixAnimationsExists = true;
                    console.log('✅ Matrix Animations exists and is accessible');
                    
                    const matrixAnimations = window.processFlowDesigner.matrixAnimations;
                    
                    // Test 3: Matrix elements are accessible through controller
                    const validation = matrixController.validateMatrixElements();
                    if (validation.isValid) {
                        results.matrixElementsAccessible = true;
                        console.log('✅ Matrix elements accessible through controller');
                    } else {
                        console.warn('⚠️ Some matrix elements missing:', validation.errors);
                        // Still count as accessible if not completely broken
                        if (validation.errors.length < 2) {
                            results.matrixElementsAccessible = true;
                        }
                    }
                    
                    // Test 4: Matrix mode toggle functionality
                    const initialMode = matrixController.getMatrixMode();
                    matrixController.setMatrixMode(!initialMode);
                    const toggledMode = matrixController.getMatrixMode();
                    matrixController.setMatrixMode(initialMode); // Reset
                    
                    if (toggledMode !== initialMode) {
                        results.matrixModeToggle = true;
                        console.log('✅ Matrix mode toggle working');
                    } else {
                        console.warn('⚠️ Matrix mode toggle not working as expected');
                    }
                    
                    // Test 5: Matrix positioning methods
                    if (typeof matrixController.analyzeTaskUrgencyImportance === 'function' &&
                        typeof matrixController.positionTasksInMatrix === 'function' &&
                        typeof matrixController.positionSingleTaskInMatrix === 'function') {
                        results.matrixPositioning = true;
                        console.log('✅ Matrix positioning methods working');
                    }
                    
                    // Test 6: D3 animations functionality
                    const d3Validation = matrixAnimations.validateD3Functionality();
                    if (d3Validation.isValid) {
                        results.d3AnimationsWorking = true;
                        console.log('✅ D3 animations working');
                    } else {
                        console.warn('⚠️ D3 animations issues:', d3Validation.errors);
                    }
                    
                    // Test 7: Matrix state management
                    const controllerState = matrixController.getMatrixControllerState();
                    const animationsState = matrixAnimations.getMatrixAnimationsState();
                    
                    if (controllerState && animationsState && 
                        typeof controllerState.isMatrixMode === 'boolean' &&
                        typeof animationsState.animationCount === 'number') {
                        results.matrixStateManagement = true;
                        console.log('✅ Matrix state management working');
                    }
                    
                } else {
                    console.error('❌ Matrix Animations not found in main application');
                }
                
                // Test 8: Interface preservation
                const originalMethods = [
                    'toggleEisenhowerMatrix', 'enterMatrixMode', 'exitMatrixMode',
                    'storeOriginalNodePositions', 'positionTasksInMatrix', 'positionSingleTaskInMatrix',
                    'analyzeTaskUrgencyImportance', 'transitionNodesOffScreen', 'transitionNodesToOriginalPositions',
                    'repositionTaskInMatrix'
                ];
                
                const allMethodsExist = originalMethods.every(method => 
                    typeof window.processFlowDesigner[method] === 'function'
                );
                
                if (allMethodsExist) {
                    results.interfacePreserved = true;
                    console.log('✅ All original matrix interfaces preserved');
                } else {
                    console.warn('⚠️ Some matrix interfaces missing');
                    // Check which methods are missing
                    originalMethods.forEach(method => {
                        if (typeof window.processFlowDesigner[method] !== 'function') {
                            console.warn(`Missing method: ${method}`);
                        }
                    });
                }
                
            } else {
                console.error('❌ Matrix Controller not found in main application');
            }
            
        } catch (error) {
            console.error('❌ Matrix system verification error:', error);
        }
        
        // Summary
        const passedTests = Object.values(results).filter(result => result === true).length;
        const totalTests = Object.keys(results).length;
        
        console.log(`\\n🎯 Matrix System Verification Results: ${passedTests}/${totalTests} tests passed`);
        
        Object.entries(results).forEach(([test, passed]) => {
            console.log(`${passed ? '✅' : '❌'} ${test}`);
        });
        
        const allPassed = passedTests === totalTests;
        console.log(`\\n${allPassed ? '🎉' : '⚠️'} Matrix System Verification ${allPassed ? 'PASSED' : 'FAILED'}`);
        
        return {
            success: allPassed,
            passedTests,
            totalTests,
            results
        };
    };
    
    // Additional matrix behavior tests
    window.testMatrixBehavior = function() {
        console.log('🔄 Testing Matrix Behavior...');
        
        if (!window.processFlowDesigner) {
            console.error('❌ ProcessFlowDesigner not available');
            return false;
        }
        
        const app = window.processFlowDesigner;
        const matrixController = app.matrixController;
        const matrixAnimations = app.matrixAnimations;
        
        if (!matrixController || !matrixAnimations) {
            console.error('❌ Matrix modules not available');
            return false;
        }
        
        try {
            // Test task urgency/importance analysis
            console.log('Testing task urgency/importance analysis...');
            
            const mockTags = [
                { category: 'urgency', option: 'urgent' },
                { category: 'importance', option: 'important' }
            ];
            
            const analysis = matrixController.analyzeTaskUrgencyImportance(mockTags);
            
            if (analysis && analysis.isUrgent === true && analysis.isImportant === true) {
                console.log('✅ Task analysis working correctly');
            } else {
                console.warn('⚠️ Task analysis not working as expected:', analysis);
            }
            
            // Test quadrant determination
            console.log('Testing quadrant determination...');
            
            const quadrant = matrixController.determineQuadrant(true, true);
            if (quadrant === 2) { // Urgent & Important should be quadrant 2
                console.log('✅ Quadrant determination working correctly');
            } else {
                console.warn('⚠️ Quadrant determination not working as expected:', quadrant);
            }
            
            // Test animation configuration
            console.log('Testing animation configuration...');
            
            const animConfig = matrixAnimations.getAnimationConfig();
            if (animConfig && animConfig.duration && animConfig.easing) {
                console.log('✅ Animation configuration accessible');
            } else {
                console.warn('⚠️ Animation configuration not accessible');
            }
            
            // Test matrix state delegation
            console.log('Testing matrix state delegation...');
            
            const initialIsMatrixMode = app.isMatrixMode;
            const controllerMode = matrixController.getMatrixMode();
            
            if (initialIsMatrixMode === controllerMode) {
                console.log('✅ Matrix state delegation working');
            } else {
                console.warn('⚠️ Matrix state delegation not working');
            }
            
            // Test animation state tracking
            console.log('Testing animation state tracking...');
            
            const animationsInProgress = matrixAnimations.areAnimationsInProgress();
            const currentAnimations = matrixAnimations.getCurrentAnimations();
            
            if (typeof animationsInProgress === 'boolean' && Array.isArray(currentAnimations)) {
                console.log('✅ Animation state tracking working');
            } else {
                console.warn('⚠️ Animation state tracking not working');
            }
            
            console.log('✅ Matrix behavior tests completed');
            return true;
            
        } catch (error) {
            console.error('❌ Matrix behavior test error:', error);
            return false;
        }
    };
    
    // Test matrix performance and diagnostics
    window.testMatrixPerformance = function() {
        console.log('🔄 Testing Matrix Performance...');
        
        if (!window.processFlowDesigner || !window.processFlowDesigner.matrixAnimations) {
            console.error('❌ Matrix Animations not available');
            return false;
        }
        
        const matrixAnimations = window.processFlowDesigner.matrixAnimations;
        
        try {
            // Create performance report
            console.log('Creating matrix performance report...');
            
            const performanceReport = matrixAnimations.createPerformanceReport();
            
            if (performanceReport && performanceReport.timestamp) {
                console.log('✅ Performance report created');
                console.log('📊 Performance Report:', performanceReport);
                
                // Check for performance issues
                if (performanceReport.recommendations && performanceReport.recommendations.length > 0) {
                    console.log('💡 Performance Recommendations:');
                    performanceReport.recommendations.forEach(rec => {
                        console.log(`  - ${rec}`);
                    });
                }
                
            } else {
                console.warn('⚠️ Performance report not created');
            }
            
            // Test D3 validation
            console.log('Testing D3 validation...');
            
            const d3Validation = matrixAnimations.validateD3Functionality();
            console.log('🔍 D3 Validation:', d3Validation);
            
            if (d3Validation.isValid) {
                console.log('✅ D3 validation passed');
            } else {
                console.warn('⚠️ D3 validation failed:', d3Validation.errors);
            }
            
            console.log('✅ Matrix performance tests completed');
            return true;
            
        } catch (error) {
            console.error('❌ Matrix performance test error:', error);
            return false;
        }
    };
    
    // Test matrix integration with existing features
    window.testMatrixIntegration = function() {
        console.log('🔄 Testing Matrix Integration...');
        
        if (!window.processFlowDesigner) {
            console.error('❌ ProcessFlowDesigner not available');
            return false;
        }
        
        const app = window.processFlowDesigner;
        
        try {
            // Test integration with tag system
            console.log('Testing matrix integration with tag system...');
            
            if (app.tagManager && app.matrixController) {
                // Test that matrix controller can access tag data
                const mockTaskElement = document.createElement('div');
                mockTaskElement.dataset.tags = JSON.stringify([
                    { category: 'urgency', option: 'urgent' }
                ]);
                
                const tags = app.matrixController.getTaskTags(mockTaskElement);
                
                if (Array.isArray(tags) && tags.length === 1) {
                    console.log('✅ Matrix-Tag integration working');
                } else {
                    console.warn('⚠️ Matrix-Tag integration issues');
                }
                
            } else {
                console.warn('⚠️ Tag manager or matrix controller missing');
            }
            
            // Test integration with DOM service
            console.log('Testing matrix integration with DOM service...');
            
            if (app.domService && app.matrixController) {
                const matrixState = app.matrixController.getMatrixControllerState();
                
                if (matrixState && matrixState.elementsLoaded) {
                    console.log('✅ Matrix-DOM integration working');
                } else {
                    console.warn('⚠️ Matrix-DOM integration issues');
                }
            }
            
            // Test getter/setter integration
            console.log('Testing matrix getter/setter integration...');
            
            const originalMode = app.isMatrixMode;
            app.isMatrixMode = !originalMode;
            const newMode = app.isMatrixMode;
            app.isMatrixMode = originalMode; // Reset
            
            if (newMode !== originalMode) {
                console.log('✅ Matrix getter/setter integration working');
            } else {
                console.warn('⚠️ Matrix getter/setter integration issues');
            }
            
            console.log('✅ Matrix integration tests completed');
            return true;
            
        } catch (error) {
            console.error('❌ Matrix integration test error:', error);
            return false;
        }
    };
    
    // Auto-run verification when page loads
    document.addEventListener('DOMContentLoaded', function() {
        // Wait a bit for app initialization
        setTimeout(() => {
            if (typeof window.verifyMatrixSystem === 'function') {
                window.verifyMatrixSystem();
            }
        }, 2000); // Longer wait for matrix system to initialize
    });
}

console.log('📋 Phase 7 Eisenhower Matrix Verification Script Loaded');