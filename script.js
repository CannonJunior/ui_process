class ProcessFlowDesigner {
    constructor() {
        // Initialize application state - nodes now managed by NodeManager
        this.flowlines = [];
        this.selectedNode = null;
        // this.dragData now handled by NodeManager
        this.flowlineCreationMode = false;
        this.sourceNodeForFlowline = null;
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
        
        // Initialize node modules (Phase 8: Node Management System)
        this.nodeFactory = new NodeFactory(this.configService);
        this.nodeManager = new NodeManager(this);
        
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
    
    // ==================== END NODE DELEGATION ====================
    
    initializeDOMElements() {
        // Get all required DOM elements through DOM service
        const elements = this.domService.getElements([
            'contextMenu', 'taskContextMenu', 'canvas', 'nodeTypeDropdown', 'flowlineTypeDropdown',
            'addTaskButton', 'taskModal', 'taskNameInput', 'taskModalCancel', 'taskModalCreate',
            'advanceTaskModal', 'advanceOptions', 'advanceModalCancel', 'saveWorkflowButton',
            'loadWorkflowButton', 'loadWorkflowInput', 'tagModal', 'currentTags',
            'tagCategoryDropdown', 'tagOptionDropdown', 'tagDateInput', 'tagDescriptionInput',
            'tagLinkInput', 'tagCompletedInput', 'tagModalCancel', 'tagModalAdd', 'tagModalSave',
            'tagContextMenu', 'tagAttributeMenu', 'tagDatePicker', 'eisenhowerToggle', 'eisenhowerMatrix'
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
        this.configService.populateDropdown(this.nodeTypeDropdown, 'nodeTypes');
        this.configService.populateDropdown(this.flowlineTypeDropdown, 'flowlineTypes');
        this.configService.populateDropdown(this.tagCategoryDropdown, 'tagSystem.categories');
        
        // Set default flowline type
        this.flowlineTypeDropdown.value = 'straight';
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
        
        this.canvas.addEventListener('drop', (e) => {
            // Prevent drops on invalid locations
            if (!e.target.classList.contains('next-action-slot') || 
                (this.draggedTag && e.target.dataset.taskId !== this.draggedTag.taskId)) {
                e.preventDefault();
            }
        });
        
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
        
        // Eisenhower Matrix toggle event listener
        this.eisenhowerToggle.addEventListener('click', () => this.toggleEisenhowerMatrix());
        
        // Tag modal event listeners are now handled by ModalManager
        // Note: Tag category dropdown change listener is kept here as it's tag logic, not modal management
        
        // Note: Tag category dropdown change is now handled by TagManager
        
        // Tag modal click outside listener is now handled by ModalManager
        
        // Note: Tag context menu event listeners are now handled by ContextMenuManager
    }
    
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
    
    startFlowlineCreation() {
        this.sourceNodeForFlowline = this.selectedNode;
        this.flowlineCreationMode = true;
        this.canvas.style.cursor = 'crosshair';
        
        // Add visual indication that we're in flowline creation mode
        this.sourceNodeForFlowline.style.boxShadow = '0 0 15px rgba(0, 123, 255, 0.8)';
        
        // Add click handler to cancel flowline creation if clicking on canvas
        const cancelHandler = (e) => {
            if (e.target === this.canvas) {
                this.exitFlowlineCreationMode();
                this.canvas.removeEventListener('click', cancelHandler);
            }
        };
        
        this.canvas.addEventListener('click', cancelHandler);
    }
    
    exitFlowlineCreationMode() {
        this.flowlineCreationMode = false;
        this.canvas.style.cursor = 'default';
        if (this.sourceNodeForFlowline) {
            this.sourceNodeForFlowline.style.boxShadow = '';
            this.sourceNodeForFlowline = null;
        }
    }
    
    createFlowline(sourceNode, targetNode) {
        const flowlineType = this.flowlineTypeDropdown.value;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'flowline-arrow');
        path.dataset.source = sourceNode.dataset.id;
        path.dataset.target = targetNode.dataset.id;
        path.dataset.type = flowlineType;
        
        this.svg.appendChild(path);
        this.flowlines.push({
            element: path,
            source: sourceNode,
            target: targetNode,
            type: flowlineType
        });
        
        this.updateFlowlines();
    }
    
    updateFlowlines() {
        this.flowlines.forEach(flowline => {
            const sourceRect = flowline.source.getBoundingClientRect();
            const targetRect = flowline.target.getBoundingClientRect();
            const canvasRect = this.canvas.getBoundingClientRect();
            
            const sourceX = sourceRect.left + sourceRect.width / 2 - canvasRect.left;
            const sourceY = sourceRect.top + sourceRect.height / 2 - canvasRect.top;
            const targetX = targetRect.left + targetRect.width / 2 - canvasRect.left;
            const targetY = targetRect.top + targetRect.height / 2 - canvasRect.top;
            
            let pathData;
            
            if (flowline.type === 'perpendicular') {
                // Create perpendicular path with right angles
                const midX = sourceX + (targetX - sourceX) / 2;
                pathData = `M ${sourceX} ${sourceY} L ${midX} ${sourceY} L ${midX} ${targetY} L ${targetX} ${targetY}`;
            } else {
                // Create straight line
                pathData = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
            }
            
            flowline.element.setAttribute('d', pathData);
        });
    }
    
    
    renameNode() {
        const textElement = this.selectedNode.querySelector('.node-text');
        const currentText = textElement.textContent;
        
        const input = document.createElement('input');
        input.className = 'node-input';
        input.type = 'text';
        input.value = currentText;
        
        // Replace the text element with the input
        this.selectedNode.replaceChild(input, textElement);
        input.focus();
        input.select();
        
        const finishRename = () => {
            textElement.textContent = input.value || currentText;
            this.selectedNode.replaceChild(textElement, input);
            
            // Update next-action-slot position if this is a task node
            if (this.selectedNode.dataset.type === 'task') {
                // Add small delay to allow DOM to update size
                setTimeout(() => {
                    this.updateNextActionSlotPosition(this.selectedNode);
                }, 10);
            }
        };
        
        input.addEventListener('blur', finishRename);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                finishRename();
            }
        });
    }
    
    deleteNode() {
        // Remove flowlines connected to this node
        this.flowlines = this.flowlines.filter(flowline => {
            if (flowline.source === this.selectedNode || flowline.target === this.selectedNode) {
                this.svg.removeChild(flowline.element);
                return false;
            }
            return true;
        });
        
        // Remove node from nodes array
        this.nodes = this.nodes.filter(node => node !== this.selectedNode);
        
        // Remove node from DOM
        this.canvas.removeChild(this.selectedNode);
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
        
        // Add drop event listeners to the Next Action slot
        nextActionSlot.addEventListener('dragover', (e) => this.handleSlotDragOver(e));
        nextActionSlot.addEventListener('drop', (e) => this.handleSlotDrop(e));
        nextActionSlot.addEventListener('dragleave', (e) => this.handleSlotDragLeave(e));
        
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
        const anchorNode = this.nodes.find(node => node.dataset.id === anchorNodeId);
        
        if (!anchorNode) return;
        
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
        this.nodes = this.nodes.filter(node => node !== this.selectedNode);
        
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
    
    saveWorkflow() {
        const workflow = {
            version: "1.1",
            timestamp: new Date().toISOString(),
            nodeCounter: this.nodeCounter,
            nodes: this.nodes.map(node => {
                const nodeData = {
                    id: node.dataset.id,
                    type: node.dataset.type,
                    text: node.querySelector('.node-text').textContent,
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
            flowlines: this.flowlines.map(flowline => ({
                sourceId: flowline.source.dataset.id,
                targetId: flowline.target.dataset.id,
                type: flowline.type || 'straight'
            })),
            settings: {
                flowlineType: this.flowlineTypeDropdown.value
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
    }
    
    loadWorkflow(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const workflow = JSON.parse(e.target.result);
                this.clearWorkflow();
                this.deserializeWorkflow(workflow);
                console.log('Workflow loaded successfully');
            } catch (error) {
                alert('Error loading workflow: Invalid file format');
                console.error('Error loading workflow:', error);
            }
        };
        reader.readAsText(file);
        
        // Reset the input so the same file can be loaded again
        event.target.value = '';
    }
    
    clearWorkflow() {
        // Remove all nodes from DOM (handle both regular nodes and task containers)
        this.nodes.forEach(node => {
            if (node.parentNode) {
                // For task nodes, remove the container instead of just the node
                if (node.dataset.type === 'task' && node.parentNode.classList.contains('task-container')) {
                    const container = node.parentNode;
                    if (container.parentNode) {
                        container.parentNode.removeChild(container);
                    }
                } else {
                    node.parentNode.removeChild(node);
                }
            }
        });
        
        // Remove all next-action-slots (they are positioned separately from task containers)
        const nextActionSlots = this.canvas.querySelectorAll('.next-action-slot');
        nextActionSlots.forEach(slot => {
            if (slot.parentNode) {
                slot.parentNode.removeChild(slot);
            }
        });
        
        // Remove all SVG flowlines
        this.flowlines.forEach(flowline => {
            if (flowline.element && flowline.element.parentNode) {
                flowline.element.parentNode.removeChild(flowline.element);
            }
        });
        
        // Clear arrays
        this.nodes = [];
        this.flowlines = [];
        this.taskNodes = [];
        this.selectedNode = null;
        this.startNode = null;
        this.nodeCounter = 0;
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
            const node = this.createNodeFromData(nodeData);
            nodeMap.set(nodeData.id, node);
            
            if (nodeData.type === 'terminal' && nodeData.text === 'Start') {
                this.startNode = node;
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
        
        // Reposition all task nodes according to their slots after everything is loaded
        this.taskNodes.forEach(taskNode => {
            if (taskNode.dataset.slot !== undefined) {
                this.positionTaskInSlot(taskNode);
            }
            // Update tags display for loaded task nodes
            this.updateTaskTagsDisplay(taskNode);
        });
        
        this.updateFlowlines();
    }
    
    createNodeFromData(nodeData) {
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
            
            // Add drop event listeners to the Next Action slot
            nextActionSlot.addEventListener('dragover', (e) => this.handleSlotDragOver(e));
            nextActionSlot.addEventListener('drop', (e) => this.handleSlotDrop(e));
            nextActionSlot.addEventListener('dragleave', (e) => this.handleSlotDragLeave(e));
            
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
            
            // Add to arrays
            this.nodes.push(taskBanner);
            this.taskNodes.push(taskBanner);
            
            return taskBanner;
        } else {
            // Handle regular nodes (process, decision, terminal)
            const node = document.createElement('div');
            
            // Use saved className if available (preserves exact CSS classes), otherwise construct from type
            if (nodeData.className) {
                node.className = nodeData.className;
            } else {
                node.className = `node ${nodeData.type}`;
            }
            
            node.dataset.type = nodeData.type;
            node.dataset.id = nodeData.id;
            
            // Create node content
            const nodeText = document.createElement('div');
            nodeText.className = 'node-text';
            nodeText.textContent = nodeData.text;
            node.appendChild(nodeText);
            
            // Position node
            node.style.left = nodeData.left + 'px';
            node.style.top = nodeData.top + 'px';
            
            // Restore visual properties if saved
            if (nodeData.computedStyles) {
                // Restore any custom box shadow (from flowline creation mode, etc.)
                if (nodeData.computedStyles.boxShadow) {
                    node.style.boxShadow = nodeData.computedStyles.boxShadow;
                }
            }
            
            // Add event listeners
            node.addEventListener('mousedown', (e) => this.handleMouseDown(e, node));
            node.addEventListener('contextmenu', (e) => this.handleContextMenu(e, node));
            node.addEventListener('dblclick', (e) => this.handleDoubleClick(e, node));
            
            // Add to canvas and arrays
            this.canvas.appendChild(node);
            this.nodes.push(node);
            
            return node;
        }
    }
    
    createFlowlineBetweenNodes(sourceNode, targetNode, flowlineType = 'straight') {
        // Temporarily set the flowline type for this creation
        const originalType = this.flowlineTypeDropdown.value;
        this.flowlineTypeDropdown.value = flowlineType;
        
        // Use the existing createFlowline method
        this.createFlowline(sourceNode, targetNode);
        
        // Restore the original flowline type
        this.flowlineTypeDropdown.value = originalType;
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
    
    handleSlotDragOver(e) {
        // Delegate to tag manager
        this.tagManager.handleSlotDragOver(e);
    }
    
    handleSlotDragLeave(e) {
        // Delegate to tag manager
        this.tagManager.handleSlotDragLeave(e);
    }
    
    handleSlotDrop(e) {
        // Delegate to tag manager
        this.tagManager.handleSlotDrop(e);
        // Sync drag state with main app
        this.draggedTag = this.tagManager.draggedTag;
        this.successfulDrop = this.tagManager.successfulDrop;
    }
    
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
});