/**
 * Node Manager
 * Handles node creation, positioning, drag and drop, and basic interactions
 * 
 * SAFETY: Manages node lifecycle and positioning with careful state tracking
 * Risk Level: MEDIUM - Core functionality with DOM manipulation
 */

class NodeManager {
    constructor(mainApp) {
        // Reference to main application instance
        this.app = mainApp;
        
        // Get services
        this.domService = this.app.domService;
        this.configService = this.app.configService;
        
        // Node management state
        this.nodeCounter = 0;
        this.nodes = [];
        this.startNode = null;
        
        // Drag and drop state
        this.dragData = {
            isDragging: false,
            node: null,
            offset: { x: 0, y: 0 }
        };
        
        // Cache DOM elements
        this.initializeNodeElements();
        
        // Setup node-specific event listeners
        this.setupNodeEventListeners();
        
        console.log('NodeManager: Initialized');
    }
    
    /**
     * Initialize and cache node-related elements
     */
    initializeNodeElements() {
        // Get node-related elements from DOM service
        this.canvas = this.domService.getElement('canvas');
        
        // Validate critical node elements
        const requiredElements = ['canvas'];
        const missingElements = requiredElements.filter(id => !this[id]);
        
        if (missingElements.length > 0) {
            console.warn(`NodeManager: Some node elements missing: ${missingElements.join(', ')}`);
        }
    }
    
    /**
     * Setup event listeners for node functionality
     */
    setupNodeEventListeners() {
        // Node creation is now handled by Add button context menu system
        
        // Global mouse event listeners for drag and drop
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        console.log('NodeManager: Event listeners initialized');
    }
    
    // ==================== NODE CREATION METHODS ====================
    
    /**
     * Create the default start node
     */
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
        this.addNodeEventListeners(node);
        
        if (this.canvas) {
            this.canvas.appendChild(node);
        }
        this.nodes.push(node);
        this.startNode = node;
        
        // Update main app reference
        this.app.startNode = node;
        
