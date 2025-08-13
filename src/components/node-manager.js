/**
 * Node Manager - Handles node creation, deletion, and manipulation
 * Manages all node types (process, decision, terminal, task)
 */
export class NodeManager {
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
        this.eventBus.on('node.create', (data) => this.createNode(data.type, data.position));
        this.eventBus.on('node.delete', (nodeId) => this.deleteNode(nodeId));
        this.eventBus.on('node.rename', (data) => this.renameNode(data.nodeId, data.newName));
        this.eventBus.on('node.move', (data) => this.moveNode(data.nodeId, data.position));
    }

    /**
     * Create a new node
     * @param {string} type - Node type (process, decision, terminal)
     * @param {Object} position - Position {x, y} (optional)
     * @returns {HTMLElement} Created node element
     */
    createNode(type, position = null) {
        // Validate input
        const validation = this.validationService.validateNodeData({ type });
        if (!validation.valid) {
            throw new Error(`Invalid node data: ${validation.errors.join(', ')}`);
        }

        const nodeCounter = this.stateManager.get('nodeCounter') + 1;
        this.stateManager.set('nodeCounter', nodeCounter);

        const node = this.domService.createElement('div', {
            className: `node ${type}`,
            dataset: {
                type: type,
                id: nodeCounter.toString()
            }
        });

        const text = this.domService.createElement('div', {
            className: 'node-text',
            textContent: this.getDefaultNodeText(type),
            parent: node
        });

        // Set position
        if (position) {
            this.domService.setPosition(node, position.x, position.y);
        } else {
            this.domService.setPosition(node, 50, 50);
        }

        // Add event listeners
        this.addNodeEventListeners(node);

        // Add to canvas and state
        const canvasManager = this.context.getComponent('canvas');
        canvasManager.addElement(node);

        const nodes = this.stateManager.get('nodes') || [];
        nodes.push(node);
        this.stateManager.set('nodes', nodes);

        // Set as start node if it's the first terminal node
        if (type === 'terminal' && !this.stateManager.get('startNode')) {
            this.stateManager.set('startNode', node);
            text.textContent = 'Start';
        }

        this.eventBus.emit('node.created', { node, type, nodeId: nodeCounter.toString() });
        return node;
    }

    /**
     * Delete a node
     * @param {string} nodeId - Node ID to delete
     */
    deleteNode(nodeId) {
        const nodes = this.stateManager.get('nodes') || [];
        const nodeIndex = nodes.findIndex(node => node.dataset.id === nodeId);
        
        if (nodeIndex === -1) {
            console.warn(`Node with ID ${nodeId} not found`);
            return;
        }

        const node = nodes[nodeIndex];
        
        // Check if it's the start node
        const startNode = this.stateManager.get('startNode');
        if (startNode === node) {
            console.warn('Cannot delete the start node');
            return;
        }

        // Remove from DOM
        const canvasManager = this.context.getComponent('canvas');
        canvasManager.removeElement(node);

        // Remove from state
        nodes.splice(nodeIndex, 1);
        this.stateManager.set('nodes', nodes);

        // Clean up event listeners
        this.domService.removeAllEventListeners(node);

        this.eventBus.emit('node.deleted', { nodeId, node });
    }

    /**
     * Rename a node
     * @param {string} nodeId - Node ID
     * @param {string} newName - New node name
     */
    renameNode(nodeId, newName) {
        const validation = this.validationService.validate('nodeName', newName);
        if (!validation.valid) {
            throw new Error(validation.message);
        }

        const node = this.findNodeById(nodeId);
        if (!node) {
            throw new Error(`Node with ID ${nodeId} not found`);
        }

        const textElement = node.querySelector('.node-text');
        if (textElement) {
            textElement.textContent = newName;
            this.eventBus.emit('node.renamed', { nodeId, newName, node });
        }
    }

    /**
     * Move a node to new position
     * @param {string} nodeId - Node ID
     * @param {Object} position - New position {x, y}
     */
    moveNode(nodeId, position) {
        const validation = this.validationService.validate('coordinates', position);
        if (!validation.valid) {
            throw new Error(validation.message);
        }

        const node = this.findNodeById(nodeId);
        if (!node) {
            throw new Error(`Node with ID ${nodeId} not found`);
        }

        this.domService.setPosition(node, position.x, position.y);
        this.eventBus.emit('node.moved', { nodeId, position, node });
    }

    /**
     * Handle node mouse down for dragging
     * @param {MouseEvent} e - Mouse event
     * @param {HTMLElement} node - Node element
     */
    handleMouseDown(e, node) {
        if (e.button !== 0) return; // Only left mouse button

        const nodeRect = node.getBoundingClientRect();
        const canvasManager = this.context.getComponent('canvas');
        const canvasRect = canvasManager.getBounds();
        const panOffset = canvasManager.getPanOffset();

        const offset = {
            x: e.clientX - nodeRect.left + panOffset.x,
            y: e.clientY - nodeRect.top + panOffset.y
        };

        this.stateManager.update({
            dragData: { isDragging: true, offset },
            selectedNode: node
        });

        node.classList.add('dragging');
        e.preventDefault();

        this.eventBus.emit('node.drag.started', { node, offset });
    }

    /**
     * Handle node dragging
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseMove(e) {
        const dragData = this.stateManager.get('dragData');
        const selectedNode = this.stateManager.get('selectedNode');

        if (!dragData.isDragging || !selectedNode) return;

        const canvasManager = this.context.getComponent('canvas');
        const canvasRect = canvasManager.getBounds();
        const panOffset = canvasManager.getPanOffset();

        const newX = e.clientX - canvasRect.left - dragData.offset.x - panOffset.x;
        const newY = e.clientY - canvasRect.top - dragData.offset.y - panOffset.y;

        this.domService.setPosition(selectedNode, newX, newY);
        this.eventBus.emit('node.dragged', { node: selectedNode, position: { x: newX, y: newY } });
    }

    /**
     * Handle mouse up to end dragging
     * @param {MouseEvent} e - Mouse event
     */
    handleMouseUp(e) {
        const dragData = this.stateManager.get('dragData');
        const selectedNode = this.stateManager.get('selectedNode');

        if (!dragData.isDragging || !selectedNode) return;

        selectedNode.classList.remove('dragging');
        
        this.stateManager.update({
            dragData: { isDragging: false, offset: { x: 0, y: 0 } }
        });

        this.eventBus.emit('node.drag.ended', { node: selectedNode });
    }

    /**
     * Handle node double click for renaming
     * @param {MouseEvent} e - Mouse event
     * @param {HTMLElement} node - Node element
     */
    handleDoubleClick(e, node) {
        e.stopPropagation();
        
        const textElement = node.querySelector('.node-text');
        if (!textElement) return;

        const currentText = textElement.textContent;
        
        const input = this.domService.createElement('input', {
            className: 'node-input',
            attributes: {
                type: 'text',
                value: currentText,
                maxlength: '30'
            }
        });

        textElement.style.display = 'none';
        node.appendChild(input);
        input.focus();
        input.select();

        const finishEditing = () => {
            const newText = this.validationService.sanitizeInput(input.value);
            if (newText && newText !== currentText) {
                try {
                    this.renameNode(node.dataset.id, newText);
                } catch (error) {
                    console.error('Error renaming node:', error);
                    textElement.textContent = currentText; // Revert on error
                }
            }
            
            node.removeChild(input);
            textElement.style.display = '';
        };

        this.domService.addEventListener(input, 'blur', finishEditing);
        this.domService.addEventListener(input, 'keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                finishEditing();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                node.removeChild(input);
                textElement.style.display = '';
            }
        });

        this.eventBus.emit('node.edit.started', { node });
    }

    /**
     * Handle context menu on node
     * @param {MouseEvent} e - Mouse event
     * @param {HTMLElement} node - Node element
     */
    handleContextMenu(e, node) {
        e.preventDefault();
        e.stopPropagation();

        this.stateManager.set('selectedNode', node);
        
        this.eventBus.emit('contextmenu.show', {
            type: 'node',
            x: e.clientX,
            y: e.clientY,
            node
        });
    }

    /**
     * Add event listeners to a node
     * @private
     */
    addNodeEventListeners(node) {
        this.domService.addEventListener(node, 'mousedown', (e) => this.handleMouseDown(e, node));
        this.domService.addEventListener(node, 'dblclick', (e) => this.handleDoubleClick(e, node));
        this.domService.addEventListener(node, 'contextmenu', (e) => this.handleContextMenu(e, node));
    }

    /**
     * Find node by ID
     * @param {string} nodeId - Node ID
     * @returns {HTMLElement|null} Node element
     */
    findNodeById(nodeId) {
        const nodes = this.stateManager.get('nodes') || [];
        return nodes.find(node => node.dataset.id === nodeId) || null;
    }

    /**
     * Get all nodes
     * @returns {HTMLElement[]} Array of node elements
     */
    getAllNodes() {
        return this.stateManager.get('nodes') || [];
    }

    /**
     * Get default text for node type
     * @private
     */
    getDefaultNodeText(type) {
        switch (type) {
            case 'process':
                return 'Process';
            case 'decision':
                return 'Decision';
            case 'terminal':
                return 'Terminal';
            default:
                return 'Node';
        }
    }

    /**
     * Create node from saved data
     * @param {Object} nodeData - Saved node data
     * @returns {HTMLElement} Created node
     */
    createNodeFromData(nodeData) {
        const node = this.domService.createElement('div', {
            className: nodeData.className || `node ${nodeData.type}`,
            dataset: {
                type: nodeData.type,
                id: nodeData.id,
                anchoredTo: nodeData.anchoredTo,
                previousAnchor: nodeData.previousAnchor,
                slot: nodeData.slot?.toString(),
                tags: JSON.stringify(nodeData.tags || [])
            }
        });

        const text = this.domService.createElement('div', {
            className: 'node-text',
            textContent: nodeData.text,
            parent: node
        });

        // Set position
        this.domService.setPosition(node, nodeData.left, nodeData.top);

        // Apply computed styles if available
        if (nodeData.computedStyles) {
            Object.entries(nodeData.computedStyles).forEach(([property, value]) => {
                if (value && value !== 'none') {
                    node.style[property] = value;
                }
            });
        }

        // Add event listeners
        this.addNodeEventListeners(node);

        // Add to state
        const nodes = this.stateManager.get('nodes') || [];
        nodes.push(node);
        this.stateManager.set('nodes', nodes);

        this.eventBus.emit('node.created.from.data', { node, nodeData });
        return node;
    }
}