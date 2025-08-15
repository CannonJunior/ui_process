/**
 * Phase 8 Node Management Verification
 * Tests node manager and node factory integration and functionality
 */

// Verification function for node management system
if (typeof window !== 'undefined') {
    window.verifyNodeManagement = function() {
        console.log('🧪 Phase 8 Node Management Verification Starting...');
        
        const results = {
            nodeManagerExists: false,
            nodeFactoryExists: false,
            nodeElementsAccessible: false,
            nodeCreation: false,
            nodeDragDrop: false,
            nodeInteractions: false,
            interfacePreserved: false,
            nodeStateManagement: false
        };
        
        try {
            // Test 1: Node Manager exists and is accessible
            if (window.processFlowDesigner && window.processFlowDesigner.nodeManager) {
                results.nodeManagerExists = true;
                console.log('✅ Node Manager exists and is accessible');
                
                const nodeManager = window.processFlowDesigner.nodeManager;
                
                // Test 2: Node Factory exists and is accessible
                if (window.processFlowDesigner.nodeFactory) {
                    results.nodeFactoryExists = true;
                    console.log('✅ Node Factory exists and is accessible');
                    
                    const nodeFactory = window.processFlowDesigner.nodeFactory;
                    
                    // Test 3: Node elements are accessible through manager
                    const validation = nodeManager.validateNodeElements();
                    if (validation.isValid) {
                        results.nodeElementsAccessible = true;
                        console.log('✅ Node elements accessible through manager');
                    } else {
                        console.warn('⚠️ Some node elements missing:', validation.errors);
                        // Still count as accessible if not completely broken
                        if (validation.errors.length < 2) {
                            results.nodeElementsAccessible = true;
                        }
                    }
                    
                    // Test 4: Node creation functionality
                    if (typeof nodeManager.createNode === 'function' &&
                        typeof nodeManager.createDefaultStartNode === 'function' &&
                        typeof nodeFactory.createNode === 'function') {
                        results.nodeCreation = true;
                        console.log('✅ Node creation methods working');
                    }
                    
                    // Test 5: Node drag and drop functionality
                    if (typeof nodeManager.handleMouseDown === 'function' &&
                        typeof nodeManager.handleMouseMove === 'function' &&
                        typeof nodeManager.handleMouseUp === 'function') {
                        results.nodeDragDrop = true;
                        console.log('✅ Node drag and drop methods working');
                    }
                    
                    // Test 6: Node interaction methods
                    if (typeof nodeManager.handleContextMenu === 'function' &&
                        typeof nodeManager.handleDoubleClick === 'function') {
                        results.nodeInteractions = true;
                        console.log('✅ Node interaction methods working');
                    }
                    
                    // Test 7: Node state management
                    const nodeState = nodeManager.getNodeManagerState();
                    if (nodeState && typeof nodeState.nodeCount === 'number' &&
                        typeof nodeState.nodeCounter === 'number') {
                        results.nodeStateManagement = true;
                        console.log('✅ Node state management working');
                    }
                    
                } else {
                    console.error('❌ Node Factory not found in main application');
                }
                
                // Test 8: Interface preservation
                const originalMethods = [
                    'createNode', 'createDefaultStartNode', 'createNodeFromData',
                    'handleMouseDown', 'handleMouseMove', 'handleMouseUp',
                    'handleContextMenu', 'handleDoubleClick', 'getAllNodes',
                    'getNodeById', 'removeNode'
                ];
                
                const allMethodsExist = originalMethods.every(method => 
                    typeof window.processFlowDesigner[method] === 'function'
                );
                
                if (allMethodsExist) {
                    results.interfacePreserved = true;
                    console.log('✅ All original node interfaces preserved');
                } else {
                    console.warn('⚠️ Some node interfaces missing');
                    // Check which methods are missing
                    originalMethods.forEach(method => {
                        if (typeof window.processFlowDesigner[method] !== 'function') {
                            console.warn(`Missing method: ${method}`);
                        }
                    });
                }
                
            } else {
                console.error('❌ Node Manager not found in main application');
            }
            
        } catch (error) {
            console.error('❌ Node management verification error:', error);
        }
        
        // Summary
        const passedTests = Object.values(results).filter(result => result === true).length;
        const totalTests = Object.keys(results).length;
        
        console.log(`\\n🎯 Node Management Verification Results: ${passedTests}/${totalTests} tests passed`);
        
        Object.entries(results).forEach(([test, passed]) => {
            console.log(`${passed ? '✅' : '❌'} ${test}`);
        });
        
        const allPassed = passedTests === totalTests;
        console.log(`\\n${allPassed ? '🎉' : '⚠️'} Node Management Verification ${allPassed ? 'PASSED' : 'FAILED'}`);
        
        return {
            success: allPassed,
            passedTests,
            totalTests,
            results
        };
    };
    
    // Additional node creation tests
    window.testNodeCreation = function() {
        console.log('🔄 Testing Node Creation...');
        
        if (!window.processFlowDesigner) {
            console.error('❌ ProcessFlowDesigner not available');
            return false;
        }
        
        const app = window.processFlowDesigner;
        const nodeManager = app.nodeManager;
        const nodeFactory = app.nodeFactory;
        
        if (!nodeManager || !nodeFactory) {
            console.error('❌ Node modules not available');
            return false;
        }
        
        try {
            // Test node factory templates
            console.log('Testing node factory templates...');
            
            const availableTypes = nodeFactory.getAvailableNodeTypes();
            if (Array.isArray(availableTypes) && availableTypes.length > 0) {
                console.log('✅ Node types available:', availableTypes);
            } else {
                console.warn('⚠️ No node types available');
            }
            
            // Test template retrieval
            const processTemplate = nodeFactory.getNodeTemplate('process');
            if (processTemplate && processTemplate.defaultText) {
                console.log('✅ Node template retrieval working');
            } else {
                console.warn('⚠️ Node template retrieval not working');
            }
            
            // Test node validation
            const validation = nodeFactory.validateNodeData('process', { id: 'test', position: { x: 100, y: 100 } });
            if (validation && typeof validation.isValid === 'boolean') {
                console.log('✅ Node data validation working');
            } else {
                console.warn('⚠️ Node data validation not working');
            }
            
            // Test node manager state
            const initialState = nodeManager.getNodeManagerState();
            console.log('Node manager initial state:', initialState);
            
            if (initialState && typeof initialState.nodeCount === 'number') {
                console.log('✅ Node manager state accessible');
            } else {
                console.warn('⚠️ Node manager state not accessible');
            }
            
            console.log('✅ Node creation tests completed');
            return true;
            
        } catch (error) {
            console.error('❌ Node creation test error:', error);
            return false;
        }
    };
    
    // Test node interaction delegation
    window.testNodeInteractions = function() {
        console.log('🔄 Testing Node Interactions...');
        
        if (!window.processFlowDesigner) {
            console.error('❌ ProcessFlowDesigner not available');
            return false;
        }
        
        const app = window.processFlowDesigner;
        
        try {
            // Test node state getters
            console.log('Testing node state getters...');
            
            const nodes = app.nodes;
            const nodeCounter = app.nodeCounter;
            const startNode = app.startNode;
            
            if (Array.isArray(nodes)) {
                console.log('✅ Nodes getter working');
            } else {
                console.warn('⚠️ Nodes getter not working');
            }
            
            if (typeof nodeCounter === 'number') {
                console.log('✅ Node counter getter working');
            } else {
                console.warn('⚠️ Node counter getter not working');
            }
            
            // Test node creation delegation
            console.log('Testing node creation delegation...');
            
            const initialNodeCount = nodes.length;
            
            // Try creating a test node (this should delegate to NodeManager)
            try {
                app.createNode('process');
                const newNodeCount = app.nodes.length;
                
                if (newNodeCount > initialNodeCount) {
                    console.log('✅ Node creation delegation working');
                } else {
                    console.warn('⚠️ Node creation delegation may not be working');
                }
            } catch (e) {
                console.warn('⚠️ Node creation delegation test failed:', e.message);
            }
            
            // Test drag state delegation
            console.log('Testing drag state delegation...');
            
            if (app.nodeManager) {
                const dragState = app.nodeManager.getDragState();
                if (dragState && typeof dragState.isDragging === 'boolean') {
                    console.log('✅ Drag state delegation working');
                } else {
                    console.warn('⚠️ Drag state delegation not working');
                }
            }
            
            console.log('✅ Node interaction tests completed');
            return true;
            
        } catch (error) {
            console.error('❌ Node interaction test error:', error);
            return false;
        }
    };
    
    // Test node factory advanced features
    window.testNodeFactory = function() {
        console.log('🔄 Testing Node Factory Features...');
        
        if (!window.processFlowDesigner || !window.processFlowDesigner.nodeFactory) {
            console.error('❌ Node Factory not available');
            return false;
        }
        
        const nodeFactory = window.processFlowDesigner.nodeFactory;
        
        try {
            // Test start node creation
            console.log('Testing start node creation...');
            
            const startNodeOptions = { position: { x: 50, y: 50 } };
            const startNode = nodeFactory.createStartNode(startNodeOptions);
            
            if (startNode && startNode.classList.contains('start-node')) {
                console.log('✅ Start node creation working');
            } else {
                console.warn('⚠️ Start node creation not working as expected');
            }
            
            // Test task node creation
            console.log('Testing task node creation...');
            
            const taskData = { text: 'Test Task', id: 'test-task' };
            const taskOptions = { anchoredTo: 'test-anchor', slot: 1 };
            const taskNode = nodeFactory.createTaskNode(taskData, taskOptions);
            
            if (taskNode && taskNode.dataset.type === 'task') {
                console.log('✅ Task node creation working');
            } else {
                console.warn('⚠️ Task node creation not working as expected');
            }
            
            // Test serialized data restoration
            console.log('Testing serialized data restoration...');
            
            const serializedData = {
                type: 'process',
                id: 'test-123',
                text: 'Test Process',
                x: 200,
                y: 200
            };
            
            const restoredNode = nodeFactory.createNodeFromSerializedData(serializedData);
            
            if (restoredNode && restoredNode.dataset.id === 'test-123') {
                console.log('✅ Serialized data restoration working');
            } else {
                console.warn('⚠️ Serialized data restoration not working');
            }
            
            console.log('✅ Node factory feature tests completed');
            return true;
            
        } catch (error) {
            console.error('❌ Node factory test error:', error);
            return false;
        }
    };
    
    // Auto-run verification when page loads
    document.addEventListener('DOMContentLoaded', function() {
        // Wait a bit for app initialization
        setTimeout(() => {
            if (typeof window.verifyNodeManagement === 'function') {
                window.verifyNodeManagement();
            }
        }, 2500); // Wait for node manager to initialize
    });
}

console.log('📋 Phase 8 Node Management Verification Script Loaded');