class ProcessFlowDesigner {
    constructor() {
        // Initialize application state
        this.nodes = [];
        this.nodeCounter = 0;
        this.flowlines = [];
        this.selectedNode = null;
        this.dragData = { isDragging: false, offset: { x: 0, y: 0 } };
        this.flowlineCreationMode = false;
        this.sourceNodeForFlowline = null;
        this.startNode = null;
        this.taskNodes = [];
        this.selectedTaskForAdvance = null;
        this.selectedTaskForTags = null;
        this.draggedTag = null;
        this.successfulDrop = false;
        this.selectedTagForEdit = null;
        this.currentTagData = null;
        this.isMatrixMode = false;
        this.originalNodePositions = new Map(); // Store original positions for ALL nodes before matrix mode
        
        // Initialize services
        this.domService = getDOMService();
        this.configService = getConfigService();
        
        // Cache DOM element references using DOM service
        this.initializeDOMElements();
        
        this.init();
    }
    
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
        // Dropdown change event
        this.nodeTypeDropdown.addEventListener('change', (e) => {
            if (e.target.value) {
                this.createNode(e.target.value);
                e.target.value = '';
            }
        });
        
        // Canvas click to hide context menu
        this.canvas.addEventListener('click', (e) => {
            if (e.target === this.canvas) {
                this.hideContextMenu();
            }
        });
        
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
        
