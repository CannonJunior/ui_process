class ProcessFlowDesigner {
    constructor() {
        // Initialize application state - nodes now managed by NodeManager
        // this.flowlines, this.flowlineCreationMode, this.sourceNodeForFlowline now handled by FlowlineManager
        this.selectedNode = null;
        // this.dragData now handled by NodeManager
        // this.startNode, this.nodes, this.nodeCounter now handled by NodeManager
        this.taskNodes = [];
        this.selectedTaskForAdvance = null;
        this.selectedTaskForTags = null;
        this.draggedTag = null;
        this.successfulDrop = false;
        this.selectedTagForEdit = null;
        this.currentTagData = null;
        // this.isMatrixMode now handled by MatrixController (getter defined below)
        this.originalNodePositions = new Map(); // Store original positions for ALL nodes before matrix mode
        
        // Track if workflows have been appended (for future merge validation)
        this.hasAppendedWorkflows = false;
        
        // Initialize services
        this.domService = getDOMService();
        this.configService = getConfigService();
        
        // Cache DOM element references using DOM service
        this.initializeDOMElements();
        
        // Initialize UI managers
        this.modalManager = new ModalManager(this);
        this.contextMenuManager = new ContextMenuManager(this);
        
        // Initialize feature managers
        this.tagManager = new TagManager(this);
        
        // Initialize matrix modules (Phase 7: Eisenhower Matrix Extraction)
        this.matrixAnimations = new MatrixAnimations(this);
        this.matrixController = new MatrixController(this);
        
        // Initialize opportunity view system
        this.opportunityController = new OpportunityController(this);
        
        // Initialize node modules (Phase 8: Node Management System)
        this.nodeFactory = new NodeFactory(this.configService);
        this.nodeManager = new NodeManager(this);
        
        // Initialize flowline modules (Phase 9: Flowline System)
        this.flowlineRenderer = new FlowlineRenderer(this.configService);
        this.flowlineManager = new FlowlineManager(this);
        
        // Initialize workflow command bridge
        this.workflowBridge = new WorkflowBridge();
        this.workflowBridge.initialize(this);
        
        this.init();
    }
    
    // ==================== MATRIX MODE DELEGATION (Phase 7) ====================
    
    /**
     * Matrix mode getter - delegates to MatrixController
     */
    get isMatrixMode() {
        return this.matrixController ? this.matrixController.getMatrixMode() : false;
    }
    
    /**
     * Matrix mode setter - delegates to MatrixController
     */
    set isMatrixMode(value) {
        if (this.matrixController) {
            this.matrixController.setMatrixMode(value);
        }
    }
    
    // Matrix interface preservation - all methods delegate to MatrixController
    toggleEisenhowerMatrix() {
        return this.matrixController ? this.matrixController.toggleEisenhowerMatrix() : null;
    }
    
    enterMatrixMode() {
        return this.matrixController ? this.matrixController.enterMatrixMode() : null;
    }
    
    exitMatrixMode() {
        return this.matrixController ? this.matrixController.exitMatrixMode() : null;
    }
    
    storeOriginalNodePositions() {
        return this.matrixController ? this.matrixController.storeOriginalNodePositions() : null;
    }
    
    positionTasksInMatrix() {
        return this.matrixController ? this.matrixController.positionTasksInMatrix() : null;
    }
    
    positionSingleTaskInMatrix(taskNode) {
        return this.matrixController ? this.matrixController.positionSingleTaskInMatrix(taskNode) : null;
    }
    
    analyzeTaskUrgencyImportance(tags) {
        return this.matrixController ? this.matrixController.analyzeTaskUrgencyImportance(tags) : { isUrgent: false, isImportant: false };
    }
    
    // Opportunity mode interface - delegates to OpportunityController
    toggleOpportunityMode() {
        if (!this.opportunityController) return;
        
        const isCurrentlyInOpportunityMode = this.opportunityController.isInOpportunityMode();
        
        if (isCurrentlyInOpportunityMode) {
            // Exit opportunity mode
            document.dispatchEvent(new CustomEvent('toggleOpportunityMode', { 
                detail: { enabled: false } 
            }));
        } else {
            // Enter opportunity mode
            document.dispatchEvent(new CustomEvent('toggleOpportunityMode', { 
                detail: { enabled: true } 
            }));
        }
    }
    
    // Animation interface preservation - delegates to MatrixAnimations
    transitionNodesOffScreen() {
        return this.matrixAnimations ? this.matrixAnimations.transitionNodesOffScreen() : Promise.resolve();
    }
    
    transitionNodesToOriginalPositions() {
        return this.matrixAnimations ? this.matrixAnimations.transitionNodesToOriginalPositions() : Promise.resolve();
    }
    
    // Legacy method for backward compatibility - now delegates to matrix modules
    repositionTaskInMatrix(taskNode) {
        return this.positionSingleTaskInMatrix(taskNode);
    }
    
    // ==================== END MATRIX DELEGATION ====================
    
    // ==================== NODE MANAGEMENT DELEGATION (Phase 8) ====================
    
    // Node creation interface preservation - delegates to NodeManager
    createNode(type) {
        return this.nodeManager ? this.nodeManager.createNode(type) : null;
    }
    
    createDefaultStartNode() {
        return this.nodeManager ? this.nodeManager.createDefaultStartNode() : null;
    }
    
    createNodeFromData(nodeData) {
        return this.nodeManager ? this.nodeManager.createNodeFromData(nodeData) : null;
    }
    
    // Node interaction interface preservation
    handleMouseDown(e, node) {
        return this.nodeManager ? this.nodeManager.handleMouseDown(e, node) : null;
    }
    
    handleMouseMove(e) {
        return this.nodeManager ? this.nodeManager.handleMouseMove(e) : null;
    }
    
    handleMouseUp(e) {
        return this.nodeManager ? this.nodeManager.handleMouseUp(e) : null;
    }
    
    handleContextMenu(e, node) {
        return this.nodeManager ? this.nodeManager.handleContextMenu(e, node) : null;
    }
    
    handleDoubleClick(e, node) {
        return this.nodeManager ? this.nodeManager.handleDoubleClick(e, node) : null;
    }
    
    // Node management utility methods
    getAllNodes() {
        return this.nodeManager ? this.nodeManager.getAllNodes() : [];
    }
    
    getNodeById(id) {
        return this.nodeManager ? this.nodeManager.getNodeById(id) : null;
    }
    
    removeNode(nodeOrId) {
        return this.nodeManager ? this.nodeManager.removeNode(nodeOrId) : false;
    }
    
    // Node state getters that maintain compatibility
    get nodes() {
        return this.nodeManager ? this.nodeManager.getAllNodes() : [];
    }
    
    get nodeCounter() {
        return this.nodeManager ? this.nodeManager.getNodeCounter() : 0;
    }
    
    set nodeCounter(value) {
        if (this.nodeManager) {
            this.nodeManager.setNodeCounter(value);
        }
    }
    
    get startNode() {
        return this.nodeManager ? this.nodeManager.startNode : null;
    }
    
    set startNode(node) {
        if (this.nodeManager) {
            this.nodeManager.startNode = node;
        }
    }
    
    // Flowline creation mode properties - delegate to FlowlineManager
    get flowlineCreationMode() {
        return this.flowlineManager ? this.flowlineManager.flowlineCreationMode : false;
    }
    
    get sourceNodeForFlowline() {
        return this.flowlineManager ? this.flowlineManager.sourceNodeForFlowline : null;
    }
    
    // ==================== END NODE DELEGATION ====================
    
    // ==================== FLOWLINE SYSTEM DELEGATION (Phase 9) ====================
    
    // Flowline creation interface preservation - delegates to FlowlineManager
    startFlowlineCreation(sourceNode = null) {
        return this.flowlineManager ? this.flowlineManager.startFlowlineCreation(sourceNode) : null;
    }
    
    exitFlowlineCreationMode() {
        return this.flowlineManager ? this.flowlineManager.exitFlowlineCreationMode() : null;
    }
    
    createFlowline(sourceNode, targetNode, flowlineType = null) {
        return this.flowlineManager ? this.flowlineManager.createFlowline(sourceNode, targetNode, flowlineType) : null;
    }
    
    updateFlowlines() {
        return this.flowlineManager ? this.flowlineManager.updateFlowlines() : null;
    }
    
    // Flowline management methods
    removeFlowline(flowlineOrId) {
        return this.flowlineManager ? this.flowlineManager.removeFlowline(flowlineOrId) : false;
    }
    
    removeFlowlinesForNode(nodeOrId) {
        return this.flowlineManager ? this.flowlineManager.removeFlowlinesForNode(nodeOrId) : 0;
    }
    
    getAllFlowlines() {
        return this.flowlineManager ? this.flowlineManager.getAllFlowlines() : [];
    }
    
    // Flowline state getters that maintain compatibility
    get flowlines() {
        return this.flowlineManager ? this.flowlineManager.getAllFlowlines() : [];
    }
    
    get flowlineCreationMode() {
        return this.flowlineManager ? this.flowlineManager.isInFlowlineCreationMode() : false;
    }
    
    set flowlineCreationMode(value) {
        // This setter maintains compatibility but delegates to FlowlineManager
        if (value && !this.flowlineCreationMode) {
            this.startFlowlineCreation();
        } else if (!value && this.flowlineCreationMode) {
            this.exitFlowlineCreationMode();
        }
    }
    
    get sourceNodeForFlowline() {
        return this.flowlineManager ? this.flowlineManager.getSourceNodeForFlowline() : null;
    }
    
    set sourceNodeForFlowline(node) {
        // This setter maintains compatibility but actual management is in FlowlineManager
        if (this.flowlineManager) {
            this.flowlineManager.sourceNodeForFlowline = node;
        }
    }
    
    // ==================== END FLOWLINE DELEGATION ====================
    
    initializeDOMElements() {
        // Get all required DOM elements through DOM service
        const elements = this.domService.getElements([
            'contextMenu', 'taskContextMenu', 'canvas', 'flowlineTypeDropdown',
            'addButton', 'addContextMenu', 'nodeTypeMenu', 'addTaskButton', 'taskModal', 'taskNameInput', 'taskModalCancel', 'taskModalCreate',
            'advanceTaskModal', 'advanceOptions', 'advanceModalCancel', 'saveWorkflowButton',
            'loadWorkflowButton', 'loadWorkflowInput', 'appendWorkflowButton', 'appendWorkflowInput', 'tagModal', 'currentTags',
            'tagCategoryDropdown', 'tagOptionDropdown', 'tagDateInput', 'tagDescriptionInput',
            'tagLinkInput', 'tagCompletedInput', 'tagModalCancel', 'tagModalAdd', 'tagModalSave',
            'tagContextMenu', 'tagAttributeMenu', 'tagDatePicker', 'eisenhowerToggle', 'eisenhowerMatrix', 'opportunityToggle',
            'reassignTasksModal', 'reassignTasksList', 'reassignOptions', 'reassignModalCancel', 'reassignModalConfirm'
        ]);
        
        // Assign elements to instance properties for backward compatibility
        Object.assign(this, elements);
        
        // Validate that critical elements are present
        const validation = this.domService.validateElements();
        if (!validation.isValid) {
            console.error('ProcessFlowDesigner: Critical DOM elements missing:', validation.errors);
            throw new Error('Required DOM elements not found');
        }
        
        if (validation.warnings.length > 0) {
            console.warn('ProcessFlowDesigner: Some DOM elements missing:', validation.warnings);
        }
    }
    
    init() {
        this.initializeDropdowns();
        this.setupEventListeners();
        this.createSVGDefs();
        this.createDefaultStartNode();
        
        // Initialize modal manager after all setup is complete
        this.modalManager.initialize();
    }
    
    initializeDropdowns() {
        // Populate dropdowns using configuration service
        this.configService.populateDropdown(this.flowlineTypeDropdown, 'flowlineTypes');
        this.configService.populateDropdown(this.tagCategoryDropdown, 'tagSystem.categories');
        
        // Set default flowline type
        this.flowlineTypeDropdown.value = 'straight';
        
        // Populate node type menu for Add context menu
        this.populateNodeTypeMenu();
    }
    
    setupEventListeners() {
        // Note: Node type dropdown change event now handled by NodeManager
        // Note: Canvas click to hide context menu is now handled by ContextMenuManager
        
        // Prevent dragging tags to invalid locations
        this.canvas.addEventListener('dragover', (e) => {
            // Only allow dropping on next-action-slots for the same task
            if (!e.target.classList.contains('next-action-slot')) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'none';
            } else if (this.draggedTag && e.target.dataset.taskId !== this.draggedTag.taskId) {
                // Prevent dropping on other tasks' next-action-slots
                e.preventDefault();
                e.dataTransfer.dropEffect = 'none';
            } else {
                // Allow dropping on same task's next-action-slot
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            }
        });
        
        // Drop handling is now handled by TagManager
        // this.canvas.addEventListener('drop', (e) => {
        //     // Prevent drops on invalid locations
        //     if (!e.target.classList.contains('next-action-slot') || 
        //         (this.draggedTag && e.target.dataset.taskId !== this.draggedTag.taskId)) {
        //         e.preventDefault();
        //     }
        // });
        
        // Note: Context menu click handling is now handled by ContextMenuManager
        // Note: Global mouse events for dragging now handled by NodeManager
        
        // Prevent context menu on canvas, but allow on tags
        this.canvas.addEventListener('contextmenu', (e) => {
            if (!e.target.classList.contains('tag')) {
                e.preventDefault();
            }
        });
        
        // Modal event listeners are now handled by ModalManager
        
        // Save/Load workflow event listeners
        this.saveWorkflowButton.addEventListener('click', () => this.saveWorkflow());
        this.loadWorkflowButton.addEventListener('click', () => this.loadWorkflowInput.click());
        this.loadWorkflowInput.addEventListener('change', (e) => this.loadWorkflow(e));
        
        this.appendWorkflowButton.addEventListener('click', () => this.appendWorkflowInput.click());
        this.appendWorkflowInput.addEventListener('change', (e) => this.appendWorkflow(e));
        
        // Opportunity toggle event listener
        this.opportunityToggle.addEventListener('click', () => this.toggleOpportunityMode());
        
        // Eisenhower Matrix toggle event listener is now handled by MatrixController
        
        // Tag modal event listeners are now handled by ModalManager
        // Note: Tag category dropdown change listener is kept here as it's tag logic, not modal management
        
        // Note: Tag category dropdown change is now handled by TagManager
        
        // Tag modal click outside listener is now handled by ModalManager
        
        // Note: Tag context menu event listeners are now handled by ContextMenuManager
        
        // Add button context menu event listeners
        this.setupAddButtonEventListeners();
    }
    
    // ==================== ADD BUTTON CONTEXT MENU METHODS ====================
    
    setupAddButtonEventListeners() {
        // Add button click to show context menu
        this.addButton.addEventListener('click', (e) => this.showAddContextMenu(e));
        
        // Add context menu item clicks
        this.addContextMenu.addEventListener('click', (e) => this.handleAddContextMenuClick(e));
        
        // Node type menu item clicks
        this.nodeTypeMenu.addEventListener('click', (e) => this.handleNodeTypeMenuClick(e));
        
        // Global click to hide menus
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#addButton') && 
                !e.target.closest('#addContextMenu') && 
                !e.target.closest('#nodeTypeMenu')) {
                this.hideAllAddMenus();
            }
        });
    }
    
    populateNodeTypeMenu() {
        // Get node types from configuration
        const nodeTypes = this.configService.getNodeTypes();
        if (!nodeTypes || !Array.isArray(nodeTypes) || !this.nodeTypeMenu) return;
        
        // Clear existing content
        this.nodeTypeMenu.innerHTML = '';
        
        // Add node type options (skip disabled "Select" option)
        nodeTypes.forEach(nodeType => {
            if (nodeType.value && !nodeType.disabled) {
                const menuItem = document.createElement('div');
                menuItem.className = 'menu-item';
                menuItem.dataset.nodeType = nodeType.value;
                menuItem.textContent = nodeType.label;
                this.nodeTypeMenu.appendChild(menuItem);
            }
        });
    }
    
    showAddContextMenu(event) {
        event.preventDefault();
        event.stopPropagation();
        
        this.hideAllAddMenus();
        
        const rect = this.addButton.getBoundingClientRect();
        this.addContextMenu.style.left = `${rect.left}px`;
        this.addContextMenu.style.top = `${rect.bottom + 5}px`;
        this.addContextMenu.style.display = 'block';
    }
    
    handleAddContextMenuClick(event) {
        event.preventDefault();
        event.stopPropagation();
        
        const menuItem = event.target.closest('.menu-item');
        if (!menuItem) return;
        
        const addType = menuItem.dataset.addType;
        
        if (addType === 'node') {
            this.showNodeTypeMenu();
        }
    }
    
    showNodeTypeMenu() {
        if (!this.nodeTypeMenu) return;
        
        const contextMenuRect = this.addContextMenu.getBoundingClientRect();
        this.nodeTypeMenu.style.left = `${contextMenuRect.right + 5}px`;
        this.nodeTypeMenu.style.top = `${contextMenuRect.top}px`;
        this.nodeTypeMenu.style.display = 'block';
    }
    
    handleNodeTypeMenuClick(event) {
        event.preventDefault();
        event.stopPropagation();
        
        const menuItem = event.target.closest('.menu-item');
        if (!menuItem) return;
        
        const nodeType = menuItem.dataset.nodeType;
        if (nodeType) {
            // Create the node using NodeManager
            if (this.nodeManager) {
                this.nodeManager.createNode(nodeType);
            } else {
                // Fallback to legacy method
                this.createNode(nodeType);
            }
        }
        
        this.hideAllAddMenus();
    }
    
    hideAllAddMenus() {
        if (this.addContextMenu) {
            this.addContextMenu.style.display = 'none';
        }
        if (this.nodeTypeMenu) {
            this.nodeTypeMenu.style.display = 'none';
        }
    }
    
    // ==================== END ADD BUTTON CONTEXT MENU METHODS ====================
    
    createSVGDefs() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '5';
        
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '7');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3.5');
        marker.setAttribute('orient', 'auto');
        
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
        polygon.setAttribute('fill', '#333');
        
        marker.appendChild(polygon);
        defs.appendChild(marker);
        svg.appendChild(defs);
        this.canvas.appendChild(svg);
        
        this.svg = svg;
    }
    
    // ==================== NODE MANAGEMENT METHODS EXTRACTED ====================
    // Phase 8: Node management functionality has been extracted to:
    // - features/node-management/node-manager.js (main node logic)
    // - features/node-management/node-factory.js (node creation)
    // All original node methods now delegate to these modules via the delegation methods above.
    // ==================== END EXTRACTED SECTION ====================
    
    hideContextMenu() {
        // Delegate to context menu manager
        this.contextMenuManager.hideContextMenu();
    }
    
    handleContextMenuAction(action) {
        // Delegate to context menu manager
        this.contextMenuManager.handleContextMenuAction(action);
    }
    
    handleTaskContextMenuAction(action) {
        // Delegate to context menu manager
        this.contextMenuManager.handleTaskContextMenuAction(action);
    }
    
    // ==================== FLOWLINE SYSTEM METHODS EXTRACTED ====================
    // Phase 9: Flowline system functionality has been extracted to:
    // - features/flowline-system/flowline-manager.js (main flowline logic)
    // - features/flowline-system/flowline-renderer.js (rendering and visual effects)
    // All original flowline methods now delegate to these modules via the delegation methods above.
    // ==================== END EXTRACTED SECTION ====================
    
    
    renameNode() {
        if (!this.selectedNode) {
            console.error('No node selected for renaming');
            return;
        }
        
        // Capture the selected node in a local variable to avoid closure issues
        const nodeToRename = this.selectedNode;
        const textElement = nodeToRename.querySelector('.node-text');
        
        if (!textElement) {
            console.error('No .node-text element found in selected node');
            return;
        }
        
        const currentText = textElement.textContent;
        
        const input = document.createElement('input');
        input.className = 'node-input';
        input.type = 'text';
        input.value = currentText;
        
        // Replace the text element with the input
        nodeToRename.replaceChild(input, textElement);
        input.focus();
        input.select();
        
        const finishRename = () => {
            textElement.textContent = input.value || currentText;
            nodeToRename.replaceChild(textElement, input);
            
            // Update next-action-slot position if this is a task node
            if (nodeToRename.dataset.type === 'task') {
                // Add small delay to allow DOM to update size
                setTimeout(() => {
                    this.updateNextActionSlotPosition(nodeToRename);
                }, 10);
            }
            
            console.log(`Node ${nodeToRename.dataset.id} renamed to: "${textElement.textContent}"`);
        };
        
        input.addEventListener('blur', finishRename);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                finishRename();
            }
        });
    }
    
    deleteNode() {
        if (!this.selectedNode) {
            console.warn('No node selected for deletion');
            return;
        }
        
        // Check if this node has associated tasks
        const associatedTasks = this.getTasksForNode(this.selectedNode.dataset.id);
        
        if (associatedTasks.length > 0) {
            // Node has associated tasks - show reassignment modal
            console.log(`Node ${this.selectedNode.dataset.id} has ${associatedTasks.length} associated tasks - showing reassignment modal`);
            this.showReassignTasksModal(this.selectedNode, associatedTasks);
        } else {
            // No associated tasks - proceed with direct deletion
            console.log(`Node ${this.selectedNode.dataset.id} has no associated tasks - proceeding with deletion`);
            this.proceedWithNodeDeletion(this.selectedNode);
        }
    }
    
    /**
     * Proceed with actual node deletion (called after task reassignment or when no tasks exist)
     * @param {HTMLElement} nodeToDelete - Node to delete
     */
    proceedWithNodeDeletion(nodeToDelete) {
        console.log(`Deleting node ${nodeToDelete.dataset.id}`);
        
        // Remove flowlines connected to this node
        this.removeFlowlinesForNode(nodeToDelete);
        
        // Remove node using NodeManager delegation
        this.removeNode(nodeToDelete);
        
        console.log(`Node ${nodeToDelete.dataset.id} deleted successfully`);
    }
    
    /**
     * Show task reassignment modal (delegates to ModalManager)
     * @param {HTMLElement} nodeToDelete - Node being deleted
     * @param {Array} associatedTasks - Tasks that need reassignment
     */
    showReassignTasksModal(nodeToDelete, associatedTasks) {
        this.modalManager.showReassignTasksModal(nodeToDelete, associatedTasks);
    }
    
    /**
     * Hide task reassignment modal (delegates to ModalManager)
     */
    hideReassignTasksModal() {
        this.modalManager.hideReassignTasksModal();
    }
    
    showTaskModal() {
        // Delegate to modal manager while preserving interface
        this.modalManager.showTaskModal();
    }
    
    hideTaskModal() {
        // Delegate to modal manager while preserving interface
        this.modalManager.hideTaskModal();
    }
    
    createTaskFromModal() {
        // Delegate to modal manager while preserving interface
        this.modalManager.createTaskFromModal();
    }
    
    createTaskNode(taskName) {
        const taskContainer = document.createElement('div');
        taskContainer.className = 'task-container';
        taskContainer.dataset.id = ++this.nodeCounter;
        
        // Create task banner (smaller height, full width)
        const taskBanner = document.createElement('div');
        taskBanner.className = 'task-banner';
        taskBanner.dataset.type = 'task';
        taskBanner.dataset.id = this.nodeCounter;
        taskBanner.dataset.anchoredTo = this.startNode.dataset.id; // Anchor to Start node by default
        taskBanner.dataset.previousAnchor = null; // No previous node initially
        taskBanner.dataset.tags = JSON.stringify([]); // Initialize empty tags array
        
        const text = document.createElement('div');
        text.className = 'node-text';
        text.textContent = taskName;
        taskBanner.appendChild(text);
        
        // Create tags display area (below banner)
        const tagsArea = document.createElement('div');
        tagsArea.className = 'task-tags-area';
        
        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'task-tags';
        tagsArea.appendChild(tagsContainer);
        
        // Add vertical structure: banner on top, tags area below
        taskContainer.appendChild(taskBanner);
        taskContainer.appendChild(tagsArea);
        
        // Create Next Action slot (positioned to right of task-container)
        const nextActionSlot = document.createElement('div');
        nextActionSlot.className = 'next-action-slot';
        nextActionSlot.title = 'Next Action';
        nextActionSlot.dataset.taskId = this.nodeCounter;
        
        // Add task container to canvas
        this.canvas.appendChild(taskContainer);
        
        // Add next-action-slot to canvas (positioned separately)
        this.canvas.appendChild(nextActionSlot);
        
        // Add to arrays first
        this.nodes.push(taskBanner);
        this.taskNodes.push(taskBanner);
        
        // Check if Eisenhower Matrix is active
        if (this.isMatrixMode) {
            // First, calculate the normal slot position for this task
            this.assignTaskSlot(taskBanner);
            const normalPosition = this.calculateTaskSlotPosition(taskBanner);
            const normalSlotPosition = { x: normalPosition.x + 130, y: normalPosition.y }; // Next-action-slot offset
            
            // Store the normal positions as "original" positions
            this.originalNodePositions.set(taskBanner.dataset.id, {
                element: taskContainer,
                x: normalPosition.x,
                y: normalPosition.y,
                type: 'task-container'
            });
            this.originalNodePositions.set(`slot-${taskBanner.dataset.id}`, {
                element: nextActionSlot,
                x: normalSlotPosition.x,
                y: normalSlotPosition.y,
                type: 'next-action-slot'
            });
            
            // Position new task off-screen initially, then animate into matrix
            taskContainer.style.left = `-${200}px`;
            taskContainer.style.top = '100px';
            nextActionSlot.style.left = `-${200}px`;
            nextActionSlot.style.top = '100px';
            
            // Position in matrix using D3 transition after a short delay to ensure DOM is ready
            setTimeout(() => {
                this.positionSingleTaskInMatrix(taskBanner);
            }, 100);
        } else {
            // Normal positioning when matrix is not active
            // Assign slot and position task node
            this.assignTaskSlot(taskBanner);
            this.positionTaskInSlot(taskBanner);
            
            // Position next-action-slot to the right of task-container
            this.positionNextActionSlot(taskContainer, nextActionSlot);
        }
        
        // Add event listeners to the task banner (now the main task element)
        taskBanner.addEventListener('mousedown', (e) => this.handleMouseDown(e, taskBanner));
        taskBanner.addEventListener('contextmenu', (e) => this.handleContextMenu(e, taskBanner));
        taskBanner.addEventListener('dblclick', (e) => this.handleDoubleClick(e, taskBanner));
        
        // Tag drag and drop is now handled by TagManager canvas listeners
        // Individual slot listeners removed to prevent conflicts
        
        // Add ResizeObserver to monitor task container size changes
        if (window.ResizeObserver) {
            let resizeTimeout;
            const resizeObserver = new ResizeObserver(() => {
                // Debounce to avoid excessive repositioning
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    this.updateNextActionSlotPosition(taskBanner);
                    // Also reposition tasks below this one when height changes
                    this.repositionTasksAfterHeightChange(taskBanner);
                }, 50);
            });
            resizeObserver.observe(taskContainer);
            
            // Store observer reference for cleanup
            taskContainer._resizeObserver = resizeObserver;
        }
    }
    
    positionNextActionSlot(taskContainer, nextActionSlot) {
        // Use GeometryUtils for positioning calculation
        const position = GeometryUtils.calculateNextActionSlotPosition(
            taskContainer, 
            this.canvas, 
            10,  // 10px gap offset
            0
        );
        
        DOMUtils.setPosition(nextActionSlot, position.x, position.y);
    }
    
    updateNextActionSlotPosition(taskNode) {
        // Update next-action-slot position when task size changes
        const taskContainer = taskNode.parentNode;
        if (!taskContainer || !taskContainer.classList.contains('task-container')) {
            return;
        }
        
        const nextActionSlot = this.canvas.querySelector(`.next-action-slot[data-task-id="${taskNode.dataset.id}"]`);
        if (nextActionSlot) {
            this.positionNextActionSlot(taskContainer, nextActionSlot);
        }
    }
    
    assignTaskSlot(taskNode) {
        const anchorNodeId = taskNode.dataset.anchoredTo;
        const existingTasks = this.getTasksForNode(anchorNodeId).filter(task => task !== taskNode);
        
        // Find the next available slot (starting from 0)
        let slot = 0;
        const usedSlots = existingTasks.map(task => parseInt(task.dataset.slot) || 0).sort((a, b) => a - b);
        
        for (let i = 0; i < usedSlots.length; i++) {
            if (usedSlots[i] === slot) {
                slot++;
            } else {
                break;
            }
        }
        
        taskNode.dataset.slot = slot.toString();
    }
    
    getTasksForNode(nodeId) {
        return this.taskNodes.filter(task => task.dataset.anchoredTo === nodeId);
    }
    
    positionTaskInSlot(taskNode) {
        const anchorNodeId = taskNode.dataset.anchoredTo;
        console.log(`Debug: positionTaskInSlot for task ${taskNode.dataset.id}, looking for anchor ${anchorNodeId}`);
        console.log(`Debug: Available nodes:`, this.nodes.map(n => ({id: n.dataset.id, type: n.dataset.type})));
        
        const anchorNode = this.nodes.find(node => node.dataset.id === anchorNodeId);
        
        if (!anchorNode) {
            console.log(`Debug: Anchor node ${anchorNodeId} not found!`);
            return;
        }
        
        console.log(`Debug: Found anchor node ${anchorNodeId}`);
        
        const anchorX = parseInt(anchorNode.style.left) || 0;
        const anchorY = parseInt(anchorNode.style.top) || 0;
        const slot = parseInt(taskNode.dataset.slot) || 0;
        
        // Constants for task positioning
        const TASK_OFFSET_Y = 80; // Distance below anchor node for first task
        const MIN_TASK_GAP = 10;   // Minimum gap between tasks
        
        // Calculate dynamic Y position based on actual heights of previous tasks
        let yPosition = anchorY + TASK_OFFSET_Y;
        
        if (slot > 0) {
            // Get all tasks for this anchor node that come before this one
            const allTasks = this.getTasksForNode(anchorNodeId);
            const sortedTasks = allTasks.sort((a, b) => {
                const slotA = parseInt(a.dataset.slot) || 0;
                const slotB = parseInt(b.dataset.slot) || 0;
                return slotA - slotB;
            });
            
            // Calculate cumulative height from previous tasks
            for (let i = 0; i < slot && i < sortedTasks.length; i++) {
                const prevTask = sortedTasks[i];
                const prevTaskContainer = prevTask.parentNode;
                
                if (prevTaskContainer && prevTaskContainer.classList.contains('task-container')) {
                    const prevTaskHeight = this.getTaskContainerTotalHeight(prevTaskContainer);
                    yPosition += prevTaskHeight + MIN_TASK_GAP;
                }
            }
        }
        
        // Find the task container (parent of the task node)
        const taskContainer = taskNode.parentNode;
        if (taskContainer && taskContainer.classList.contains('task-container')) {
            taskContainer.style.left = anchorX + 'px';
            taskContainer.style.top = yPosition + 'px';
            
            // Also position the associated next-action-slot
            const nextActionSlot = this.canvas.querySelector(`.next-action-slot[data-task-id="${taskNode.dataset.id}"]`);
            if (nextActionSlot) {
                this.positionNextActionSlot(taskContainer, nextActionSlot);
            }
        } else {
            // Fallback for task nodes without container (shouldn't happen with new structure)
            taskNode.style.left = anchorX + 'px';
            taskNode.style.top = yPosition + 'px';
        }
    }
    
    getTaskContainerTotalHeight(taskContainer) {
        // Get the actual rendered height of the entire task container including tags
        // Use a small delay to ensure DOM updates have been processed
        const rect = taskContainer.getBoundingClientRect();
        
        // Ensure minimum height for tasks without tags
        const minHeight = 40; // Minimum height for task banner
        return Math.max(rect.height, minHeight);
    }
    
    repositionTasksAfterHeightChange(changedTaskNode) {
        // When a task's height changes, reposition all tasks below it
        const anchorNodeId = changedTaskNode.dataset.anchoredTo;
        const changedSlot = parseInt(changedTaskNode.dataset.slot) || 0;
        
        // Get all tasks for this anchor that are in slots after the changed task
        const allTasks = this.getTasksForNode(anchorNodeId);
        const tasksToReposition = allTasks.filter(task => {
            const taskSlot = parseInt(task.dataset.slot) || 0;
            return taskSlot > changedSlot;
        });
        
        // Reposition each affected task
        tasksToReposition.forEach(task => {
            this.positionTaskInSlot(task);
        });
    }
    
    repositionAllTasksForNode(nodeId) {
        const tasks = this.getTasksForNode(nodeId);
        tasks.forEach(task => {
            this.positionTaskInSlot(task);
        });
    }
    
    compactTaskSlots(nodeId) {
        const tasks = this.getTasksForNode(nodeId);
        
        // Sort tasks by their current slot
        tasks.sort((a, b) => {
            const slotA = parseInt(a.dataset.slot) || 0;
            const slotB = parseInt(b.dataset.slot) || 0;
            return slotA - slotB;
        });
        
        // Reassign slots starting from 0 with no gaps
        tasks.forEach((task, index) => {
            task.dataset.slot = index.toString();
            this.positionTaskInSlot(task);
        });
    }
    
    moveAnchoredTaskNodes(anchorNodeId, deltaX, deltaY) {
        // When anchor nodes move, reposition all anchored tasks using their slots
        this.repositionAllTasksForNode(anchorNodeId);
    }
    
    deleteTaskNode() {
        const anchorNodeId = this.selectedNode.dataset.anchoredTo;
        
        // Remove from task nodes array
        this.taskNodes = this.taskNodes.filter(node => node !== this.selectedNode);
        
        // Remove from general nodes array
        // Remove node using NodeManager
        if (this.nodeManager && this.selectedNode) {
            this.nodeManager.removeNode(this.selectedNode);
        }
        
        // Remove the associated next-action-slot
        const nextActionSlot = this.canvas.querySelector(`.next-action-slot[data-task-id="${this.selectedNode.dataset.id}"]`);
        if (nextActionSlot && nextActionSlot.parentNode) {
            nextActionSlot.parentNode.removeChild(nextActionSlot);
        }
        
        // Remove from DOM - handle container structure
        if (this.selectedNode.parentNode && this.selectedNode.parentNode.classList.contains('task-container')) {
            const container = this.selectedNode.parentNode;
            
            // Clean up ResizeObserver
            if (container._resizeObserver) {
                container._resizeObserver.disconnect();
                delete container._resizeObserver;
            }
            
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
        } else {
            // Fallback for nodes without container
            this.canvas.removeChild(this.selectedNode);
        }
        
        // Compact slots for the anchor node to remove gaps
        this.compactTaskSlots(anchorNodeId);
    }
    
    advanceTask() {
        if (!this.selectedNode || this.selectedNode.dataset.type !== 'task') return;
        
        const anchorNodeId = this.selectedNode.dataset.anchoredTo;
        const anchorNode = this.nodes.find(node => node.dataset.id === anchorNodeId);
        
        if (!anchorNode) return;
        
        // Find outbound flowlines from the anchor node
        const outboundFlowlines = this.flowlines.filter(flowline => 
            flowline.source.dataset.id === anchorNodeId
        );
        
        if (outboundFlowlines.length === 0) {
            alert('No outbound connections from the current node.');
            return;
        }
        
        if (outboundFlowlines.length === 1) {
            // Single flowline - advance directly
            this.moveTaskToNode(this.selectedNode, outboundFlowlines[0].target);
        } else {
            // Multiple flowlines - show selection modal
            this.showAdvanceTaskModal(outboundFlowlines);
        }
    }
    
    reverseTask() {
        if (!this.selectedNode || this.selectedNode.dataset.type !== 'task') return;
        
        const previousAnchorId = this.selectedNode.dataset.previousAnchor;
        
        // Check if there's a previous node to reverse to
        if (!previousAnchorId || previousAnchorId === 'null') {
            alert('No previous node to reverse to.');
            return;
        }
        
        // Find the previous anchor node
        const previousAnchorNode = this.nodes.find(node => node.dataset.id === previousAnchorId);
        
        if (!previousAnchorNode) {
            alert('Previous node no longer exists.');
            return;
        }
        
        // Move the task back to the previous node
        this.moveTaskToNode(this.selectedNode, previousAnchorNode);
    }
    
    showTagModal() {
        // Delegate to modal manager while preserving interface
        this.modalManager.showTagModal();
    }
    
    hideTagModal() {
        // Delegate to modal manager while preserving interface
        this.modalManager.hideTagModal();
    }
    
    handleTagCategoryChange(e) {
        // Delegate to tag manager
        this.tagManager.handleTagCategoryChange(e);
    }
    
    displayCurrentTags() {
        // Delegate to tag manager
        this.tagManager.displayCurrentTags();
    }
    
    addTagToTask() {
        // Delegate to tag manager
        this.tagManager.addTagToTask();
    }
    
    removeTag(index) {
        // Delegate to tag manager
        this.tagManager.removeTag(index);
    }
    
    saveTaskTags() {
        // Tags are already saved when added/removed, but if matrix is active,
        // reposition the task based on its updated tags
        if (this.isMatrixMode && this.selectedTaskForTags) {
            this.positionSingleTaskInMatrix(this.selectedTaskForTags);
        }
        
        this.hideTagModal();
    }
    
    getTaskTags(taskNode) {
        // Delegate to tag manager
        return this.tagManager.getTaskTags(taskNode);
    }
    
    setTaskTags(taskNode, tags) {
        // Delegate to tag manager
        this.tagManager.setTaskTags(taskNode, tags);
    }
    
    updateTaskTagsDisplay(taskNode) {
        // Delegate to tag manager
        this.tagManager.updateTaskTagsDisplay(taskNode);
    }
    
    showAdvanceTaskModal(outboundFlowlines) {
        // Delegate to modal manager while preserving interface
        this.modalManager.showAdvanceTaskModal(outboundFlowlines);
    }
    
    hideAdvanceTaskModal() {
        // Delegate to modal manager while preserving interface
        this.modalManager.hideAdvanceTaskModal();
    }
    
    moveTaskToNode(taskNode, targetNode) {
        const oldAnchorNodeId = taskNode.dataset.anchoredTo;
        
        // Only proceed if actually moving to a different node
        if (oldAnchorNodeId === targetNode.dataset.id) {
            return; // Already on target node
        }
        
        // Store the previous anchor for potential reversal
        taskNode.dataset.previousAnchor = oldAnchorNodeId;
        
        // Update the anchor reference
        taskNode.dataset.anchoredTo = targetNode.dataset.id;
        
        // Assign a new slot for the target node (this will exclude the current task from existing tasks)
        this.assignTaskSlot(taskNode);
        
        // Position the task in its new slot
        this.positionTaskInSlot(taskNode);
        
        // Compact slots for the old anchor node to remove gaps
        if (oldAnchorNodeId) {
            this.compactTaskSlots(oldAnchorNodeId);
        }
    }
    
    /**
     * Enhanced text extraction for nodes to handle all node types properly
     * @param {HTMLElement} node - The node element
     * @returns {string} Extracted text content
     */
    extractNodeText(node) {
        if (!node) {
            console.log('🔍 extractNodeText: node is null/undefined');
            return '';
        }
        
        console.log(`🔍 extractNodeText: Processing node ID=${node.dataset.id}, Type=${node.dataset.type}`);
        console.log(`🔍 extractNodeText: Node className="${node.className}"`);
        
        // Standardized text extraction - treat all node types uniformly
        const textElement = node.querySelector('.node-text');
        console.log(`🔍 extractNodeText: .node-text element found: ${!!textElement}`);
        
        if (textElement) {
            console.log(`🔍 extractNodeText: .node-text textContent: "${textElement.textContent}"`);
            console.log(`🔍 extractNodeText: .node-text trimmed: "${textElement.textContent?.trim()}"`);
        }
        
        if (textElement && textElement.textContent && textElement.textContent.trim()) {
            // Primary method: extract from .node-text element
            const extractedText = textElement.textContent.trim();
            console.log(`✅ extractNodeText: Successfully extracted: "${extractedText}"`);
            return extractedText;
        } else {
            // Uniform fallback for all node types when .node-text is missing or empty
            const nodeType = node.dataset.type || 'Node';
            const nodeId = node.dataset.id || '';
            const fallbackText = `${nodeType.charAt(0).toUpperCase() + nodeType.slice(1)} ${nodeId}`;
            
            console.warn(`⚠️ extractNodeText: Node ${node.dataset.id} (${node.dataset.type}) missing or empty .node-text element, using fallback: "${fallbackText}"`);
            return fallbackText;
        }
    }

    saveWorkflow() {
        console.log(`\n🚀 SAVE WORKFLOW STARTED`);
        console.log(`📊 SAVE: this.nodes has ${this.nodes.length} elements:`, this.nodes.map(n => ({ id: n.dataset.id, type: n.dataset.type })));
        console.log(`📊 SAVE: this.taskNodes has ${this.taskNodes.length} elements:`, this.taskNodes.map(n => ({ id: n.dataset.id, type: n.dataset.type })));
        
        // Show what's actually in the DOM
        const allDOMNodes = Array.from(document.querySelectorAll('.node:not(.task-banner), .task-banner'));
        console.log(`🌐 SAVE: Found ${allDOMNodes.length} total nodes in DOM:`);
        allDOMNodes.forEach((node, index) => {
            const textElement = node.querySelector('.node-text');
            const currentText = textElement ? textElement.textContent : 'NO .node-text';
            console.log(`  DOM Node ${index + 1}: ID=${node.dataset.id}, Type=${node.dataset.type}, Text="${currentText}"`);
        });
        
        // Ensure we capture ALL nodes, even if there are tracking issues
        // Find all DOM nodes and cross-reference with tracked nodes
        const trackedNodeIds = new Set([
            ...this.nodes.map(n => n.dataset.id),
            ...this.taskNodes.map(n => n.dataset.id)
        ]);
        
        console.log(`🔗 SAVE: Tracked node IDs:`, Array.from(trackedNodeIds));
        
        // Add any untracked nodes to the appropriate array
        let untrackedCount = 0;
        allDOMNodes.forEach(node => {
            if (!trackedNodeIds.has(node.dataset.id)) {
                console.warn(`❗ SAVE: Found untracked node during save: ID=${node.dataset.id}, Type=${node.dataset.type}`);
                if (node.dataset.type === 'task') {
                    this.taskNodes.push(node);
                } else {
                    this.nodes.push(node);
                }
                untrackedCount++;
            }
        });
        
        if (untrackedCount > 0) {
            console.log(`🔧 SAVE: Fixed tracking for ${untrackedCount} nodes during save`);
        }
        
        console.log(`\n📝 SAVE: Starting node processing...`)
        
        const workflow = {
            version: "1.1",
            timestamp: new Date().toISOString(),
            nodeCounter: this.nodeCounter,
            nodes: [...new Set([...this.nodes, ...this.taskNodes])].map((node, index) => {
                console.log(`\n📝 SAVE: Processing node ${index + 1}/${[...new Set([...this.nodes, ...this.taskNodes])].length}`);
                console.log(`📝 SAVE: Node ID=${node.dataset.id}, Type=${node.dataset.type}`);
                
                const extractedText = this.extractNodeText(node);
                console.log(`📝 SAVE: Final text for node ${node.dataset.id}: "${extractedText}"`);
                
                const nodeData = {
                    id: node.dataset.id,
                    type: node.dataset.type,
                    text: extractedText,
                    left: parseInt(node.style.left) || 0,
                    top: parseInt(node.style.top) || 0,
                    anchoredTo: node.dataset.anchoredTo || null,
                    previousAnchor: node.dataset.previousAnchor || null,
                    slot: node.dataset.slot ? parseInt(node.dataset.slot) : null,
                    tags: node.dataset.tags ? JSON.parse(node.dataset.tags) : [],
                    isTaskNode: this.taskNodes.includes(node),
                    className: node.className,
                    width: node.offsetWidth,
                    height: node.offsetHeight,
                    computedStyles: {
                        transform: window.getComputedStyle(node).transform,
                        borderRadius: window.getComputedStyle(node).borderRadius,
                        backgroundColor: window.getComputedStyle(node).backgroundColor,
                        borderColor: window.getComputedStyle(node).borderColor,
                        boxShadow: node.style.boxShadow || ''
                    }
                };
                
                // For task nodes, also save container and next-action-slot positions
                if (node.dataset.type === 'task') {
                    const taskContainer = node.closest('.task-container');
                    const nextActionSlot = this.canvas.querySelector(`.next-action-slot[data-task-id="${node.dataset.id}"]`);
                    
                    if (taskContainer) {
                        nodeData.containerPosition = {
                            left: taskContainer.offsetLeft,
                            top: taskContainer.offsetTop
                        };
                    }
                    
                    if (nextActionSlot) {
                        nodeData.nextActionSlotPosition = {
                            left: nextActionSlot.offsetLeft,
                            top: nextActionSlot.offsetTop
                        };
                    }
                }
                
                return nodeData;
            }),
            flowlines: this.getAllFlowlines().map(flowline => ({
                sourceId: flowline.source.dataset.id,
                targetId: flowline.target.dataset.id,
                type: flowline.type || 'straight'
            })),
            settings: {
                flowlineType: this.flowlineTypeDropdown.value
            },
            // Structured sections for easier access and analysis
            structured: {
                tasks: this.taskNodes.map(node => ({
                    id: node.dataset.id,
                    text: this.extractNodeText(node),
                    tags: node.dataset.tags ? JSON.parse(node.dataset.tags) : [],
                    position: {
                        left: parseInt(node.style.left) || 0,
                        top: parseInt(node.style.top) || 0
                    },
                    anchoredTo: node.dataset.anchoredTo || null,
                    slot: node.dataset.slot ? parseInt(node.dataset.slot) : null,
                    containerPosition: (() => {
                        const taskContainer = node.closest('.task-container');
                        return taskContainer ? {
                            left: taskContainer.offsetLeft,
                            top: taskContainer.offsetTop
                        } : null;
                    })(),
                    nextActionSlotPosition: (() => {
                        const nextActionSlot = this.canvas.querySelector(`.next-action-slot[data-task-id="${node.dataset.id}"]`);
                        return nextActionSlot ? {
                            left: nextActionSlot.offsetLeft,
                            top: nextActionSlot.offsetTop
                        } : null;
                    })()
                })),
                tags: (() => {
                    const allTags = [];
                    this.taskNodes.forEach(node => {
                        const tags = node.dataset.tags ? JSON.parse(node.dataset.tags) : [];
                        if (tags.length > 0) {
                            allTags.push({
                                taskId: node.dataset.id,
                                taskText: this.extractNodeText(node),
                                taskType: node.dataset.type,
                                tags: tags,
                                tagCount: tags.length
                            });
                        }
                    });
                    return allTags;
                })(),
                regularNodes: this.nodes.filter(node => node.dataset.type !== 'task').map(node => ({
                    id: node.dataset.id,
                    type: node.dataset.type,
                    text: this.extractNodeText(node),
                    position: {
                        left: parseInt(node.style.left) || 0,
                        top: parseInt(node.style.top) || 0
                    }
                })),
                summary: {
                    totalNodes: this.nodes.length,
                    taskCount: this.taskNodes.length,
                    regularNodeCount: this.nodes.length - this.taskNodes.length,
                    flowlineCount: this.getAllFlowlines().length,
                    totalTagCount: this.taskNodes.reduce((count, node) => {
                        const tags = node.dataset.tags ? JSON.parse(node.dataset.tags) : [];
                        console.log(`Debug: Task ${node.dataset.id} has ${tags.length} tags:`, tags);
                        return count + tags.length;
                    }, 0)
                }
            }
        };
        
        const dataStr = JSON.stringify(workflow, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `workflow-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        
        // Provide detailed save information
        const summary = workflow.structured.summary;
        
        console.log(`\n🎉 SAVE COMPLETED - Workflow saved successfully (v1.1 format)`);
        console.log(`📈 SAVE SUMMARY: ${summary.totalNodes} nodes, ${summary.taskCount} tasks, ${summary.totalTagCount} tags, ${summary.flowlineCount} flowlines`);
        
        // Show final text values that were saved
        console.log(`\n📋 FINAL SAVED NODE TEXTS:`);
        workflow.nodes.forEach((nodeData, index) => {
            console.log(`  Node ${index + 1}: ID=${nodeData.id}, Type=${nodeData.type}, Text="${nodeData.text}"`);
        });
        
        console.log(`\n🔚 SAVE WORKFLOW ENDED`);
        
        // Provide user feedback
        setTimeout(() => {
            alert(`Workflow saved successfully!\n${summary.totalNodes} nodes, ${summary.taskCount} tasks, ${summary.totalTagCount} tags, ${summary.flowlineCount} flowlines`);
        }, 100);
    }
    
    loadWorkflow(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const workflow = JSON.parse(e.target.result);
                
                // Check if this is a supported workflow format
                if (!workflow.version) {
                    throw new Error('Missing workflow version');
                }
                
                if (workflow.version === '2.0') {
                    throw new Error('Version 2.0 workflows require the new module system (not yet loaded)');
                }
                
                if (workflow.version !== '1.1') {
                    throw new Error(`Unsupported workflow version: ${workflow.version}`);
                }
                
                this.clearWorkflow();
                this.deserializeWorkflow(workflow);
                
                // Provide detailed loading information
                const nodeCount = workflow.nodes ? workflow.nodes.length : 0;
                const taskCount = workflow.structured ? workflow.structured.summary.taskCount : 
                    (workflow.nodes ? workflow.nodes.filter(n => n.type === 'task').length : 0);
                const tagCount = workflow.structured ? workflow.structured.summary.totalTagCount : 
                    (workflow.nodes ? workflow.nodes.reduce((count, node) => count + (node.tags ? node.tags.length : 0), 0) : 0);
                const flowlineCount = workflow.flowlines ? workflow.flowlines.length : 0;
                
                console.log('Workflow loaded successfully (v1.1 format)');
                console.log(`Loaded: ${nodeCount} nodes, ${taskCount} tasks, ${tagCount} tags, ${flowlineCount} flowlines`);
                alert(`Workflow loaded successfully!\n${nodeCount} nodes, ${taskCount} tasks, ${tagCount} tags, ${flowlineCount} flowlines`);
            } catch (error) {
                let errorMessage = error.message || 'Invalid file format';
                alert(`Error loading workflow: ${errorMessage}`);
                console.error('Error loading workflow:', error);
            }
        };
        reader.readAsText(file);
        
        // Reset the input so the same file can be loaded again
        event.target.value = '';
    }
    
    appendWorkflow(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const workflow = JSON.parse(e.target.result);
                
                // Check if this is a supported workflow format
                if (!workflow.version) {
                    throw new Error('Missing workflow version');
                }
                
                if (workflow.version === '2.0') {
                    throw new Error('Version 2.0 workflows require the new module system (not yet loaded)');
                }
                
                if (workflow.version !== '1.1') {
                    throw new Error(`Unsupported workflow version: ${workflow.version}`);
                }
                
                // Store current state for merge validation planning
                const currentNodeCount = this.nodes.length;
                const currentTaskCount = this.taskNodes.length;
                
                // Do NOT call clearWorkflow() - this is the key difference from loadWorkflow
                this.appendDeserializeWorkflow(workflow);
                
                // Provide detailed loading information
                const appendedNodeCount = workflow.nodes ? workflow.nodes.length : 0;
                const appendedTaskCount = workflow.structured ? workflow.structured.summary.taskCount : 
                    (workflow.nodes ? workflow.nodes.filter(n => n.type === 'task').length : 0);
                const appendedTagCount = workflow.structured ? workflow.structured.summary.totalTagCount : 
                    (workflow.nodes ? workflow.nodes.reduce((count, node) => count + (node.tags ? node.tags.length : 0), 0) : 0);
                const appendedFlowlineCount = workflow.flowlines ? workflow.flowlines.length : 0;
                
                console.log('Workflow appended successfully (v1.1 format)');
                console.log(`Appended: ${appendedNodeCount} nodes, ${appendedTaskCount} tasks, ${appendedTagCount} tags, ${appendedFlowlineCount} flowlines`);
                console.log(`Canvas now has: ${this.nodes.length} nodes, ${this.taskNodes.length} tasks total`);
                
                // Mark that this workflow now contains multiple sources (for future merge validation)
                this.hasAppendedWorkflows = true;
                
                alert(`Workflow appended successfully!\nAdded: ${appendedNodeCount} nodes, ${appendedTaskCount} tasks, ${appendedTagCount} tags, ${appendedFlowlineCount} flowlines\nCanvas total: ${this.nodes.length} nodes, ${this.taskNodes.length} tasks`);
            } catch (error) {
                let errorMessage = error.message || 'Invalid file format';
                alert(`Error appending workflow: ${errorMessage}`);
                console.error('Error appending workflow:', error);
            }
        };
        reader.readAsText(file);
        
        // Reset the input so the same file can be appended again
        event.target.value = '';
    }
    
    clearWorkflow() {
        console.log('Debug: Starting clearWorkflow...');
        console.log(`Current state - this.nodes: ${this.nodes.length} elements`, this.nodes.map(n => ({id: n.dataset.id, type: n.dataset.type})));
        console.log(`Current state - this.taskNodes: ${this.taskNodes.length} elements`, this.taskNodes.map(n => ({id: n.dataset.id, type: n.dataset.type})));
        
        // First, clear managers if they exist (this should handle regular nodes)
        if (this.nodeManager) {
            console.log('Debug: Clearing NodeManager...');
            this.nodeManager.clearAllNodes();
        }
        
        if (this.flowlineManager) {
            console.log('Debug: Clearing FlowlineManager...');
            this.flowlineManager.clearAllFlowlines();
        }
        
        // Clear task nodes manually since they might not be managed by NodeManager
        console.log('Debug: Manually clearing task nodes...');
        this.taskNodes.forEach((node, index) => {
            console.log(`Debug: Clearing task node ${index}: ${node.dataset.id}`);
            if (node.parentNode) {
                // For task nodes, remove the container instead of just the node
                if (node.dataset.type === 'task' && node.parentNode.classList.contains('task-container')) {
                    const container = node.parentNode;
                    console.log(`Debug: Removing task container for ${node.dataset.id}`);
                    if (container.parentNode) {
                        container.parentNode.removeChild(container);
                    }
                } else {
                    console.log(`Debug: Removing task node directly: ${node.dataset.id}`);
                    node.parentNode.removeChild(node);
                }
            }
        });
        
        // Brute force: Remove ALL elements from canvas that might be left over
        console.log('Debug: Performing brute force cleanup of canvas...');
        
        // Remove all task containers
        const taskContainers = this.canvas.querySelectorAll('.task-container');
        console.log(`Debug: Found ${taskContainers.length} task containers to remove`);
        taskContainers.forEach((container, index) => {
            console.log(`Debug: Removing task container ${index}`);
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
        });
        
        // Remove all next-action-slots
        const nextActionSlots = this.canvas.querySelectorAll('.next-action-slot');
        console.log(`Debug: Found ${nextActionSlots.length} next-action-slots to remove`);
        nextActionSlots.forEach((slot, index) => {
            console.log(`Debug: Removing next-action-slot ${index}`);
            if (slot.parentNode) {
                slot.parentNode.removeChild(slot);
            }
        });
        
        // Remove all regular nodes
        const regularNodes = this.canvas.querySelectorAll('.node');
        console.log(`Debug: Found ${regularNodes.length} regular nodes to remove`);
        regularNodes.forEach((node, index) => {
            console.log(`Debug: Removing regular node ${index}: ${node.dataset.id}`);
            if (node.parentNode) {
                node.parentNode.removeChild(node);
            }
        });
        
        // Remove all SVG elements
        const svgElements = this.canvas.querySelectorAll('svg');
        console.log(`Debug: Found ${svgElements.length} SVG elements to remove`);
        svgElements.forEach((svg, index) => {
            console.log(`Debug: Removing SVG element ${index}`);
            if (svg.parentNode) {
                svg.parentNode.removeChild(svg);
            }
        });
        
        // Clear our task nodes array
        this.taskNodes = [];
        this.selectedNode = null;
        this.startNode = null;
        
        // Verify canvas is empty
        const remainingElements = this.canvas.children.length;
        console.log(`Debug: Canvas cleanup complete. Remaining elements: ${remainingElements}`);
        if (remainingElements > 0) {
            console.log('Debug: Remaining elements:', Array.from(this.canvas.children).map(el => el.className));
        }
        
        console.log('Debug: clearWorkflow complete');
    }
    
    deserializeWorkflow(workflow) {
        // Restore counter
        this.nodeCounter = workflow.nodeCounter || 0;
        
        // Restore settings
        if (workflow.settings && workflow.settings.flowlineType) {
            this.flowlineTypeDropdown.value = workflow.settings.flowlineType;
        }
        
        // Create nodes first
        const nodeMap = new Map();
        workflow.nodes.forEach(nodeData => {
            console.log(`Debug: Creating node from data:`, nodeData);
            const node = this.createNodeFromData(nodeData);
            nodeMap.set(nodeData.id, node);
            
            if (nodeData.type === 'terminal' && nodeData.text === 'Start') {
                this.startNode = node;
            }
            
            if (nodeData.type === 'task') {
                console.log(`Debug: Created task node with ID ${nodeData.id}, tags:`, nodeData.tags);
                console.log(`Debug: Task node dataset.tags:`, node.dataset.tags);
            }
        });
        
        // Create flowlines after all nodes exist
        workflow.flowlines.forEach(flowlineData => {
            const sourceNode = nodeMap.get(flowlineData.sourceId);
            const targetNode = nodeMap.get(flowlineData.targetId);
            
            if (sourceNode && targetNode) {
                this.createFlowlineBetweenNodes(sourceNode, targetNode, flowlineData.type);
            }
        });
        
        // Reposition all task nodes according to their anchoring after everything is loaded
        console.log(`Debug: After loading, taskNodes array has ${this.taskNodes.length} elements:`, this.taskNodes.map(n => ({ id: n.dataset.id, type: n.dataset.type })));
        this.taskNodes.forEach(taskNode => {
            console.log(`Debug: Processing task ${taskNode.dataset.id}:`);
            console.log(`  - anchoredTo: ${taskNode.dataset.anchoredTo}`);
            console.log(`  - slot: ${taskNode.dataset.slot}`);
            
            // Always reposition task nodes relative to their anchor nodes (ignore saved positions)
            if (taskNode.dataset.anchoredTo) {
                console.log(`Debug: Repositioning task ${taskNode.dataset.id} to anchor ${taskNode.dataset.anchoredTo}`);
                this.positionTaskInSlot(taskNode);
            } else {
                console.log(`Debug: Task ${taskNode.dataset.id} has no anchor, keeping saved position`);
            }
            
            // Update tags display for loaded task nodes
            console.log(`Debug: Updating tags display for task ${taskNode.dataset.id}, tags:`, taskNode.dataset.tags);
            this.updateTaskTagsDisplay(taskNode);
        });
        
        this.updateFlowlines();
    }
    
    appendDeserializeWorkflow(workflow) {
        // Build a map of existing node IDs to detect conflicts
        const existingNodeIds = new Set();
        [...this.nodes, ...this.taskNodes].forEach(node => {
            existingNodeIds.add(node.dataset.id);
        });
        
        // Create an ID mapping for conflicts and track the highest counter
        const idMapping = new Map();
        let maxCounter = this.nodeCounter;
        
        // First pass: resolve ID conflicts and update node counter
        workflow.nodes.forEach(nodeData => {
            if (existingNodeIds.has(nodeData.id)) {
                // ID conflict - assign a new unique ID
                const newId = `node_${++maxCounter}`;
                idMapping.set(nodeData.id, newId);
                console.log(`ID conflict: mapping ${nodeData.id} -> ${newId}`);
            } else {
                // No conflict - keep original ID
                idMapping.set(nodeData.id, nodeData.id);
                existingNodeIds.add(nodeData.id);
            }
            
            // Track highest counter from the appended workflow
            if (nodeData.id.startsWith('node_')) {
                const nodeNum = parseInt(nodeData.id.split('_')[1]);
                if (!isNaN(nodeNum)) {
                    maxCounter = Math.max(maxCounter, nodeNum);
                }
            }
        });
        
        // Update node counter to avoid future conflicts
        this.nodeCounter = maxCounter;
        
        // Calculate offset to position appended nodes to the right of existing content
        const existingBounds = this.calculateCanvasBounds();
        const offsetX = existingBounds.maxX + 200; // 200px gap
        const offsetY = 0;
        
        // Create nodes with remapped IDs and offset positions
        const nodeMap = new Map();
        workflow.nodes.forEach(nodeData => {
            const remappedNodeData = {
                ...nodeData,
                id: idMapping.get(nodeData.id),
                x: (nodeData.x || 0) + offsetX,
                y: (nodeData.y || 0) + offsetY
            };
            
            console.log(`Debug: Appending node from data:`, remappedNodeData);
            const node = this.createNodeFromData(remappedNodeData);
            nodeMap.set(nodeData.id, node); // Map using original ID for flowline creation
            
            if (remappedNodeData.type === 'task') {
                console.log(`Debug: Appended task node with ID ${remappedNodeData.id}, tags:`, remappedNodeData.tags);
            }
        });
        
        // Create flowlines with remapped node IDs
        workflow.flowlines.forEach(flowlineData => {
            const sourceNode = nodeMap.get(flowlineData.sourceId);
            const targetNode = nodeMap.get(flowlineData.targetId);
            
            if (sourceNode && targetNode) {
                this.createFlowlineBetweenNodes(sourceNode, targetNode, flowlineData.type);
            }
        });
        
        // Reposition task nodes according to their anchoring
        this.taskNodes.forEach(taskNode => {
            if (taskNode.dataset.anchoredTo && nodeMap.has(taskNode.dataset.anchoredTo)) {
                console.log(`Debug: Repositioning appended task ${taskNode.dataset.id} to anchor ${taskNode.dataset.anchoredTo}`);
                this.positionTaskInSlot(taskNode);
            }
            
            // Update tags display for appended task nodes
            this.updateTaskTagsDisplay(taskNode);
        });
        
        this.updateFlowlines();
        
        console.log(`Debug: Workflow appended. ID mappings:`, Object.fromEntries(idMapping));
        console.log(`Debug: Node counter updated to: ${this.nodeCounter}`);
    }
    
    calculateCanvasBounds() {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        [...this.nodes, ...this.taskNodes].forEach(node => {
            const rect = node.getBoundingClientRect();
            const canvasRect = this.canvas.getBoundingClientRect();
            
            const nodeX = rect.left - canvasRect.left;
            const nodeY = rect.top - canvasRect.top;
            const nodeRight = nodeX + rect.width;
            const nodeBottom = nodeY + rect.height;
            
            minX = Math.min(minX, nodeX);
            minY = Math.min(minY, nodeY);
            maxX = Math.max(maxX, nodeRight);
            maxY = Math.max(maxY, nodeBottom);
        });
        
        // If no nodes exist, return default bounds
        if (minX === Infinity) {
            return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
        }
        
        return { minX, minY, maxX, maxY };
    }
    
    createNodeFromData(nodeData) {
        console.log(`Debug: createNodeFromData called for ${nodeData.type} node ${nodeData.id}`);
        
        // For regular nodes, delegate to NodeManager if available
        if (nodeData.type !== 'task' && this.nodeManager) {
            console.log(`Debug: Delegating regular node creation to NodeManager`);
            const node = this.nodeManager.createNodeFromData(nodeData);
            console.log(`Debug: NodeManager created node:`, node ? node.dataset.id : 'null');
            return node;
        }
        
        // Handle task nodes with container structure
        if (nodeData.type === 'task') {
            const taskContainer = document.createElement('div');
            taskContainer.className = 'task-container';
            taskContainer.dataset.id = nodeData.id;
            
            // Create task banner (the main task element)
            const taskBanner = document.createElement('div');
            taskBanner.className = 'task-banner';
            taskBanner.dataset.type = nodeData.type;
            taskBanner.dataset.id = nodeData.id;
            
            if (nodeData.anchoredTo) {
                taskBanner.dataset.anchoredTo = nodeData.anchoredTo;
            }
            
            // Restore previous anchor information for task nodes
            if (nodeData.previousAnchor) {
                taskBanner.dataset.previousAnchor = nodeData.previousAnchor;
            }
            
            // Restore slot information for task nodes
            if (nodeData.slot !== null && nodeData.slot !== undefined) {
                taskBanner.dataset.slot = nodeData.slot.toString();
            }
            
            // Restore tag information
            if (nodeData.tags) {
                taskBanner.dataset.tags = JSON.stringify(nodeData.tags);
            }
            
            // Create task banner content
            const nodeText = document.createElement('div');
            nodeText.className = 'node-text';
            nodeText.textContent = nodeData.text;
            taskBanner.appendChild(nodeText);
            
            // Create tags display area (separate from banner)
            const tagsArea = document.createElement('div');
            tagsArea.className = 'task-tags-area';
            
            const tagsContainer = document.createElement('div');
            tagsContainer.className = 'task-tags';
            tagsArea.appendChild(tagsContainer);
            
            // Add vertical structure: banner on top, tags area below
            taskContainer.appendChild(taskBanner);
            taskContainer.appendChild(tagsArea);
            
            // Create Next Action slot (positioned separately)
            const nextActionSlot = document.createElement('div');
            nextActionSlot.className = 'next-action-slot';
            nextActionSlot.title = 'Next Action';
            nextActionSlot.dataset.taskId = nodeData.id;
            
            // Position task container - use saved position if available, otherwise fallback
            if (nodeData.containerPosition) {
                taskContainer.style.left = nodeData.containerPosition.left + 'px';
                taskContainer.style.top = nodeData.containerPosition.top + 'px';
            } else {
                // Fallback to old position data
                taskContainer.style.left = nodeData.left + 'px';
                taskContainer.style.top = nodeData.top + 'px';
            }
            
            // Add task container to canvas
            this.canvas.appendChild(taskContainer);
            
            // Add next-action-slot to canvas (positioned separately)
            this.canvas.appendChild(nextActionSlot);
            
            // Position next-action-slot - use saved position if available, otherwise calculate
            if (nodeData.nextActionSlotPosition) {
                nextActionSlot.style.position = 'absolute';
                nextActionSlot.style.left = nodeData.nextActionSlotPosition.left + 'px';
                nextActionSlot.style.top = nodeData.nextActionSlotPosition.top + 'px';
            } else {
                // Fallback: position to the right of task container
                this.positionNextActionSlot(taskContainer, nextActionSlot);
            }
            
            // Add event listeners to the task banner
            taskBanner.addEventListener('mousedown', (e) => this.handleMouseDown(e, taskBanner));
            taskBanner.addEventListener('contextmenu', (e) => this.handleContextMenu(e, taskBanner));
            taskBanner.addEventListener('dblclick', (e) => this.handleDoubleClick(e, taskBanner));
            
            // Tag drag and drop is now handled by TagManager canvas listeners
            // Individual slot listeners removed to prevent conflicts
            
            // Add ResizeObserver to monitor task container size changes
            if (window.ResizeObserver) {
                let resizeTimeout;
                const resizeObserver = new ResizeObserver(() => {
                    // Debounce to avoid excessive repositioning
                    clearTimeout(resizeTimeout);
                    resizeTimeout = setTimeout(() => {
                        this.updateNextActionSlotPosition(taskBanner);
                        // Also reposition tasks below this one when height changes
                        this.repositionTasksAfterHeightChange(taskBanner);
                    }, 50);
                });
                resizeObserver.observe(taskContainer);
                
                // Store observer reference for cleanup
                taskContainer._resizeObserver = resizeObserver;
            }
            
            // Add to taskNodes array (this.nodes is handled by NodeManager)
            this.taskNodes.push(taskBanner);
            
            return taskBanner;
        }
        
        // Fallback for cases where NodeManager is not available
        console.warn(`Debug: NodeManager not available for node ${nodeData.id}, creating manually`);
        return null;
    }
    
    createFlowlineBetweenNodes(sourceNode, targetNode, flowlineType = 'straight') {
        console.log(`Debug: Creating flowline between ${sourceNode.dataset.id} and ${targetNode.dataset.id}`);
        
        // Delegate to FlowlineManager if available
        if (this.flowlineManager) {
            console.log(`Debug: Delegating flowline creation to FlowlineManager`);
            const flowline = this.flowlineManager.createFlowline(sourceNode, targetNode, flowlineType);
            console.log(`Debug: FlowlineManager created flowline:`, flowline ? flowline.id : 'null');
            return flowline;
        }
        
        console.warn(`Debug: FlowlineManager not available, cannot create flowline`);
        return null;
    }
    
    // Drag and Drop functionality for task tags
    handleTagDragStart(e) {
        // Delegate to tag manager
        this.tagManager.handleTagDragStart(e);
        // Sync drag state with main app
        this.draggedTag = this.tagManager.draggedTag;
        this.successfulDrop = this.tagManager.successfulDrop;
    }
    
    handleTagDragEnd(e) {
        // Delegate to tag manager
        this.tagManager.handleTagDragEnd(e);
        // Sync drag state with main app
        this.draggedTag = this.tagManager.draggedTag;
        this.successfulDrop = this.tagManager.successfulDrop;
    }
    
    // Tag drag and drop methods removed - now handled entirely by TagManager canvas listeners
    
    snapTagToSlot(tagElement, slotElement) {
        // Delegate to tag manager
        this.tagManager.snapTagToSlot(tagElement, slotElement);
    }
    
    snapTagBack() {
        // Delegate to tag manager
        this.tagManager.snapTagBack();
    }
    
    formatDateForDisplay(dateString) {
        // Delegate to tag manager
        return this.tagManager.formatDateForDisplay(dateString);
    }
    
    // Simple Tag Menu Functions
    showSimpleTagMenu(e, tagElement, tagData) {
        // Delegate to tag manager
        this.tagManager.showSimpleTagMenu(e, tagElement, tagData);
    }
    
    // Tag Context Menu Functions
    handleTagContextMenu(e, tagElement, taskNode, tagIndex) {
        // Delegate to context menu manager
        this.contextMenuManager.showTagContextMenu(tagElement, e);
    }
    
    handleTagAttributeClick(attribute, e) {
        // Delegate to context menu manager
        this.contextMenuManager.handleTagAttributeClick(attribute, e);
    }
    
    showTagAttributeOptions(attribute, e) {
        // Delegate to context menu manager
        this.contextMenuManager.showTagAttributeMenu(attribute, e);
    }
    
    showTagDatePicker(e) {
        // Delegate to context menu manager
        this.contextMenuManager.showTagDatePicker(e);
    }
    
    applyTagDate() {
        // Delegate to context menu manager
        this.contextMenuManager.applyTagDate();
    }
    
    clearTagDate() {
        // Delegate to context menu manager
        this.contextMenuManager.clearTagDate();
    }
    
    updateTagAttribute(attribute, value) {
        // Delegate to tag manager
        this.tagManager.updateTagAttribute(attribute, value);
    }
    
    deleteSelectedTag() {
        if (!this.currentTagData || !this.currentTagData.taskNode) return;
        
        const tags = this.getTaskTags(this.currentTagData.taskNode);
        const tagIndex = this.currentTagData.tagIndex;
        
        if (tagIndex >= 0 && tagIndex < tags.length) {
            tags.splice(tagIndex, 1);
            this.setTaskTags(this.currentTagData.taskNode, tags);
            
            // Refresh displays
            this.updateTaskTagsDisplay(this.currentTagData.taskNode);
            if (this.selectedTaskForTags === this.currentTagData.taskNode) {
                this.displayCurrentTags();
            }
        }
    }
    
    resetTagFromNextAction() {
        if (!this.selectedTagForEdit || !this.currentTagData) return;
        
        const tagElement = this.selectedTagForEdit;
        const taskNode = this.currentTagData.taskNode;
        
        // Find the task container (parent of the banner)
        const taskContainer = taskNode.parentNode;
        if (!taskContainer) {
            console.error('Could not find task container');
            return;
        }
        
        // Find the task's tags container
        const tagsContainer = taskContainer.querySelector('.task-tags');
        if (!tagsContainer) {
            console.error('Could not find task tags container');
            return;
        }
        
        // Remove the tag from its current parent (next-action-slot or canvas)
        tagElement.remove();
        
        // Reset tag styling to normal
        tagElement.style.position = '';
        tagElement.style.left = '';
        tagElement.style.top = '';
        tagElement.style.zIndex = '';
        tagElement.style.transform = '';
        tagElement.style.transition = '';
        
        // Remove next-action state and classes
        delete tagElement.dataset.isInNextAction;
        delete tagElement.dataset.originalParent;
        tagElement.classList.remove('in-next-action', 'tag-animating-to-slot', 'tag-in-slot');
        
        // Add the tag back to the task's tags container
        tagsContainer.appendChild(tagElement);
        
        console.log('Tag reset from next-action state and returned to task');
        
        // Reposition tasks below this one since height may have changed
        this.repositionTasksAfterHeightChange(taskNode);
    }
    
    hideTagContextMenus() {
        // Delegate to context menu manager
        this.contextMenuManager.hideTagContextMenus();
    }
    
    // ==================== EISENHOWER MATRIX METHODS EXTRACTED ====================
    // Phase 7: Eisenhower Matrix functionality has been extracted to:
    // - features/eisenhower-matrix/matrix-controller.js (main logic)
    // - features/eisenhower-matrix/matrix-animations.js (D3 animations)
    // All original matrix methods now delegate to these modules via the delegation methods above.
    // ==================== END EXTRACTED SECTION ====================
    
    calculateTaskSlotPosition(taskNode) {
        // Delegate to GeometryUtils with interface preservation
        const anchorId = taskNode.dataset.anchoredTo;
        const slotIndex = parseInt(taskNode.dataset.slot) || 0;
        
        // Find anchor node
        const anchorNode = this.nodes.find(node => node.dataset.id === anchorId);
        if (!anchorNode) {
            return { x: 100, y: 100 }; // Default position
        }
        
        // Use GeometryUtils for calculation with config service
        return GeometryUtils.calculateTaskSlotPosition(
            anchorNode, 
            this.canvas, 
            slotIndex, 
            this.configService.getUIConfig()
        );
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.processFlowDesigner = new ProcessFlowDesigner();
    
    // Make opportunity controller globally accessible for card actions
    window.opportunityController = window.processFlowDesigner.opportunityController;
});