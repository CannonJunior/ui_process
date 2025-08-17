/**
 * Eisenhower Matrix Animations
 * Handles all D3 animations and transitions for matrix mode
 * 
 * SAFETY: Complex D3 animations with timing dependencies
 * Risk Level: HIGHEST - Critical D3 animation logic
 */

class MatrixAnimations {
    constructor(mainApp) {
        // Reference to main application instance
        this.app = mainApp;
        
        // Animation configuration
        this.animationConfig = {
            duration: {
                nodeTransition: 800,
                taskPositioning: 1000,
                singleTask: 1000
            },
            delay: {
                staggerTasks: 50,
                staggerSlots: 50
            },
            easing: d3.easeCubicOut
        };
        
        // Animation state tracking
        this.animationsInProgress = new Set();
        
        console.log('MatrixAnimations: Initialized with D3 version', d3.version || 'unknown');
    }
    
    // ==================== NODE TRANSITION ANIMATIONS ====================
    
    /**
     * Transition all nodes off-screen to the left
     * @returns {Promise} Promise that resolves when animation completes
     */
    transitionNodesOffScreen() {
        return new Promise((resolve) => {
            const animationId = 'nodes-off-screen';
            this.animationsInProgress.add(animationId);
            
            try {
                // Get original positions from matrix controller
                const originalPositions = this.app.matrixController ? 
                    this.app.matrixController.getOriginalNodePositions() : new Map();
                
                const elementsToAnimate = Array.from(originalPositions.values());
                
                if (elementsToAnimate.length === 0) {
                    console.log('MatrixAnimations: No elements to animate off-screen');
                    this.animationsInProgress.delete(animationId);
                    resolve();
                    return;
                }
                
                console.log(`MatrixAnimations: Transitioning ${elementsToAnimate.length} elements off-screen`);
                
                // Use D3 to select and animate elements
                d3.selectAll(elementsToAnimate.map(item => item.element))
                    .transition()
                    .duration(this.animationConfig.duration.nodeTransition)
                    .ease(this.animationConfig.easing)
                    .style('left', (d, i) => {
                        const item = elementsToAnimate[i];
                        // Move off-screen to the left (negative x value)
                        return `-${item.element.offsetWidth + 50}px`;
                    })
                    .on('end', () => {
                        console.log('MatrixAnimations: Nodes transition off-screen completed');
                        this.animationsInProgress.delete(animationId);
                        resolve();
                    })
                    .on('interrupt', () => {
                        console.warn('MatrixAnimations: Nodes off-screen animation interrupted');
                        this.animationsInProgress.delete(animationId);
                        resolve();
                    });
                    
            } catch (error) {
                console.error('MatrixAnimations: Error in transitionNodesOffScreen:', error);
                this.animationsInProgress.delete(animationId);
                resolve(); // Resolve anyway to prevent hanging
            }
        });
    }
    
    /**
     * Transition all nodes back to their original positions
     * @returns {Promise} Promise that resolves when animation completes
     */
    transitionNodesToOriginalPositions() {
        return new Promise((resolve) => {
            const animationId = 'nodes-to-original';
            this.animationsInProgress.add(animationId);
            
            try {
                // Get original positions from matrix controller
                const originalPositions = this.app.matrixController ? 
                    this.app.matrixController.getOriginalNodePositions() : new Map();
                
                const elementsToAnimate = Array.from(originalPositions.values());
                
                if (elementsToAnimate.length === 0) {
                    console.log('MatrixAnimations: No elements to animate to original positions');
                    this.animationsInProgress.delete(animationId);
                    resolve();
                    return;
                }
                
                console.log(`MatrixAnimations: Transitioning ${elementsToAnimate.length} elements to original positions`);
                
                // Use D3 to select and animate elements back to original positions
                d3.selectAll(elementsToAnimate.map(item => item.element))
                    .transition()
                    .duration(this.animationConfig.duration.nodeTransition)
                    .ease(this.animationConfig.easing)
                    .style('left', (d, i) => {
                        const item = elementsToAnimate[i];
                        return `${item.x}px`;
                    })
                    .style('top', (d, i) => {
                        const item = elementsToAnimate[i];
                        return `${item.y}px`;
                    })
                    .on('end', () => {
                        console.log('MatrixAnimations: Nodes transition to original positions completed');
                        
                        // Animate flowlines back to original positions
                        this.animateFlowlinesFromMatrix();
                        
                        this.animationsInProgress.delete(animationId);
                        resolve();
                    })
                    .on('interrupt', () => {
                        console.warn('MatrixAnimations: Nodes to original positions animation interrupted');
                        this.animationsInProgress.delete(animationId);
                        resolve();
                    });
                    
            } catch (error) {
                console.error('MatrixAnimations: Error in transitionNodesToOriginalPositions:', error);
                this.animationsInProgress.delete(animationId);
                resolve(); // Resolve anyway to prevent hanging
            }
        });
    }
    
