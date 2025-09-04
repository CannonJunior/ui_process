/**
 * Eisenhower Matrix Controller
 * Main control logic for matrix mode toggle, state management, and task analysis
 * 
 * SAFETY: Handles matrix mode toggle and analysis logic
 * Risk Level: HIGH - Core functionality with state dependencies
 */

class MatrixController {
    constructor(mainApp) {
        // Reference to main application instance
        this.app = mainApp;
        
        // Get services
        this.domService = this.app.domService;
        this.configService = this.app.configService;
        
        // Cache matrix-related DOM elements
        this.initializeMatrixElements();
        
        // Matrix state
        this.isMatrixMode = false;
        this.originalNodePositions = new Map();
        
        // Initialize event listeners
        this.setupMatrixEventListeners();
    }
    
    /**
     * Initialize and cache matrix-related elements
     */
    initializeMatrixElements() {
        // Get matrix-related elements from DOM service
        this.eisenhowerToggle = this.domService.getElement('eisenhowerToggle');
        this.eisenhowerMatrix = this.domService.getElement('eisenhowerMatrix');
        this.canvas = this.domService.getElement('canvas');
        
        // Validate critical matrix elements
        const requiredElements = ['eisenhowerToggle', 'eisenhowerMatrix', 'canvas'];
        const missingElements = requiredElements.filter(id => !this[id]);
        
        if (missingElements.length > 0) {
            console.warn(`MatrixController: Some matrix elements missing: ${missingElements.join(', ')}`);
        }
    }
    
    /**
     * Setup event listeners for matrix functionality
     */
    setupMatrixEventListeners() {
        // Matrix toggle button event listener
        if (this.eisenhowerToggle) {
            this.eisenhowerToggle.addEventListener('click', () => this.app.toggleEisenhowerMatrix());
        }
        
        console.log('MatrixController: Event listeners initialized');
    }
    
    // ==================== MATRIX MODE CONTROL METHODS ====================
    
    /**
     * Activate matrix mode (called by main app's radio button system)
     */
    activate() {
        if (!this.isMatrixMode) {
            this.isMatrixMode = true;
            this.enterMatrixMode();
            console.log('MatrixController: Matrix mode enabled');
        }
    }
    
    /**
     * Deactivate matrix mode (called by main app's radio button system)
     */
    deactivate() {
        if (this.isMatrixMode) {
            this.isMatrixMode = false;
            this.exitMatrixMode();
            console.log('MatrixController: Matrix mode disabled');
        }
    }
    
    /**
     * Enter Matrix mode - transition to matrix view
     */
    enterMatrixMode() {
        console.log('MatrixController: Entering Eisenhower Matrix mode');
        
        // Store original positions of all nodes
        this.storeOriginalNodePositions();
        
        // Show the matrix overlay
        if (this.eisenhowerMatrix) {
            this.eisenhowerMatrix.style.display = 'grid';
        }
        
        // Use matrix animations to transition nodes off-screen and then position in matrix
        if (this.app.matrixAnimations) {
            this.app.matrixAnimations.transitionNodesOffScreen().then(() => {
                // After nodes are off-screen, position tasks in matrix quadrants
                this.positionTasksInMatrix();
            });
        } else {
            // Fallback: direct positioning without animations
            console.warn('MatrixController: MatrixAnimations not available, using fallback');
            this.positionTasksInMatrix();
        }
    }
    
    /**
     * Exit Matrix mode - return to normal view
     */
    exitMatrixMode() {
        console.log('MatrixController: Exiting Eisenhower Matrix mode');
        
        // Use matrix animations to transition nodes back to original positions
        if (this.app.matrixAnimations) {
            this.app.matrixAnimations.transitionNodesToOriginalPositions().then(() => {
                // After regular nodes are restored, reposition tasks relative to their anchor nodes
                this.repositionTasksAfterMatrixExit();
                
                // Restore flowlines to original positions
                this.restoreOriginalFlowlinePositions();
                
                // After transition completes, hide the matrix overlay
                if (this.eisenhowerMatrix) {
                    this.eisenhowerMatrix.style.display = 'none';
                }
            });
        } else {
            // Fallback: directly hide matrix without animations
            console.warn('MatrixController: MatrixAnimations not available, using fallback');
            
            // Reposition tasks relative to their anchor nodes
            this.repositionTasksAfterMatrixExit();
            
            // Restore flowlines to original positions
            this.restoreOriginalFlowlinePositions();
            
            if (this.eisenhowerMatrix) {
                this.eisenhowerMatrix.style.display = 'none';
            }
        }
    }
    
