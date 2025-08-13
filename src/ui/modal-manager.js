/**
 * Modal Manager - Handles all modal operations and lifecycle
 * Manages task modals, tag modals, and advance task modals
 */
export class ModalManager {
    constructor(context) {
        this.context = context;
        this.eventBus = context.eventBus;
        this.stateManager = context.stateManager;
        this.domService = context.getService('dom');
        this.validationService = context.getService('validation');
        
        this.setupEventListeners();
        this.setupModalElements();
    }

    /**
     * Setup event listeners
     * @private
     */
    setupEventListeners() {
        this.eventBus.on('modal.task.show', () => this.showTaskModal());
        this.eventBus.on('modal.task.hide', () => this.hideTaskModal());
        this.eventBus.on('modal.tag.show', (taskBanner) => this.showTagModal(taskBanner));
        this.eventBus.on('modal.tag.hide', () => this.hideTagModal());
        this.eventBus.on('modal.advance.show', (taskBanner) => this.showAdvanceTaskModal(taskBanner));
        this.eventBus.on('modal.advance.hide', () => this.hideAdvanceTaskModal());
    }

    /**
     * Setup modal element references and event handlers
     * @private
     */
    setupModalElements() {
        // Task Modal
        this.taskModal = this.context.getElement('taskModal');
        this.taskNameInput = this.context.getElement('taskNameInput');
        this.taskModalCancel = this.context.getElement('taskModalCancel');
        this.taskModalCreate = this.context.getElement('taskModalCreate');

        // Tag Modal
        this.tagModal = this.context.getElement('tagModal');
        this.currentTags = this.context.getElement('currentTags');
        this.tagCategoryDropdown = this.context.getElement('tagCategoryDropdown');
        this.tagOptionDropdown = this.context.getElement('tagOptionDropdown');
        this.tagDateInput = this.context.getElement('tagDateInput');
        this.tagDescriptionInput = this.context.getElement('tagDescriptionInput');
        this.tagLinkInput = this.context.getElement('tagLinkInput');
        this.tagCompletedInput = this.context.getElement('tagCompletedInput');
        this.tagModalCancel = this.context.getElement('tagModalCancel');
        this.tagModalAdd = this.context.getElement('tagModalAdd');
        this.tagModalSave = this.context.getElement('tagModalSave');

        // Advance Task Modal
        this.advanceTaskModal = this.context.getElement('advanceTaskModal');
        this.advanceOptions = this.context.getElement('advanceOptions');
        this.advanceModalCancel = this.context.getElement('advanceModalCancel');

        this.setupModalEventHandlers();
    }

    /**
     * Setup modal event handlers
     * @private
     */
    setupModalEventHandlers() {
        // Task Modal Events
        this.domService.addEventListener(this.taskModalCancel, 'click', () => this.hideTaskModal());
        this.domService.addEventListener(this.taskModalCreate, 'click', () => this.createTaskFromModal());
        this.domService.addEventListener(this.taskNameInput, 'keydown', (e) => {
            if (e.key === 'Enter') {
                this.createTaskFromModal();
            }
        });

        // Click outside to close
        this.domService.addEventListener(this.taskModal, 'click', (e) => {
            if (e.target === this.taskModal) {
                this.hideTaskModal();
            }
        });

        // Tag Modal Events
        this.domService.addEventListener(this.tagModalCancel, 'click', () => this.hideTagModal());
        this.domService.addEventListener(this.tagModalAdd, 'click', () => this.addTagToTask());
        this.domService.addEventListener(this.tagModalSave, 'click', () => this.saveTaskTags());
        this.domService.addEventListener(this.tagCategoryDropdown, 'change', (e) => this.handleTagCategoryChange(e));

        // Click outside to close
        this.domService.addEventListener(this.tagModal, 'click', (e) => {
            if (e.target === this.tagModal) {
                this.hideTagModal();
            }
        });

        // Advance Task Modal Events
        this.domService.addEventListener(this.advanceModalCancel, 'click', () => this.hideAdvanceTaskModal());

        // Click outside to close
        this.domService.addEventListener(this.advanceTaskModal, 'click', (e) => {
            if (e.target === this.advanceTaskModal) {
                this.hideAdvanceTaskModal();
            }
        });
    }

    /**
     * Show task creation modal
     */
    showTaskModal() {
        this.taskNameInput.value = '';
        this.domService.show(this.taskModal);
        this.taskNameInput.focus();
        this.eventBus.emit('modal.task.shown');
    }

