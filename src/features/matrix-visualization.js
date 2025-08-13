/**
 * Matrix Visualization - Manages Eisenhower Matrix display and positioning
 * Handles task positioning within matrix quadrants and visual feedback
 */
export class MatrixVisualization {
    constructor(context) {
        this.context = context;
        this.eventBus = context.eventBus;
        this.stateManager = context.stateManager;
        this.domService = context.getService('dom');
        this.positioningService = context.getService('positioning');
        
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     * @private
     */
    setupEventListeners() {
        this.eventBus.on('matrix.toggle', (enabled) => this.toggleMatrix(enabled));
        this.eventBus.on('matrix.show', () => this.showMatrix());
        this.eventBus.on('matrix.hide', () => this.hideMatrix());
        this.eventBus.on('task.created', () => this.positionNewTaskInMatrix());
    }

    /**
     * Toggle matrix visibility
     * @param {boolean} enabled - Whether matrix should be enabled
     */
    toggleMatrix(enabled) {
        if (enabled) {
            this.showMatrix();
        } else {
            this.hideMatrix();
        }
    }

    /**
     * Show Eisenhower Matrix
     */
    showMatrix() {
        const eisenhowerToggle = this.context.getElement('eisenhowerToggle');
        if (!eisenhowerToggle.checked) {
            eisenhowerToggle.checked = true;
        }

        // Store original positions before showing matrix
        this.storeOriginalPositions();

        // Show matrix visualization
        const eisenhowerMatrix = this.context.getElement('eisenhowerMatrix');
        this.domService.show(eisenhowerMatrix);

        // Position tasks in matrix
        this.positionTasksInMatrix();

        this.stateManager.set('matrixVisible', true);
        this.eventBus.emit('matrix.shown');
    }

    /**
     * Hide Eisenhower Matrix
     */
    hideMatrix() {
        const eisenhowerToggle = this.context.getElement('eisenhowerToggle');
        if (eisenhowerToggle.checked) {
            eisenhowerToggle.checked = false;
        }

        // Hide matrix visualization
        const eisenhowerMatrix = this.context.getElement('eisenhowerMatrix');
        this.domService.hide(eisenhowerMatrix);

        // Restore original positions
        this.restoreOriginalPositions();

        this.stateManager.set('matrixVisible', false);
        this.eventBus.emit('matrix.hidden');
    }

    /**
     * Store original positions of all tasks and tags
     * @private
     */
    storeOriginalPositions() {
        const originalPositions = new Map();
        
        // Store task positions
        const taskContainers = document.querySelectorAll('.task-container');
        taskContainers.forEach(container => {
            const rect = container.getBoundingClientRect();
            const canvasManager = this.context.getComponent('canvas');
            const panOffset = canvasManager.getPanOffset();
            
            originalPositions.set(container, {
                x: rect.left + panOffset.x,
                y: rect.top + panOffset.y,
                type: 'task-container'
            });
        });

        // Store tag positions
        const tags = document.querySelectorAll('.tag:not(.modal-tag)');
        tags.forEach(tag => {
            if (!tag.closest('.task-container')) { // Only standalone tags
                const rect = tag.getBoundingClientRect();
                const canvasManager = this.context.getComponent('canvas');
                const panOffset = canvasManager.getPanOffset();
                
                originalPositions.set(tag, {
                    x: rect.left + panOffset.x,
                    y: rect.top + panOffset.y,
                    type: 'tag'
                });
            }
        });

        this.stateManager.set('originalPositions', originalPositions);
    }

    /**
     * Restore original positions when exiting matrix
     * @private
     */
    restoreOriginalPositions() {
        const originalPositions = this.stateManager.get('originalPositions');
        if (!originalPositions) return;

        originalPositions.forEach((position, element) => {
            if (element.parentNode) { // Check if element still exists
                this.domService.setPosition(element, position.x, position.y);
            }
        });

        // Trigger responsive positioning system for task containers
        setTimeout(() => {
            const taskContainers = document.querySelectorAll('.task-container');
            taskContainers.forEach(container => {
                const taskBanner = container.querySelector('.task-banner');
                if (taskBanner) {
                    this.eventBus.emit('task.position.update', taskBanner.dataset.id);
                }
            });
        }, 0);

        this.stateManager.set('originalPositions', null);
    }

    /**
     * Position all tasks within matrix quadrants
     * @private
     */
    positionTasksInMatrix() {
        const taskBanners = document.querySelectorAll('.task-banner[data-type="task"]');
        
        taskBanners.forEach(taskBanner => {
            this.positionTaskInMatrix(taskBanner);
        });

        // Update flowlines after positioning
        setTimeout(() => {
            this.eventBus.emit('flowline.update.all');
        }, 100);
    }

    /**
     * Position a specific task in the matrix
     * @param {HTMLElement} taskBanner - Task banner element
     * @private
     */
    positionTaskInMatrix(taskBanner) {
        const priority = this.getTaskPriority(taskBanner);
        const urgency = this.getTaskUrgency(taskBanner);
        
        const quadrant = this.determineQuadrant(priority, urgency);
        const position = this.getQuadrantPosition(quadrant);
        
        const taskContainer = taskBanner.closest('.task-container');
        if (taskContainer) {
            this.domService.setPosition(taskContainer, position.x, position.y);
        }
    }

    /**
     * Position new task in matrix if matrix is visible
     */
    positionNewTaskInMatrix() {
        const isMatrixVisible = this.stateManager.get('matrixVisible');
        if (!isMatrixVisible) return;

        // Find the most recently created task
        const taskBanners = document.querySelectorAll('.task-banner[data-type="task"]');
        const latestTask = Array.from(taskBanners).pop();
        
        if (latestTask) {
            setTimeout(() => {
                this.positionTaskInMatrix(latestTask);
            }, 100);
        }
    }

    /**
     * Get task priority from tags
     * @param {HTMLElement} taskBanner - Task banner element
     * @returns {string} Priority level
     * @private
     */
    getTaskPriority(taskBanner) {
        const tags = JSON.parse(taskBanner.dataset.tags || '[]');
        const priorityTag = tags.find(tag => tag.category === 'priority');
        return priorityTag ? priorityTag.option : 'medium';
    }

    /**
     * Get task urgency from tags
     * @param {HTMLElement} taskBanner - Task banner element
     * @returns {string} Urgency level
     * @private
     */
    getTaskUrgency(taskBanner) {
        const tags = JSON.parse(taskBanner.dataset.tags || '[]');
        const urgencyTag = tags.find(tag => tag.category === 'urgency');
        return urgencyTag ? urgencyTag.option : 'medium';
    }

    /**
     * Determine matrix quadrant based on priority and urgency
     * @param {string} priority - Priority level
     * @param {string} urgency - Urgency level
     * @returns {number} Quadrant number (1-4)
     * @private
     */
    determineQuadrant(priority, urgency) {
        const isHighPriority = priority === 'high';
        const isHighUrgency = urgency === 'high';
        
        if (isHighPriority && isHighUrgency) return 1; // Do First
        if (isHighPriority && !isHighUrgency) return 2; // Schedule
        if (!isHighPriority && isHighUrgency) return 3; // Delegate
        return 4; // Eliminate
    }

    /**
     * Get position coordinates for a quadrant
     * @param {number} quadrant - Quadrant number (1-4)
     * @returns {Object} Position coordinates
     * @private
     */
    getQuadrantPosition(quadrant) {
        const eisenhowerMatrix = this.context.getElement('eisenhowerMatrix');
        const matrixRect = eisenhowerMatrix.getBoundingClientRect();
        const canvasManager = this.context.getComponent('canvas');
        const panOffset = canvasManager.getPanOffset();
        
        // Base positions relative to matrix
        const baseX = matrixRect.left + panOffset.x;
        const baseY = matrixRect.top + panOffset.y;
        const quadrantWidth = matrixRect.width / 2;
        const quadrantHeight = matrixRect.height / 2;
        
        // Add some padding within quadrants
        const padding = 20;
        const randomOffset = () => Math.random() * 50 - 25; // Random offset for variety
        
        const positions = {
            1: { // Top-left: Important & Urgent
                x: baseX + padding + randomOffset(),
                y: baseY + padding + randomOffset()
            },
            2: { // Top-right: Important & Not Urgent
                x: baseX + quadrantWidth + padding + randomOffset(),
                y: baseY + padding + randomOffset()
            },
            3: { // Bottom-left: Not Important & Urgent
                x: baseX + padding + randomOffset(),
                y: baseY + quadrantHeight + padding + randomOffset()
            },
            4: { // Bottom-right: Not Important & Not Urgent
                x: baseX + quadrantWidth + padding + randomOffset(),
                y: baseY + quadrantHeight + padding + randomOffset()
            }
        };
        
        return positions[quadrant] || positions[4];
    }

    /**
     * Update matrix layout when canvas changes
     */
    updateMatrixLayout() {
        const isMatrixVisible = this.stateManager.get('matrixVisible');
        if (!isMatrixVisible) return;
        
        this.positionTasksInMatrix();
    }

    /**
     * Get quadrant information for a task
     * @param {HTMLElement} taskBanner - Task banner element
     * @returns {Object} Quadrant information
     */
    getTaskQuadrantInfo(taskBanner) {
        const priority = this.getTaskPriority(taskBanner);
        const urgency = this.getTaskUrgency(taskBanner);
        const quadrant = this.determineQuadrant(priority, urgency);
        
        const quadrantNames = {
            1: 'Do First (Important & Urgent)',
            2: 'Schedule (Important & Not Urgent)',
            3: 'Delegate (Not Important & Urgent)',
            4: 'Eliminate (Not Important & Not Urgent)'
        };
        
        return {
            quadrant,
            name: quadrantNames[quadrant],
            priority,
            urgency
        };
    }

    /**
     * Check if matrix is currently visible
     * @returns {boolean} True if matrix is visible
     */
    isMatrixVisible() {
        return this.stateManager.get('matrixVisible') || false;
    }

    /**
     * Get all tasks in a specific quadrant
     * @param {number} quadrant - Quadrant number (1-4)
     * @returns {Array} Array of task banner elements
     */
    getTasksInQuadrant(quadrant) {
        const taskBanners = document.querySelectorAll('.task-banner[data-type="task"]');
        
        return Array.from(taskBanners).filter(taskBanner => {
            const priority = this.getTaskPriority(taskBanner);
            const urgency = this.getTaskUrgency(taskBanner);
            return this.determineQuadrant(priority, urgency) === quadrant;
        });
    }

    /**
     * Export matrix state data
     * @returns {Object} Matrix state data
     */
    exportMatrixData() {
        return {
            visible: this.isMatrixVisible(),
            originalPositions: this.stateManager.get('originalPositions') || new Map()
        };
    }

    /**
     * Import matrix state data
     * @param {Object} matrixData - Matrix state data
     */
    importMatrixData(matrixData) {
        if (matrixData.visible) {
            this.showMatrix();
        } else {
            this.hideMatrix();
        }
    }
}