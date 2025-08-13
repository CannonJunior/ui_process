/**
 * Flowline Manager - Handles flowline creation, deletion, and SVG path management
 * Manages connections between nodes with different line styles
 */
export class FlowlineManager {
    constructor(context) {
        this.context = context;
        this.eventBus = context.eventBus;
        this.stateManager = context.stateManager;
        this.domService = context.getService('dom');
        
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     * @private
     */
    setupEventListeners() {
        this.eventBus.on('flowline.create', (data) => 
            this.createFlowline(data.sourceNode, data.targetNode, data.type));
        this.eventBus.on('flowline.delete', (data) => 
            this.deleteFlowline(data.sourceId, data.targetId));
        this.eventBus.on('flowline.update.all', () => this.updateAllFlowlines());
        this.eventBus.on('node.moved', () => this.updateAllFlowlines());
        this.eventBus.on('node.created', () => this.updateAllFlowlines());
        this.eventBus.on('node.deleted', () => this.updateAllFlowlines());
        this.eventBus.on('canvas.pan.updated', () => this.updateAllFlowlines());
    }

    /**
     * Start flowline creation mode
     * @param {HTMLElement} sourceNode - Source node element
     */
    startFlowlineCreation(sourceNode) {
        this.stateManager.update({
            flowlineCreationMode: true,
            sourceNodeForFlowline: sourceNode
        });

        // Add visual feedback
        sourceNode.style.boxShadow = '0 0 15px rgba(0, 123, 255, 0.8)';
        
        // Change cursor for canvas
        const canvas = this.context.getElement('canvas');
        canvas.style.cursor = 'crosshair';

        this.eventBus.emit('flowline.creation.started', { sourceNode });
    }

    /**
     * Exit flowline creation mode
     */
    exitFlowlineCreationMode() {
        const sourceNode = this.stateManager.get('sourceNodeForFlowline');
        
        this.stateManager.update({
            flowlineCreationMode: false,
            sourceNodeForFlowline: null
        });

        // Remove visual feedback
        if (sourceNode) {
            sourceNode.style.boxShadow = '';
        }

        // Reset cursor
        const canvas = this.context.getElement('canvas');
        canvas.style.cursor = '';

        this.eventBus.emit('flowline.creation.ended');
    }

    /**
     * Create flowline between two nodes
     * @param {HTMLElement} sourceNode - Source node
     * @param {HTMLElement} targetNode - Target node
     * @param {string} type - Flowline type ('straight' or 'perpendicular')
     */
    createFlowline(sourceNode, targetNode, type = 'straight') {
        // Validate inputs
        if (!sourceNode || !targetNode) {
            throw new Error('Source and target nodes are required');
        }

        if (sourceNode === targetNode) {
            throw new Error('Cannot create flowline to same node');
        }

        // Check if flowline already exists
        const flowlines = this.stateManager.get('flowlines') || [];
        const existingFlowline = flowlines.find(f => 
            f.source === sourceNode && f.target === targetNode
        );

        if (existingFlowline) {
            console.warn('Flowline already exists between these nodes');
            return existingFlowline;
        }

        // Create flowline data object
        const flowline = {
            source: sourceNode,
            target: targetNode,
            type: type,
            id: `flowline_${sourceNode.dataset.id}_${targetNode.dataset.id}`,
            path: null // SVG path element will be created later
        };

        // Add to state
        flowlines.push(flowline);
        this.stateManager.set('flowlines', flowlines);

        // Create SVG path
        this.createFlowlinePath(flowline);

        this.eventBus.emit('flowline.created', { 
            flowline, 
            sourceId: sourceNode.dataset.id, 
            targetId: targetNode.dataset.id 
        });

        return flowline;
    }

    /**
     * Create SVG path for flowline
     * @private
     */
    createFlowlinePath(flowline) {
        const canvasManager = this.context.getComponent('canvas');
        const svg = canvasManager.getSVG();

        const path = this.domService.createSVGElement('path', {
            class: 'flowline-arrow',
            id: flowline.id
        });

        svg.appendChild(path);
        flowline.path = path;

        this.updateFlowlinePath(flowline);
    }

    /**
     * Update SVG path for flowline
     * @private
     */
    updateFlowlinePath(flowline) {
        if (!flowline.path) return;

        const sourceRect = flowline.source.getBoundingClientRect();
        const targetRect = flowline.target.getBoundingClientRect();
        const canvasManager = this.context.getComponent('canvas');
        const canvasRect = canvasManager.getBounds();
        const panOffset = canvasManager.getPanOffset();

        // Calculate connection points
        const sourcePoint = this.getConnectionPoint(sourceRect, canvasRect, panOffset);
        const targetPoint = this.getConnectionPoint(targetRect, canvasRect, panOffset);

        // Generate path based on type
        let pathData;
        if (flowline.type === 'perpendicular') {
            pathData = this.generatePerpendicularPath(sourcePoint, targetPoint);
        } else {
            pathData = this.generateStraightPath(sourcePoint, targetPoint);
        }

        flowline.path.setAttribute('d', pathData);
    }

    /**
     * Get connection point for a node
     * @private
     */
    getConnectionPoint(nodeRect, canvasRect, panOffset) {
        return {
            x: nodeRect.left - canvasRect.left + (nodeRect.width / 2) - panOffset.x,
            y: nodeRect.top - canvasRect.top + (nodeRect.height / 2) - panOffset.y
        };
    }

    /**
     * Generate straight path between two points
     * @private
     */
    generateStraightPath(start, end) {
        return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
    }

    /**
     * Generate perpendicular path between two points
     * @private
     */
    generatePerpendicularPath(start, end) {
        const midX = start.x + (end.x - start.x) / 2;
        
        return `M ${start.x} ${start.y} 
                L ${midX} ${start.y} 
                L ${midX} ${end.y} 
                L ${end.x} ${end.y}`;
    }

    /**
     * Delete flowline
     * @param {string} sourceId - Source node ID
     * @param {string} targetId - Target node ID
     */
    deleteFlowline(sourceId, targetId) {
        const flowlines = this.stateManager.get('flowlines') || [];
        const flowlineIndex = flowlines.findIndex(f => 
            f.source.dataset.id === sourceId && f.target.dataset.id === targetId
        );

        if (flowlineIndex === -1) {
            console.warn(`Flowline from ${sourceId} to ${targetId} not found`);
            return;
        }

        const flowline = flowlines[flowlineIndex];

        // Remove SVG path
        if (flowline.path && flowline.path.parentNode) {
            flowline.path.parentNode.removeChild(flowline.path);
        }

        // Remove from state
        flowlines.splice(flowlineIndex, 1);
        this.stateManager.set('flowlines', flowlines);

        this.eventBus.emit('flowline.deleted', { sourceId, targetId, flowline });
    }

    /**
     * Update all flowlines (called when nodes move)
     */
    updateAllFlowlines() {
        const flowlines = this.stateManager.get('flowlines') || [];
        flowlines.forEach(flowline => this.updateFlowlinePath(flowline));
    }

    /**
     * Create flowline between nodes by their IDs
     * @param {string} sourceId - Source node ID
     * @param {string} targetId - Target node ID
     * @param {string} type - Flowline type
     */
    createFlowlineBetweenNodes(sourceId, targetId, type = 'straight') {
        const nodeManager = this.context.getComponent('node');
        const sourceNode = nodeManager.findNodeById(sourceId);
        const targetNode = nodeManager.findNodeById(targetId);

        if (!sourceNode || !targetNode) {
            throw new Error(`Cannot find nodes for flowline: ${sourceId} -> ${targetId}`);
        }

        return this.createFlowline(sourceNode, targetNode, type);
    }

    /**
     * Get flowlines for a specific node
     * @param {string} nodeId - Node ID
     * @returns {Object} Object with incoming and outgoing flowlines
     */
    getFlowlinesForNode(nodeId) {
        const flowlines = this.stateManager.get('flowlines') || [];
        
        return {
            incoming: flowlines.filter(f => f.target.dataset.id === nodeId),
            outgoing: flowlines.filter(f => f.source.dataset.id === nodeId)
        };
    }

    /**
     * Remove all flowlines connected to a node
     * @param {string} nodeId - Node ID
     */
    removeFlowlinesForNode(nodeId) {
        const { incoming, outgoing } = this.getFlowlinesForNode(nodeId);
        
        [...incoming, ...outgoing].forEach(flowline => {
            this.deleteFlowline(
                flowline.source.dataset.id, 
                flowline.target.dataset.id
            );
        });
    }

    /**
     * Change flowline type
     * @param {string} sourceId - Source node ID
     * @param {string} targetId - Target node ID
     * @param {string} newType - New flowline type
     */
    changeFlowlineType(sourceId, targetId, newType) {
        const flowlines = this.stateManager.get('flowlines') || [];
        const flowline = flowlines.find(f => 
            f.source.dataset.id === sourceId && f.target.dataset.id === targetId
        );

        if (!flowline) {
            console.warn(`Flowline from ${sourceId} to ${targetId} not found`);
            return;
        }

        flowline.type = newType;
        this.updateFlowlinePath(flowline);

        this.eventBus.emit('flowline.type.changed', { sourceId, targetId, newType });
    }

    /**
     * Get all flowlines
     * @returns {Array} Array of flowline objects
     */
    getAllFlowlines() {
        return this.stateManager.get('flowlines') || [];
    }

    /**
     * Clear all flowlines
     */
    clearAllFlowlines() {
        const flowlines = this.stateManager.get('flowlines') || [];
        
        // Remove all SVG paths
        flowlines.forEach(flowline => {
            if (flowline.path && flowline.path.parentNode) {
                flowline.path.parentNode.removeChild(flowline.path);
            }
        });

        // Clear state
        this.stateManager.set('flowlines', []);

        this.eventBus.emit('flowlines.cleared');
    }

    /**
     * Export flowlines data for saving
     * @returns {Array} Serializable flowline data
     */
    exportFlowlinesData() {
        const flowlines = this.stateManager.get('flowlines') || [];
        
        return flowlines.map(flowline => ({
            sourceId: flowline.source.dataset.id,
            targetId: flowline.target.dataset.id,
            type: flowline.type || 'straight'
        }));
    }

    /**
     * Import flowlines data from loading
     * @param {Array} flowlinesData - Flowline data array
     */
    importFlowlinesData(flowlinesData) {
        flowlinesData.forEach(data => {
            try {
                this.createFlowlineBetweenNodes(data.sourceId, data.targetId, data.type);
            } catch (error) {
                console.error('Error creating flowline:', error);
            }
        });
    }

    /**
     * Handle node click during flowline creation
     * @param {HTMLElement} targetNode - Target node that was clicked
     */
    handleNodeClickForFlowline(targetNode) {
        const flowlineCreationMode = this.stateManager.get('flowlineCreationMode');
        const sourceNode = this.stateManager.get('sourceNodeForFlowline');

        if (!flowlineCreationMode || !sourceNode) return;

        if (targetNode === sourceNode) {
            // Cancel if clicking same node
            this.exitFlowlineCreationMode();
            return;
        }

        try {
            // Get flowline type from dropdown
            const flowlineTypeDropdown = this.context.getElement('flowlineTypeDropdown');
            const flowlineType = flowlineTypeDropdown ? flowlineTypeDropdown.value : 'straight';
            
            this.createFlowline(sourceNode, targetNode, flowlineType);
            this.exitFlowlineCreationMode();
        } catch (error) {
            console.error('Error creating flowline:', error);
            this.exitFlowlineCreationMode();
        }
    }

    /**
     * Set default flowline type
     * @param {string} type - Flowline type
     */
    setDefaultFlowlineType(type) {
        const flowlineTypeDropdown = this.context.getElement('flowlineTypeDropdown');
        if (flowlineTypeDropdown) {
            flowlineTypeDropdown.value = type;
        }
    }
}