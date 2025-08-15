// Matrix Debug Script - Run this in browser console to test matrix functionality

function debugMatrixState() {
    console.log('=== MATRIX DEBUG REPORT ===');
    
    if (!window.processFlowDesigner) {
        console.error('❌ ProcessFlowDesigner not found');
        return;
    }
    
    const app = window.processFlowDesigner;
    
    // Check matrix controller
    console.log('Matrix Controller:', !!app.matrixController);
    if (app.matrixController) {
        const state = app.matrixController.getMatrixControllerState();
        console.log('Matrix Controller State:', state);
        
        const validation = app.matrixController.validateMatrixElements();
        console.log('Matrix Element Validation:', validation);
    }
    
    // Check matrix animations
    console.log('Matrix Animations:', !!app.matrixAnimations);
    if (app.matrixAnimations) {
        const state = app.matrixAnimations.getMatrixAnimationsState();
        console.log('Matrix Animations State:', state);
        
        const d3Validation = app.matrixAnimations.validateD3Functionality();
        console.log('D3 Validation:', d3Validation);
    }
    
    // Check DOM elements
    const elements = {
        eisenhowerToggle: document.getElementById('eisenhowerToggle'),
        eisenhowerMatrix: document.getElementById('eisenhowerMatrix'),
        canvas: document.getElementById('canvas')
    };
    
    console.log('DOM Elements:', {
        eisenhowerToggle: !!elements.eisenhowerToggle,
        eisenhowerMatrix: !!elements.eisenhowerMatrix,
        canvas: !!elements.canvas
    });
    
    // Check nodes and task nodes
    console.log('Nodes:', app.nodes?.length || 0);
    console.log('Task Nodes:', app.taskNodes?.length || 0);
    
    // Check if matrix mode is active
    console.log('Matrix Mode Active:', app.isMatrixMode);
    
    console.log('=== END MATRIX DEBUG REPORT ===');
}

