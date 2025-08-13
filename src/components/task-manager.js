/**
 * Task Manager - Handles task creation, positioning, and lifecycle
 * Manages task nodes, containers, and next-action slots
 */
export class TaskManager {
    constructor(context) {
        this.context = context;
        this.eventBus = context.eventBus;
        this.stateManager = context.stateManager;
        this.domService = context.getService('dom');
        this.positioningService = context.getService('positioning');
        this.validationService = context.getService('validation');
        
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     * @private
     */
    setupEventListeners() {
        this.eventBus.on('task.create', (data) => this.createTask(data.name, data.anchoredTo));
        this.eventBus.on('task.delete', (taskId) => this.deleteTask(taskId));
        this.eventBus.on('task.advance', (data) => this.advanceTask(data.taskId, data.targetNodeId));
        this.eventBus.on('task.position.update', (taskId) => this.updateTaskPosition(taskId));
        this.eventBus.on('task.tags.updated', (data) => this.updateTaskTagsDisplay(data.taskId));
    }

    /**
     * Create a new task
     * @param {string} taskName - Task name
     * @param {string} anchoredTo - ID of anchor node (optional)
     * @returns {HTMLElement} Created task banner element
     */
    createTask(taskName, anchoredTo = null) {
        // Validate task name
        const validation = this.validationService.validateTaskData({ name: taskName });
        if (!validation.valid) {
            throw new Error(`Invalid task data: ${Object.values(validation.errors).join(', ')}`);
        }

        const nodeCounter = this.stateManager.get('nodeCounter') + 1;
        this.stateManager.set('nodeCounter', nodeCounter);

        // Create task container
        const taskContainer = this.domService.createElement('div', {
            className: 'task-container',
            dataset: { id: nodeCounter.toString() }
        });

        // Create task banner
        const taskBanner = this.domService.createElement('div', {
            className: 'task-banner',
            dataset: {
                type: 'task',
                id: nodeCounter.toString(),
                anchoredTo: anchoredTo || this.stateManager.get('startNode')?.dataset.id,
                previousAnchor: null,
                tags: JSON.stringify([])
            },
            parent: taskContainer
        });

        // Create task text
        this.domService.createElement('div', {
            className: 'node-text',
            textContent: taskName,
            parent: taskBanner
        });

        // Create tags area
        const tagsArea = this.domService.createElement('div', {
            className: 'task-tags-area',
            parent: taskContainer
        });

        this.domService.createElement('div', {
            className: 'task-tags',
            parent: tagsArea
        });

        // Create next action slot
        const nextActionSlot = this.domService.createElement('div', {
            className: 'next-action-slot',
            attributes: { title: 'Next Action' },
            dataset: { taskId: nodeCounter.toString() }
        });

        // Add to canvas
        const canvasManager = this.context.getComponent('canvas');
        canvasManager.addElement(taskContainer);
        canvasManager.addElement(nextActionSlot);

        // Position task and slot
        this.assignTaskSlot(taskBanner);
        this.positionTaskInSlot(taskBanner);
        this.positionNextActionSlot(taskContainer, nextActionSlot);

        // Add event listeners
        this.addTaskEventListeners(taskBanner, nextActionSlot);

        // Setup resize observer
        this.setupResizeObserver(taskContainer);

        // Add to state
        const nodes = this.stateManager.get('nodes') || [];
        const taskNodes = this.stateManager.get('taskNodes') || [];
        nodes.push(taskBanner);
        taskNodes.push(taskBanner);
        this.stateManager.update({ nodes, taskNodes });

        this.eventBus.emit('task.created', { 
            taskBanner, 
            taskContainer, 
            nextActionSlot, 
            taskId: nodeCounter.toString() 
        });

        return taskBanner;
    }

    /**
     * Delete a task
     * @param {string} taskId - Task ID
     */
    deleteTask(taskId) {
        const taskBanner = this.findTaskById(taskId);
        if (!taskBanner) {
            console.warn(`Task with ID ${taskId} not found`);
            return;
        }

        const taskContainer = taskBanner.closest('.task-container');
        const nextActionSlot = this.context.getElement('canvas')
            .querySelector(`.next-action-slot[data-task-id="${taskId}"]`);

        // Remove from DOM
        const canvasManager = this.context.getComponent('canvas');
        if (taskContainer) {
            this.cleanupResizeObserver(taskContainer);
            canvasManager.removeElement(taskContainer);
        }
        if (nextActionSlot) {
            canvasManager.removeElement(nextActionSlot);
        }

        // Remove from state
        const nodes = this.stateManager.get('nodes') || [];
        const taskNodes = this.stateManager.get('taskNodes') || [];
        
        const nodeIndex = nodes.indexOf(taskBanner);
        const taskIndex = taskNodes.indexOf(taskBanner);
        
        if (nodeIndex > -1) nodes.splice(nodeIndex, 1);
        if (taskIndex > -1) taskNodes.splice(taskIndex, 1);
        
        this.stateManager.update({ nodes, taskNodes });

        // Compact slots for the anchor node
        const anchorNodeId = taskBanner.dataset.anchoredTo;
        if (anchorNodeId) {
            this.compactTaskSlots(anchorNodeId);
        }

        this.eventBus.emit('task.deleted', { taskId, taskBanner });
    }

    /**
     * Advance task to new anchor node
     * @param {string} taskId - Task ID
     * @param {string} targetNodeId - Target anchor node ID
     */
    advanceTask(taskId, targetNodeId) {
        const taskBanner = this.findTaskById(taskId);
        if (!taskBanner) {
            throw new Error(`Task with ID ${taskId} not found`);
        }

        const oldAnchorNodeId = taskBanner.dataset.anchoredTo;
        
        // Update task data
        taskBanner.dataset.previousAnchor = oldAnchorNodeId;
        taskBanner.dataset.anchoredTo = targetNodeId;

        // Assign new slot and reposition
        this.assignTaskSlot(taskBanner);
        this.positionTaskInSlot(taskBanner);

        // Compact slots for the old anchor node
        if (oldAnchorNodeId) {
            this.compactTaskSlots(oldAnchorNodeId);
        }

        this.eventBus.emit('task.advanced', { 
            taskId, 
            oldAnchorNodeId, 
            newAnchorNodeId: targetNodeId 
        });
    }

    /**
     * Assign task to available slot
     * @param {HTMLElement} taskBanner - Task banner element
     */
    assignTaskSlot(taskBanner) {
        const anchorNodeId = taskBanner.dataset.anchoredTo;
        const slot = this.positioningService.findAvailableSlot(anchorNodeId);
        taskBanner.dataset.slot = slot.toString();
    }

    /**
     * Position task in its assigned slot
     * @param {HTMLElement} taskBanner - Task banner element
     */
    positionTaskInSlot(taskBanner) {
        const anchorNodeId = taskBanner.dataset.anchoredTo;
        const slot = parseInt(taskBanner.dataset.slot) || 0;
        
        const position = this.positioningService.calculateTaskSlotPosition(anchorNodeId, slot);
        const taskContainer = taskBanner.parentNode;
        
        if (taskContainer && taskContainer.classList.contains('task-container')) {
            this.domService.setPosition(taskContainer, position.x, position.y);
            
            // Update next-action-slot position
            const nextActionSlot = this.context.getElement('canvas')
                .querySelector(`.next-action-slot[data-task-id="${taskBanner.dataset.id}"]`);
            if (nextActionSlot) {
                this.positionNextActionSlot(taskContainer, nextActionSlot);
            }
        }

        this.eventBus.emit('task.positioned', { taskBanner, position });
    }

    /**
     * Position next action slot relative to task container
     * @param {HTMLElement} taskContainer - Task container
     * @param {HTMLElement} nextActionSlot - Next action slot
     */
    positionNextActionSlot(taskContainer, nextActionSlot) {
        const position = this.positioningService.calculateNextActionSlotPosition(taskContainer);
        this.domService.setPosition(nextActionSlot, position.x, position.y);
    }

    /**
     * Update task position after height changes
     * @param {string} taskId - Task ID
     */
    updateTaskPosition(taskId) {
        const taskBanner = this.findTaskById(taskId);
        if (taskBanner) {
            this.positionTaskInSlot(taskBanner);
            this.repositionTasksAfterHeightChange(taskBanner);
        }
    }

    /**
     * Reposition tasks after height change
     * @param {HTMLElement} taskBanner - Task that changed height
     */
    repositionTasksAfterHeightChange(taskBanner) {
        const anchorNodeId = taskBanner.dataset.anchoredTo;
        const changedSlot = parseInt(taskBanner.dataset.slot) || 0;
        
        // Reposition all tasks in slots after the changed task
        const allTasks = this.getTasksForNode(anchorNodeId);
        allTasks
            .filter(task => {
                const taskSlot = parseInt(task.dataset.slot) || 0;
                return taskSlot > changedSlot;
            })
            .forEach(task => this.positionTaskInSlot(task));
    }

    /**
     * Compact task slots by removing gaps
     * @param {string} nodeId - Anchor node ID
     */
    compactTaskSlots(nodeId) {
        const tasks = this.getTasksForNode(nodeId);
        
        // Sort tasks by current slot
        tasks.sort((a, b) => {
            const slotA = parseInt(a.dataset.slot) || 0;
            const slotB = parseInt(b.dataset.slot) || 0;
            return slotA - slotB;
        });

        // Reassign slots starting from 0
        tasks.forEach((task, index) => {
            task.dataset.slot = index.toString();
            this.positionTaskInSlot(task);
        });
    }

    /**
     * Update task tags display
     * @param {string} taskId - Task ID
     */
    updateTaskTagsDisplay(taskId) {
        const taskBanner = this.findTaskById(taskId);
        if (!taskBanner) return;

        const taskContainer = taskBanner.closest('.task-container');
        if (!taskContainer) return;

        const tagsContainer = taskContainer.querySelector('.task-tags');
        if (!tagsContainer) return;

        // Clear existing tags
        tagsContainer.innerHTML = '';

        // Get tags from data
        const tagsData = JSON.parse(taskBanner.dataset.tags || '[]');
        
        // Create tag elements
        tagsData.forEach(tagData => {
            const tag = this.createTagElement(tagData, taskId);
            tagsContainer.appendChild(tag);
        });

        // Update positioning after tags change
        setTimeout(() => {
            this.updateTaskPosition(taskId);
        }, 0);

        this.eventBus.emit('task.tags.displayed', { taskId, tagsData });
    }

    /**
     * Create tag element
     * @param {Object} tagData - Tag data
     * @param {string} taskId - Task ID
     * @returns {HTMLElement} Tag element
     */
    createTagElement(tagData, taskId) {
        const tagManager = this.context.getComponent('tag');
        return tagManager.createTagElement(tagData, taskId);
    }

    /**
     * Add event listeners to task elements
     * @private
     */
    addTaskEventListeners(taskBanner, nextActionSlot) {
        const nodeManager = this.context.getComponent('node');
        
        // Task banner events (reuse node event handlers)
        this.domService.addEventListener(taskBanner, 'mousedown', (e) => 
            nodeManager.handleMouseDown(e, taskBanner));
        this.domService.addEventListener(taskBanner, 'dblclick', (e) => 
            nodeManager.handleDoubleClick(e, taskBanner));
        this.domService.addEventListener(taskBanner, 'contextmenu', (e) => 
            this.handleTaskContextMenu(e, taskBanner));

        // Next action slot events
        this.domService.addEventListener(nextActionSlot, 'dragover', (e) => 
            this.handleSlotDragOver(e));
        this.domService.addEventListener(nextActionSlot, 'drop', (e) => 
            this.handleSlotDrop(e));
        this.domService.addEventListener(nextActionSlot, 'dragleave', (e) => 
            this.handleSlotDragLeave(e));
    }

    /**
     * Handle task context menu
     * @param {MouseEvent} e - Mouse event
     * @param {HTMLElement} taskBanner - Task banner element
     */
    handleTaskContextMenu(e, taskBanner) {
        e.preventDefault();
        e.stopPropagation();

        this.stateManager.set('selectedNode', taskBanner);
        
        this.eventBus.emit('contextmenu.show', {
            type: 'task',
            x: e.clientX,
            y: e.clientY,
            taskBanner
        });
    }

    /**
     * Handle drag over next action slot
     * @param {DragEvent} e - Drag event
     */
    handleSlotDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.target.classList.add('drag-over');
        e.dataTransfer.dropEffect = 'move';
    }

