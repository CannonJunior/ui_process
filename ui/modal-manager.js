/**
 * Modal Manager
 * Centralized management of all modal interactions and state
 * 
 * SAFETY: Manages UI modal state with careful event preservation
 * Risk Level: MEDIUM - UI state interactions, event handling dependencies
 */

class ModalManager {
    constructor(mainApp) {
        // Reference to main application instance
        this.app = mainApp;
        
        // Get services
        this.domService = this.app.domService;
        this.configService = this.app.configService;
        
        // Cache modal elements
        this.initializeModalElements();
        
        // Modal state tracking
        this.currentModal = null;
        this.modalStack = []; // For nested modals
        
        // Setup modal event listeners
        this.setupModalEventListeners();
    }
    
    /**
     * Initialize and cache all modal elements
     */
    initializeModalElements() {
        // Get modal elements from DOM service
        const modalElements = this.domService.getElementGroup('modals');
        const inputElements = this.domService.getInputElements();
        const modalControls = this.domService.getElements([
            'taskModalCancel', 'taskModalCreate', 'advanceModalCancel',
            'tagModalCancel', 'tagModalAdd', 'tagModalSave', 'addTaskButton',
            'advanceOptions', 'currentTags'
        ]);
        
        // Assign to instance for easy access
        Object.assign(this, modalElements, inputElements, modalControls);
        
        // Validate critical modal elements
        const requiredElements = ['taskModal', 'tagModal', 'advanceTaskModal'];
        const missingElements = requiredElements.filter(id => !this[id]);
        
        if (missingElements.length > 0) {
            throw new Error(`ModalManager: Missing required elements: ${missingElements.join(', ')}`);
        }
    }
    