    /**
     * Reposition tasks relative to their anchor nodes after matrix exit
     * Uses D3 transitions for smooth animated repositioning
     */
    repositionTasksAfterMatrixExit() {
        console.log('MatrixController: Repositioning tasks after matrix exit with D3 transitions');
        
        // Get all task nodes from main app
        const taskNodes = this.app.taskNodes || [];
        
        if (taskNodes.length === 0) {
            console.log('MatrixController: No task nodes to reposition');
            return;
        }
        
        // Calculate target positions for all tasks first
        const taskPositions = [];
        
        taskNodes.forEach(taskNode => {
            if (taskNode.dataset.type === 'task' && taskNode.dataset.anchoredTo) {
                try {
                    const targetPosition = this.calculateTaskSlotPosition(taskNode);
                    if (targetPosition) {
                        const taskContainer = taskNode.closest('.task-container');
                        if (taskContainer) {
                            taskPositions.push({
                                element: taskContainer,
                                targetX: targetPosition.x,
                                targetY: targetPosition.y,
                                taskNode: taskNode
                            });
                        }
                    }
                } catch (error) {
                    console.error('MatrixController: Error calculating task position:', error);
                }
            }
        });
        
        if (taskPositions.length === 0) {
            console.log('MatrixController: No valid task positions calculated');
            return;
        }
        
        console.log(`MatrixController: Animating ${taskPositions.length} tasks to anchor positions`);
        
        // Use D3 to animate task containers to their proper positions
        d3.selectAll(taskPositions.map(pos => pos.element))
            .transition()
            .duration(800) // Match the duration used in matrix animations
            .delay((d, i) => i * 100) // Stagger animations for visual appeal
            .ease(d3.easeCubicOut) // Use the same easing as other matrix animations
            .style('left', (d, i) => `${taskPositions[i].targetX}px`)
            .style('top', (d, i) => `${taskPositions[i].targetY}px`)
            .on('end', (d, i) => {
                // Also reposition the next-action-slot for this task
                this.repositionNextActionSlotForTask(taskPositions[i]);
            });
        
        console.log(`MatrixController: Started D3 transition for ${taskPositions.length} tasks`);
    }
    
    /**
     * Calculate the proper slot position for a task relative to its anchor node
     * @param {HTMLElement} taskNode - Task node element
     * @returns {Object|null} Position object with x, y coordinates or null if calculation fails
     */
    calculateTaskSlotPosition(taskNode) {
        const anchorNodeId = taskNode.dataset.anchoredTo;
        const anchorNode = this.app.nodes ? this.app.nodes.find(node => node.dataset.id === anchorNodeId) : null;
        
        if (!anchorNode) {
            console.warn(`MatrixController: Anchor node ${anchorNodeId} not found for task ${taskNode.dataset.id}`);
            return null;
        }
        
        const anchorX = parseInt(anchorNode.style.left) || 0;
        const anchorY = parseInt(anchorNode.style.top) || 0;
        const slot = parseInt(taskNode.dataset.slot) || 0;
        
        // Constants for task positioning (match the main app's constants)
        const TASK_OFFSET_Y = 80; // Distance below anchor node for first task
        const MIN_TASK_GAP = 10;   // Minimum gap between tasks
        
        // Calculate dynamic Y position based on actual heights of previous tasks
        let yPosition = anchorY + TASK_OFFSET_Y;
        
        if (slot > 0) {
            // Get all tasks for this anchor node that come before this one
            const allTasks = this.getTasksForAnchorNode(anchorNodeId);
            const previousTasks = allTasks.filter(task => {
                const taskSlot = parseInt(task.dataset.slot) || 0;
                return taskSlot < slot;
            }).sort((a, b) => {
                const slotA = parseInt(a.dataset.slot) || 0;
                const slotB = parseInt(b.dataset.slot) || 0;
                return slotA - slotB;
            });
            
            // Add up the heights of all previous tasks and their gaps
            previousTasks.forEach(prevTask => {
                const prevContainer = prevTask.closest('.task-container');
                if (prevContainer) {
                    const taskHeight = prevContainer.offsetHeight;
                    yPosition += taskHeight + MIN_TASK_GAP;
                }
            });
        }
        
        return {
            x: anchorX,
            y: yPosition
        };
    }
    
