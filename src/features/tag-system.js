/**
 * Tag System - Manages tag operations, creation, and lifecycle
 * Handles tag CRUD operations, styling, and interaction
 */
export class TagSystem {
    constructor(context) {
        this.context = context;
        this.eventBus = context.eventBus;
        this.stateManager = context.stateManager;
        this.domService = context.getService('dom');
        this.validationService = context.getService('validation');
        
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     * @private
     */
    setupEventListeners() {
        this.eventBus.on('tag.add', (data) => this.addTagToTask(data.taskBanner, data.tagData));
        this.eventBus.on('tag.remove', (data) => this.removeTagFromTask(data.taskBanner, data.tagIndex));
        this.eventBus.on('tag.delete', (data) => this.deleteTag(data.tag));
        this.eventBus.on('tag.attribute.update', (data) => 
            this.updateTagAttribute(data.tag, data.attribute, data.value));
        this.eventBus.on('tag.reset.from.next.action', (data) => 
            this.resetTagFromNextAction(data.tag));
    }

    /**
     * Add tag to task
     * @param {HTMLElement} taskBanner - Task banner element
     * @param {Object} tagData - Tag data object
     */
    addTagToTask(taskBanner, tagData) {
        if (!taskBanner || taskBanner.dataset.type !== 'task') {
            throw new Error('Invalid task for tag addition');
        }

        // Validate tag data
        const validation = this.validationService.validateTagData(tagData);
        if (!validation.valid) {
            throw new Error(`Invalid tag data: ${Object.values(validation.errors).join(', ')}`);
        }

        // Get current tags
        const currentTags = JSON.parse(taskBanner.dataset.tags || '[]');
        
        // Check for duplicate tags
        const isDuplicate = currentTags.some(tag => 
            tag.category === tagData.category && tag.option === tagData.option
        );

        if (isDuplicate) {
            throw new Error('This tag already exists on the task');
        }

        // Add timestamp to tag data
        const enrichedTagData = {
            ...tagData,
            id: this.generateTagId(),
            createdAt: new Date().toISOString()
        };

        // Add to task data
        currentTags.push(enrichedTagData);
        taskBanner.dataset.tags = JSON.stringify(currentTags);

        // Update display
        this.updateTaskTagsDisplay(taskBanner);

        this.eventBus.emit('tag.added', { 
            taskBanner, 
            tagData: enrichedTagData, 
            taskId: taskBanner.dataset.id 
        });
    }

    /**
     * Remove tag from task by index
     * @param {HTMLElement} taskBanner - Task banner element
     * @param {number} tagIndex - Index of tag to remove
     */
    removeTagFromTask(taskBanner, tagIndex) {
        if (!taskBanner || taskBanner.dataset.type !== 'task') {
            throw new Error('Invalid task for tag removal');
        }

        const currentTags = JSON.parse(taskBanner.dataset.tags || '[]');
        
        if (tagIndex < 0 || tagIndex >= currentTags.length) {
            throw new Error('Invalid tag index');
        }

        const removedTag = currentTags.splice(tagIndex, 1)[0];
        taskBanner.dataset.tags = JSON.stringify(currentTags);

        // Update display
        this.updateTaskTagsDisplay(taskBanner);

        this.eventBus.emit('tag.removed', { 
            taskBanner, 
            removedTag, 
            taskId: taskBanner.dataset.id 
        });
    }

    /**
     * Delete tag element
     * @param {HTMLElement} tag - Tag element to delete
     */
    deleteTag(tag) {
        const taskId = tag.dataset.taskId;
        const tagId = tag.dataset.tagId;

        if (!taskId || !tagId) {
            console.error('Missing task ID or tag ID for deletion');
            return;
        }

        // Find the task and remove tag from data
        const taskBanner = this.findTaskById(taskId);
        if (taskBanner) {
            const currentTags = JSON.parse(taskBanner.dataset.tags || '[]');
            const tagIndex = currentTags.findIndex(t => t.id === tagId);
            
            if (tagIndex > -1) {
                this.removeTagFromTask(taskBanner, tagIndex);
            }
        }

        // Remove from DOM if still present
        if (tag.parentNode) {
            tag.parentNode.removeChild(tag);
        }

        this.eventBus.emit('tag.deleted', { tag, taskId, tagId });
    }

    /**
     * Update tag attribute
     * @param {HTMLElement} tag - Tag element
     * @param {string} attribute - Attribute name
     * @param {string} value - New value
     */
    updateTagAttribute(tag, attribute, value) {
        const taskId = tag.dataset.taskId;
        const tagId = tag.dataset.tagId;

        if (!taskId || !tagId) {
            console.error('Missing task ID or tag ID for update');
            return;
        }

        // Find task and update tag data
        const taskBanner = this.findTaskById(taskId);
        if (!taskBanner) {
            console.error('Task not found for tag update');
            return;
        }

        const currentTags = JSON.parse(taskBanner.dataset.tags || '[]');
        const tagIndex = currentTags.findIndex(t => t.id === tagId);

        if (tagIndex === -1) {
            console.error('Tag not found in task data');
            return;
        }

        // Update tag data
        const tagData = currentTags[tagIndex];
        tagData[attribute] = value;
        tagData.updatedAt = new Date().toISOString();

        // Validate updated data
        const validation = this.validationService.validateTagData(tagData);
        if (!validation.valid) {
            console.error('Invalid tag data after update:', validation.errors);
            return;
        }

        // Save and update display
        taskBanner.dataset.tags = JSON.stringify(currentTags);
        this.updateTaskTagsDisplay(taskBanner);

        this.eventBus.emit('tag.attribute.updated', { 
            tag, 
            attribute, 
            value, 
            taskId, 
            tagId 
        });
    }

    /**
     * Create tag element
     * @param {Object} tagData - Tag data
     * @param {string} taskId - Task ID
     * @param {boolean} isModal - Whether this is for modal display
     * @returns {HTMLElement} Tag element
     */
    createTagElement(tagData, taskId, isModal = false) {
        const tagDisplay = this.getTagDisplay(tagData.category);
        
        const tag = this.domService.createElement('div', {
            className: `tag ${isModal ? 'modal-tag' : ''}`,
            dataset: {
                category: tagData.category,
                option: tagData.option,
                taskId: taskId,
                tagId: tagData.id,
                isInNextAction: 'false'
            },
            styles: {
                color: tagDisplay.color,
                backgroundColor: tagDisplay.bgColor
            }
        });

        // Create tag content
        const content = this.getTagDisplayText(tagData);
        tag.textContent = content;

        // Add tooltip with full information
        tag.title = this.getTagTooltip(tagData);

        // Make draggable if not in modal
        if (!isModal && taskId) {
            const dragDropHandler = this.context.getComponent('dragDrop');
            if (dragDropHandler) {
                dragDropHandler.makeDraggable(tag, {
                    effectAllowed: 'move'
                });
            }

            // Add right-click context menu
            this.domService.addEventListener(tag, 'contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showTagContextMenu(tag, e);
            });
        }

        this.eventBus.emit('tag.element.created', { tag, tagData, taskId });
        return tag;
    }