    // ==================== MATRIX POSITIONING ANIMATIONS ====================
    
    /**
     * Animate multiple tasks into matrix positions
     * @param {Array} taskContainersData - Array of task positioning data
     */
    animateTasksToMatrix(taskContainersData) {
        const animationId = 'tasks-to-matrix';
        this.animationsInProgress.add(animationId);
        
        try {
            if (!taskContainersData || taskContainersData.length === 0) {
                console.log('MatrixAnimations: No tasks to animate to matrix');
                this.animationsInProgress.delete(animationId);
                return;
            }
            
            console.log(`MatrixAnimations: Animating ${taskContainersData.length} tasks to matrix positions`);
            
            // Use D3 to animate task containers into matrix positions
            d3.selectAll(taskContainersData.map(item => item.element))
                .transition()
                .duration(this.animationConfig.duration.taskPositioning)
                .delay((d, i) => i * this.animationConfig.delay.staggerTasks) // Stagger animations
                .ease(this.animationConfig.easing)
                .style('left', (d, i) => `${taskContainersData[i].targetX}px`)
                .style('top', (d, i) => `${taskContainersData[i].targetY}px`)
                .on('end', () => {
                    this.animationsInProgress.delete(animationId);
                });
            
            // Also animate next-action-slots to positions relative to their tasks
            this.animateNextActionSlots(taskContainersData);
            
            // Animate flowlines to update with new node positions
            this.animateFlowlinesForMatrix();
            
        } catch (error) {
            console.error('MatrixAnimations: Error in animateTasksToMatrix:', error);
            this.animationsInProgress.delete(animationId);
        }
    }
    
    /**
     * Animate next-action-slots relative to their tasks
     * @param {Array} taskContainersData - Array of task positioning data
     */
    animateNextActionSlots(taskContainersData) {
        const animationId = 'slots-to-matrix';
        this.animationsInProgress.add(animationId);
        
        try {
            const canvas = this.app.canvas || this.app.domService?.getElement('canvas');
            if (!canvas) {
                console.warn('MatrixAnimations: Canvas not available for slot animation');
                this.animationsInProgress.delete(animationId);
                return;
            }
            
            const slotsToAnimate = [];
            
            taskContainersData.forEach((taskData, index) => {
                const nextActionSlot = canvas.querySelector(`.next-action-slot[data-task-id="${taskData.taskNode.dataset.id}"]`);
                
                if (nextActionSlot) {
                    // Position next-action-slot to the right of its task container
                    const slotX = taskData.targetX + 130; // 130px to the right
                    const slotY = taskData.targetY;
                    
                    slotsToAnimate.push({
                        element: nextActionSlot,
                        targetX: slotX,
                        targetY: slotY,
                        delay: index * this.animationConfig.delay.staggerSlots
                    });
                }
            });
            
            if (slotsToAnimate.length === 0) {
                this.animationsInProgress.delete(animationId);
                return;
            }
            
            console.log(`MatrixAnimations: Animating ${slotsToAnimate.length} next-action-slots`);
            
            // Animate slots
            slotsToAnimate.forEach(slotData => {
                d3.select(slotData.element)
                    .transition()
                    .duration(this.animationConfig.duration.taskPositioning)
                    .delay(slotData.delay)
                    .ease(this.animationConfig.easing)
                    .style('left', `${slotData.targetX}px`)
                    .style('top', `${slotData.targetY}px`);
            });
            
            // Mark animation as complete after the longest delay + duration
            const maxDelay = Math.max(...slotsToAnimate.map(s => s.delay));
            setTimeout(() => {
                this.animationsInProgress.delete(animationId);
            }, maxDelay + this.animationConfig.duration.taskPositioning);
            
        } catch (error) {
            console.error('MatrixAnimations: Error in animateNextActionSlots:', error);
            this.animationsInProgress.delete(animationId);
        }
    }
    