        console.log('NodeManager: Created default start node');
        return node;
    }
    
    /**
     * Create a new node of the specified type
     * @param {string} type - Node type (process, decision, terminal, etc.)
     * @returns {HTMLElement} Created node element
     */
    createNode(type) {
        if (!type) {
            console.error('NodeManager: Node type is required');
            return null;
        }
        
        const node = document.createElement('div');
        node.className = `node ${type}`;
        node.dataset.type = type;
        node.dataset.id = ++this.nodeCounter;
        
        const text = document.createElement('div');
        text.className = 'node-text';
        text.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} ${this.nodeCounter}`;
        node.appendChild(text);
        
        // Position node randomly on canvas using GeometryUtils
        if (typeof GeometryUtils !== 'undefined' && this.canvas) {
            const position = GeometryUtils.calculateRandomPosition(this.canvas, 150, 150, 100);
            if (typeof DOMUtils !== 'undefined') {
                DOMUtils.setPosition(node, position.x, position.y);
            } else {
                // Fallback positioning
                node.style.left = `${position.x}px`;
                node.style.top = `${position.y}px`;
            }
        } else {
            // Fallback random positioning
            node.style.left = `${100 + Math.random() * 300}px`;
            node.style.top = `${100 + Math.random() * 200}px`;
        }
        
        // Add event listeners
        this.addNodeEventListeners(node);
        
        if (this.canvas) {
            this.canvas.appendChild(node);
        }
        this.nodes.push(node);
        
        // Update main app nodes array
        if (this.app.nodes) {
            this.app.nodes.push(node);
        }
        
        console.log(`NodeManager: Created ${type} node with ID ${this.nodeCounter}`);
        
        // Fire event for API persistence
        const nodeEventData = {
            nodeId: node.dataset.id,
            type: type,
            name: node.querySelector('.node-text').textContent,
            node: node
        };
        
        console.log('🔥 Dispatching node.created event:', nodeEventData);
        document.dispatchEvent(new CustomEvent('node.created', { 
            detail: nodeEventData 
        }));
        
        // FALLBACK: Direct API persistence
        console.log('🔄 FALLBACK: Attempting direct node persistence...');
        this.directPersistNode(nodeEventData);
        
        return node;
    }
    
    // Direct API persistence fallback method
    async directPersistNode(nodeData) {
        try {
            console.log('📡 DIRECT API: Making direct fetch call to persist node...');
            
            const apiData = {
                workflowId: '23854ca3-e4e4-4b7f-8b93-87f34f52411d', // Use default test workflow
                type: nodeData.type,
                text: nodeData.name,
                positionX: parseFloat(nodeData.node?.style?.left) || 50,
                positionY: parseFloat(nodeData.node?.style?.top) || 50,
                style: {},
                metadata: {
                    nodeId: nodeData.nodeId,
                    created_at: new Date().toISOString()
                }
            };
            
            console.log('📡 DIRECT API: Sending node data:', apiData);
            
            const response = await fetch('http://localhost:3001/api/v1/nodes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(apiData)
            });
            
            console.log('📡 DIRECT API: Node response status:', response.status);
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ DIRECT API: Node persisted successfully:', result);
            } else {
                const error = await response.text();
                console.error('❌ DIRECT API: Failed to persist node:', error);
            }
        } catch (error) {
            console.error('❌ DIRECT API: Error during direct node persistence:', error);
        }
    }
    
    /**
     * Create a node from serialized data (used during load operations)
     * @param {Object} nodeData - Serialized node data
     * @returns {HTMLElement} Created node element
     */
    createNodeFromData(nodeData) {
        if (!nodeData || !nodeData.type) {
            console.error('NodeManager: Invalid node data for creation');
            return null;
        }
        
        const node = document.createElement('div');
        node.className = `node ${nodeData.type}`;
        node.dataset.type = nodeData.type;
        node.dataset.id = nodeData.id;
        
        // Update counter to prevent ID conflicts
        this.nodeCounter = Math.max(this.nodeCounter, parseInt(nodeData.id));
        
        const text = document.createElement('div');
        text.className = 'node-text';
        text.textContent = nodeData.text || `${nodeData.type} ${nodeData.id}`;
        node.appendChild(text);
        
        // Set position (handle both old and new position formats)
        node.style.left = `${nodeData.left || nodeData.x || 100}px`;
        node.style.top = `${nodeData.top || nodeData.y || 100}px`;
        
        // Add event listeners
        this.addNodeEventListeners(node);
        
        if (this.canvas) {
            this.canvas.appendChild(node);
        }
        this.nodes.push(node);
        
        // Update main app nodes array
        if (this.app.nodes) {
            this.app.nodes.push(node);
        }
        
        // Set as start node if it's a terminal type and no start node exists
        if (nodeData.type === 'terminal' && !this.startNode) {
            this.startNode = node;
            this.app.startNode = node;
        }
        
        console.log(`NodeManager: Created node from data - ${nodeData.type} with ID ${nodeData.id}`);
        return node;
    }
    
    /**
     * Add standard event listeners to a node
     * @param {HTMLElement} node - Node element
     */
    addNodeEventListeners(node) {
        node.addEventListener('mousedown', (e) => this.handleMouseDown(e, node));
        node.addEventListener('contextmenu', (e) => this.handleContextMenu(e, node));
        node.addEventListener('dblclick', (e) => this.handleDoubleClick(e, node));
    }
    
    // ==================== NODE INTERACTION METHODS ====================
    
    /**
     * Handle mouse down event on nodes
     * @param {Event} e - Mouse event
     * @param {HTMLElement} node - Node element
     */
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
            
            console.log(`NodeManager: Started dragging node ${node.dataset.id}`);
        }
    }
    
    /**
     * Handle mouse move event for node dragging
     * @param {Event} e - Mouse event
     */
    handleMouseMove(e) {
        if (this.dragData.isDragging && this.dragData.node && this.canvas) {
            const canvasRect = this.canvas.getBoundingClientRect();
            const newX = e.clientX - canvasRect.left - this.dragData.offset.x;
            const newY = e.clientY - canvasRect.top - this.dragData.offset.y;
            
            // Calculate the movement delta
            const currentX = parseInt(this.dragData.node.style.left) || 0;
            const currentY = parseInt(this.dragData.node.style.top) || 0;
            const deltaX = newX - currentX;
            const deltaY = newY - currentY;
            
            // Move the main node using GeometryUtils constraint
            let constrainedPosition;
            if (typeof GeometryUtils !== 'undefined') {
                constrainedPosition = GeometryUtils.constrainToCanvas(newX, newY, this.canvas, this.dragData.node);
            } else {
                // Fallback constraint
                constrainedPosition = { x: Math.max(0, newX), y: Math.max(0, newY) };
            }
            
            if (typeof DOMUtils !== 'undefined') {
                DOMUtils.setPosition(this.dragData.node, constrainedPosition.x, constrainedPosition.y);
            } else {
                // Fallback positioning
                this.dragData.node.style.left = `${constrainedPosition.x}px`;
                this.dragData.node.style.top = `${constrainedPosition.y}px`;
            }
            
            // Move anchored task nodes if this is not a task node itself
            if (this.dragData.node.dataset.type !== 'task') {
                this.moveAnchoredTaskNodes(this.dragData.node.dataset.id, deltaX, deltaY);
            }
            
            // Update flowlines
            this.updateFlowlines();
        }
    }
    
    /**
     * Handle mouse up event to end node dragging
     * @param {Event} e - Mouse event
     */
    handleMouseUp(e) {
        if (this.dragData.isDragging) {
            this.dragData.node.classList.remove('dragging');
            console.log(`NodeManager: Stopped dragging node ${this.dragData.node.dataset.id}`);
            
            this.dragData.isDragging = false;
            this.dragData.node = null;
        }
    }
    
    /**
     * Handle context menu event on nodes
     * @param {Event} e - Context menu event
     * @param {HTMLElement} node - Node element
     */
    handleContextMenu(e, node) {
        // Delegate to context menu manager if available
        if (this.app.contextMenuManager && typeof this.app.contextMenuManager.handleContextMenu === 'function') {
            this.app.contextMenuManager.handleContextMenu(e, node);
        } else {
            // Fallback: prevent default context menu
            e.preventDefault();
            console.log('NodeManager: Context menu triggered for node', node.dataset.id);
        }
    }
    
    /**
     * Handle double click event on nodes
     * @param {HTMLElement} node - Node element
     * @param {Event} e - Double click event
     */
    handleDoubleClick(e, node) {
        console.log(`NodeManager: Double click on node ${node.dataset.id}`);
        console.log(`NodeManager: flowlineCreationMode = ${this.app.flowlineCreationMode}`);
        console.log(`NodeManager: sourceNodeForFlowline = ${this.app.sourceNodeForFlowline ? this.app.sourceNodeForFlowline.dataset.id : 'null'}`);
        
        // Check if we're in flowline creation mode
        if (this.app.flowlineCreationMode && this.app.sourceNodeForFlowline && node !== this.app.sourceNodeForFlowline) {
            console.log(`NodeManager: Creating flowline from ${this.app.sourceNodeForFlowline.dataset.id} to ${node.dataset.id}`);
            this.createFlowline(this.app.sourceNodeForFlowline, node);
            this.exitFlowlineCreationMode();
        } else {
            console.log(`NodeManager: Double clicked node ${node.dataset.id} - not in flowline creation mode or no source node`);
        }
    }
    
    // ==================== NODE POSITIONING AND MOVEMENT ====================
    
    /**
     * Move anchored task nodes when their anchor node moves
     * @param {string} anchorNodeId - ID of the anchor node that moved
     * @param {number} deltaX - X movement delta
     * @param {number} deltaY - Y movement delta
     */
    moveAnchoredTaskNodes(anchorNodeId, deltaX, deltaY) {
        // Delegate to main app if method exists
        if (typeof this.app.moveAnchoredTaskNodes === 'function') {
            this.app.moveAnchoredTaskNodes(anchorNodeId, deltaX, deltaY);
        } else {
            // Fallback implementation
            const taskNodes = this.app.taskNodes || [];
            taskNodes.forEach(taskNode => {
                if (taskNode.dataset.anchoredTo === anchorNodeId) {
                    const currentX = parseInt(taskNode.style.left) || 0;
                    const currentY = parseInt(taskNode.style.top) || 0;
                    taskNode.style.left = `${currentX + deltaX}px`;
                    taskNode.style.top = `${currentY + deltaY}px`;
                }
            });
        }
    }
    
    /**
     * Update flowlines after node movement
     */
    updateFlowlines() {
        // Delegate to main app if method exists
        if (typeof this.app.updateFlowlines === 'function') {
            this.app.updateFlowlines();
        }
    }
    
    /**
     * Create flowline between nodes
     * @param {HTMLElement} sourceNode - Source node
     * @param {HTMLElement} targetNode - Target node
     */
    createFlowline(sourceNode, targetNode) {
        // Delegate to main app if method exists
        if (typeof this.app.createFlowline === 'function') {
            this.app.createFlowline(sourceNode, targetNode);
        }
    }
    
    /**
     * Exit flowline creation mode
     */
    exitFlowlineCreationMode() {
        // Delegate to main app if method exists
        if (typeof this.app.exitFlowlineCreationMode === 'function') {
            this.app.exitFlowlineCreationMode();
        }
    }
    
    // ==================== NODE MANAGEMENT UTILITY METHODS ====================
    
    /**
     * Get all nodes
     * @returns {Array} Array of node elements
     */
    getAllNodes() {
        return [...this.nodes];
    }
    
    /**
     * Get node by ID
     * @param {string} id - Node ID
     * @returns {HTMLElement|null} Node element or null if not found
     */
    getNodeById(id) {
        return this.nodes.find(node => node.dataset.id === id) || null;
    }
    
    /**
     * Get nodes by type
     * @param {string} type - Node type
     * @returns {Array} Array of nodes of the specified type
     */
    getNodesByType(type) {
        return this.nodes.filter(node => node.dataset.type === type);
    }
    
    /**
     * Remove a node from the manager
     * @param {HTMLElement|string} nodeOrId - Node element or node ID
     * @returns {boolean} True if node was removed, false otherwise
     */
    removeNode(nodeOrId) {
        let node;
        if (typeof nodeOrId === 'string') {
            node = this.getNodeById(nodeOrId);
        } else {
            node = nodeOrId;
        }
        
        if (!node) {
            console.warn('NodeManager: Node not found for removal');
            return false;
        }
        
        // Remove from DOM
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
        
        // Remove from nodes array
        const index = this.nodes.indexOf(node);
        if (index > -1) {
            this.nodes.splice(index, 1);
        }
        
        // Remove from main app nodes array
        if (this.app.nodes) {
            const appIndex = this.app.nodes.indexOf(node);
            if (appIndex > -1) {
                this.app.nodes.splice(appIndex, 1);
            }
        }
        
        // Clear start node reference if this was the start node
        if (this.startNode === node) {
            this.startNode = null;
            this.app.startNode = null;
        }
        
        console.log(`NodeManager: Removed node ${node.dataset.id}`);
        return true;
    }
    
    /**
     * Clear all nodes
     */
    clearAllNodes() {
        // Remove all nodes from DOM
        this.nodes.forEach(node => {
            if (node.parentNode) {
                node.parentNode.removeChild(node);
            }
        });
        
        // Clear arrays
        this.nodes = [];
        // Note: app.nodes is a getter-only property, no need to clear it
        
        // Clear references
        this.startNode = null;
        this.app.startNode = null;
        this.nodeCounter = 0;
        
        console.log('NodeManager: Cleared all nodes');
    }
    
    /**
     * Get current node counter value
     * @returns {number} Current node counter
     */
    getNodeCounter() {
        return this.nodeCounter;
    }
    
    /**
     * Set node counter value (used during load operations)
     * @param {number} value - New counter value
     */
    setNodeCounter(value) {
        this.nodeCounter = Math.max(0, parseInt(value) || 0);
    }
    
    /**
     * Get drag state information
     * @returns {Object} Drag state information
     */
    getDragState() {
        return {
            isDragging: this.dragData.isDragging,
            nodeId: this.dragData.node ? this.dragData.node.dataset.id : null,
            offset: { ...this.dragData.offset }
        };
    }
    
    /**
     * Get node manager state information for debugging
     * @returns {Object} Node manager state information
     */
    getNodeManagerState() {
        return {
            nodeCount: this.nodes.length,
            nodeCounter: this.nodeCounter,
            startNodeId: this.startNode ? this.startNode.dataset.id : null,
            isDragging: this.dragData.isDragging,
            draggedNodeId: this.dragData.node ? this.dragData.node.dataset.id : null,
            elementsLoaded: {
                canvas: !!this.canvas
            }
        };
    }
    
    /**
     * Validate node manager elements
     * @returns {Object} Validation result
     */
    validateNodeElements() {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };
        
        // Check critical elements
        const criticalElements = ['canvas'];
        criticalElements.forEach(elementName => {
            if (!this[elementName]) {
                result.isValid = false;
                result.errors.push(`Missing critical element: ${elementName}`);
            }
        });
        
        // Check optional elements - none currently required
        const optionalElements = [];
        optionalElements.forEach(elementName => {
            if (!this[elementName]) {
                result.warnings.push(`Missing optional element: ${elementName}`);
            }
        });
        
        return result;
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NodeManager;
}

// Make available globally for direct use
if (typeof window !== 'undefined') {
    window.NodeManager = NodeManager;
}