    /**
     * Handle drop on next action slot
     * @param {DragEvent} e - Drop event
     */
    handleSlotDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        e.target.classList.remove('drag-over');
        
        this.eventBus.emit('tag.drop', { slot: e.target, event: e });
    }

    /**
     * Handle drag leave next action slot
     * @param {DragEvent} e - Drag event
     */
    handleSlotDragLeave(e) {
        e.target.classList.remove('drag-over');
    }

    /**
     * Setup resize observer for task container
     * @private
     */
    setupResizeObserver(taskContainer) {
        if (!window.ResizeObserver) return;

        let resizeTimeout;
        const resizeObserver = new ResizeObserver(() => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const taskBanner = taskContainer.querySelector('.task-banner');
                if (taskBanner) {
                    this.updateTaskPosition(taskBanner.dataset.id);
                }
            }, 50);
        });

        resizeObserver.observe(taskContainer);
        taskContainer._resizeObserver = resizeObserver;
    }

    /**
     * Cleanup resize observer
     * @private
     */
    cleanupResizeObserver(taskContainer) {
        if (taskContainer._resizeObserver) {
            taskContainer._resizeObserver.disconnect();
            delete taskContainer._resizeObserver;
        }
    }

    /**
     * Find task by ID
     * @param {string} taskId - Task ID
     * @returns {HTMLElement|null} Task banner element
     */
    findTaskById(taskId) {
        const taskNodes = this.stateManager.get('taskNodes') || [];
        return taskNodes.find(task => task.dataset.id === taskId) || null;
    }

    /**
     * Get all tasks for a specific anchor node
     * @param {string} nodeId - Anchor node ID
     * @returns {HTMLElement[]} Array of task elements
     */
    getTasksForNode(nodeId) {
        const taskNodes = this.stateManager.get('taskNodes') || [];
        return taskNodes.filter(task => task.dataset.anchoredTo === nodeId);
    }

    /**
     * Get all tasks
     * @returns {HTMLElement[]} Array of task elements
     */
    getAllTasks() {
        return this.stateManager.get('taskNodes') || [];
    }

    /**
     * Create task from saved data
     * @param {Object} taskData - Saved task data
     * @returns {HTMLElement} Created task banner
     */
    createTaskFromData(taskData) {
        // This would be called during workflow loading
        // Implementation similar to createTask but using saved data
        const nodeCounter = Math.max(this.stateManager.get('nodeCounter'), parseInt(taskData.id));
        this.stateManager.set('nodeCounter', nodeCounter);

        // Create task structure from data
        const taskContainer = this.domService.createElement('div', {
            className: 'task-container',
            dataset: { id: taskData.id }
        });

        const taskBanner = this.domService.createElement('div', {
            className: taskData.className || 'task-banner',
            dataset: {
                type: taskData.type,
                id: taskData.id,
                anchoredTo: taskData.anchoredTo,
                previousAnchor: taskData.previousAnchor,
                slot: taskData.slot?.toString(),
                tags: JSON.stringify(taskData.tags || [])
            },
            parent: taskContainer
        });

        // Add task text
        this.domService.createElement('div', {
            className: 'node-text',
            textContent: taskData.text,
            parent: taskBanner
        });

        // Create tags area
        const tagsArea = this.domService.createElement('div', {
            className: 'task-tags-area',
            parent: taskContainer
        });

        this.domService.createElement('div', {
            className: 'task-tags',
            parent: tagsArea
        });

        // Create next action slot
        const nextActionSlot = this.domService.createElement('div', {
            className: 'next-action-slot',
            attributes: { title: 'Next Action' },
            dataset: { taskId: taskData.id }
        });

        // Add to canvas
        const canvasManager = this.context.getComponent('canvas');
        canvasManager.addElement(taskContainer);
        canvasManager.addElement(nextActionSlot);

        // Add event listeners
        this.addTaskEventListeners(taskBanner, nextActionSlot);

        // Setup resize observer
        this.setupResizeObserver(taskContainer);

        // Add to state
        const nodes = this.stateManager.get('nodes') || [];
        const taskNodes = this.stateManager.get('taskNodes') || [];
        nodes.push(taskBanner);
        taskNodes.push(taskBanner);
        this.stateManager.update({ nodes, taskNodes });

        this.eventBus.emit('task.created.from.data', { taskBanner, taskData });
        return taskBanner;
    }
}