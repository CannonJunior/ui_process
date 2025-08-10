class ProcessFlowDesigner {
    constructor() {
        this.nodes = [];
        this.nodeCounter = 0;
        this.flowlines = [];
        this.selectedNode = null;
        this.dragData = { isDragging: false, offset: { x: 0, y: 0 } };
        this.contextMenu = document.getElementById('contextMenu');
        this.taskContextMenu = document.getElementById('taskContextMenu');
        this.canvas = document.getElementById('canvas');
        this.nodeTypeDropdown = document.getElementById('nodeTypeDropdown');
        this.flowlineTypeDropdown = document.getElementById('flowlineTypeDropdown');
        this.flowlineCreationMode = false;
        this.sourceNodeForFlowline = null;
        this.addTaskButton = document.getElementById('addTaskButton');
        this.taskModal = document.getElementById('taskModal');
        this.taskNameInput = document.getElementById('taskNameInput');
        this.taskModalCancel = document.getElementById('taskModalCancel');
        this.taskModalCreate = document.getElementById('taskModalCreate');
        this.advanceTaskModal = document.getElementById('advanceTaskModal');
        this.advanceOptions = document.getElementById('advanceOptions');
        this.advanceModalCancel = document.getElementById('advanceModalCancel');
        this.saveWorkflowButton = document.getElementById('saveWorkflowButton');
        this.loadWorkflowButton = document.getElementById('loadWorkflowButton');
        this.loadWorkflowInput = document.getElementById('loadWorkflowInput');
        this.startNode = null;
        this.taskNodes = [];
        this.selectedTaskForAdvance = null;
        this.tagModal = document.getElementById('tagModal');
        this.currentTags = document.getElementById('currentTags');
        this.tagCategoryDropdown = document.getElementById('tagCategoryDropdown');
        this.tagOptionDropdown = document.getElementById('tagOptionDropdown');
        this.tagDateInput = document.getElementById('tagDateInput');
        this.tagModalCancel = document.getElementById('tagModalCancel');
        this.tagModalAdd = document.getElementById('tagModalAdd');
        this.tagModalSave = document.getElementById('tagModalSave');
        this.selectedTaskForTags = null;
        this.draggedTag = null;
        this.successfulDrop = false;
        
        // Tag context menu elements
        this.tagContextMenu = document.getElementById('tagContextMenu');
        this.tagAttributeMenu = document.getElementById('tagAttributeMenu');
        this.tagDatePicker = document.getElementById('tagDatePicker');
        this.selectedTagForEdit = null;
        this.currentTagData = null;
        
        this.init();
    }
    
    init() {
        this.initializeDropdowns();
        this.setupEventListeners();
        this.createSVGDefs();
        this.createDefaultStartNode();
    }
    
    initializeDropdowns() {
        // Populate node type dropdown from config
        ConfigUtils.populateDropdown(this.nodeTypeDropdown, AppConfig.nodeTypes);
        
        // Populate flowline type dropdown from config
        ConfigUtils.populateDropdown(this.flowlineTypeDropdown, AppConfig.flowlineTypes);
        
        // Populate tag category dropdown from config
        ConfigUtils.populateDropdown(this.tagCategoryDropdown, AppConfig.tagSystem.categories);
        
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
            // Only allow dropping on next-action-slots
            if (!e.target.classList.contains('next-action-slot')) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'none';
            } else {
                // Allow dropping on next-action-slots
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            }
        });
        
        this.canvas.addEventListener('drop', (e) => {
            // Prevent drops on invalid locations
            if (!e.target.classList.contains('next-action-slot')) {
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
        
        // Prevent context menu on canvas
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
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
        
        // Position node randomly on canvas
        const canvasRect = this.canvas.getBoundingClientRect();
        node.style.left = Math.random() * (canvasRect.width - 150) + 'px';
        node.style.top = Math.random() * (canvasRect.height - 150) + 100 + 'px';
        
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
            
            // Move the main node
            this.dragData.node.style.left = Math.max(0, Math.min(newX, canvasRect.width - this.dragData.node.offsetWidth)) + 'px';
            this.dragData.node.style.top = Math.max(0, Math.min(newY, canvasRect.height - this.dragData.node.offsetHeight)) + 'px';
            
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
        const taskName = this.taskNameInput.value.trim();
        if (taskName) {
            this.createTaskNode(taskName);
            this.hideTaskModal();
        }
    }
    
    createTaskNode(taskName) {
        const taskContainer = document.createElement('div');
        taskContainer.className = 'task-container';
        taskContainer.dataset.id = ++this.nodeCounter;
        
        const node = document.createElement('div');
        node.className = 'node task';
        node.dataset.type = 'task';
        node.dataset.id = this.nodeCounter;
        node.dataset.anchoredTo = this.startNode.dataset.id; // Anchor to Start node by default
        node.dataset.previousAnchor = null; // No previous node initially
        node.dataset.tags = JSON.stringify([]); // Initialize empty tags array
        
        const text = document.createElement('div');
        text.className = 'node-text';
        text.textContent = taskName;
        node.appendChild(text);
        
        // Create tags display container
        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'task-tags';
        node.appendChild(tagsContainer);
        
        // Create Next Action slot
        const nextActionSlot = document.createElement('div');
        nextActionSlot.className = 'next-action-slot';
        nextActionSlot.title = 'Next Action';
        nextActionSlot.dataset.taskId = this.nodeCounter;
        
        // Add container structure
        taskContainer.appendChild(node);
        taskContainer.appendChild(nextActionSlot);
        
        // Assign slot and position task node
        this.assignTaskSlot(node);
        this.positionTaskInSlot(node);
        
        // Add event listeners to the task node
        node.addEventListener('mousedown', (e) => this.handleMouseDown(e, node));
        node.addEventListener('contextmenu', (e) => this.handleContextMenu(e, node));
        node.addEventListener('dblclick', (e) => this.handleDoubleClick(e, node));
        
        // Add drop event listeners to the Next Action slot
        nextActionSlot.addEventListener('dragover', (e) => this.handleSlotDragOver(e));
        nextActionSlot.addEventListener('drop', (e) => this.handleSlotDrop(e));
        nextActionSlot.addEventListener('dragleave', (e) => this.handleSlotDragLeave(e));
        
        this.canvas.appendChild(taskContainer);
        this.nodes.push(node);
        this.taskNodes.push(node);
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
        const TASK_SPACING = 50;  // Spacing between tasks in slots
        
        // Find the task container (parent of the task node)
        const taskContainer = taskNode.parentNode;
        if (taskContainer && taskContainer.classList.contains('task-container')) {
            taskContainer.style.left = anchorX + 'px';
            taskContainer.style.top = (anchorY + TASK_OFFSET_Y + (slot * TASK_SPACING)) + 'px';
        } else {
            // Fallback for task nodes without container (shouldn't happen with new structure)
            taskNode.style.left = anchorX + 'px';
            taskNode.style.top = (anchorY + TASK_OFFSET_Y + (slot * TASK_SPACING)) + 'px';
        }
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
        
        // Remove from DOM - handle container structure
        if (this.selectedNode.parentNode && this.selectedNode.parentNode.classList.contains('task-container')) {
            const container = this.selectedNode.parentNode;
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
        
        // Reset dropdowns and date input
        this.tagCategoryDropdown.value = '';
        this.tagOptionDropdown.disabled = true;
        this.tagOptionDropdown.innerHTML = '<option value="">Select category first</option>';
        this.tagDateInput.value = '';
        
        this.tagModal.style.display = 'block';
    }
    
    hideTagModal() {
        this.tagModal.style.display = 'none';
        this.selectedTaskForTags = null;
    }
    
    handleTagCategoryChange(e) {
        const selectedCategory = e.target.value;
        
        if (selectedCategory) {
            // Populate options dropdown based on selected category
            const options = AppConfig.tagSystem.options[selectedCategory];
            if (options) {
                ConfigUtils.populateDropdown(this.tagOptionDropdown, options);
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
            
            const display = ConfigUtils.getTagDisplay(tag.category);
            tagElement.style.color = display.color;
            tagElement.style.backgroundColor = display.bgColor;
            
            const categoryLabel = ConfigUtils.getTagCategoryLabel(tag.category);
            const optionLabel = ConfigUtils.getTagOptionLabel(tag.category, tag.option);
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
        
        if (!category || !option) {
            alert('Please select both a tag category and option.');
            return;
        }
        
        const tags = this.getTaskTags(this.selectedTaskForTags);
        
        // Create tag object with optional date
        const tagData = { category, option };
        if (date) {
            tagData.date = date;
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
        
        // Reset form
        this.tagCategoryDropdown.value = '';
        this.tagOptionDropdown.disabled = true;
        this.tagOptionDropdown.innerHTML = '<option value="">Select category first</option>';
        this.tagDateInput.value = '';
    }
    
    removeTag(index) {
        if (!this.selectedTaskForTags) return;
        
        const tags = this.getTaskTags(this.selectedTaskForTags);
        tags.splice(index, 1);
        
        this.setTaskTags(this.selectedTaskForTags, tags);
        this.displayCurrentTags();
        this.updateTaskTagsDisplay(this.selectedTaskForTags);
    }
    
    saveTaskTags() {
        // Tags are already saved when added/removed
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
        const tagsContainer = taskNode.querySelector('.task-tags');
        if (!tagsContainer) return;
        
        const tags = this.getTaskTags(taskNode);
        tagsContainer.innerHTML = '';
        
        tags.forEach((tag, index) => {
            const tagElement = document.createElement('div');
            tagElement.className = 'tag';
            tagElement.draggable = true;
            tagElement.dataset.tagIndex = index;
            tagElement.dataset.taskId = taskNode.dataset.id;
            
            const display = ConfigUtils.getTagDisplay(tag.category);
            tagElement.style.color = display.color;
            tagElement.style.backgroundColor = display.bgColor;
            
            const categoryLabel = ConfigUtils.getTagCategoryLabel(tag.category);
            const optionLabel = ConfigUtils.getTagOptionLabel(tag.category, tag.option);
            const dateText = tag.date ? ` (${this.formatDateForDisplay(tag.date)})` : '';
            
            tagElement.textContent = `${categoryLabel}: ${optionLabel}${dateText}`;
            
            // Add drag event listeners
            tagElement.addEventListener('dragstart', (e) => this.handleTagDragStart(e));
            tagElement.addEventListener('dragend', (e) => this.handleTagDragEnd(e));
            
            // Add context menu event listener
            tagElement.addEventListener('contextmenu', (e) => this.handleTagContextMenu(e, tagElement, taskNode, index));
            
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
            version: "1.0",
            timestamp: new Date().toISOString(),
            nodeCounter: this.nodeCounter,
            nodes: this.nodes.map(node => ({
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
            })),
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
            
            const node = document.createElement('div');
            
            // Use saved className if available (preserves exact CSS classes), otherwise construct from type
            if (nodeData.className) {
                node.className = nodeData.className;
            } else {
                node.className = `node ${nodeData.type}`;
            }
            
            node.dataset.type = nodeData.type;
            node.dataset.id = nodeData.id;
            
            if (nodeData.anchoredTo) {
                node.dataset.anchoredTo = nodeData.anchoredTo;
            }
            
            // Restore previous anchor information for task nodes
            if (nodeData.previousAnchor) {
                node.dataset.previousAnchor = nodeData.previousAnchor;
            }
            
            // Restore slot information for task nodes
            if (nodeData.slot !== null && nodeData.slot !== undefined) {
                node.dataset.slot = nodeData.slot.toString();
            }
            
            // Restore tag information
            if (nodeData.tags) {
                node.dataset.tags = JSON.stringify(nodeData.tags);
            }
            
            // Create node content
            const nodeText = document.createElement('div');
            nodeText.className = 'node-text';
            nodeText.textContent = nodeData.text;
            node.appendChild(nodeText);
            
            // Create tags container for task nodes
            const tagsContainer = document.createElement('div');
            tagsContainer.className = 'task-tags';
            node.appendChild(tagsContainer);
            
            // Create Next Action slot
            const nextActionSlot = document.createElement('div');
            nextActionSlot.className = 'next-action-slot';
            nextActionSlot.title = 'Next Action';
            nextActionSlot.dataset.taskId = nodeData.id;
            
            // Add container structure
            taskContainer.appendChild(node);
            taskContainer.appendChild(nextActionSlot);
            
            // Position container
            taskContainer.style.left = nodeData.left + 'px';
            taskContainer.style.top = nodeData.top + 'px';
            
            // Add event listeners to the task node
            node.addEventListener('mousedown', (e) => this.handleMouseDown(e, node));
            node.addEventListener('contextmenu', (e) => this.handleContextMenu(e, node));
            node.addEventListener('dblclick', (e) => this.handleDoubleClick(e, node));
            
            // Add drop event listeners to the Next Action slot
            nextActionSlot.addEventListener('dragover', (e) => this.handleSlotDragOver(e));
            nextActionSlot.addEventListener('drop', (e) => this.handleSlotDrop(e));
            nextActionSlot.addEventListener('dragleave', (e) => this.handleSlotDragLeave(e));
            
            // Add to canvas and arrays
            this.canvas.appendChild(taskContainer);
            this.nodes.push(node);
            this.taskNodes.push(node);
            
            return node;
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
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        e.target.classList.add('drag-over');
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
        
        // Find the source and target task nodes
        const sourceTaskNode = this.nodes.find(node => node.dataset.id === sourceTaskId);
        const targetTaskNode = this.nodes.find(node => node.dataset.id === targetTaskId);
        
        console.log('Source node:', sourceTaskNode, 'Target node:', targetTaskNode);
        
        if (!sourceTaskNode || !targetTaskNode) {
            console.log('Could not find source or target task node');
            return;
        }
        
        // Get the tag data
        const sourceTags = this.getTaskTags(sourceTaskNode);
        const tagData = sourceTags[this.draggedTag.tagIndex];
        
        console.log('Tag data:', tagData, 'from index:', this.draggedTag.tagIndex);
        
        if (!tagData) {
            console.log('No tag data found at index');
            return;
        }
        
        // Set successful drop flag BEFORE modifying anything
        this.successfulDrop = true;
        
        // Remove tag from source task
        sourceTags.splice(this.draggedTag.tagIndex, 1);
        this.setTaskTags(sourceTaskNode, sourceTags);
        
        // Add tag to target task (check for duplicates by category)
        const targetTags = this.getTaskTags(targetTaskNode);
        const existingTagIndex = targetTags.findIndex(tag => tag.category === tagData.category);
        
        if (existingTagIndex >= 0) {
            // Update existing tag
            targetTags[existingTagIndex] = tagData;
        } else {
            // Add new tag
            targetTags.push(tagData);
        }
        
        this.setTaskTags(targetTaskNode, targetTags);
        
        // Update displays
        this.updateTaskTagsDisplay(sourceTaskNode);
        this.updateTaskTagsDisplay(targetTaskNode);
        
        console.log('Drop completed successfully');
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
    
    // Tag Context Menu Functions
    handleTagContextMenu(e, tagElement, taskNode, tagIndex) {
        e.preventDefault();
        e.stopPropagation();
        
        this.selectedTagForEdit = tagElement;
        this.currentTagData = {
            taskNode: taskNode,
            tagIndex: tagIndex,
            attribute: null
        };
        
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
    
    hideTagContextMenus() {
        this.tagContextMenu.style.display = 'none';
        this.tagAttributeMenu.style.display = 'none';
        this.tagDatePicker.style.display = 'none';
        this.selectedTagForEdit = null;
        this.currentTagData = null;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.processFlowDesigner = new ProcessFlowDesigner();
});