    /**
     * Animate a single task to matrix position
     * @param {Object} taskData - Single task positioning data
     */
    animateSingleTaskToMatrix(taskData) {
        const animationId = `single-task-${taskData.taskNode.dataset.id}`;
        this.animationsInProgress.add(animationId);
        
        try {
            if (!taskData || !taskData.element) {
                console.warn('MatrixAnimations: Invalid task data for single task animation');
                this.animationsInProgress.delete(animationId);
                return;
            }
            
            console.log(`MatrixAnimations: Animating single task to matrix position (quadrant ${taskData.quadrant})`);
            
            // Use D3 to animate task container into position
            d3.select(taskData.element)
                .transition()
                .duration(this.animationConfig.duration.singleTask)
                .ease(this.animationConfig.easing)
                .style('left', `${taskData.targetX}px`)
                .style('top', `${taskData.targetY}px`)
                .on('end', () => {
                    this.animationsInProgress.delete(animationId);
                });
            
            // Also animate associated next-action-slot
            this.animateSlotForSingleTask(taskData);
            
        } catch (error) {
            console.error('MatrixAnimations: Error in animateSingleTaskToMatrix:', error);
            this.animationsInProgress.delete(animationId);
        }
    }
    
    /**
     * Animate next-action-slot for a single task
     * @param {Object} taskData - Task positioning data
     */
    animateSlotForSingleTask(taskData) {
        try {
            const canvas = this.app.canvas || this.app.domService?.getElement('canvas');
            if (!canvas) {
                console.warn('MatrixAnimations: Canvas not available for single slot animation');
                return;
            }
            
            const nextActionSlot = canvas.querySelector(`.next-action-slot[data-task-id="${taskData.taskNode.dataset.id}"]`);
            
            if (nextActionSlot) {
                const slotX = taskData.targetX + 130; // 130px to the right of task
                const slotY = taskData.targetY;
                
                this.animateSlotToPosition(nextActionSlot, slotX, slotY);
            }
            
        } catch (error) {
            console.error('MatrixAnimations: Error in animateSlotForSingleTask:', error);
        }
    }
    
    /**
     * Animate a slot to a specific position
     * @param {HTMLElement} slotElement - Slot element
     * @param {number} targetX - Target X position
     * @param {number} targetY - Target Y position
     */
    animateSlotToPosition(slotElement, targetX, targetY) {
        const animationId = `slot-${slotElement.dataset.taskId}`;
        this.animationsInProgress.add(animationId);
        
        try {
            d3.select(slotElement)
                .transition()
                .duration(this.animationConfig.duration.singleTask)
                .ease(this.animationConfig.easing)
                .style('left', `${targetX}px`)
                .style('top', `${targetY}px`)
                .on('end', () => {
                    this.animationsInProgress.delete(animationId);
                });
                
        } catch (error) {
            console.error('MatrixAnimations: Error in animateSlotToPosition:', error);
            this.animationsInProgress.delete(animationId);
        }
    }
    
    // ==================== ANIMATION MANAGEMENT ====================
    
    /**
     * Check if any animations are currently in progress
     * @returns {boolean} True if animations are running
     */
    areAnimationsInProgress() {
        return this.animationsInProgress.size > 0;
    }
    
    /**
     * Get list of currently running animations
     * @returns {Array} Array of animation IDs
     */
    getCurrentAnimations() {
        return Array.from(this.animationsInProgress);
    }
    
    /**
     * Stop all running animations
     */
    stopAllAnimations() {
        console.log('MatrixAnimations: Stopping all animations');
        
        try {
            // Interrupt all D3 transitions
            d3.selectAll('*').interrupt();
            
            // Clear animations tracking
            this.animationsInProgress.clear();
            
            console.log('MatrixAnimations: All animations stopped');
            
        } catch (error) {
            console.error('MatrixAnimations: Error stopping animations:', error);
        }
    }
    
