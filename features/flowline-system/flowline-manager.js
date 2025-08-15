/**
 * Flowline Manager
 * Handles flowline creation, management, and interaction logic
 * 
 * SAFETY: Manages flowline lifecycle and user interactions
 * Risk Level: MEDIUM - UI state management with SVG manipulation
 */

class FlowlineManager {
    constructor(mainApp) {
        // Reference to main application instance
        this.app = mainApp;
        
        // Get services
        this.domService = this.app.domService;
        this.configService = this.app.configService;
        
        // Flowline management state
        this.flowlines = [];
        this.flowlineCreationMode = false;
        this.sourceNodeForFlowline = null;
        
        // Cache DOM elements
        this.initializeFlowlineElements();
        
        // Setup flowline-specific event listeners
        this.setupFlowlineEventListeners();
        
        console.log('FlowlineManager: Initialized');
    }
    
    /**
     * Initialize and cache flowline-related elements
     */
    initializeFlowlineElements() {
        // Get flowline-related elements from DOM service
        this.canvas = this.domService.getElement('canvas');
        this.flowlineTypeDropdown = this.domService.getElement('flowlineTypeDropdown');
        
        // Get or create SVG element
        this.svg = this.app.svg || this.findOrCreateSVGElement();
        
        // Validate critical flowline elements
        const requiredElements = ['canvas', 'flowlineTypeDropdown'];
        const missingElements = requiredElements.filter(id => !this[id]);
        
        if (missingElements.length > 0) {
            console.warn(`FlowlineManager: Some flowline elements missing: ${missingElements.join(', ')}`);
        }
    }
    
    /**
     * Setup event listeners for flowline functionality
     */
    setupFlowlineEventListeners() {
        // No specific event listeners needed for flowlines currently
        // Flowline creation is triggered by context menu actions
        
        console.log('FlowlineManager: Event listeners initialized');
    }
    
    /**
     * Find or create SVG element for flowlines
     * @returns {SVGElement} SVG element
     */
    findOrCreateSVGElement() {
        let svg = this.canvas ? this.canvas.querySelector('svg') : null;
        
        if (!svg && this.canvas) {
            // Create SVG element if it doesn't exist
            svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.style.position = 'absolute';
            svg.style.top = '0';
            svg.style.left = '0';
            svg.style.width = '100%';
            svg.style.height = '100%';
            svg.style.pointerEvents = 'none';
            svg.style.zIndex = '1';
            
            this.canvas.appendChild(svg);
        }
        
        return svg;
    }
    
    // ==================== FLOWLINE CREATION METHODS ====================
    
    /**
     * Start flowline creation mode
     * @param {HTMLElement} sourceNode - Source node for the flowline
     */
    startFlowlineCreation(sourceNode = null) {
        // Use provided source node or selected node from main app
        this.sourceNodeForFlowline = sourceNode || this.app.selectedNode;
        
        if (!this.sourceNodeForFlowline) {
            console.warn('FlowlineManager: No source node available for flowline creation');
            return;
        }
        
        this.flowlineCreationMode = true;
        
        if (this.canvas) {
            this.canvas.style.cursor = 'crosshair';
        }
        
        // Add visual indication that we're in flowline creation mode
        this.sourceNodeForFlowline.style.boxShadow = '0 0 15px rgba(0, 123, 255, 0.8)';
        
        // Add click handler to cancel flowline creation if clicking on canvas
        const cancelHandler = (e) => {
            if (e.target === this.canvas) {
                this.exitFlowlineCreationMode();
                if (this.canvas) {
                    this.canvas.removeEventListener('click', cancelHandler);
                }
            }
        };
        
        if (this.canvas) {
            this.canvas.addEventListener('click', cancelHandler);
        }
        
        console.log(`FlowlineManager: Started flowline creation from node ${this.sourceNodeForFlowline.dataset.id}`);
    }
    
    /**
     * Exit flowline creation mode
     */
    exitFlowlineCreationMode() {
        this.flowlineCreationMode = false;
        
        if (this.canvas) {
            this.canvas.style.cursor = 'default';
        }
        
        if (this.sourceNodeForFlowline) {
            this.sourceNodeForFlowline.style.boxShadow = '';
            this.sourceNodeForFlowline = null;
        }
        
        console.log('FlowlineManager: Exited flowline creation mode');
    }
    