function testMatrixToggle() {
    console.log('=== TESTING MATRIX TOGGLE ===');
    
    if (!window.processFlowDesigner) {
        console.error('❌ ProcessFlowDesigner not found');
        return;
    }
    
    const app = window.processFlowDesigner;
    
    console.log('Current matrix mode:', app.isMatrixMode);
    console.log('Available nodes:', app.nodes?.length || 0);
    console.log('Available task nodes:', app.taskNodes?.length || 0);
    
    // Test toggle
    try {
        console.log('Attempting to toggle matrix...');
        app.toggleEisenhowerMatrix();
        
        setTimeout(() => {
            console.log('Matrix mode after toggle:', app.isMatrixMode);
            
            const matrixElement = document.getElementById('eisenhowerMatrix');
            console.log('Matrix element display:', matrixElement?.style.display);
            
            // Test toggle back to normal
            if (app.isMatrixMode) {
                console.log('Testing toggle back to normal mode...');
                app.toggleEisenhowerMatrix();
                
                setTimeout(() => {
                    console.log('Matrix mode after second toggle:', app.isMatrixMode);
                    console.log('Matrix element display after exit:', matrixElement?.style.display);
                    
                    // Check task positioning after animations should complete
                    setTimeout(() => {
                        console.log('Checking task positions after D3 transitions...');
                        const taskNodes = app.taskNodes || [];
                        taskNodes.forEach(task => {
                            const anchorId = task.dataset.anchoredTo;
                            const slot = task.dataset.slot;
                            const container = task.closest('.task-container');
                            const nextActionSlot = document.querySelector(`.next-action-slot[data-task-id="${task.dataset.id}"]`);
                            
                            if (container) {
                                console.log(`Task ${task.dataset.id}: anchor=${anchorId}, slot=${slot}`);
                                console.log(`  Container position: (${container.style.left}, ${container.style.top})`);
                                
                                if (nextActionSlot) {
                                    console.log(`  Next-action-slot position: (${nextActionSlot.style.left}, ${nextActionSlot.style.top})`);
                                }
                                
                                // Verify task is positioned relative to its anchor node
                                if (anchorId) {
                                    const anchorNode = app.nodes?.find(n => n.dataset.id === anchorId);
                                    if (anchorNode) {
                                        const anchorX = parseInt(anchorNode.style.left) || 0;
                                        const anchorY = parseInt(anchorNode.style.top) || 0;
                                        const taskX = parseInt(container.style.left) || 0;
                                        const taskY = parseInt(container.style.top) || 0;
                                        
                                        console.log(`  Anchor position: (${anchorX}, ${anchorY})`);
                                        console.log(`  Task relative to anchor: (${taskX - anchorX}, ${taskY - anchorY})`);
                                        
                                        // Check if task is positioned correctly (should be below anchor)
                                        if (taskY > anchorY + 60) { // Should be at least 60px below
                                            console.log(`  ✅ Task correctly positioned below anchor`);
                                        } else {
                                            console.log(`  ⚠️ Task may not be positioned correctly relative to anchor`);
                                        }
                                    }
                                }
                            }
                        });
                    }, 1000); // Wait for D3 transitions to complete
                    
                    console.log('=== TOGGLE TEST COMPLETE ===');
                }, 2000);
            }
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error during toggle test:', error);
    }
}

function testMatrixAnimation() {
    console.log('=== TESTING MATRIX ANIMATION ===');
    
    if (!window.processFlowDesigner || !window.processFlowDesigner.matrixAnimations) {
        console.error('❌ Matrix animations not available');
        return;
    }
    
    const app = window.processFlowDesigner;
    
    // Test D3 functionality
    const d3Test = app.matrixAnimations.validateD3Functionality();
    console.log('D3 validation:', d3Test);
    
    if (!d3Test.isValid) {
        console.error('❌ D3 is not working properly');
        return;
    }
    
    // Test off-screen animation
    try {
        console.log('Testing off-screen animation...');
        app.matrixAnimations.transitionNodesOffScreen().then(() => {
            console.log('✅ Off-screen animation completed');
            
            // Test return animation
            setTimeout(() => {
                console.log('Testing return animation...');
                app.matrixAnimations.transitionNodesToOriginalPositions().then(() => {
                    console.log('✅ Return animation completed');
                    console.log('=== ANIMATION TEST COMPLETE ===');
                });
            }, 1000);
        });
    } catch (error) {
        console.error('❌ Error during animation test:', error);
    }
}

function testTaskRepositioning() {
    console.log('=== TESTING TASK REPOSITIONING WITH D3 ===');
    
    if (!window.processFlowDesigner) {
        console.error('❌ ProcessFlowDesigner not found');
        return;
    }
    
    const app = window.processFlowDesigner;
    
    if (!app.matrixController) {
        console.error('❌ MatrixController not found');
        return;
    }
    
    console.log('Task nodes available:', app.taskNodes?.length || 0);
    
    if (!app.taskNodes || app.taskNodes.length === 0) {
        console.warn('⚠️ No task nodes found to test repositioning');
        return;
    }
    
    try {
        console.log('Testing task repositioning with D3 transitions...');
        
        // Record initial positions
        const initialPositions = app.taskNodes.map(task => {
            const container = task.closest('.task-container');
            return {
                taskId: task.dataset.id,
                initialX: container ? parseInt(container.style.left) || 0 : 0,
                initialY: container ? parseInt(container.style.top) || 0 : 0
            };
        });
        
        console.log('Initial task positions:', initialPositions);
        
        // Call the repositioning function directly
        app.matrixController.repositionTasksAfterMatrixExit();
        
        // Check positions after animation
        setTimeout(() => {
            console.log('Task positions after D3 repositioning:');
            app.taskNodes.forEach(task => {
                const container = task.closest('.task-container');
                if (container) {
                    const finalX = parseInt(container.style.left) || 0;
                    const finalY = parseInt(container.style.top) || 0;
                    const initial = initialPositions.find(p => p.taskId === task.dataset.id);
                    
                    console.log(`Task ${task.dataset.id}:`);
                    console.log(`  Initial: (${initial?.initialX}, ${initial?.initialY})`);
                    console.log(`  Final: (${finalX}, ${finalY})`);
                    console.log(`  Movement: (${finalX - (initial?.initialX || 0)}, ${finalY - (initial?.initialY || 0)})`);
                }
            });
            
            console.log('=== TASK REPOSITIONING TEST COMPLETE ===');
        }, 1200); // Wait for staggered animations to complete
        
    } catch (error) {
        console.error('❌ Error during task repositioning test:', error);
    }
}

// Auto-run debug when loaded
if (typeof window !== 'undefined') {
    // Wait for page to load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(debugMatrixState, 2000);
        });
    } else {
        setTimeout(debugMatrixState, 1000);
    }
}

console.log('Matrix debug functions loaded:');
console.log('- debugMatrixState() - Check overall matrix state');
console.log('- testMatrixToggle() - Test full matrix toggle cycle');
console.log('- testMatrixAnimation() - Test D3 animations');
console.log('- testTaskRepositioning() - Test task D3 repositioning only');