    /**
     * Get all tasks for a specific anchor node
     * @param {string} anchorNodeId - Anchor node ID
     * @returns {Array} Array of task elements
     */
    getTasksForAnchorNode(anchorNodeId) {
        const taskNodes = this.app.taskNodes || [];
        return taskNodes.filter(task => task.dataset.anchoredTo === anchorNodeId);
    }
    
    /**
     * Reposition next-action-slot for a specific task after task positioning
     * @param {Object} taskPosition - Task position data with element and taskNode
     */
    repositionNextActionSlotForTask(taskPosition) {
        if (!this.canvas) return;
        
        const taskNode = taskPosition.taskNode;
        const nextActionSlot = this.canvas.querySelector(`.next-action-slot[data-task-id="${taskNode.dataset.id}"]`);
        
        if (nextActionSlot) {
            // Position next-action-slot to the right of the task container
            const slotX = taskPosition.targetX + 130; // 130px to the right of task
            const slotY = taskPosition.targetY;
            
            // Use D3 to animate the slot positioning as well
            d3.select(nextActionSlot)
                .transition()
                .duration(400) // Shorter duration for slot positioning
                .ease(d3.easeCubicOut)
                .style('left', `${slotX}px`)
                .style('top', `${slotY}px`);
                
            console.log(`MatrixController: Repositioned next-action-slot for task ${taskNode.dataset.id}`);
        }
    }
    
    // ==================== POSITION STORAGE AND MANAGEMENT ====================
    
    /**
     * Store original positions of all nodes before matrix mode
     * Uses main script's localStorage positions to ensure we restore to true Workflow positions
     */
    storeOriginalNodePositions() {
        this.originalNodePositions.clear();
        
        // Get the true Workflow positions from main script's localStorage system
        const storedWorkflowPositions = this.app.getStoredWorkflowPositions ? 
            this.app.getStoredWorkflowPositions() : {};
        
        // Get nodes from main app
        const nodes = this.app.nodes || [];
        
        // Store positions for all regular nodes
        nodes.forEach(node => {
            if (node.dataset.type === 'task') {
                // For task nodes, store the task container position
                const taskContainer = node.closest('.task-container');
                if (taskContainer) {
                    // Try to get stored position first, fall back to current DOM position
                    const taskId = node.dataset.id;
                    const storedPos = storedWorkflowPositions.taskNodes?.[taskId];
                    
                    this.originalNodePositions.set(taskId, {
                        element: taskContainer,
                        x: storedPos ? storedPos.x : taskContainer.offsetLeft,
                        y: storedPos ? storedPos.y : taskContainer.offsetTop,
                        type: 'task-container'
                    });
                }
            } else {
                // For regular nodes (process, decision, terminal)
                const nodeId = node.dataset.id;
                const storedPos = storedWorkflowPositions.nodes?.[nodeId];
                
                this.originalNodePositions.set(nodeId, {
                    element: node,
                    x: storedPos ? storedPos.x : node.offsetLeft,
                    y: storedPos ? storedPos.y : node.offsetTop,
                    type: 'node'
                });
            }
        });
        
        // Store positions for next-action-slots
        if (this.canvas) {
            const nextActionSlots = this.canvas.querySelectorAll('.next-action-slot');
            nextActionSlots.forEach(slot => {
                const taskId = slot.dataset.taskId;
                const storedPos = storedWorkflowPositions.nextActionSlots?.[taskId];
                
                this.originalNodePositions.set(`slot-${taskId}`, {
                    element: slot,
                    x: storedPos ? storedPos.x : slot.offsetLeft,
                    y: storedPos ? storedPos.y : slot.offsetTop,
                    type: 'next-action-slot'
                });
            });
        }
        
        // Store flowline positions
        this.storeOriginalFlowlinePositions();
        
        console.log('MatrixController: Stored original positions for', this.originalNodePositions.size, 'elements');
        console.log('MatrixController: Using stored positions from localStorage:', !!storedWorkflowPositions.nodes);
    }
    