        // Context menu click handling
        this.contextMenu.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action && this.selectedNode) {
                this.handleContextMenuAction(action);
            }
            this.hideContextMenu();
        });
        
        // Task context menu click handling
        this.taskContextMenu.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action && this.selectedNode) {
                this.handleTaskContextMenuAction(action);
            }
            this.hideContextMenu();
        });
        
        // Global mouse events for dragging
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        // Prevent context menu on canvas, but allow on tags
        this.canvas.addEventListener('contextmenu', (e) => {
            if (!e.target.classList.contains('tag')) {
                e.preventDefault();
            }
        });
        
        // Task modal event listeners
        this.addTaskButton.addEventListener('click', () => this.showTaskModal());
        this.taskModalCancel.addEventListener('click', () => this.hideTaskModal());
        this.taskModalCreate.addEventListener('click', () => this.createTaskFromModal());
        this.taskNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.createTaskFromModal();
            }
        });
        
        // Close modal when clicking outside
        this.taskModal.addEventListener('click', (e) => {
            if (e.target === this.taskModal) {
                this.hideTaskModal();
            }
        });
        
        // Advance task modal event listeners
        this.advanceModalCancel.addEventListener('click', () => this.hideAdvanceTaskModal());
        this.advanceTaskModal.addEventListener('click', (e) => {
            if (e.target === this.advanceTaskModal) {
                this.hideAdvanceTaskModal();
            }
        });
        
        // Save/Load workflow event listeners
        this.saveWorkflowButton.addEventListener('click', () => this.saveWorkflow());
        this.loadWorkflowButton.addEventListener('click', () => this.loadWorkflowInput.click());
        this.loadWorkflowInput.addEventListener('change', (e) => this.loadWorkflow(e));
        
        // Eisenhower Matrix toggle event listener
        this.eisenhowerToggle.addEventListener('click', () => this.toggleEisenhowerMatrix());
        
        // Tag management event listeners
        this.tagModalCancel.addEventListener('click', () => this.hideTagModal());
        this.tagModalAdd.addEventListener('click', () => this.addTagToTask());
        this.tagModalSave.addEventListener('click', () => this.saveTaskTags());
        
        // Tag category dropdown change
        this.tagCategoryDropdown.addEventListener('change', (e) => this.handleTagCategoryChange(e));
        
        // Close tag modal when clicking outside
        this.tagModal.addEventListener('click', (e) => {
            if (e.target === this.tagModal) {
                this.hideTagModal();
            }
        });
        
        // Tag context menu event listeners
        this.tagContextMenu.addEventListener('click', (e) => {
            const attribute = e.target.dataset.attribute;
            const action = e.target.dataset.action;
            
            if (attribute) {
                this.handleTagAttributeClick(attribute, e);
            } else if (action === 'delete') {
                this.deleteSelectedTag();
                this.hideTagContextMenus();
            } else if (action === 'reset-next-action') {
                this.resetTagFromNextAction();
                this.hideTagContextMenus();
            }
        });
        
        // Tag attribute menu event listeners
        this.tagAttributeMenu.addEventListener('click', (e) => {
            const value = e.target.dataset.value;
            if (value && this.selectedTagForEdit && this.currentTagData) {
                this.updateTagAttribute(this.currentTagData.attribute, value);
                this.hideTagContextMenus();
            }
        });
        
        // Global click handler to close tag context menus
        document.addEventListener('click', (e) => {
            if (!this.tagContextMenu.contains(e.target) && 
                !this.tagAttributeMenu.contains(e.target) && 
                !this.tagDatePicker.contains(e.target) &&
                !e.target.classList.contains('tag')) {
                this.hideTagContextMenus();
            }
        });
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
    
    createDefaultStartNode() {
        const node = document.createElement('div');
        node.className = 'node terminal';
        node.dataset.type = 'terminal';
        node.dataset.id = ++this.nodeCounter;
        
        const text = document.createElement('div');
        text.className = 'node-text';
        text.textContent = 'Start';
        node.appendChild(text);
        
        // Position the Start node in the top-left area of the canvas
        node.style.left = '50px';
        node.style.top = '100px';
        
        // Add event listeners
        node.addEventListener('mousedown', (e) => this.handleMouseDown(e, node));
        node.addEventListener('contextmenu', (e) => this.handleContextMenu(e, node));
        node.addEventListener('dblclick', (e) => this.handleDoubleClick(e, node));
        
        this.canvas.appendChild(node);
        this.nodes.push(node);
        this.startNode = node;
    }
    
    createNode(type) {
        const node = document.createElement('div');
        node.className = `node ${type}`;
        node.dataset.type = type;
        node.dataset.id = ++this.nodeCounter;
        
        const text = document.createElement('div');
        text.className = 'node-text';
        text.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} ${this.nodeCounter}`;
        node.appendChild(text);
        
        // Position node randomly on canvas using GeometryUtils
        const position = GeometryUtils.calculateRandomPosition(this.canvas, 150, 150, 100);
        DOMUtils.setPosition(node, position.x, position.y);
        
        // Add event listeners
        node.addEventListener('mousedown', (e) => this.handleMouseDown(e, node));
        node.addEventListener('contextmenu', (e) => this.handleContextMenu(e, node));
        node.addEventListener('dblclick', (e) => this.handleDoubleClick(e, node));
        
        this.canvas.appendChild(node);
        this.nodes.push(node);
    }
    
    handleMouseDown(e, node) {
        if (e.button === 0) { // Left click
            // Prevent dragging for task nodes
            if (node.dataset.type === 'task') {
                return;
            }
            
            e.preventDefault();
            this.dragData.isDragging = true;
            this.dragData.node = node;
            
            const rect = node.getBoundingClientRect();
            this.dragData.offset.x = e.clientX - rect.left;
            this.dragData.offset.y = e.clientY - rect.top;
            
            node.classList.add('dragging');
        }
    }
    
    handleMouseMove(e) {
        if (this.dragData.isDragging && this.dragData.node) {
            const canvasRect = this.canvas.getBoundingClientRect();
            const newX = e.clientX - canvasRect.left - this.dragData.offset.x;
            const newY = e.clientY - canvasRect.top - this.dragData.offset.y;
            
            // Calculate the movement delta
            const currentX = parseInt(this.dragData.node.style.left) || 0;
            const currentY = parseInt(this.dragData.node.style.top) || 0;
            const deltaX = newX - currentX;
            const deltaY = newY - currentY;
            
            // Move the main node using GeometryUtils constraint
            const constrainedPosition = GeometryUtils.constrainToCanvas(newX, newY, this.canvas, this.dragData.node);
            DOMUtils.setPosition(this.dragData.node, constrainedPosition.x, constrainedPosition.y);
            
            // Move anchored task nodes if this is not a task node itself
            if (this.dragData.node.dataset.type !== 'task') {
                this.moveAnchoredTaskNodes(this.dragData.node.dataset.id, deltaX, deltaY);
            }
            
            this.updateFlowlines();
        }
    }
    
    handleMouseUp(e) {
        if (this.dragData.isDragging) {
            this.dragData.node.classList.remove('dragging');
            this.dragData.isDragging = false;
            this.dragData.node = null;
        }
    }
    
    handleContextMenu(e, node) {
        e.preventDefault();
        this.selectedNode = node;
        
        const canvasRect = this.canvas.getBoundingClientRect();
        const isTaskNode = node.dataset.type === 'task';
        const menu = isTaskNode ? this.taskContextMenu : this.contextMenu;
        
        // For task nodes, show/hide the reverse option based on previous anchor availability
        if (isTaskNode) {
            const reverseMenuItem = menu.querySelector('[data-action="reverse"]');
            const hasPreviousAnchor = node.dataset.previousAnchor && node.dataset.previousAnchor !== 'null';
            if (reverseMenuItem) {
                reverseMenuItem.style.display = hasPreviousAnchor ? 'block' : 'none';
            }
        }
        
        menu.style.left = (e.clientX - canvasRect.left) + 'px';
        menu.style.top = (e.clientY - canvasRect.top) + 'px';
        menu.style.display = 'block';
    }
    
    hideContextMenu() {
        this.contextMenu.style.display = 'none';
        this.taskContextMenu.style.display = 'none';
        this.hideTagContextMenus();
        this.selectedNode = null;
    }
    
    handleContextMenuAction(action) {
        switch (action) {
            case 'flowline':
                this.startFlowlineCreation();
                break;
            case 'rename':
                this.renameNode();
                break;
            case 'delete':
                this.deleteNode();
                break;
        }
    }
    
    handleTaskContextMenuAction(action) {
        switch (action) {
            case 'advance':
                this.advanceTask();
                break;
            case 'reverse':
                this.reverseTask();
                break;
            case 'tags':
                this.showTagModal();
                break;
            case 'rename':
                this.renameNode();
                break;
            case 'delete':
                this.deleteTaskNode();
                break;
        }
    }
    
    handleDoubleClick(e, node) {
        if (this.flowlineCreationMode && this.sourceNodeForFlowline && node !== this.sourceNodeForFlowline) {
            this.createFlowline(this.sourceNodeForFlowline, node);
            this.exitFlowlineCreationMode();
        }
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
        this.taskModal.style.display = 'block';
        this.taskNameInput.value = '';
        this.taskNameInput.focus();
    }
    
    hideTaskModal() {
        this.taskModal.style.display = 'none';
    }
    
    createTaskFromModal() {
        const taskNameRaw = this.taskNameInput.value;
        const validation = ValidationUtils.validateTaskName(taskNameRaw);
        
        if (validation.isValid) {
            this.createTaskNode(validation.value);
            this.hideTaskModal();
            
            // Get the newly created task node (last one in taskNodes array)
            const newTaskNode = this.taskNodes[this.taskNodes.length - 1];
            
            // Set it as selected and open tag management modal
            this.selectedNode = newTaskNode;
            this.showTagModal();
        } else {
            // Show validation error to user
            alert(validation.error);
            // Set focus back to input for correction
            this.taskNameInput.focus();
        }
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
        if (!this.selectedNode || this.selectedNode.dataset.type !== 'task') return;
        
        this.selectedTaskForTags = this.selectedNode;
        
        // Display current tags
        this.displayCurrentTags();
        
        // Reset dropdowns and input fields
        this.tagCategoryDropdown.value = '';
        this.tagOptionDropdown.disabled = true;
        this.tagOptionDropdown.innerHTML = '<option value="">Select category first</option>';
        this.tagDateInput.value = '';
        this.tagDescriptionInput.value = '';
        this.tagLinkInput.value = '';
        this.tagCompletedInput.checked = false;
        
        this.tagModal.style.display = 'block';
    }
    
    hideTagModal() {
        this.tagModal.style.display = 'none';
        this.selectedTaskForTags = null;
    }
    
    handleTagCategoryChange(e) {
        const selectedCategory = e.target.value;
        
        if (selectedCategory) {
            // Populate options dropdown based on selected category using config service
            const success = this.configService.populateDropdown(this.tagOptionDropdown, `tagSystem.options.${selectedCategory}`);
            if (success) {
                this.tagOptionDropdown.disabled = false;
            }
        } else {
            this.tagOptionDropdown.disabled = true;
            this.tagOptionDropdown.innerHTML = '<option value="">Select category first</option>';
        }
    }
    
    displayCurrentTags() {
        if (!this.selectedTaskForTags) return;
        
        const tags = this.getTaskTags(this.selectedTaskForTags);
        this.currentTags.innerHTML = '';
        
        tags.forEach((tag, index) => {
            const tagElement = document.createElement('div');
            tagElement.className = 'tag';
            
            const configService = this.configService;
            const display = configService.getTagDisplay(tag.category);
            tagElement.style.color = display.color;
            tagElement.style.backgroundColor = display.bgColor;
            
            const categoryLabel = configService.getTagCategoryLabel(tag.category);
            const optionLabel = configService.getTagOptionLabel(tag.category, tag.option);
            const dateText = tag.date ? ` (${this.formatDateForDisplay(tag.date)})` : '';
            
            tagElement.innerHTML = `
                <span>${categoryLabel}: ${optionLabel}${dateText}</span>
                <button class="tag-remove" data-index="${index}">×</button>
            `;
            
            // Add remove event listener
            tagElement.querySelector('.tag-remove').addEventListener('click', (e) => {
                this.removeTag(parseInt(e.target.dataset.index));
            });
            
            this.currentTags.appendChild(tagElement);
        });
    }
    
    addTagToTask() {
        if (!this.selectedTaskForTags) return;
        
        const category = this.tagCategoryDropdown.value;
        const option = this.tagOptionDropdown.value;
        const date = this.tagDateInput.value; // Date is optional
        const description = this.tagDescriptionInput.value.trim(); // Description is optional
        const link = this.tagLinkInput.value.trim(); // Link is optional
        const completed = this.tagCompletedInput.checked; // Completed is boolean
        
        if (!category || !option) {
            alert('Please select both a tag category and option.');
            return;
        }
        
        const tags = this.getTaskTags(this.selectedTaskForTags);
        
        // Create tag object with optional fields
        const tagData = { category, option };
        if (date) {
            tagData.date = date;
        }
        if (description) {
            tagData.description = description;
        }
        if (link) {
            tagData.link = link;
        }
        if (completed) {
            tagData.completed = completed;
        }
        
        // Check if this tag category already exists
        const existingTagIndex = tags.findIndex(tag => tag.category === category);
        
        if (existingTagIndex >= 0) {
            // Update existing tag
            tags[existingTagIndex] = tagData;
        } else {
            // Add new tag
            tags.push(tagData);
        }
        
        // Update task tags
        this.setTaskTags(this.selectedTaskForTags, tags);
        
        // Refresh display
        this.displayCurrentTags();
        this.updateTaskTagsDisplay(this.selectedTaskForTags);
        
        // Reposition tasks below this one since height may have changed
        this.repositionTasksAfterHeightChange(this.selectedTaskForTags);
        
        // Reset form
        this.tagCategoryDropdown.value = '';
        this.tagOptionDropdown.disabled = true;
        this.tagOptionDropdown.innerHTML = '<option value="">Select category first</option>';
        this.tagDateInput.value = '';
        this.tagDescriptionInput.value = '';
        this.tagLinkInput.value = '';
        this.tagCompletedInput.checked = false;
    }
    
    removeTag(index) {
        if (!this.selectedTaskForTags) return;
        
        const tags = this.getTaskTags(this.selectedTaskForTags);
        tags.splice(index, 1);
        
        this.setTaskTags(this.selectedTaskForTags, tags);
        this.displayCurrentTags();
        this.updateTaskTagsDisplay(this.selectedTaskForTags);
        
        // Reposition tasks below this one since height may have changed
        this.repositionTasksAfterHeightChange(this.selectedTaskForTags);
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
        try {
            return JSON.parse(taskNode.dataset.tags || '[]');
        } catch (e) {
            return [];
        }
    }
    
    setTaskTags(taskNode, tags) {
        taskNode.dataset.tags = JSON.stringify(tags);
    }
    
    updateTaskTagsDisplay(taskNode) {
        // Find the task container (parent of the banner)
        const taskContainer = taskNode.parentNode;
        if (!taskContainer) return;
        
        // Find the tags container within the task-tags-area
        const tagsContainer = taskContainer.querySelector('.task-tags');
        if (!tagsContainer) return;
        
        const tags = this.getTaskTags(taskNode);
        
        // Find the next-action-slot for this task
        const nextActionSlot = this.canvas.querySelector(`.next-action-slot[data-task-id="${taskNode.dataset.id}"]`);
        
        // Get existing tag elements that are in next-action state (in the slot)
        const existingTagElements = nextActionSlot ? Array.from(nextActionSlot.querySelectorAll('.tag-in-slot[data-task-id="' + taskNode.dataset.id + '"]')) : [];
        
        tagsContainer.innerHTML = '';
        
        tags.forEach((tag, index) => {
            // Check if this tag is already positioned in the next-action-slot
            const existingNextActionTag = existingTagElements.find(el => 
                parseInt(el.dataset.tagIndex) === index && el.dataset.isInNextAction === 'true'
            );
            
            if (existingNextActionTag) {
                // Update the existing next-action tag's data but don't recreate it
                existingNextActionTag.dataset.tagIndex = index;
                return; // Skip creating a new element
            }
            const tagElement = document.createElement('div');
            tagElement.className = 'tag';
            tagElement.draggable = true;
            tagElement.dataset.tagIndex = index;
            tagElement.dataset.taskId = taskNode.dataset.id;
            
            const configService = this.configService;
            const display = configService.getTagDisplay(tag.category);
            tagElement.style.color = display.color;
            tagElement.style.backgroundColor = display.bgColor;
            
            const categoryLabel = configService.getTagCategoryLabel(tag.category);
            const optionLabel = configService.getTagOptionLabel(tag.category, tag.option);
            const dateText = tag.date ? ` (${this.formatDateForDisplay(tag.date)})` : '';
            
            tagElement.textContent = `${categoryLabel}: ${optionLabel}${dateText}`;
            
            // Add drag event listeners
            tagElement.addEventListener('dragstart', (e) => this.handleTagDragStart(e));
            tagElement.addEventListener('dragend', (e) => this.handleTagDragEnd(e));
            
            // Add context menu event listener (simple - no overlap issues)
            tagElement.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Right-click detected on tag:', tagElement);
                console.log('Tag data:', tags[index]);
                this.showSimpleTagMenu(e, tagElement, tags[index]);
            });
            
            tagsContainer.appendChild(tagElement);
        });
    }
    
    showAdvanceTaskModal(outboundFlowlines) {
        this.selectedTaskForAdvance = this.selectedNode;
        this.advanceOptions.innerHTML = '';
        
        outboundFlowlines.forEach(flowline => {
            const option = document.createElement('div');
            option.className = 'advance-option';
            option.dataset.targetId = flowline.target.dataset.id;
            
            const targetNodeText = flowline.target.querySelector('.node-text').textContent;
            const targetNodeType = flowline.target.dataset.type;
            option.textContent = `${targetNodeText} (${targetNodeType})`;
            
            option.addEventListener('click', () => {
                this.moveTaskToNode(this.selectedTaskForAdvance, flowline.target);
                this.hideAdvanceTaskModal();
            });
            
            this.advanceOptions.appendChild(option);
        });
        
        this.advanceTaskModal.style.display = 'block';
    }
    
    hideAdvanceTaskModal() {
        this.advanceTaskModal.style.display = 'none';
        this.selectedTaskForAdvance = null;
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
        console.log('Drag start:', e.target);
        this.successfulDrop = false; // Reset flag for new drag operation
        
        this.draggedTag = {
            element: e.target,
            taskId: e.target.dataset.taskId,
            tagIndex: parseInt(e.target.dataset.tagIndex),
            originalParent: e.target.parentNode,
            originalPosition: Array.from(e.target.parentNode.children).indexOf(e.target)
        };
        
        console.log('Dragged tag data:', this.draggedTag);
        
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', ''); // Required for Firefox
    }
    
    handleTagDragEnd(e) {
        console.log('Drag end, successful drop:', this.successfulDrop);
        e.target.classList.remove('dragging');
        
        // If drag ended without a successful drop, snap back
        if (this.draggedTag && !this.successfulDrop) {
            console.log('Snapping tag back');
            this.snapTagBack();
        } else {
            console.log('Drop was successful, not snapping back');
        }
        
        // Clean up drag state
        this.draggedTag = null;
        // Note: Don't reset successfulDrop here, let it be handled by the next drag operation
    }
    
    handleSlotDragOver(e) {
        // Only allow dragover if it's the same task
        if (this.draggedTag && e.target.dataset.taskId === this.draggedTag.taskId) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            e.target.classList.add('drag-over');
        } else {
            e.dataTransfer.dropEffect = 'none';
        }
    }
    
    handleSlotDragLeave(e) {
        // Only remove drag-over if we're actually leaving the slot
        if (!e.currentTarget.contains(e.relatedTarget)) {
            e.target.classList.remove('drag-over');
        }
    }
    
    handleSlotDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        e.target.classList.remove('drag-over');
        
        console.log('Drop event triggered on slot:', e.target);
        
        if (!this.draggedTag) {
            console.log('No dragged tag found');
            return;
        }
        
        const targetTaskId = e.target.dataset.taskId;
        const sourceTaskId = this.draggedTag.taskId;
        
        console.log('Source task ID:', sourceTaskId, 'Target task ID:', targetTaskId);
        
        // Only allow dropping on the same task's next-action-slot
        if (sourceTaskId !== targetTaskId) {
            console.log('Cannot drop on different task');
            return;
        }
        
        // Set successful drop flag
        this.successfulDrop = true;
        
        // Animate the tag to snap to the next-action-slot location
        this.snapTagToSlot(this.draggedTag.element, e.target);
        
        console.log('Tag snapped to next-action-slot');
    }
    
    snapTagToSlot(tagElement, slotElement) {
        // Store restoration data on the tag element
        tagElement.dataset.originalParent = 'task-tags';
        
        // Get current and target positions for animation
        const tagRect = tagElement.getBoundingClientRect();
        const slotRect = slotElement.getBoundingClientRect();
        
        // Calculate animation offset
        const deltaX = slotRect.left - tagRect.left;
        const deltaY = slotRect.top - tagRect.top;
        
        console.log('Snapping tag to slot - deltaX:', deltaX, 'deltaY:', deltaY);
        
        // Add visual styling for the animation
        tagElement.classList.add('tag-animating-to-slot');
        tagElement.style.zIndex = '1000';
        
        // Animate the tag to the slot position using transform
        tagElement.style.transition = 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        tagElement.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.05)`;
        
        // After animation completes, move the tag to the slot
        setTimeout(() => {
            // Remove the tag from its current parent (task-tags container)
            tagElement.remove();
            
            // Reset animation styles
            tagElement.style.transition = '';
            tagElement.style.transform = '';
            tagElement.style.zIndex = '';
            tagElement.classList.remove('tag-animating-to-slot');
            
            // Add the tag as a child of the next-action-slot
            tagElement.classList.add('tag-in-slot');
            tagElement.dataset.isInNextAction = 'true';
            slotElement.appendChild(tagElement);
            
            // Context menu event listener is preserved when moving DOM elements
            
            // Add temporary glow effect
            tagElement.classList.add('in-next-action');
            setTimeout(() => {
                tagElement.classList.remove('in-next-action');
            }, 1500);
            
            console.log('Tag successfully snapped to next-action slot');
            
            // Reposition tasks below this one since height may have changed
            const taskBanner = this.nodes.find(node => node.dataset.id === slotElement.dataset.taskId);
            if (taskBanner) {
                setTimeout(() => {
                    this.repositionTasksAfterHeightChange(taskBanner);
                }, 50); // Small delay to allow DOM updates
            }
        }, 400);
    }
    
    snapTagBack() {
        if (!this.draggedTag) return;
        
        const tagElement = this.draggedTag.element;
        tagElement.classList.add('snap-back');
        
        // Remove the animation class after animation completes
        setTimeout(() => {
            tagElement.classList.remove('snap-back');
        }, 300);
    }
    
    formatDateForDisplay(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            // Format as MM/DD/YYYY
            return date.toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric'
            });
        } catch (e) {
            return dateString; // Return original if parsing fails
        }
    }
    
    // Simple Tag Menu Functions
    showSimpleTagMenu(e, tagElement, tagData) {
        console.log('Showing simple tag menu for:', tagData);
        
        // Hide any existing context menus
        this.hideTagContextMenus();
        this.hideContextMenu();
        
        // Create or update the simple tag menu content
        const tagMenu = document.getElementById('tagContextMenu');
        tagMenu.innerHTML = '';
        
        // Add tag information
        const categoryItem = document.createElement('div');
        categoryItem.className = 'menu-item menu-info';
        categoryItem.innerHTML = `<strong>Category:</strong> ${tagData.category || 'None'}`;
        tagMenu.appendChild(categoryItem);
        
        if (tagData.option) {
            const optionItem = document.createElement('div');
            optionItem.className = 'menu-item menu-info';
            optionItem.innerHTML = `<strong>Option:</strong> ${tagData.option}`;
            tagMenu.appendChild(optionItem);
        }
        
        if (tagData.date) {
            const dateItem = document.createElement('div');
            dateItem.className = 'menu-item menu-info';
            dateItem.innerHTML = `<strong>Date:</strong> ${tagData.date}`;
            tagMenu.appendChild(dateItem);
        }
        
        if (tagData.description) {
            const descItem = document.createElement('div');
            descItem.className = 'menu-item menu-info';
            descItem.innerHTML = `<strong>Description:</strong> ${tagData.description}`;
            tagMenu.appendChild(descItem);
        }
        
        if (tagData.link) {
            const linkItem = document.createElement('div');
            linkItem.className = 'menu-item menu-info';
            linkItem.innerHTML = `<strong>Link:</strong> <a href="${tagData.link}" target="_blank" rel="noopener">${tagData.link}</a>`;
            linkItem.style.pointerEvents = 'auto'; // Allow clicking on the link
            tagMenu.appendChild(linkItem);
        }
        
        if (tagData.completed !== undefined) {
            const completedItem = document.createElement('div');
            completedItem.className = 'menu-item menu-info';
            completedItem.innerHTML = `<strong>Status:</strong> ${tagData.completed ? '✓ Completed' : '○ Not completed'}`;
            tagMenu.appendChild(completedItem);
        }
        
        // Add separator
        const separator = document.createElement('div');
        separator.className = 'menu-separator';
        tagMenu.appendChild(separator);
        
        // Add close option
        const closeItem = document.createElement('div');
        closeItem.className = 'menu-item';
        closeItem.textContent = 'Close';
        closeItem.addEventListener('click', () => {
            this.hideTagContextMenus();
        });
        tagMenu.appendChild(closeItem);
        
        // Position and show menu
        const canvasRect = this.canvas.getBoundingClientRect();
        tagMenu.style.left = (e.clientX - canvasRect.left) + 'px';
        tagMenu.style.top = (e.clientY - canvasRect.top) + 'px';
        tagMenu.style.display = 'block';
    }
    
    // Tag Context Menu Functions
    handleTagContextMenu(e, tagElement, taskNode, tagIndex) {
        e.preventDefault();
        
        this.selectedTagForEdit = tagElement;
        this.currentTagData = {
            taskNode: taskNode,
            tagIndex: tagIndex,
            attribute: null
        };
        
        // Show/hide reset option based on whether tag is in next-action state
        const resetMenuItem = this.tagContextMenu.querySelector('[data-action="reset-next-action"]');
        if (resetMenuItem) {
            resetMenuItem.style.display = tagElement.dataset.isInNextAction === 'true' ? 'block' : 'none';
        }
        
        const canvasRect = this.canvas.getBoundingClientRect();
        this.tagContextMenu.style.left = (e.clientX - canvasRect.left) + 'px';
        this.tagContextMenu.style.top = (e.clientY - canvasRect.top) + 'px';
        this.tagContextMenu.style.display = 'block';
        
        // Hide other menus
        this.hideContextMenu();
        this.tagAttributeMenu.style.display = 'none';
        this.tagDatePicker.style.display = 'none';
    }
    
    handleTagAttributeClick(attribute, e) {
        this.currentTagData.attribute = attribute;
        
        if (attribute === 'date') {
            this.showTagDatePicker(e);
        } else {
            this.showTagAttributeOptions(attribute, e);
        }
    }
    
    showTagAttributeOptions(attribute, e) {
        const canvasRect = this.canvas.getBoundingClientRect();
        const menuRect = this.tagContextMenu.getBoundingClientRect();
        
        // Position to the right of the context menu
        this.tagAttributeMenu.style.left = (menuRect.right - canvasRect.left + 5) + 'px';
        this.tagAttributeMenu.style.top = (e.clientY - canvasRect.top) + 'px';
        
        // Populate options
        this.tagAttributeMenu.innerHTML = '';
        
        if (attribute === 'category') {
            AppConfig.tagSystem.categories.forEach(category => {
                if (category.value && !category.disabled) {
                    const option = document.createElement('div');
                    option.className = 'menu-item';
                    option.dataset.value = category.value;
                    option.textContent = category.label;
                    this.tagAttributeMenu.appendChild(option);
                }
            });
        } else if (attribute === 'option') {
            const tags = this.getTaskTags(this.currentTagData.taskNode);
            const currentTag = tags[this.currentTagData.tagIndex];
            if (currentTag && currentTag.category) {
                const options = AppConfig.tagSystem.options[currentTag.category];
                if (options) {
                    options.forEach(option => {
                        if (option.value && !option.disabled) {
                            const menuItem = document.createElement('div');
                            menuItem.className = 'menu-item';
                            menuItem.dataset.value = option.value;
                            menuItem.textContent = option.label;
                            this.tagAttributeMenu.appendChild(menuItem);
                        }
                    });
                }
            }
        }
        
        this.tagAttributeMenu.style.display = 'block';
    }
    
    showTagDatePicker(e) {
        const canvasRect = this.canvas.getBoundingClientRect();
        const menuRect = this.tagContextMenu.getBoundingClientRect();
        
        // Position to the right of the context menu
        this.tagDatePicker.style.left = (menuRect.right - canvasRect.left + 5) + 'px';
        this.tagDatePicker.style.top = (e.clientY - canvasRect.top) + 'px';
        
        // Get current date value
        const tags = this.getTaskTags(this.currentTagData.taskNode);
        const currentTag = tags[this.currentTagData.tagIndex];
        const currentDate = currentTag.date || '';
        
        // Create simple date input for now (we'll enhance with PrimeReact later)
        this.tagDatePicker.innerHTML = `
            <input type="date" id="tagDatePickerInput" value="${currentDate}" style="padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px;">
            <div style="margin-top: 5px;">
                <button onclick="window.processFlowDesigner.applyTagDate()" style="padding: 4px 8px; background: #007bff; color: white; border: none; border-radius: 3px; margin-right: 5px;">Apply</button>
                <button onclick="window.processFlowDesigner.clearTagDate()" style="padding: 4px 8px; background: #6c757d; color: white; border: none; border-radius: 3px;">Clear</button>
            </div>
        `;
        
        this.tagDatePicker.style.display = 'block';
        
        // Focus the date input
        setTimeout(() => {
            const input = document.getElementById('tagDatePickerInput');
            if (input) input.focus();
        }, 10);
    }
    
    applyTagDate() {
        const input = document.getElementById('tagDatePickerInput');
        if (input && this.currentTagData) {
            const newDate = input.value;
            this.updateTagAttribute('date', newDate);
            this.hideTagContextMenus();
        }
    }
    
    clearTagDate() {
        if (this.currentTagData) {
            this.updateTagAttribute('date', '');
            this.hideTagContextMenus();
        }
    }
    
    updateTagAttribute(attribute, value) {
        if (!this.currentTagData || !this.currentTagData.taskNode) return;
        
        const tags = this.getTaskTags(this.currentTagData.taskNode);
        const tagIndex = this.currentTagData.tagIndex;
        
        if (tagIndex >= 0 && tagIndex < tags.length) {
            const tag = tags[tagIndex];
            
            if (attribute === 'category') {
                // When changing category, reset the option to first available
                tag.category = value;
                const options = AppConfig.tagSystem.options[value];
                if (options && options.length > 0) {
                    const firstValidOption = options.find(opt => opt.value && !opt.disabled);
                    if (firstValidOption) {
                        tag.option = firstValidOption.value;
                    }
                }
            } else if (attribute === 'option') {
                tag.option = value;
            } else if (attribute === 'date') {
                if (value) {
                    tag.date = value;
                } else {
                    delete tag.date;
                }
            }
            
            // Update the tag data
            this.setTaskTags(this.currentTagData.taskNode, tags);
            
            // Refresh displays
            this.updateTaskTagsDisplay(this.currentTagData.taskNode);
            if (this.selectedTaskForTags === this.currentTagData.taskNode) {
                this.displayCurrentTags();
            }
        }
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
        this.tagContextMenu.style.display = 'none';
        this.tagAttributeMenu.style.display = 'none';
        this.tagDatePicker.style.display = 'none';
        this.selectedTagForEdit = null;
        this.currentTagData = null;
    }
    
    // Eisenhower Matrix Methods
    toggleEisenhowerMatrix() {
        this.isMatrixMode = !this.isMatrixMode;
        
        if (this.isMatrixMode) {
            this.enterMatrixMode();
        } else {
            this.exitMatrixMode();
        }
        
        // Update button text
        this.eisenhowerToggle.textContent = this.isMatrixMode ? '📊 Exit Matrix' : '📊 Matrix';
    }
    
    enterMatrixMode() {
        console.log('Entering Eisenhower Matrix mode');
        
        // Store original positions of all nodes
        this.storeOriginalNodePositions();
        
        // Show the matrix overlay
        this.eisenhowerMatrix.style.display = 'grid';
        
        // Use D3 to transition all nodes off-screen to the left
        this.transitionNodesOffScreen().then(() => {
            // After nodes are off-screen, position tasks in matrix quadrants
            this.positionTasksInMatrix();
        });
    }
    
    exitMatrixMode() {
        console.log('Exiting Eisenhower Matrix mode');
        
        // Use D3 to transition all nodes back to original positions
        this.transitionNodesToOriginalPositions().then(() => {
            // After transition completes, hide the matrix overlay
            this.eisenhowerMatrix.style.display = 'none';
        });
    }
    
    storeOriginalNodePositions() {
        this.originalNodePositions.clear();
        
        // Store positions for all regular nodes
        this.nodes.forEach(node => {
            if (node.dataset.type === 'task') {
                // For task nodes, store the task container position
                const taskContainer = node.closest('.task-container');
                if (taskContainer) {
                    this.originalNodePositions.set(node.dataset.id, {
                        element: taskContainer,
                        x: taskContainer.offsetLeft,
                        y: taskContainer.offsetTop,
                        type: 'task-container'
                    });
                }
            } else {
                // For regular nodes (process, decision, terminal)
                this.originalNodePositions.set(node.dataset.id, {
                    element: node,
                    x: node.offsetLeft,
                    y: node.offsetTop,
                    type: 'node'
                });
            }
        });
        
        // Store positions for next-action-slots
        const nextActionSlots = this.canvas.querySelectorAll('.next-action-slot');
        nextActionSlots.forEach(slot => {
            this.originalNodePositions.set(`slot-${slot.dataset.taskId}`, {
                element: slot,
                x: slot.offsetLeft,
                y: slot.offsetTop,
                type: 'next-action-slot'
            });
        });
        
        console.log('Stored original positions for', this.originalNodePositions.size, 'elements');
    }
    
    transitionNodesOffScreen() {
        return new Promise((resolve) => {
            const elementsToAnimate = Array.from(this.originalNodePositions.values());
            
            if (elementsToAnimate.length === 0) {
                resolve();
                return;
            }
            
            // Use D3 to select and animate elements
            d3.selectAll(elementsToAnimate.map(item => item.element))
                .transition()
                .duration(800)
                .ease(d3.easeCubicOut)
                .style('left', (d, i) => {
                    const item = elementsToAnimate[i];
                    // Move off-screen to the left (negative x value)
                    return `-${item.element.offsetWidth + 50}px`;
                })
                .on('end', () => {
                    resolve();
                });
        });
    }
    
    transitionNodesToOriginalPositions() {
        return new Promise((resolve) => {
            const elementsToAnimate = Array.from(this.originalNodePositions.values());
            
            if (elementsToAnimate.length === 0) {
                resolve();
                return;
            }
            
            // Use D3 to select and animate elements back to original positions
            d3.selectAll(elementsToAnimate.map(item => item.element))
                .transition()
                .duration(800)
                .ease(d3.easeCubicOut)
                .style('left', (d, i) => {
                    const item = elementsToAnimate[i];
                    return `${item.x}px`;
                })
                .style('top', (d, i) => {
                    const item = elementsToAnimate[i];
                    return `${item.y}px`;
                })
                .on('end', () => {
                    resolve();
                });
        });
    }
    
    positionTasksInMatrix() {
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
        
        this.taskNodes.forEach((taskNode, index) => {
            const taskContainer = taskNode.closest('.task-container');
            if (!taskContainer) return;
            
            // Parse task tags to determine urgency and importance
            const tags = this.getTaskTags(taskNode);
            const { isUrgent, isImportant } = this.analyzeTaskUrgencyImportance(tags);
            
            // Determine quadrant based on urgency/importance
            let quadrantNum;
            if (isImportant && !isUrgent) {
                quadrantNum = 1; // Not Urgent & Important (top-left)
            } else if (isImportant && isUrgent) {
                quadrantNum = 2; // Urgent & Important (top-right)
            } else if (!isImportant && !isUrgent) {
                quadrantNum = 3; // Not Urgent & Not Important (bottom-left)
            } else if (!isImportant && isUrgent) {
                quadrantNum = 4; // Urgent & Not Important (bottom-right)
            } else {
                // Default to quadrant 3 if no clear classification
                quadrantNum = 3;
            }
            
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
        
        // Use D3 to animate task containers into matrix positions
        if (taskContainersData.length > 0) {
            d3.selectAll(taskContainersData.map(item => item.element))
                .transition()
                .duration(1000)
                .delay((d, i) => i * 50) // Stagger animations
                .ease(d3.easeCubicOut)
                .style('left', (d, i) => `${taskContainersData[i].targetX}px`)
                .style('top', (d, i) => `${taskContainersData[i].targetY}px`);
        }
        
        // Also animate next-action-slots to positions relative to their tasks
        taskContainersData.forEach((taskData, index) => {
            const nextActionSlot = this.canvas.querySelector(`.next-action-slot[data-task-id="${taskData.taskNode.dataset.id}"]`);
            
            if (nextActionSlot) {
                // Position next-action-slot to the right of its task container
                const slotX = taskData.targetX + 130; // 130px to the right
                const slotY = taskData.targetY;
                
                d3.select(nextActionSlot)
                    .transition()
                    .duration(1000)
                    .delay(index * 50) // Stagger with tasks
                    .ease(d3.easeCubicOut)
                    .style('left', `${slotX}px`)
                    .style('top', `${slotY}px`);
            }
        });
        
        console.log('Positioned', this.taskNodes.length, 'tasks in matrix quadrants with D3 transitions');
    }
    
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
    
    positionSingleTaskInMatrix(taskNode) {
        if (!this.isMatrixMode) return;
        
        const taskContainer = taskNode.closest('.task-container');
        const nextActionSlot = this.canvas.querySelector(`.next-action-slot[data-task-id="${taskNode.dataset.id}"]`);
        
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
        let quadrantNum;
        if (isImportant && !isUrgent) {
            quadrantNum = 1; // Not Urgent & Important (top-left)
        } else if (isImportant && isUrgent) {
            quadrantNum = 2; // Urgent & Important (top-right)
        } else if (!isImportant && !isUrgent) {
            quadrantNum = 3; // Not Urgent & Not Important (bottom-left)
        } else if (!isImportant && isUrgent) {
            quadrantNum = 4; // Urgent & Not Important (bottom-right)
        } else {
            // Default to quadrant 3 if no clear classification
            quadrantNum = 3;
        }
        
        const quadrant = quadrants[quadrantNum];
        
        // Count existing tasks in this quadrant to calculate position
        let tasksInQuadrant = 0;
        this.taskNodes.forEach(existingTaskNode => {
            if (existingTaskNode === taskNode) return; // Don't count the current task
            
            const existingTags = this.getTaskTags(existingTaskNode);
            const { isUrgent: existingUrgent, isImportant: existingImportant } = this.analyzeTaskUrgencyImportance(existingTags);
            
            // Determine existing task's quadrant
            let existingQuadrant;
            if (existingImportant && !existingUrgent) {
                existingQuadrant = 1;
            } else if (existingImportant && existingUrgent) {
                existingQuadrant = 2;
            } else if (!existingImportant && !existingUrgent) {
                existingQuadrant = 3;
            } else if (!existingImportant && existingUrgent) {
                existingQuadrant = 4;
            } else {
                existingQuadrant = 3;
            }
            
            if (existingQuadrant === quadrantNum) {
                tasksInQuadrant++;
            }
        });
        
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
        
        // Use D3 to animate task container into position
        d3.select(taskContainer)
            .transition()
            .duration(1000)
            .ease(d3.easeCubicOut)
            .style('left', `${targetX}px`)
            .style('top', `${targetY}px`);
        
        // Also animate next-action-slot if it exists
        if (nextActionSlot) {
            const slotX = targetX + 130; // 130px to the right of task
            const slotY = targetY;
            
            d3.select(nextActionSlot)
                .transition()
                .duration(1000)
                .ease(d3.easeCubicOut)
                .style('left', `${slotX}px`)
                .style('top', `${slotY}px`);
        }
        
        console.log(`Positioned new task "${taskNode.querySelector('.node-text').textContent}" in quadrant ${quadrantNum} using D3 transitions`);
    }
    
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