    /**
     * Update task tags display
     * @param {HTMLElement} taskBanner - Task banner element
     */
    updateTaskTagsDisplay(taskBanner) {
        const taskContainer = taskBanner.closest('.task-container');
        if (!taskContainer) return;

        const tagsContainer = taskContainer.querySelector('.task-tags');
        if (!tagsContainer) return;

        // Clear existing tags
        tagsContainer.innerHTML = '';

        // Get tags from data
        const tagsData = JSON.parse(taskBanner.dataset.tags || '[]');
        const taskId = taskBanner.dataset.id;
        
        // Create tag elements
        tagsData.forEach(tagData => {
            const tag = this.createTagElement(tagData, taskId);
            tagsContainer.appendChild(tag);
        });

        // Update task positioning after tags change
        setTimeout(() => {
            this.eventBus.emit('task.position.update', taskId);
        }, 0);

        this.eventBus.emit('task.tags.display.updated', { taskBanner, tagsData });
    }

    /**
     * Show tag context menu
     * @param {HTMLElement} tag - Tag element
     * @param {MouseEvent} e - Mouse event
     * @private
     */
    showTagContextMenu(tag, e) {
        this.eventBus.emit('contextmenu.tag.show', {
            tag: tag,
            x: e.clientX,
            y: e.clientY
        });
    }

    /**
     * Reset tag from next action slot back to task
     * @param {HTMLElement} tag - Tag element
     */
    resetTagFromNextAction(tag) {
        const dragDropHandler = this.context.getComponent('dragDrop');
        if (dragDropHandler) {
            dragDropHandler.resetTagFromNextAction(tag);
        }
    }

    /**
     * Get tag display configuration
     * @param {string} category - Tag category
     * @returns {Object} Display configuration
     * @private
     */
    getTagDisplay(category) {
        return AppConfig.tagSystem.display[category] || { 
            color: '#666', 
            bgColor: '#f5f5f5' 
        };
    }