    /**
     * Store original positions of flowlines before matrix mode
     * Uses stored flowline data when available for true Workflow state
     */
    storeOriginalFlowlinePositions() {
        // Get the true Workflow positions from main script's localStorage system
        const storedWorkflowPositions = this.app.getStoredWorkflowPositions ? 
            this.app.getStoredWorkflowPositions() : {};
            
        // Get flowlines from flowline manager
        const flowlines = this.app.flowlineManager ? this.app.flowlineManager.getAllFlowlines() : [];
        
        flowlines.forEach(flowline => {
            if (flowline.element && flowline.source && flowline.target) {
                // Try to get stored flowline data first
                const storedFlowline = storedWorkflowPositions.flowlines?.[flowline.id];
                
                // Store flowline path data by storing the source and target positions
                this.originalNodePositions.set(`flowline-${flowline.id}`, {
                    element: flowline.element,
                    sourceId: flowline.source.dataset.id,
                    targetId: flowline.target.dataset.id,
                    type: 'flowline',
                    flowlineType: flowline.type,
                    // Use stored path if available, otherwise use current path
                    originalPath: storedFlowline?.path || flowline.element.getAttribute('d')
                });
            }
        });
        
        console.log('MatrixController: Stored original positions for', flowlines.length, 'flowlines');
    }

    /**
     * Get stored original positions for animations
     * @returns {Map} Original positions map
     */
    getOriginalNodePositions() {
        return this.originalNodePositions;
    }
    
    // ==================== MATRIX POSITIONING METHODS ====================
    
    /**
     * Position all tasks in matrix quadrants based on urgency/importance
     */
    positionTasksInMatrix() {
        if (!this.canvas) {
            console.error('MatrixController: Canvas not available for matrix positioning');
            return;
        }
        
        const canvasRect = this.canvas.getBoundingClientRect();
        const quadrantWidth = canvasRect.width / 2;
        const quadrantHeight = canvasRect.height / 2;
        
        // Define quadrant positions (with padding from edges and labels)
        const quadrants = {
            1: { x: 20, y: 40 }, // Not Urgent & Important (top-left)
            2: { x: quadrantWidth + 20, y: 40 }, // Urgent & Important (top-right) 
            3: { x: 20, y: quadrantHeight + 40 }, // Not Urgent & Not Important (bottom-left)
            4: { x: quadrantWidth + 20, y: quadrantHeight + 40 } // Urgent & Not Important (bottom-right)
        };
        
        // Prepare task containers for animation based on their urgency/importance tags
        const taskContainersData = [];
        const quadrantCounts = { 1: 0, 2: 0, 3: 0, 4: 0 }; // Track tasks per quadrant for positioning
        
        // Get task nodes from main app
        const taskNodes = this.app.taskNodes || [];
        
        taskNodes.forEach((taskNode, index) => {
            const taskContainer = taskNode.closest('.task-container');
            if (!taskContainer) return;
            
            // Parse task tags to determine urgency and importance
            const tags = this.getTaskTags(taskNode);
            const { isUrgent, isImportant } = this.analyzeTaskUrgencyImportance(tags);
            
            // Determine quadrant based on urgency/importance
            const quadrantNum = this.determineQuadrant(isUrgent, isImportant);
            const quadrant = quadrants[quadrantNum];
            
            // Calculate position within quadrant to prevent overlapping
            const tasksInQuadrant = quadrantCounts[quadrantNum];
            const offsetX = (tasksInQuadrant % 2) * 180; // 2 columns per quadrant
            const offsetY = Math.floor(tasksInQuadrant / 2) * 80; // Stack vertically
            
            // Ensure we don't exceed quadrant boundaries
            const maxOffsetX = quadrantWidth - 220;
            const maxOffsetY = quadrantHeight - 120;
            const clampedOffsetX = Math.min(offsetX, maxOffsetX);
            const clampedOffsetY = Math.min(offsetY, maxOffsetY);
            
            taskContainersData.push({
                element: taskContainer,
                targetX: quadrant.x + clampedOffsetX,
                targetY: quadrant.y + clampedOffsetY,
                quadrant: quadrantNum,
                taskNode: taskNode
            });
            
            quadrantCounts[quadrantNum]++;
        });
        
        // Use matrix animations to animate task containers into matrix positions
        if (this.app.matrixAnimations && taskContainersData.length > 0) {
            this.app.matrixAnimations.animateTasksToMatrix(taskContainersData);
        } else {
            // Fallback: direct positioning without animation
            taskContainersData.forEach(taskData => {
                taskData.element.style.left = `${taskData.targetX}px`;
                taskData.element.style.top = `${taskData.targetY}px`;
                
                // Position next-action-slot
                this.positionNextActionSlot(taskData);
            });
        }
        
        // Update flowlines after positioning tasks
        this.updateFlowlinesInMatrix();
        
        console.log('MatrixController: Positioned', taskNodes.length, 'tasks in matrix quadrants');
    }
    