    /**
     * Hide task creation modal
     */
    hideTaskModal() {
        this.domService.hide(this.taskModal);
        this.taskNameInput.value = '';
        this.eventBus.emit('modal.task.hidden');
    }

    /**
     * Create task from modal input
     */
    createTaskFromModal() {
        const taskName = this.validationService.sanitizeInput(this.taskNameInput.value);
        
        if (!taskName) {
            alert('Please enter a task name');
            return;
        }

        const validation = this.validationService.validateTaskData({ name: taskName });
        if (!validation.valid) {
            alert(Object.values(validation.errors).join('\n'));
            return;
        }

        try {
            // Create task through task manager
            this.eventBus.emit('task.create', { name: taskName });
            this.hideTaskModal();
            
            // Open tag modal for new task
            this.eventBus.once('task.created', (data) => {
                this.stateManager.set('selectedNode', data.taskBanner);
                this.showTagModal(data.taskBanner);
            });
        } catch (error) {
            alert(`Error creating task: ${error.message}`);
        }
    }

    /**
     * Show tag management modal
     * @param {HTMLElement} taskBanner - Task banner element
     */
    showTagModal(taskBanner) {
        if (!taskBanner || taskBanner.dataset.type !== 'task') {
            console.warn('Invalid task for tag modal');
            return;
        }

        this.stateManager.set('selectedTaskForTags', taskBanner);
        this.displayCurrentTags();
        this.resetTagForm();
        this.domService.show(this.tagModal);
        this.eventBus.emit('modal.tag.shown', { taskBanner });
    }

    /**
     * Hide tag management modal
     */
    hideTagModal() {
        this.domService.hide(this.tagModal);
        this.stateManager.update({
            selectedTaskForTags: null,
            selectedTagForEdit: null,
            currentTagData: null
        });
        this.eventBus.emit('modal.tag.hidden');
    }

    /**
     * Display current tags in modal
     * @private
     */
    displayCurrentTags() {
        const taskBanner = this.stateManager.get('selectedTaskForTags');
        if (!taskBanner) return;

        this.currentTags.innerHTML = '';
        
        const tagsData = JSON.parse(taskBanner.dataset.tags || '[]');
        
        if (tagsData.length === 0) {
            return; // Empty state handled by CSS
        }

        tagsData.forEach((tagData, index) => {
            const tagElement = this.createModalTagElement(tagData, index);
            this.currentTags.appendChild(tagElement);
        });
    }

    /**
     * Create tag element for modal display
     * @private
     */
    createModalTagElement(tagData, index) {
        const tagManager = this.context.getComponent('tag');
        const tagElement = tagManager.createTagElement(tagData, null, true); // Modal version

        // Add remove button
        const removeBtn = this.domService.createElement('button', {
            className: 'tag-remove',
            textContent: '×',
            parent: tagElement
        });

        this.domService.addEventListener(removeBtn, 'click', (e) => {
            e.stopPropagation();
            this.removeTagFromTask(index);
        });

        return tagElement;
    }

    /**
     * Reset tag form to initial state
     * @private
     */
    resetTagForm() {
        this.tagCategoryDropdown.value = '';
        this.tagOptionDropdown.value = '';
        this.tagOptionDropdown.disabled = true;
        this.tagDateInput.value = '';
        this.tagDescriptionInput.value = '';
        this.tagLinkInput.value = '';
        this.tagCompletedInput.checked = false;
    }

    /**
     * Handle tag category change
     * @param {Event} e - Change event
     */
    handleTagCategoryChange(e) {
        const category = e.target.value;
        
        // Clear and disable option dropdown
        this.tagOptionDropdown.innerHTML = '';
        this.tagOptionDropdown.disabled = true;

        if (!category) return;

        // Populate options for selected category
        const categoryOptions = AppConfig.tagSystem.options[category];
        if (categoryOptions) {
            this.tagOptionDropdown.disabled = false;
            categoryOptions.forEach(option => {
                const optionElement = this.domService.createElement('option', {
                    attributes: { value: option.value },
                    textContent: option.label
                });
                
                if (option.disabled) {
                    optionElement.disabled = true;
                }
                
                this.tagOptionDropdown.appendChild(optionElement);
            });
        }
    }

