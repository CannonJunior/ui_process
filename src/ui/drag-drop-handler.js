/**
 * Drag Drop Handler - Manages drag and drop functionality
 * Handles tag dragging, node dragging, and drop zone validation
 */
export class DragDropHandler {
    constructor(context) {
        this.context = context;
        this.eventBus = context.eventBus;
        this.stateManager = context.stateManager;
        this.domService = context.getService('dom');
        this.validationService = context.getService('validation');
        
        this.setupEventListeners();
        this.setupGlobalDragHandlers();
    }

    /**
     * Setup event listeners
     * @private
     */
    setupEventListeners() {
        this.eventBus.on('tag.drag.start', (data) => this.handleTagDragStart(data));
        this.eventBus.on('tag.drop', (data) => this.handleTagDrop(data));
        this.eventBus.on('node.drag.start', (data) => this.handleNodeDragStart(data));
    }

    /**
     * Setup global drag and drop handlers
     * @private
     */
    setupGlobalDragHandlers() {
        // Global mouse move for node dragging
        this.domService.addEventListener(document, 'mousemove', (e) => {
            this.handleGlobalMouseMove(e);
        });

        // Global mouse up for ending drags
        this.domService.addEventListener(document, 'mouseup', (e) => {
            this.handleGlobalMouseUp(e);
        });
    }

    /**
     * Make an element draggable
     * @param {HTMLElement} element - Element to make draggable
     * @param {Object} options - Drag options
     */
    makeDraggable(element, options = {}) {
        element.draggable = true;
        
        this.domService.addEventListener(element, 'dragstart', (e) => {
            this.handleDragStart(e, element, options);
        });

        this.domService.addEventListener(element, 'dragend', (e) => {
            this.handleDragEnd(e, element, options);
        });
    }

    /**
     * Handle drag start
     * @param {DragEvent} e - Drag event
     * @param {HTMLElement} element - Dragged element
     * @param {Object} options - Drag options
     * @private
     */
    handleDragStart(e, element, options) {
        // Set drag data
        e.dataTransfer.effectAllowed = options.effectAllowed || 'move';
        e.dataTransfer.setData('text/plain', ''); // Required for Firefox

        // Add visual feedback
        element.classList.add('dragging');

        // Store drag information
        if (element.classList.contains('tag')) {
            this.handleTagDragStart({
                tag: element,
                event: e
            });
        } else if (element.classList.contains('node') || element.classList.contains('task-banner')) {
            this.handleNodeDragStart({
                node: element,
                event: e
            });
        }

        this.eventBus.emit('drag.started', { element, event: e, options });
    }

    /**
     * Handle drag end
     * @param {DragEvent} e - Drag event
     * @param {HTMLElement} element - Dragged element
     * @param {Object} options - Drag options
     * @private
     */
    handleDragEnd(e, element, options) {
        // Remove visual feedback
        element.classList.remove('dragging');

        // Handle tag-specific drag end
        if (element.classList.contains('tag')) {
            this.handleTagDragEnd({
                tag: element,
                event: e,
                success: this.stateManager.get('successfulDrop')
            });
        }

        // Clear drag state
        this.stateManager.update({
            draggedTag: null,
            successfulDrop: false
        });

        this.eventBus.emit('drag.ended', { element, event: e, options });
    }

    /**
     * Handle tag drag start
     * @param {Object} data - Drag data {tag, event}
     */
    handleTagDragStart(data) {
        const { tag, event } = data;
        
        // Store tag information for validation
        const tagData = {
            element: tag,
            taskId: tag.dataset.taskId,
            category: tag.dataset.category,
            option: tag.dataset.option
        };

        this.stateManager.set('draggedTag', tagData);

        // Add drag styling
        tag.classList.add('dragging');

        this.eventBus.emit('tag.drag.started', { tag, tagData });
    }

    /**
     * Handle tag drag end
     * @param {Object} data - Drag end data {tag, event, success}
     * @private
     */
    handleTagDragEnd(data) {
        const { tag, success } = data;
        
        if (!success) {
            // Add snap back animation if drop failed
            tag.classList.add('snap-back');
            setTimeout(() => {
                tag.classList.remove('snap-back');
            }, 300);
        }

        tag.classList.remove('dragging');
        this.eventBus.emit('tag.drag.ended', data);
    }

    /**
     * Handle tag drop
     * @param {Object} data - Drop data {slot, event}
     */
    handleTagDrop(data) {
        const { slot, event } = data;
        const draggedTag = this.stateManager.get('draggedTag');

        if (!draggedTag) {
            console.warn('No dragged tag found');
            return;
        }

        // Validate drop
        const validation = this.validationService.validateDropZone(
            draggedTag.element,
            slot,
            { acceptedTypes: ['tag'] }
        );

        if (!validation.valid) {
            console.warn('Invalid drop:', validation.message);
            return;
        }

        // Perform the drop
        this.performTagDrop(draggedTag, slot);
        this.stateManager.set('successfulDrop', true);

        this.eventBus.emit('tag.dropped', { 
            tag: draggedTag.element, 
            slot, 
            taskId: draggedTag.taskId 
        });
    }

    /**
     * Perform tag drop operation
     * @param {Object} draggedTag - Dragged tag data
     * @param {HTMLElement} slot - Drop slot
     * @private
     */
    performTagDrop(draggedTag, slot) {
        const tag = draggedTag.element;
        
        // Remove from original location
        if (tag.parentNode) {
            tag.parentNode.removeChild(tag);
        }

        // Add to next action slot
        slot.appendChild(tag);
        tag.classList.add('tag-in-slot');
        tag.classList.add('in-next-action');
        tag.dataset.isInNextAction = 'true';

        // Update task tags display
        this.eventBus.emit('task.tags.updated', { taskId: draggedTag.taskId });

        // Add glow animation
        setTimeout(() => {
            tag.classList.remove('in-next-action');
        }, 800);
    }