    /**
     * Position a single task in the matrix (used when tasks are added/modified)
     * @param {HTMLElement} taskNode - Task node element
     */
    positionSingleTaskInMatrix(taskNode) {
        if (!this.isMatrixMode || !this.canvas) return;
        
        const taskContainer = taskNode.closest('.task-container');
        if (!taskContainer) return;
        
        // Get canvas dimensions for quadrant calculations
        const canvasRect = this.canvas.getBoundingClientRect();
        const quadrantWidth = canvasRect.width / 2;
        const quadrantHeight = canvasRect.height / 2;
        
        // Define quadrant positions (same as in positionTasksInMatrix)
        const quadrants = {
            1: { x: 20, y: 40 }, // Not Urgent & Important (top-left)
            2: { x: quadrantWidth + 20, y: 40 }, // Urgent & Important (top-right) 
            3: { x: 20, y: quadrantHeight + 40 }, // Not Urgent & Not Important (bottom-left)
            4: { x: quadrantWidth + 20, y: quadrantHeight + 40 } // Urgent & Not Important (bottom-right)
        };
        
        // Parse task tags to determine urgency and importance
        const tags = this.getTaskTags(taskNode);
        const { isUrgent, isImportant } = this.analyzeTaskUrgencyImportance(tags);
        
        // Determine quadrant based on urgency/importance
        const quadrantNum = this.determineQuadrant(isUrgent, isImportant);
        const quadrant = quadrants[quadrantNum];
        
        // Count existing tasks in this quadrant to calculate position
        const tasksInQuadrant = this.countTasksInQuadrant(quadrantNum, taskNode);
        
        // Calculate position within quadrant
        const offsetX = (tasksInQuadrant % 2) * 180; // 2 columns per quadrant
        const offsetY = Math.floor(tasksInQuadrant / 2) * 80; // Stack vertically
        
        // Ensure we don't exceed quadrant boundaries
        const maxOffsetX = quadrantWidth - 220;
        const maxOffsetY = quadrantHeight - 120;
        const clampedOffsetX = Math.min(offsetX, maxOffsetX);
        const clampedOffsetY = Math.min(offsetY, maxOffsetY);
        
        const targetX = quadrant.x + clampedOffsetX;
        const targetY = quadrant.y + clampedOffsetY;
        
        // Create task data for animation
        const taskData = {
            element: taskContainer,
            targetX: targetX,
            targetY: targetY,
            quadrant: quadrantNum,
            taskNode: taskNode
        };
        
        // Use matrix animations to animate single task
        if (this.app.matrixAnimations) {
            this.app.matrixAnimations.animateSingleTaskToMatrix(taskData);
        } else {
            // Fallback: direct positioning
            taskContainer.style.left = `${targetX}px`;
            taskContainer.style.top = `${targetY}px`;
            this.positionNextActionSlot(taskData);
        }
        
        // Update flowlines for this task
        this.updateFlowlinesForTask(taskNode);
        
        const taskText = taskNode.querySelector('.node-text')?.textContent || 'Unknown';
        console.log(`MatrixController: Positioned task "${taskText}" in quadrant ${quadrantNum}`);
    }
    