    /**
     * Get tag display text
     * @param {Object} tagData - Tag data
     * @returns {string} Display text
     * @private
     */
    getTagDisplayText(tagData) {
        const categoryLabel = this.getCategoryLabel(tagData.category);
        const optionLabel = this.getOptionLabel(tagData.category, tagData.option);
        
        return `${categoryLabel}: ${optionLabel}`;
    }

    /**
     * Get tag tooltip text
     * @param {Object} tagData - Tag data
     * @returns {string} Tooltip text
     * @private
     */
    getTagTooltip(tagData) {
        let tooltip = this.getTagDisplayText(tagData);
        
        if (tagData.date) {
            tooltip += `\nDate: ${tagData.date}`;
        }
        
        if (tagData.description) {
            tooltip += `\nDescription: ${tagData.description}`;
        }
        
        if (tagData.link) {
            tooltip += `\nLink: ${tagData.link}`;
        }
        
        if (tagData.completed) {
            tooltip += '\nStatus: Completed';
        }
        
        return tooltip;
    }

    /**
     * Get category label
     * @param {string} categoryValue - Category value
     * @returns {string} Category label
     * @private
     */
    getCategoryLabel(categoryValue) {
        const category = AppConfig.tagSystem.categories.find(cat => cat.value === categoryValue);
        return category ? category.label : categoryValue;
    }

    /**
     * Get option label
     * @param {string} category - Category
     * @param {string} optionValue - Option value
     * @returns {string} Option label
     * @private
     */
    getOptionLabel(category, optionValue) {
        const options = AppConfig.tagSystem.options[category];
        if (!options) return optionValue;
        
        const option = options.find(opt => opt.value === optionValue);
        return option ? option.label : optionValue;
    }

    /**
     * Generate unique tag ID
     * @returns {string} Unique tag ID
     * @private
     */
    generateTagId() {
        return 'tag_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Find task by ID
     * @param {string} taskId - Task ID
     * @returns {HTMLElement|null} Task banner element
     * @private
     */
    findTaskById(taskId) {
        const taskManager = this.context.getComponent('task');
        return taskManager ? taskManager.findTaskById(taskId) : null;
    }

    /**
     * Get tags for task
     * @param {string} taskId - Task ID
     * @returns {Array} Array of tag data objects
     */
    getTagsForTask(taskId) {
        const taskBanner = this.findTaskById(taskId);
        if (!taskBanner) return [];
        
        return JSON.parse(taskBanner.dataset.tags || '[]');
    }

    /**
     * Search tags by criteria
     * @param {Object} criteria - Search criteria
     * @returns {Array} Array of matching tags
     */
    searchTags(criteria) {
        const allTasks = this.stateManager.get('taskNodes') || [];
        const matchingTags = [];

        allTasks.forEach(taskBanner => {
            const tags = JSON.parse(taskBanner.dataset.tags || '[]');
            const taskId = taskBanner.dataset.id;

            tags.forEach(tag => {
                let matches = true;

                if (criteria.category && tag.category !== criteria.category) {
                    matches = false;
                }

                if (criteria.option && tag.option !== criteria.option) {
                    matches = false;
                }

                if (criteria.completed !== undefined && tag.completed !== criteria.completed) {
                    matches = false;
                }

                if (criteria.dateFrom && tag.date && tag.date < criteria.dateFrom) {
                    matches = false;
                }

                if (criteria.dateTo && tag.date && tag.date > criteria.dateTo) {
                    matches = false;
                }

                if (matches) {
                    matchingTags.push({
                        ...tag,
                        taskId: taskId
                    });
                }
            });
        });

        return matchingTags;
    }

    /**
     * Export all tags data
     * @returns {Array} Array of all tag data
     */
    exportAllTags() {
        const allTasks = this.stateManager.get('taskNodes') || [];
        const allTags = [];

        allTasks.forEach(taskBanner => {
            const tags = JSON.parse(taskBanner.dataset.tags || '[]');
            const taskId = taskBanner.dataset.id;
            const taskName = taskBanner.querySelector('.node-text').textContent;

            tags.forEach(tag => {
                allTags.push({
                    ...tag,
                    taskId: taskId,
                    taskName: taskName
                });
            });
        });

        return allTags;
    }

    /**
     * Clear all tags from a task
     * @param {string} taskId - Task ID
     */
    clearAllTagsFromTask(taskId) {
        const taskBanner = this.findTaskById(taskId);
        if (!taskBanner) return;

        taskBanner.dataset.tags = JSON.stringify([]);
        this.updateTaskTagsDisplay(taskBanner);

        this.eventBus.emit('task.tags.cleared', { taskId });
    }
}