    /**
     * Create a flowline between two nodes
     * @param {HTMLElement} sourceNode - Source node
     * @param {HTMLElement} targetNode - Target node
     * @param {string} flowlineType - Type of flowline (optional)
     * @returns {Object} Created flowline object
     */
    createFlowline(sourceNode, targetNode, flowlineType = null) {
        if (!sourceNode || !targetNode) {
            console.error('FlowlineManager: Both source and target nodes are required');
            return null;
        }
        
        if (sourceNode === targetNode) {
            console.warn('FlowlineManager: Cannot create flowline to same node');
            return null;
        }
        
        // Check if flowline already exists between these nodes
        const existingFlowline = this.findFlowlineBetweenNodes(sourceNode, targetNode);
        if (existingFlowline) {
            console.warn('FlowlineManager: Flowline already exists between these nodes');
            return existingFlowline;
        }
        
        // Get flowline type
        const type = flowlineType || (this.flowlineTypeDropdown ? this.flowlineTypeDropdown.value : 'straight');
        
        // Create SVG path element
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'flowline-arrow');
        path.dataset.source = sourceNode.dataset.id;
        path.dataset.target = targetNode.dataset.id;
        path.dataset.type = type;
        
        // Add path to SVG
        if (this.svg) {
            this.svg.appendChild(path);
        }
        
        // Create flowline object
        const flowline = {
            element: path,
            source: sourceNode,
            target: targetNode,
            type: type,
            id: this.generateFlowlineId(sourceNode, targetNode)
        };
        
        // Add to flowlines array
        this.flowlines.push(flowline);
        
        // Update main app flowlines reference
        if (this.app.flowlines) {
            this.app.flowlines.push(flowline);
        }
        
        // Update flowline path
        this.updateSingleFlowline(flowline);
        
        console.log(`FlowlineManager: Created ${type} flowline from ${sourceNode.dataset.id} to ${targetNode.dataset.id}`);
        