    /**
     * Position next-action-slot relative to its task
     * @param {Object} taskData - Task positioning data
     */
    positionNextActionSlot(taskData) {
        if (!this.canvas) return;
        
        const nextActionSlot = this.canvas.querySelector(`.next-action-slot[data-task-id="${taskData.taskNode.dataset.id}"]`);
        
        if (nextActionSlot) {
            // Position next-action-slot to the right of its task container
            const slotX = taskData.targetX + 130; // 130px to the right
            const slotY = taskData.targetY;
            
            if (this.app.matrixAnimations) {
                this.app.matrixAnimations.animateSlotToPosition(nextActionSlot, slotX, slotY);
            } else {
                // Direct positioning
                nextActionSlot.style.left = `${slotX}px`;
                nextActionSlot.style.top = `${slotY}px`;
            }
        }
    }
    
    // ==================== TASK ANALYSIS METHODS ====================
    
    /**
     * Analyze task tags to determine urgency and importance
     * @param {Array} tags - Array of tag objects
     * @returns {Object} Object with isUrgent and isImportant booleans
     */
    analyzeTaskUrgencyImportance(tags) {
        let isUrgent = false;
        let isImportant = false;
        
        // Analyze tags to determine urgency and importance
        tags.forEach(tag => {
            if (tag.category === 'urgency') {
                if (tag.option === 'urgent') {
                    isUrgent = true;
                } else if (tag.option === 'not-urgent') {
                    isUrgent = false;
                }
            } else if (tag.category === 'importance') {
                if (tag.option === 'important') {
                    isImportant = true;
                } else if (tag.option === 'not-important') {
                    isImportant = false;
                }
            }
        });
        
        return { isUrgent, isImportant };
    }
    
    /**
     * Determine quadrant number based on urgency and importance
     * @param {boolean} isUrgent - Whether task is urgent
     * @param {boolean} isImportant - Whether task is important
     * @returns {number} Quadrant number (1-4)
     */
    determineQuadrant(isUrgent, isImportant) {
        if (isImportant && !isUrgent) {
            return 1; // Not Urgent & Important (top-left)
        } else if (isImportant && isUrgent) {
            return 2; // Urgent & Important (top-right)
        } else if (!isImportant && !isUrgent) {
            return 3; // Not Urgent & Not Important (bottom-left)
        } else if (!isImportant && isUrgent) {
            return 4; // Urgent & Not Important (bottom-right)
        } else {
            // Default to quadrant 3 if no clear classification
            return 3;
        }
    }
    
    /**
     * Count existing tasks in a specific quadrant
     * @param {number} targetQuadrant - Target quadrant number
     * @param {HTMLElement} excludeTask - Task to exclude from count
     * @returns {number} Number of tasks in quadrant
     */
    countTasksInQuadrant(targetQuadrant, excludeTask = null) {
        let tasksInQuadrant = 0;
        const taskNodes = this.app.taskNodes || [];
        
        taskNodes.forEach(existingTaskNode => {
            if (excludeTask && existingTaskNode === excludeTask) return; // Don't count the excluded task
            
            const existingTags = this.getTaskTags(existingTaskNode);
            const { isUrgent: existingUrgent, isImportant: existingImportant } = this.analyzeTaskUrgencyImportance(existingTags);
            
            // Determine existing task's quadrant
            const existingQuadrant = this.determineQuadrant(existingUrgent, existingImportant);
            
            if (existingQuadrant === targetQuadrant) {
                tasksInQuadrant++;
            }
        });
        
        return tasksInQuadrant;
    }
    
    // ==================== UTILITY METHODS ====================
    