    /**
     * Wait for all current animations to complete
     * @param {number} timeout - Maximum time to wait in milliseconds
     * @returns {Promise} Promise that resolves when animations complete or timeout
     */
    waitForAnimationsToComplete(timeout = 5000) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            
            const checkAnimations = () => {
                if (this.animationsInProgress.size === 0) {
                    console.log('MatrixAnimations: All animations completed');
                    resolve();
                } else if (Date.now() - startTime > timeout) {
                    console.warn('MatrixAnimations: Animation wait timeout reached');
                    resolve();
                } else {
                    setTimeout(checkAnimations, 100);
                }
            };
            
            checkAnimations();
        });
    }
    
    // ==================== ANIMATION CONFIGURATION ====================
    
    /**
     * Update animation configuration
     * @param {Object} newConfig - New configuration values
     */
    updateAnimationConfig(newConfig) {
        try {
            // Deep merge configuration
            if (newConfig.duration) {
                Object.assign(this.animationConfig.duration, newConfig.duration);
            }
            if (newConfig.delay) {
                Object.assign(this.animationConfig.delay, newConfig.delay);
            }
            if (newConfig.easing) {
                this.animationConfig.easing = newConfig.easing;
            }
            
            console.log('MatrixAnimations: Configuration updated', this.animationConfig);
            
        } catch (error) {
            console.error('MatrixAnimations: Error updating configuration:', error);
        }
    }
    
    /**
     * Get current animation configuration
     * @returns {Object} Current animation configuration
     */
    getAnimationConfig() {
        return { ...this.animationConfig };
    }
    
    /**
     * Reset animation configuration to defaults
     */
    resetAnimationConfig() {
        this.animationConfig = {
            duration: {
                nodeTransition: 800,
                taskPositioning: 1000,
                singleTask: 1000
            },
            delay: {
                staggerTasks: 50,
                staggerSlots: 50
            },
            easing: d3.easeCubicOut
        };
        
        console.log('MatrixAnimations: Configuration reset to defaults');
    }
    
    // ==================== DEBUGGING AND DIAGNOSTICS ====================
    
    /**
     * Get matrix animations state information for debugging
     * @returns {Object} Matrix animations state information
     */
    getMatrixAnimationsState() {
        return {
            animationsInProgress: Array.from(this.animationsInProgress),
            animationCount: this.animationsInProgress.size,
            d3Available: typeof d3 !== 'undefined',
            d3Version: typeof d3 !== 'undefined' ? (d3.version || 'unknown') : 'not available',
            config: this.animationConfig
        };
    }
    
    /**
     * Validate D3 availability and functionality
     * @returns {Object} Validation result
     */
    validateD3Functionality() {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };
        
        try {
            // Check if D3 is available
            if (typeof d3 === 'undefined') {
                result.isValid = false;
                result.errors.push('D3.js library not available');
                return result;
            }
            
            // Check essential D3 methods
            const requiredMethods = ['select', 'selectAll', 'transition', 'ease', 'easeCubicOut'];
            requiredMethods.forEach(method => {
                if (typeof d3[method] === 'undefined') {
                    result.errors.push(`D3 method missing: ${method}`);
                    result.isValid = false;
                }
            });
            
            // Test basic D3 functionality
            try {
                const testSelection = d3.select('body');
                if (!testSelection) {
                    result.warnings.push('D3 selection test failed');
                }
            } catch (e) {
                result.warnings.push('D3 basic functionality test failed');
            }
            
        } catch (error) {
            result.isValid = false;
            result.errors.push(`D3 validation error: ${error.message}`);
        }
        
        return result;
    }
    
    /**
     * Create animation performance report
     * @returns {Object} Performance report
     */
    createPerformanceReport() {
        return {
            timestamp: new Date().toISOString(),
            activeAnimations: this.animationsInProgress.size,
            currentAnimations: Array.from(this.animationsInProgress),
            configuration: this.animationConfig,
            d3Status: this.validateD3Functionality(),
            recommendations: this.getPerformanceRecommendations()
        };
    }
    
    // ==================== FLOWLINE ANIMATION METHODS ====================
    
    /**
     * Animate flowlines when entering matrix mode
     */
    animateFlowlinesForMatrix() {
        const animationId = 'flowlines-to-matrix';
        this.animationsInProgress.add(animationId);
        
        try {
            if (!this.app.flowlineManager) {
                console.warn('MatrixAnimations: FlowlineManager not available');
                this.animationsInProgress.delete(animationId);
                return;
            }
            
            const flowlines = this.app.flowlineManager.getAllFlowlines();
            if (flowlines.length === 0) {
                this.animationsInProgress.delete(animationId);
                return;
            }
            
            // Animate each flowline path with a staggered transition
            flowlines.forEach((flowline, index) => {
                if (flowline.element) {
                    // Store original path before animation
                    const originalPath = flowline.element.getAttribute('d');
                    
                    d3.select(flowline.element)
                        .transition()
                        .duration(this.animationConfig.duration.nodeTransition)
                        .delay(index * 50) // Stagger animations
                        .ease(this.animationConfig.easing)
                        .attrTween('d', () => {
                            // Update flowline path during transition
                            return (t) => {
                                // Force flowline update at each step of transition
                                this.app.flowlineManager.updateSingleFlowline(flowline);
                                return flowline.element.getAttribute('d');
                            };
                        })
                        .on('end', () => {
                            if (index === flowlines.length - 1) {
                                // Final update after all animations complete
                                this.app.flowlineManager.updateFlowlines();
                                this.animationsInProgress.delete(animationId);
                                console.log('MatrixAnimations: Flowlines transition to matrix completed');
                            }
                        });
                }
            });
            
        } catch (error) {
            console.error('MatrixAnimations: Error in animateFlowlinesForMatrix:', error);
            this.animationsInProgress.delete(animationId);
        }
    }
    
    /**
     * Animate flowlines when exiting matrix mode back to original positions
     */
    animateFlowlinesFromMatrix() {
        const animationId = 'flowlines-from-matrix';
        this.animationsInProgress.add(animationId);
        
        try {
            if (!this.app.flowlineManager) {
                console.warn('MatrixAnimations: FlowlineManager not available');
                this.animationsInProgress.delete(animationId);
                return;
            }
            
            const flowlines = this.app.flowlineManager.getAllFlowlines();
            if (flowlines.length === 0) {
                this.animationsInProgress.delete(animationId);
                return;
            }
            
            // Animate each flowline path back to original position
            flowlines.forEach((flowline, index) => {
                if (flowline.element) {
                    d3.select(flowline.element)
                        .transition()
                        .duration(this.animationConfig.duration.nodeTransition)
                        .delay(index * 30) // Slightly faster stagger for return
                        .ease(this.animationConfig.easing)
                        .attrTween('d', () => {
                            // Update flowline path during transition
                            return (t) => {
                                // Force flowline update at each step of transition
                                this.app.flowlineManager.updateSingleFlowline(flowline);
                                return flowline.element.getAttribute('d');
                            };
                        })
                        .on('end', () => {
                            if (index === flowlines.length - 1) {
                                // Final update after all animations complete
                                this.app.flowlineManager.updateFlowlines();
                                this.animationsInProgress.delete(animationId);
                                console.log('MatrixAnimations: Flowlines transition from matrix completed');
                            }
                        });
                }
            });
            
        } catch (error) {
            console.error('MatrixAnimations: Error in animateFlowlinesFromMatrix:', error);
            this.animationsInProgress.delete(animationId);
        }
    }
    
    /**
     * Get performance recommendations
     * @returns {Array} Array of recommendation strings
     */
    getPerformanceRecommendations() {
        const recommendations = [];
        
        if (this.animationsInProgress.size > 5) {
            recommendations.push('Consider reducing concurrent animations for better performance');
        }
        
        if (this.animationConfig.duration.taskPositioning > 1500) {
            recommendations.push('Long animation durations may impact user experience');
        }
        
        if (this.animationConfig.delay.staggerTasks > 100) {
            recommendations.push('High stagger delays may make animations feel slow');
        }
        
        return recommendations;
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MatrixAnimations;
}

// Make available globally for direct use
if (typeof window !== 'undefined') {
    window.MatrixAnimations = MatrixAnimations;
}