    /**
     * Setup event listeners for all modal interactions
     */
    setupModalEventListeners() {
        // Task Modal Event Listeners
        if (this.addTaskButton) {
            this.addTaskButton.addEventListener('click', () => this.showTaskModal());
        }
        
        if (this.taskModalCancel) {
            this.taskModalCancel.addEventListener('click', () => this.hideTaskModal());
        }
        
        if (this.taskModalCreate) {
            this.taskModalCreate.addEventListener('click', () => this.createTaskFromModal());
        }
        
        // Task modal input enter key support
        if (this.taskNameInput) {
            this.taskNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.createTaskFromModal();
                }
            });
        }
        
        // Task modal click outside to close
        if (this.taskModal) {
            this.taskModal.addEventListener('click', (e) => {
                if (e.target === this.taskModal) {
                    this.hideTaskModal();
                }
            });
        }
        
        // Advance Task Modal Event Listeners
        if (this.advanceModalCancel) {
            this.advanceModalCancel.addEventListener('click', () => this.hideAdvanceTaskModal());
        }
        
        // Advance modal click outside to close
        if (this.advanceTaskModal) {
            this.advanceTaskModal.addEventListener('click', (e) => {
                if (e.target === this.advanceTaskModal) {
                    this.hideAdvanceTaskModal();
                }
            });
        }
        
        // Tag Modal Event Listeners
        if (this.tagModalCancel) {
            this.tagModalCancel.addEventListener('click', () => this.hideTagModal());
        }
        
        if (this.tagModalAdd) {
            this.tagModalAdd.addEventListener('click', () => this.addTagToTask());
        }
        
        if (this.tagModalSave) {
            this.tagModalSave.addEventListener('click', () => this.saveTaskTags());
        }
        
        // Tag modal click outside to close
        if (this.tagModal) {
            this.tagModal.addEventListener('click', (e) => {
                if (e.target === this.tagModal) {
                    this.hideTagModal();
                }
            });
        }
        
        // Reassign Tasks Modal Event Listeners
        if (this.app.reassignModalCancel) {
            this.app.reassignModalCancel.addEventListener('click', () => this.hideReassignTasksModal());
        }
        
        if (this.app.reassignModalConfirm) {
            this.app.reassignModalConfirm.addEventListener('click', () => this.confirmTaskReassignment());
        }
        
        // Reassign modal click outside to close
        if (this.app.reassignTasksModal) {
            this.app.reassignTasksModal.addEventListener('click', (e) => {
                if (e.target === this.app.reassignTasksModal) {
                    this.hideReassignTasksModal();
                }
            });
        }
        
        // Global escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentModal) {
                this.hideCurrentModal();
            }
        });
    }
    
    // ==================== TASK MODAL METHODS ====================
    
    /**
     * Show task creation modal
     */
    showTaskModal() {
        this.domService.show('taskModal', 'block');
        this.currentModal = 'taskModal';
        
        // Clear and focus input
        if (this.taskNameInput) {
            this.taskNameInput.value = '';
            this.taskNameInput.focus();
        }
        
        console.log('ModalManager: Task modal opened');
    }
    
    /**
     * Hide task creation modal
     */
    hideTaskModal() {
        this.domService.hide('taskModal');
        
        if (this.currentModal === 'taskModal') {
            this.currentModal = null;
        }
        
        console.log('ModalManager: Task modal closed');
    }
    
    /**
     * Create task from modal input with validation
     */
    createTaskFromModal() {
        if (!this.taskNameInput) {
            console.error('ModalManager: Task name input not found');
            return;
        }
        
        const taskNameRaw = this.taskNameInput.value;
        const validation = ValidationUtils.validateTaskName(taskNameRaw);
        
        if (validation.isValid) {
            // Delegate to main app for task creation
            this.app.createTaskNode(validation.value);
            this.hideTaskModal();
            
            // Get the newly created task node and open tag modal
            const newTaskNode = this.app.taskNodes[this.app.taskNodes.length - 1];
            this.app.selectedNode = newTaskNode;
            this.showTagModal();
            
            console.log(`ModalManager: Task created: "${validation.value}"`);
        } else {
            // Show validation error
            alert(validation.error);
            this.taskNameInput.focus();
        }
    }
    
    // ==================== TAG MODAL METHODS ====================
    
    /**
     * Show tag editing modal for selected task
     */
    showTagModal() {
        if (!this.app.selectedNode || this.app.selectedNode.dataset.type !== 'task') {
            console.warn('ModalManager: No task selected for tag editing');
            return;
        }
        
        this.app.selectedTaskForTags = this.app.selectedNode;
        this.currentModal = 'tagModal';
        
        // Display current tags
        this.app.displayCurrentTags();
        
        // Reset form elements
        this.resetTagModalForm();
        
        this.domService.show('tagModal', 'block');
        console.log('ModalManager: Tag modal opened');
    }
    
    /**
     * Hide tag editing modal
     */
    hideTagModal() {
        this.domService.hide('tagModal');
        
        if (this.currentModal === 'tagModal') {
            this.currentModal = null;
        }
        
        this.app.selectedTaskForTags = null;
        console.log('ModalManager: Tag modal closed');
    }
    
    /**
     * Reset tag modal form elements
     */
    resetTagModalForm() {
        if (this.tagCategoryDropdown) {
            this.tagCategoryDropdown.value = '';
        }
        
        if (this.tagOptionDropdown) {
            this.tagOptionDropdown.disabled = true;
            this.tagOptionDropdown.innerHTML = '<option value="">Select category first</option>';
        }
        
        // Reset input fields
        const inputFields = ['tagDateInput', 'tagDescriptionInput', 'tagLinkInput'];
        inputFields.forEach(fieldName => {
            if (this[fieldName]) {
                this[fieldName].value = '';
            }
        });
        
        if (this.tagCompletedInput) {
            this.tagCompletedInput.checked = false;
        }
    }
    
    /**
     * Add tag to current task (delegates to main app)
     */
    addTagToTask() {
        // Delegate to main app logic
        this.app.addTagToTask();
    }
    
    /**
     * Save task tags (delegates to main app)
     */
    saveTaskTags() {
        // Delegate to main app logic
        this.app.saveTaskTags();
    }
    
    // ==================== ADVANCE TASK MODAL METHODS ====================
    
    /**
     * Show task advancement modal with available options
     * @param {Array} outboundFlowlines - Available flowlines for task advancement
     */
    showAdvanceTaskModal(outboundFlowlines) {
        if (!this.app.selectedNode) {
            console.warn('ModalManager: No task selected for advancement');
            return;
        }
        
        this.app.selectedTaskForAdvance = this.app.selectedNode;
        this.currentModal = 'advanceTaskModal';
        
        // Clear and populate advance options
        if (this.advanceOptions) {
            this.advanceOptions.innerHTML = '';
            
            outboundFlowlines.forEach(flowline => {
                const option = this.createAdvanceOption(flowline);
                this.advanceOptions.appendChild(option);
            });
        }
        
        this.domService.show('advanceTaskModal', 'block');
        console.log('ModalManager: Advance task modal opened');
    }
    
    /**
     * Hide task advancement modal
     */
    hideAdvanceTaskModal() {
        this.domService.hide('advanceTaskModal');
        
        if (this.currentModal === 'advanceTaskModal') {
            this.currentModal = null;
        }
        
        this.app.selectedTaskForAdvance = null;
        console.log('ModalManager: Advance task modal closed');
    }
    
    /**
     * Create advance option element for modal
     * @param {Object} flowline - Flowline object with target node
     * @returns {HTMLElement} Option element
     */
    createAdvanceOption(flowline) {
        const option = document.createElement('div');
        option.className = 'advance-option';
        option.dataset.targetId = flowline.target.dataset.id;
        
        const targetNodeText = flowline.target.querySelector('.node-text').textContent;
        const targetNodeType = flowline.target.dataset.type;
        option.textContent = `${targetNodeText} (${targetNodeType})`;
        
        // Add click handler for option selection
        option.addEventListener('click', () => {
            this.app.moveTaskToNode(this.app.selectedTaskForAdvance, flowline.target);
            this.hideAdvanceTaskModal();
        });
        
        return option;
    }
    
    // ==================== TASK REASSIGNMENT MODAL METHODS ====================
    
    /**
     * Show task reassignment modal when deleting a node with associated tasks
     * @param {HTMLElement} nodeToDelete - Node being deleted
     * @param {Array} associatedTasks - Tasks that need reassignment
     */
    showReassignTasksModal(nodeToDelete, associatedTasks) {
        this.nodeBeingDeleted = nodeToDelete;
        this.tasksToReassign = associatedTasks;
        this.selectedReassignTarget = null;
        this.currentModal = 'reassignTasksModal';
        
        // Update modal message
        const nodeText = nodeToDelete.querySelector('.node-text')?.textContent || 'Unknown';
        const nodeType = nodeToDelete.dataset.type || 'node';
        const message = `The ${nodeType} "${nodeText}" has ${associatedTasks.length} associated task${associatedTasks.length !== 1 ? 's' : ''}. Select which node to reassign them to:`;
        
        const messageElement = this.domService.getElement('reassignTasksMessage');
        if (messageElement) {
            messageElement.textContent = message;
        }
        
        // Populate tasks list
        this.populateTasksList(associatedTasks);
        
        // Populate available nodes for reassignment
        this.populateReassignOptions(nodeToDelete);
        
        // Disable confirm button initially
        const confirmBtn = this.domService.getElement('reassignModalConfirm');
        if (confirmBtn) {
            confirmBtn.disabled = true;
        }
        
        this.domService.show('reassignTasksModal', 'block');
        console.log(`ModalManager: Reassign tasks modal opened for node ${nodeToDelete.dataset.id}`);
    }
    
    /**
     * Hide task reassignment modal
     */
    hideReassignTasksModal() {
        this.domService.hide('reassignTasksModal');
        
        if (this.currentModal === 'reassignTasksModal') {
            this.currentModal = null;
        }
        
        this.nodeBeingDeleted = null;
        this.tasksToReassign = null;
        this.selectedReassignTarget = null;
        console.log('ModalManager: Reassign tasks modal closed');
    }
    
    /**
     * Populate the list of tasks that need reassignment
     * @param {Array} tasks - Tasks to display
     */
    populateTasksList(tasks) {
        const tasksList = this.domService.getElement('reassignTasksList');
        if (!tasksList) return;
        
        tasksList.innerHTML = '';
        
        tasks.forEach(task => {
            const taskItem = document.createElement('div');
            taskItem.className = 'reassign-task-item';
            
            const taskName = task.querySelector('.node-text')?.textContent || 'Unnamed Task';
            const taskSlot = task.dataset.slot || '0';
            
            taskItem.innerHTML = `
                <span class="task-name">${taskName}</span>
                <span class="task-meta">Slot ${taskSlot}</span>
            `;
            
            tasksList.appendChild(taskItem);
        });
    }
    
    /**
     * Populate available nodes for task reassignment
     * @param {HTMLElement} excludeNode - Node to exclude from options
     */
    populateReassignOptions(excludeNode) {
        const optionsContainer = this.domService.getElement('reassignOptions');
        if (!optionsContainer) return;
        
        optionsContainer.innerHTML = '';
        
        // Get all nodes except the one being deleted
        const availableNodes = this.app.nodes.filter(node => 
            node !== excludeNode && node.dataset.type !== 'task'
        );
        
        if (availableNodes.length === 0) {
            const noOptions = document.createElement('div');
            noOptions.className = 'reassign-option disabled';
            noOptions.textContent = 'No available nodes for reassignment';
            optionsContainer.appendChild(noOptions);
            return;
        }
        
        availableNodes.forEach(node => {
            const option = this.createReassignOption(node);
            optionsContainer.appendChild(option);
        });
    }
    
    /**
     * Create reassignment option element
     * @param {HTMLElement} node - Node to create option for
     * @returns {HTMLElement} Option element
     */
    createReassignOption(node) {
        const option = document.createElement('div');
        option.className = 'reassign-option';
        option.dataset.nodeId = node.dataset.id;
        
        const nodeText = node.querySelector('.node-text')?.textContent || 'Unnamed Node';
        const nodeType = node.dataset.type || 'node';
        
        option.innerHTML = `
            <span class="node-type">${nodeType}</span>
            <span class="node-name">${nodeText}</span>
        `;
        
        // Add click handler for option selection
        option.addEventListener('click', () => {
            this.selectReassignOption(option, node);
        });
        
        return option;
    }
    
    /**
     * Handle reassignment option selection
     * @param {HTMLElement} optionElement - Selected option element
     * @param {HTMLElement} targetNode - Target node for reassignment
     */
    selectReassignOption(optionElement, targetNode) {
        // Remove previous selection
        const allOptions = this.domService.getElement('reassignOptions')?.querySelectorAll('.reassign-option');
        allOptions?.forEach(opt => opt.classList.remove('selected'));
        
        // Select current option
        optionElement.classList.add('selected');
        this.selectedReassignTarget = targetNode;
        
        // Enable confirm button
        const confirmBtn = this.domService.getElement('reassignModalConfirm');
        if (confirmBtn) {
            confirmBtn.disabled = false;
        }
        
        console.log(`ModalManager: Selected reassignment target: ${targetNode.dataset.id}`);
    }
    
    /**
     * Confirm task reassignment and proceed with node deletion
     */
    confirmTaskReassignment() {
        if (!this.selectedReassignTarget || !this.tasksToReassign || !this.nodeBeingDeleted) {
            console.error('ModalManager: Invalid state for task reassignment');
            return;
        }
        
        console.log(`ModalManager: Reassigning ${this.tasksToReassign.length} tasks to node ${this.selectedReassignTarget.dataset.id}`);
        
        // Reassign all tasks to the selected target node
        this.tasksToReassign.forEach(task => {
            this.app.moveTaskToNode(task, this.selectedReassignTarget);
        });
        
        // Hide the modal
        this.hideReassignTasksModal();
        
        // Proceed with actual node deletion
        this.proceedWithNodeDeletion(this.nodeBeingDeleted);
    }
    
    /**
     * Proceed with actual node deletion after tasks have been reassigned
     * @param {HTMLElement} node - Node to delete
     */
    proceedWithNodeDeletion(node) {
        console.log(`ModalManager: Proceeding with deletion of node ${node.dataset.id}`);
        
        // Use the app's proceedWithNodeDeletion method to actually delete the node
        if (typeof this.app.proceedWithNodeDeletion === 'function') {
            this.app.proceedWithNodeDeletion(node);
            console.log(`ModalManager: Node ${node.dataset.id} deleted successfully`);
        } else {
            console.error('ModalManager: proceedWithNodeDeletion method not available');
        }
    }
    
    // ==================== GENERAL MODAL METHODS ====================
    
    /**
     * Hide currently open modal
     */
    hideCurrentModal() {
        switch (this.currentModal) {
            case 'taskModal':
                this.hideTaskModal();
                break;
            case 'tagModal':
                this.hideTagModal();
                break;
            case 'advanceTaskModal':
                this.hideAdvanceTaskModal();
                break;
            case 'reassignTasksModal':
                this.hideReassignTasksModal();
                break;
            default:
                console.log('ModalManager: No modal currently open');
        }
    }
    
    /**
     * Hide all modals
     */
    hideAllModals() {
        this.hideTaskModal();
        this.hideTagModal();
        this.hideAdvanceTaskModal();
        this.currentModal = null;
    }
    
    /**
     * Check if any modal is currently open
     * @returns {boolean} True if a modal is open
     */
    isModalOpen() {
        return this.currentModal !== null;
    }
    
    /**
     * Get currently open modal
     * @returns {string|null} Current modal name or null
     */
    getCurrentModal() {
        return this.currentModal;
    }
    
    /**
     * Validate modal elements are properly connected
     * @returns {Object} Validation result
     */
    validateModalElements() {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };
        
        // Check critical modal elements
        const criticalElements = ['taskModal', 'tagModal', 'advanceTaskModal'];
        criticalElements.forEach(elementName => {
            if (!this[elementName]) {
                result.isValid = false;
                result.errors.push(`Missing critical modal element: ${elementName}`);
            }
        });
        
        // Check modal controls
        const controlElements = ['taskModalCancel', 'taskModalCreate', 'tagModalCancel'];
        controlElements.forEach(elementName => {
            if (!this[elementName]) {
                result.warnings.push(`Missing modal control: ${elementName}`);
            }
        });
        
        return result;
    }
    
    /**
     * Get modal state information for debugging
     * @returns {Object} Modal state information
     */
    getModalState() {
        return {
            currentModal: this.currentModal,
            modalStack: [...this.modalStack],
            isModalOpen: this.isModalOpen(),
            validation: this.validateModalElements()
        };
    }
    
    /**
     * Setup modal keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + T for new task modal
            if ((e.ctrlKey || e.metaKey) && e.key === 't' && !this.isModalOpen()) {
                e.preventDefault();
                this.showTaskModal();
            }
            
            // Ctrl/Cmd + E for tag modal (if task selected)
            if ((e.ctrlKey || e.metaKey) && e.key === 'e' && !this.isModalOpen()) {
                if (this.app.selectedNode && this.app.selectedNode.dataset.type === 'task') {
                    e.preventDefault();
                    this.showTagModal();
                }
            }
        });
    }
    
    /**
     * Initialize modal manager with keyboard shortcuts
     */
    initialize() {
        this.setupKeyboardShortcuts();
        console.log('ModalManager: Initialized with keyboard shortcuts');
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalManager;
}

// Make available globally for direct use
if (typeof window !== 'undefined') {
    window.ModalManager = ModalManager;
}