    /**
     * Get task tags (delegates to main app or tag manager)
     * @param {HTMLElement} taskNode - Task node element
     * @returns {Array} Array of tag objects
     */
    getTaskTags(taskNode) {
        // Delegate to tag manager if available
        if (this.app.tagManager && typeof this.app.tagManager.getTaskTags === 'function') {
            return this.app.tagManager.getTaskTags(taskNode);
        }
        
        // Fallback to main app method
        if (typeof this.app.getTaskTags === 'function') {
            return this.app.getTaskTags(taskNode);
        }
        
        // Last resort: parse directly from dataset
        try {
            return JSON.parse(taskNode.dataset.tags || '[]');
        } catch (e) {
            console.error('MatrixController: Error parsing task tags:', e);
            return [];
        }
    }
    
    /**
     * Get current matrix mode state
     * @returns {boolean} Whether matrix mode is active
     */
    getMatrixMode() {
        return this.isMatrixMode;
    }
    
    /**
     * Set matrix mode state (for external updates)
     * @param {boolean} isActive - Whether matrix should be active
     */
    setMatrixMode(isActive) {
        if (isActive !== this.isMatrixMode) {
            this.app.toggleEisenhowerMatrix();
        }
    }
    
    /**
     * Get matrix controller state information for debugging
     * @returns {Object} Matrix controller state information
     */
    getMatrixControllerState() {
        return {
            isMatrixMode: this.isMatrixMode,
            originalPositionsStored: this.originalNodePositions.size,
            elementsLoaded: {
                eisenhowerToggle: !!this.eisenhowerToggle,
                eisenhowerMatrix: !!this.eisenhowerMatrix,
                canvas: !!this.canvas
            },
            matrixAnimationsAvailable: !!this.app.matrixAnimations
        };
    }
    
    /**
     * Validate matrix controller elements
     * @returns {Object} Validation result
     */
    validateMatrixElements() {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };
        
        // Check critical elements
        const criticalElements = ['canvas', 'eisenhowerToggle', 'eisenhowerMatrix'];
        criticalElements.forEach(elementName => {
            if (!this[elementName]) {
                result.isValid = false;
                result.errors.push(`Missing critical element: ${elementName}`);
            }
        });
        
        // Check dependencies
        if (!this.app.matrixAnimations) {
            result.warnings.push('Matrix animations module not available - using fallback positioning');
        }
        
        return result;
    }
    
    // ==================== FLOWLINE MANAGEMENT METHODS ====================
    
    /**
     * Update all flowlines during matrix mode
     */
    updateFlowlinesInMatrix() {
        if (!this.app.flowlineManager) {
            console.warn('MatrixController: FlowlineManager not available');
            return;
        }
        
        // Update all flowlines to reflect new node positions
        this.app.flowlineManager.updateFlowlines();
        console.log('MatrixController: Updated all flowlines for matrix mode');
    }
    
    /**
     * Update flowlines connected to a specific task
     * @param {HTMLElement} taskNode - Task node element
     */
    updateFlowlinesForTask(taskNode) {
        if (!this.app.flowlineManager || !taskNode) {
            return;
        }
        
        const taskId = taskNode.dataset.id;
        if (!taskId) return;
        
        // Get flowlines connected to this task
        const flowlines = this.app.flowlineManager.getAllFlowlines();
        const connectedFlowlines = flowlines.filter(flowline => 
            flowline.source.dataset.id === taskId || flowline.target.dataset.id === taskId
        );
        
        // Update each connected flowline
        connectedFlowlines.forEach(flowline => {
            this.app.flowlineManager.updateSingleFlowline(flowline);
        });
        
        console.log(`MatrixController: Updated ${connectedFlowlines.length} flowlines for task ${taskId}`);
    }
    
    /**
     * Restore flowlines to original positions after exiting matrix mode
     */
    restoreOriginalFlowlinePositions() {
        if (!this.app.flowlineManager) {
            console.warn('MatrixController: FlowlineManager not available');
            return;
        }
        
        // Update all flowlines to reflect restored node positions
        this.app.flowlineManager.updateFlowlines();
        console.log('MatrixController: Restored flowlines to original positions');
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MatrixController;
}

// Make available globally for direct use
if (typeof window !== 'undefined') {
    window.MatrixController = MatrixController;
}