    /**
     * Add tag to task
     */
    addTagToTask() {
        const taskBanner = this.stateManager.get('selectedTaskForTags');
        if (!taskBanner) return;

        const tagData = {
            category: this.tagCategoryDropdown.value,
            option: this.tagOptionDropdown.value,
            date: this.tagDateInput.value || null,
            description: this.validationService.sanitizeInput(this.tagDescriptionInput.value) || null,
            link: this.validationService.sanitizeInput(this.tagLinkInput.value) || null,
            completed: this.tagCompletedInput.checked
        };

        const validation = this.validationService.validateTagData(tagData);
        if (!validation.valid) {
            alert(Object.values(validation.errors).join('\n'));
            return;
        }

        // Add tag through tag manager
        this.eventBus.emit('tag.add', { taskBanner, tagData });
        
        this.resetTagForm();
        this.displayCurrentTags();
    }

    /**
     * Save all task tags
     */
    saveTaskTags() {
        this.hideTagModal();
        this.eventBus.emit('task.tags.saved');
    }

    /**
     * Remove tag from task
     * @param {number} tagIndex - Index of tag to remove
     */
    removeTagFromTask(tagIndex) {
        const taskBanner = this.stateManager.get('selectedTaskForTags');
        if (!taskBanner) return;

        this.eventBus.emit('tag.remove', { taskBanner, tagIndex });
        this.displayCurrentTags();
    }

    /**
     * Show advance task modal
     * @param {HTMLElement} taskBanner - Task banner element
     */
    showAdvanceTaskModal(taskBanner) {
        if (!taskBanner || taskBanner.dataset.type !== 'task') {
            console.warn('Invalid task for advance modal');
            return;
        }

        this.stateManager.set('selectedTaskForAdvance', taskBanner);
        this.populateAdvanceOptions();
        this.domService.show(this.advanceTaskModal);
        this.eventBus.emit('modal.advance.shown', { taskBanner });
    }

    /**
     * Hide advance task modal
     */
    hideAdvanceTaskModal() {
        this.domService.hide(this.advanceTaskModal);
        this.stateManager.set('selectedTaskForAdvance', null);
        this.advanceOptions.innerHTML = '';
        this.eventBus.emit('modal.advance.hidden');
    }

    /**
     * Populate advance options with available nodes
     * @private
     */
    populateAdvanceOptions() {
        const taskBanner = this.stateManager.get('selectedTaskForAdvance');
        if (!taskBanner) return;

        this.advanceOptions.innerHTML = '';
        
        const currentAnchorId = taskBanner.dataset.anchoredTo;
        const nodes = this.stateManager.get('nodes') || [];
        
        // Filter out task nodes and current anchor
        const availableNodes = nodes.filter(node => 
            node.dataset.type !== 'task' && 
            node.dataset.id !== currentAnchorId
        );

        if (availableNodes.length === 0) {
            this.advanceOptions.innerHTML = '<p>No available nodes to advance to.</p>';
            return;
        }

        availableNodes.forEach(node => {
            const option = this.domService.createElement('div', {
                className: 'advance-option',
                textContent: node.querySelector('.node-text').textContent,
                dataset: { nodeId: node.dataset.id }
            });

            this.domService.addEventListener(option, 'click', () => {
                this.selectAdvanceOption(option);
            });

            this.advanceOptions.appendChild(option);
        });
    }

    /**
     * Select advance option
     * @param {HTMLElement} option - Selected option element
     * @private
     */
    selectAdvanceOption(option) {
        const taskBanner = this.stateManager.get('selectedTaskForAdvance');
        const targetNodeId = option.dataset.nodeId;

        if (!taskBanner || !targetNodeId) return;

        try {
            this.eventBus.emit('task.advance', {
                taskId: taskBanner.dataset.id,
                targetNodeId: targetNodeId
            });
            
            this.hideAdvanceTaskModal();
        } catch (error) {
            alert(`Error advancing task: ${error.message}`);
        }
    }

    /**
     * Check if any modal is currently open
     * @returns {boolean} True if a modal is open
     */
    isModalOpen() {
        return this.domService.isVisible(this.taskModal) ||
               this.domService.isVisible(this.tagModal) ||
               this.domService.isVisible(this.advanceTaskModal);
    }

    /**
     * Close all modals
     */
    closeAllModals() {
        this.hideTaskModal();
        this.hideTagModal();
        this.hideAdvanceTaskModal();
        this.eventBus.emit('modals.all.closed');
    }

    /**
     * Get currently open modal
     * @returns {string|null} Modal type or null
     */
    getCurrentModal() {
        if (this.domService.isVisible(this.taskModal)) return 'task';
        if (this.domService.isVisible(this.tagModal)) return 'tag';
        if (this.domService.isVisible(this.advanceTaskModal)) return 'advance';
        return null;
    }
}