    /**
     * Handle node drag start
     * @param {Object} data - Node drag data {node, event}
     */
    handleNodeDragStart(data) {
        const { node, event } = data;
        
        // Let the node manager handle the actual dragging logic
        const nodeManager = this.context.getComponent('node');
        if (nodeManager) {
            nodeManager.handleMouseDown(event, node);
        }

        this.eventBus.emit('node.drag.started', { node });
    }

    /**
     * Handle global mouse move
     * @param {MouseEvent} e - Mouse event
     * @private
     */
    handleGlobalMouseMove(e) {
        const dragData = this.stateManager.get('dragData');
        if (dragData && dragData.isDragging) {
            const nodeManager = this.context.getComponent('node');
            if (nodeManager) {
                nodeManager.handleMouseMove(e);
            }
        }
    }

    /**
     * Handle global mouse up
     * @param {MouseEvent} e - Mouse event
     * @private
     */
    handleGlobalMouseUp(e) {
        const dragData = this.stateManager.get('dragData');
        if (dragData && dragData.isDragging) {
            const nodeManager = this.context.getComponent('node');
            if (nodeManager) {
                nodeManager.handleMouseUp(e);
            }
        }
    }

    /**
     * Create drop zone
     * @param {HTMLElement} element - Element to make a drop zone
     * @param {Object} options - Drop zone options
     */
    createDropZone(element, options = {}) {
        this.domService.addEventListener(element, 'dragover', (e) => {
            this.handleDropZoneDragOver(e, element, options);
        });

        this.domService.addEventListener(element, 'dragenter', (e) => {
            this.handleDropZoneDragEnter(e, element, options);
        });

        this.domService.addEventListener(element, 'dragleave', (e) => {
            this.handleDropZoneDragLeave(e, element, options);
        });

        this.domService.addEventListener(element, 'drop', (e) => {
            this.handleDropZoneDrop(e, element, options);
        });
    }

    /**
     * Handle drop zone drag over
     * @private
     */
    handleDropZoneDragOver(e, element, options) {
        e.preventDefault();
        
        const draggedTag = this.stateManager.get('draggedTag');
        if (!draggedTag) return;

        // Validate drop
        const validation = this.validationService.validateDropZone(
            draggedTag.element,
            element,
            options.constraints || {}
        );

        if (validation.valid) {
            e.dataTransfer.dropEffect = 'move';
            element.classList.add('drag-over');
        } else {
            e.dataTransfer.dropEffect = 'none';
        }
    }

    /**
     * Handle drop zone drag enter
     * @private
     */
    handleDropZoneDragEnter(e, element, options) {
        e.preventDefault();
        // Visual feedback handled in dragover
    }

    /**
     * Handle drop zone drag leave
     * @private
     */
    handleDropZoneDragLeave(e, element, options) {
        // Only remove highlight if actually leaving the element
        if (!element.contains(e.relatedTarget)) {
            element.classList.remove('drag-over');
        }
    }

    /**
     * Handle drop zone drop
     * @private
     */
    handleDropZoneDrop(e, element, options) {
        e.preventDefault();
        element.classList.remove('drag-over');

        if (options.onDrop) {
            options.onDrop(e, element);
        }
    }

    /**
     * Reset tag from next action slot back to task
     * @param {HTMLElement} tag - Tag element
     */
    resetTagFromNextAction(tag) {
        if (!tag.closest('.next-action-slot')) {
            console.warn('Tag is not in next action slot');
            return;
        }

        const taskId = tag.dataset.taskId;
        const taskBanner = this.findTaskById(taskId);
        
        if (!taskBanner) {
            console.error('Task not found for tag reset');
            return;
        }

        const taskContainer = taskBanner.closest('.task-container');
        const tagsContainer = taskContainer.querySelector('.task-tags');

        if (!tagsContainer) {
            console.error('Tags container not found');
            return;
        }

        // Remove from next action slot
        if (tag.parentNode) {
            tag.parentNode.removeChild(tag);
        }

        // Add back to task tags
        tag.classList.remove('tag-in-slot');
        tag.dataset.isInNextAction = 'false';
        tagsContainer.appendChild(tag);

        // Update task display
        this.eventBus.emit('task.tags.updated', { taskId });
        this.eventBus.emit('tag.reset.completed', { tag, taskId });
    }

    /**
     * Find task by ID (helper method)
     * @param {string} taskId - Task ID
     * @returns {HTMLElement|null} Task element
     * @private
     */
    findTaskById(taskId) {
        const taskManager = this.context.getComponent('task');
        return taskManager ? taskManager.findTaskById(taskId) : null;
    }

    /**
     * Get current drag state
     * @returns {Object} Current drag state
     */
    getDragState() {
        return {
            isDragging: this.stateManager.get('dragData')?.isDragging || false,
            draggedTag: this.stateManager.get('draggedTag'),
            successfulDrop: this.stateManager.get('successfulDrop')
        };
    }

    /**
     * Clear all drag state
     */
    clearDragState() {
        this.stateManager.update({
            dragData: { isDragging: false, offset: { x: 0, y: 0 } },
            draggedTag: null,
            successfulDrop: false
        });

        // Remove drag classes from all elements
        document.querySelectorAll('.dragging').forEach(el => {
            el.classList.remove('dragging');
        });

        document.querySelectorAll('.drag-over').forEach(el => {
            el.classList.remove('drag-over');
        });
    }
}