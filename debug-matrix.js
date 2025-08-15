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
                    
                    // Check task positioning
                    console.log('Checking task positions after matrix exit...');
                    const taskNodes = app.taskNodes || [];
                    taskNodes.forEach(task => {
                        const anchorId = task.dataset.anchoredTo;
                        const slot = task.dataset.slot;
                        const container = task.closest('.task-container');
                        if (container) {
                            console.log(`Task ${task.dataset.id}: anchor=${anchorId}, slot=${slot}, position=(${container.style.left}, ${container.style.top})`);
                        }
                    });
                    
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

console.log('Matrix debug functions loaded. Run debugMatrixState(), testMatrixToggle(), or testMatrixAnimation() in console.');