        return flowline;
    }
    
    /**
     * Generate a unique ID for a flowline
     * @param {HTMLElement} sourceNode - Source node
     * @param {HTMLElement} targetNode - Target node
     * @returns {string} Flowline ID
     */
    generateFlowlineId(sourceNode, targetNode) {
        return `flowline-${sourceNode.dataset.id}-to-${targetNode.dataset.id}`;
    }
    
    // ==================== FLOWLINE MANAGEMENT METHODS ====================
    
    /**
     * Update all flowlines to reflect current node positions
     */
    updateFlowlines() {
        this.flowlines.forEach(flowline => this.updateSingleFlowline(flowline));
    }
    
    /**
     * Update a single flowline path
     * @param {Object} flowline - Flowline object
     */
    updateSingleFlowline(flowline) {
        if (!flowline || !flowline.element || !flowline.source || !flowline.target || !this.canvas) {
            return;
        }
        
        try {
            const sourceRect = flowline.source.getBoundingClientRect();
            const targetRect = flowline.target.getBoundingClientRect();
            const canvasRect = this.canvas.getBoundingClientRect();
            
            // Calculate center points relative to canvas
            const sourceX = sourceRect.left + sourceRect.width / 2 - canvasRect.left;
            const sourceY = sourceRect.top + sourceRect.height / 2 - canvasRect.top;
            const targetX = targetRect.left + targetRect.width / 2 - canvasRect.left;
            const targetY = targetRect.top + targetRect.height / 2 - canvasRect.top;
            
            // Generate path data based on flowline type
            const pathData = this.generatePathData(sourceX, sourceY, targetX, targetY, flowline.type);
            
            // Update path element
            flowline.element.setAttribute('d', pathData);
            
        } catch (error) {
            console.error('FlowlineManager: Error updating flowline:', error);
        }
    }
    
    /**
     * Generate SVG path data based on flowline type
     * @param {number} sourceX - Source X coordinate
     * @param {number} sourceY - Source Y coordinate
     * @param {number} targetX - Target X coordinate
     * @param {number} targetY - Target Y coordinate
     * @param {string} type - Flowline type
     * @returns {string} SVG path data
     */
    generatePathData(sourceX, sourceY, targetX, targetY, type) {
        switch (type) {
            case 'perpendicular':
                // Create perpendicular path with right angles
                const midX = sourceX + (targetX - sourceX) / 2;
                return `M ${sourceX} ${sourceY} L ${midX} ${sourceY} L ${midX} ${targetY} L ${targetX} ${targetY}`;
                
            case 'curved':
                // Create curved path using quadratic bezier
                const controlX = sourceX + (targetX - sourceX) / 2;
                const controlY = sourceY + (targetY - sourceY) / 2 - 50; // Curve upward
                return `M ${sourceX} ${sourceY} Q ${controlX} ${controlY} ${targetX} ${targetY}`;
                
            case 'straight':
            default:
                // Create straight line
                return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
        }
    }
    
    /**
     * Remove a flowline
     * @param {Object|string} flowlineOrId - Flowline object or flowline ID
     * @returns {boolean} True if flowline was removed
     */
    removeFlowline(flowlineOrId) {
        let flowline;
        
        if (typeof flowlineOrId === 'string') {
            flowline = this.findFlowlineById(flowlineOrId);
        } else {
            flowline = flowlineOrId;
        }
        
        if (!flowline) {
            console.warn('FlowlineManager: Flowline not found for removal');
            return false;
        }
        
        // Remove from DOM
        if (flowline.element && flowline.element.parentNode) {
            flowline.element.parentNode.removeChild(flowline.element);
        }
        
        // Remove from flowlines array
        const index = this.flowlines.indexOf(flowline);
        if (index > -1) {
            this.flowlines.splice(index, 1);
        }
        
        // Remove from main app flowlines array
        if (this.app.flowlines) {
            const appIndex = this.app.flowlines.indexOf(flowline);
            if (appIndex > -1) {
                this.app.flowlines.splice(appIndex, 1);
            }
        }
        
        console.log(`FlowlineManager: Removed flowline ${flowline.id || 'unknown'}`);
        return true;
    }
    
    /**
     * Remove all flowlines connected to a specific node
     * @param {HTMLElement|string} nodeOrId - Node element or node ID
     * @returns {number} Number of flowlines removed
     */
    removeFlowlinesForNode(nodeOrId) {
        const nodeId = typeof nodeOrId === 'string' ? nodeOrId : nodeOrId.dataset.id;
        
        const flowlinesToRemove = this.flowlines.filter(flowline => 
            flowline.source.dataset.id === nodeId || flowline.target.dataset.id === nodeId
        );
        
        flowlinesToRemove.forEach(flowline => this.removeFlowline(flowline));
        
        console.log(`FlowlineManager: Removed ${flowlinesToRemove.length} flowlines for node ${nodeId}`);
        return flowlinesToRemove.length;
    }
    
    /**
     * Clear all flowlines
     */
    clearAllFlowlines() {
        // Remove all flowline elements from DOM
        this.flowlines.forEach(flowline => {
            if (flowline.element && flowline.element.parentNode) {
                flowline.element.parentNode.removeChild(flowline.element);
            }
        });
        
        // Clear arrays
        this.flowlines = [];
        if (this.app.flowlines) {
            this.app.flowlines = [];
        }
        
        console.log('FlowlineManager: Cleared all flowlines');
    }
    
    // ==================== FLOWLINE QUERY METHODS ====================
    
    /**
     * Find flowline by ID
     * @param {string} id - Flowline ID
     * @returns {Object|null} Flowline object or null
     */
    findFlowlineById(id) {
        return this.flowlines.find(flowline => flowline.id === id) || null;
    }
    
    /**
     * Find flowline between two nodes
     * @param {HTMLElement} sourceNode - Source node
     * @param {HTMLElement} targetNode - Target node
     * @returns {Object|null} Flowline object or null
     */
    findFlowlineBetweenNodes(sourceNode, targetNode) {
        return this.flowlines.find(flowline => 
            flowline.source === sourceNode && flowline.target === targetNode
        ) || null;
    }
    
    /**
     * Get all flowlines connected to a node
     * @param {HTMLElement|string} nodeOrId - Node element or node ID
     * @returns {Array} Array of flowline objects
     */
    getFlowlinesForNode(nodeOrId) {
        const nodeId = typeof nodeOrId === 'string' ? nodeOrId : nodeOrId.dataset.id;
        
        return this.flowlines.filter(flowline => 
            flowline.source.dataset.id === nodeId || flowline.target.dataset.id === nodeId
        );
    }
    
    /**
     * Get all flowlines
     * @returns {Array} Array of all flowline objects
     */
    getAllFlowlines() {
        return [...this.flowlines];
    }
    
    /**
     * Get flowlines by type
     * @param {string} type - Flowline type
     * @returns {Array} Array of flowlines of the specified type
     */
    getFlowlinesByType(type) {
        return this.flowlines.filter(flowline => flowline.type === type);
    }
    
    // ==================== FLOWLINE STATE AND UTILITY METHODS ====================
    
    /**
     * Get flowline creation mode state
     * @returns {boolean} Whether flowline creation mode is active
     */
    isInFlowlineCreationMode() {
        return this.flowlineCreationMode;
    }
    
    /**
     * Get source node for flowline creation
     * @returns {HTMLElement|null} Source node or null
     */
    getSourceNodeForFlowline() {
        return this.sourceNodeForFlowline;
    }
    
    /**
     * Set flowline type (updates dropdown if available)
     * @param {string} type - Flowline type
     */
    setFlowlineType(type) {
        if (this.flowlineTypeDropdown) {
            this.flowlineTypeDropdown.value = type;
        }
    }
    
    /**
     * Get current flowline type
     * @returns {string} Current flowline type
     */
    getCurrentFlowlineType() {
        return this.flowlineTypeDropdown ? this.flowlineTypeDropdown.value : 'straight';
    }
    
    /**
     * Serialize flowlines for saving
     * @returns {Array} Array of serialized flowline data
     */
    serializeFlowlines() {
        return this.flowlines.map(flowline => ({
            id: flowline.id,
            sourceId: flowline.source.dataset.id,
            targetId: flowline.target.dataset.id,
            type: flowline.type
        }));
    }
    
    /**
     * Restore flowlines from serialized data
     * @param {Array} flowlineData - Array of serialized flowline data
     * @param {Function} getNodeByIdCallback - Callback to get node by ID
     */
    restoreFlowlines(flowlineData, getNodeByIdCallback) {
        if (!Array.isArray(flowlineData)) {
            console.warn('FlowlineManager: Invalid flowline data for restoration');
            return;
        }
        
        flowlineData.forEach(data => {
            try {
                const sourceNode = getNodeByIdCallback(data.sourceId);
                const targetNode = getNodeByIdCallback(data.targetId);
                
                if (sourceNode && targetNode) {
                    this.createFlowline(sourceNode, targetNode, data.type);
                } else {
                    console.warn(`FlowlineManager: Could not restore flowline ${data.id} - nodes not found`);
                }
                
            } catch (error) {
                console.error('FlowlineManager: Error restoring flowline:', error);
            }
        });
        
        console.log(`FlowlineManager: Restored ${flowlineData.length} flowlines`);
    }
    
    /**
     * Get flowline manager state information for debugging
     * @returns {Object} Flowline manager state information
     */
    getFlowlineManagerState() {
        return {
            flowlineCount: this.flowlines.length,
            flowlineCreationMode: this.flowlineCreationMode,
            sourceNodeId: this.sourceNodeForFlowline ? this.sourceNodeForFlowline.dataset.id : null,
            currentFlowlineType: this.getCurrentFlowlineType(),
            elementsLoaded: {
                canvas: !!this.canvas,
                flowlineTypeDropdown: !!this.flowlineTypeDropdown,
                svg: !!this.svg
            }
        };
    }
    
    /**
     * Validate flowline manager elements
     * @returns {Object} Validation result
     */
    validateFlowlineElements() {
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
        
        // Check optional elements
        const optionalElements = ['flowlineTypeDropdown', 'svg'];
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
    module.exports = FlowlineManager;
}

// Make available globally for direct use
if (typeof window !== 'undefined') {
    window.FlowlineManager = FlowlineManager;
}