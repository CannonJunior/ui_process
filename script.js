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
        
        // Track current mode for radio button behavior
        this.currentMode = null;
        
        // Track if workflows have been appended (for future merge validation)
        this.hasAppendedWorkflows = false;
        
        // Initialize services
        this.domService = getDOMService();
        this.configService = getConfigService();
        this.relationshipTracker = new RelationshipTracker();
        
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
        
        // Initialize workflow ingestion service (Phase 3: Vector Search Integration)
        this.workflowIngestion = null;
        
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
    
    // Matrix interface preservation - compatibility method for tests
    toggleEisenhowerMatrix() {
        // For tests: toggle between matrix and workflow modes
        if (this.currentMode === 'matrix') {
            this.setMode('workflow');
        } else {
            this.setMode('matrix');
        }
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
    
    /**
     * Set the application mode - exclusive radio button system for four modes
     * @param {string} mode - The mode to activate ('workflow', 'matrix', 'opportunities', 'knowledgeGraph')
     */
    setMode(mode) {
        // Radio button behavior: don't allow clicking the same button to toggle off
        if (this.currentMode === mode) {
            console.log(`🔘 Already in ${mode} mode - no change needed`);
            return;
        }
        
        console.log(`🔄 Switching from ${this.currentMode || 'none'} to ${mode} mode`);
        
        // Save positions before switching away from workflow mode
        if (this.currentMode === 'workflow') {
            this.saveWorkflowPositions();
        }
        
        // Track current state
        const previousMode = this.currentMode;
        this.currentMode = mode;
        
        // Deactivate all modes first (transition elements off-screen)
        this.deactivateAllModes();
        
        // Then activate the selected mode
        setTimeout(() => {
            switch (mode) {
                case 'workflow':
                    this.activateWorkflowMode();
                    break;
                case 'matrix':
                    this.activateMatrixMode();
                    break;
                case 'opportunities':
                    this.activateOpportunitiesMode();
                    break;
                case 'knowledgeGraph':
                    this.activateKnowledgeGraphMode();
                    break;
                default:
                    console.warn(`Unknown mode: ${mode}`);
            }
        }, 100); // Small delay to allow transitions to start
    }
    
    /**
     * Save positions of all workflow objects before switching modes
     * Uses persistent localStorage with validation to prevent overwriting
     */
    saveWorkflowPositions() {
        console.log('💾 Saving workflow object positions to persistent storage...');
        
        try {
            // Get existing positions from localStorage (never overwrite without validation)
            const existingPositions = this.getStoredWorkflowPositions();
            
            // Create new position data structure
            const positionData = {
                timestamp: Date.now(),
                nodes: {},
                taskNodes: {},
                nextActionSlots: {},
                flowlines: {},
                otherElements: {},
                canvasScroll: { x: 0, y: 0 }
            };
            
            const canvas = document.getElementById('canvas');
            const canvasRect = canvas.getBoundingClientRect();
            
            // Save canvas scroll position
            positionData.canvasScroll = {
                x: canvas.scrollLeft || 0,
                y: canvas.scrollTop || 0
            };
            
            // Save node positions
            const nodes = document.querySelectorAll('.node');
            nodes.forEach(node => {
                if (node.dataset.id) {
                    const rect = node.getBoundingClientRect();
                    const x = rect.left - canvasRect.left + canvas.scrollLeft;
                    const y = rect.top - canvasRect.top + canvas.scrollTop;
                    
                    const nodeId = node.dataset.id;
                    
                    // Only save if position is valid and not already stored, or if current position differs
                    if (this.isValidPosition(x, y)) {
                        const existing = existingPositions.nodes?.[nodeId];
                        if (!existing || existing.x !== x || existing.y !== y) {
                            positionData.nodes[nodeId] = { x, y, nodeType: node.dataset.nodeType || 'unknown' };
                            
                            // Also save to dataset as backup
                            node.dataset.savedX = x;
                            node.dataset.savedY = y;
                        } else {
                            // Keep existing position
                            positionData.nodes[nodeId] = existing;
                        }
                    } else if (existingPositions.nodes?.[nodeId]) {
                        // Keep existing valid position if current is invalid
                        positionData.nodes[nodeId] = existingPositions.nodes[nodeId];
                    }
                }
            });
            
            // Save task node positions
            const taskNodes = document.querySelectorAll('.task-node');
            taskNodes.forEach(taskNode => {
                if (taskNode.dataset.id) {
                    const rect = taskNode.getBoundingClientRect();
                    const x = rect.left - canvasRect.left + canvas.scrollLeft;
                    const y = rect.top - canvasRect.top + canvas.scrollTop;
                    
                    const taskId = taskNode.dataset.id;
                    
                    if (this.isValidPosition(x, y)) {
                        const existing = existingPositions.taskNodes?.[taskId];
                        if (!existing || existing.x !== x || existing.y !== y) {
                            positionData.taskNodes[taskId] = { x, y };
                            
                            taskNode.dataset.savedX = x;
                            taskNode.dataset.savedY = y;
                        } else {
                            positionData.taskNodes[taskId] = existing;
                        }
                    } else if (existingPositions.taskNodes?.[taskId]) {
                        positionData.taskNodes[taskId] = existingPositions.taskNodes[taskId];
                    }
                }
            });
            
            // Save next action slot positions
            const nextActionSlots = document.querySelectorAll('.next-action-slot');
            nextActionSlots.forEach(slot => {
                if (slot.dataset.nodeId) {
                    const rect = slot.getBoundingClientRect();
                    const x = rect.left - canvasRect.left + canvas.scrollLeft;
                    const y = rect.top - canvasRect.top + canvas.scrollTop;
                    
                    const slotKey = `${slot.dataset.nodeId}-${slot.dataset.slotIndex || 0}`;
                    
                    if (this.isValidPosition(x, y)) {
                        const existing = existingPositions.nextActionSlots?.[slotKey];
                        if (!existing || existing.x !== x || existing.y !== y) {
                            positionData.nextActionSlots[slotKey] = { 
                                x, y, 
                                nodeId: slot.dataset.nodeId, 
                                slotIndex: slot.dataset.slotIndex || 0 
                            };
                            
                            slot.dataset.savedX = x;
                            slot.dataset.savedY = y;
                        } else {
                            positionData.nextActionSlots[slotKey] = existing;
                        }
                    } else if (existingPositions.nextActionSlots?.[slotKey]) {
                        positionData.nextActionSlots[slotKey] = existingPositions.nextActionSlots[slotKey];
                    }
                }
            });
            
            // Save flowline connection data
            const flowlines = document.querySelectorAll('.flowline, .flowline-path');
            let flowlineCount = 0;
            flowlines.forEach(flowline => {
                if (flowline.dataset.sourceId && flowline.dataset.targetId) {
                    const flowlineKey = `${flowline.dataset.sourceId}-${flowline.dataset.targetId}`;
                    positionData.flowlines[flowlineKey] = {
                        sourceId: flowline.dataset.sourceId,
                        targetId: flowline.dataset.targetId,
                        type: flowline.dataset.type || 'default'
                    };
                    
                    // Store backup data
                    flowline.dataset.savedSourceId = flowline.dataset.sourceId;
                    flowline.dataset.savedTargetId = flowline.dataset.targetId;
                    if (flowline.dataset.type) {
                        flowline.dataset.savedType = flowline.dataset.type;
                    }
                    flowlineCount++;
                }
            });
            
            // Save any other positioned workflow elements
            const otherWorkflowElements = document.querySelectorAll('[data-workflow-element]');
            otherWorkflowElements.forEach(element => {
                const elementId = element.id || element.dataset.workflowElement;
                if (elementId) {
                    const rect = element.getBoundingClientRect();
                    const x = rect.left - canvasRect.left + canvas.scrollLeft;
                    const y = rect.top - canvasRect.top + canvas.scrollTop;
                    
                    if (this.isValidPosition(x, y)) {
                        const existing = existingPositions.otherElements?.[elementId];
                        if (!existing || existing.x !== x || existing.y !== y) {
                            positionData.otherElements[elementId] = { x, y };
                            
                            element.dataset.savedX = x;
                            element.dataset.savedY = y;
                        } else {
                            positionData.otherElements[elementId] = existing;
                        }
                    } else if (existingPositions.otherElements?.[elementId]) {
                        positionData.otherElements[elementId] = existingPositions.otherElements[elementId];
                    }
                }
            });
            
            // Store to localStorage with validation
            this.storeWorkflowPositions(positionData);
            
            console.log(`✅ Saved positions for ${Object.keys(positionData.nodes).length} nodes, ${Object.keys(positionData.taskNodes).length} task nodes, ${Object.keys(positionData.nextActionSlots).length} slots, ${flowlineCount} flowlines to persistent storage`);
            
        } catch (error) {
            console.error('❌ Error saving workflow positions:', error);
        }
    }
    
    /**
     * Validate if position coordinates are reasonable and not corrupted
     */
    isValidPosition(x, y) {
        // Check for reasonable bounds (not negative, not extremely large)
        const maxCanvasSize = 50000; // 50k pixels should be more than enough
        return (
            typeof x === 'number' && 
            typeof y === 'number' && 
            !isNaN(x) && 
            !isNaN(y) && 
            x >= -1000 && // Allow some negative offset for elements slightly off-canvas
            y >= -1000 && 
            x < maxCanvasSize && 
            y < maxCanvasSize
        );
    }
    
    /**
     * Get stored workflow positions from localStorage
     */
    getStoredWorkflowPositions() {
        try {
            const stored = localStorage.getItem('workflowPositions');
            if (stored) {
                const positions = JSON.parse(stored);
                console.log('📍 Retrieved stored positions from localStorage');
                return positions;
            }
        } catch (error) {
            console.warn('⚠️ Error reading stored positions:', error);
        }
        
        // Return empty structure if nothing stored
        return {
            timestamp: 0,
            nodes: {},
            taskNodes: {},
            nextActionSlots: {},
            flowlines: {},
            otherElements: {},
            canvasScroll: { x: 0, y: 0 }
        };
    }
    
    /**
     * Store workflow positions to localStorage with validation
     */
    storeWorkflowPositions(positionData) {
        try {
            // Validate position data structure
            if (!positionData || typeof positionData !== 'object') {
                throw new Error('Invalid position data structure');
            }
            
            // Ensure all required properties exist
            const requiredProps = ['nodes', 'taskNodes', 'nextActionSlots', 'flowlines', 'otherElements', 'canvasScroll'];
            for (const prop of requiredProps) {
                if (!positionData[prop]) {
                    positionData[prop] = {};
                }
            }
            
            // Add version for future compatibility
            positionData.version = '1.0';
            positionData.timestamp = Date.now();
            
            // Store to localStorage
            const jsonData = JSON.stringify(positionData, null, 2);
            localStorage.setItem('workflowPositions', jsonData);
            
            console.log('✅ Workflow positions stored to localStorage successfully');
            
            // Also store a backup with timestamp
            const backupKey = `workflowPositions_backup_${Date.now()}`;
            localStorage.setItem(backupKey, jsonData);
            
            // Clean up old backups (keep only the 3 most recent)
            this.cleanupPositionBackups();
            
        } catch (error) {
            console.error('❌ Error storing positions to localStorage:', error);
        }
    }
    
    /**
     * Clean up old position backups to prevent localStorage bloat
     */
    cleanupPositionBackups() {
        try {
            const backupKeys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('workflowPositions_backup_')) {
                    backupKeys.push(key);
                }
            }
            
            // Sort by timestamp (newest first)
            backupKeys.sort((a, b) => {
                const timestampA = parseInt(a.split('_').pop());
                const timestampB = parseInt(b.split('_').pop());
                return timestampB - timestampA;
            });
            
            // Remove old backups (keep only 3 most recent)
            for (let i = 3; i < backupKeys.length; i++) {
                localStorage.removeItem(backupKeys[i]);
            }
            
            if (backupKeys.length > 3) {
                console.log(`🧹 Cleaned up ${backupKeys.length - 3} old position backups`);
            }
        } catch (error) {
            console.warn('⚠️ Error cleaning up position backups:', error);
        }
    }
    
    /**
     * Restore positions of workflow objects when returning to workflow mode
     * Uses persistent localStorage data with fallback to dataset attributes
     */
    restoreWorkflowPositions() {
        console.log('📍 Restoring workflow object positions from persistent storage...');
        
        try {
            // Get stored position data from localStorage
            const storedPositions = this.getStoredWorkflowPositions();
            let restoredCount = { nodes: 0, taskNodes: 0, slots: 0, flowlines: 0, otherElements: 0 };
            let errorsCount = 0;
            
            // Restore canvas scroll position
            const canvas = document.getElementById('canvas');
            if (canvas && storedPositions.canvasScroll) {
                if (typeof storedPositions.canvasScroll.x === 'number') {
                    canvas.scrollLeft = storedPositions.canvasScroll.x;
                }
                if (typeof storedPositions.canvasScroll.y === 'number') {
                    canvas.scrollTop = storedPositions.canvasScroll.y;
                }
            }
            
            // Restore node positions
            const nodes = document.querySelectorAll('.node');
            nodes.forEach(node => {
                const nodeId = node.dataset.id;
                if (nodeId) {
                    let restored = false;
                    
                    // Try to restore from localStorage first
                    if (storedPositions.nodes && storedPositions.nodes[nodeId]) {
                        const stored = storedPositions.nodes[nodeId];
                        if (this.isValidPosition(stored.x, stored.y)) {
                            node.style.left = stored.x + 'px';
                            node.style.top = stored.y + 'px';
                            node.dataset.savedX = stored.x;
                            node.dataset.savedY = stored.y;
                            restoredCount.nodes++;
                            restored = true;
                        }
                    }
                    
                    // Fallback to dataset attributes if localStorage failed
                    if (!restored && node.dataset.savedX && node.dataset.savedY) {
                        const x = parseFloat(node.dataset.savedX);
                        const y = parseFloat(node.dataset.savedY);
                        if (this.isValidPosition(x, y)) {
                            node.style.left = x + 'px';
                            node.style.top = y + 'px';
                            restoredCount.nodes++;
                            restored = true;
                        }
                    }
                    
                    if (!restored) {
                        errorsCount++;
                        console.warn(`⚠️ Could not restore position for node ${nodeId}`);
                    }
                }
            });
            
            // Restore task node positions
            const taskNodes = document.querySelectorAll('.task-node');
            taskNodes.forEach(taskNode => {
                const taskId = taskNode.dataset.id;
                if (taskId) {
                    let restored = false;
                    
                    // Try localStorage first
                    if (storedPositions.taskNodes && storedPositions.taskNodes[taskId]) {
                        const stored = storedPositions.taskNodes[taskId];
                        if (this.isValidPosition(stored.x, stored.y)) {
                            taskNode.style.left = stored.x + 'px';
                            taskNode.style.top = stored.y + 'px';
                            taskNode.dataset.savedX = stored.x;
                            taskNode.dataset.savedY = stored.y;
                            restoredCount.taskNodes++;
                            restored = true;
                        }
                    }
                    
                    // Fallback to dataset
                    if (!restored && taskNode.dataset.savedX && taskNode.dataset.savedY) {
                        const x = parseFloat(taskNode.dataset.savedX);
                        const y = parseFloat(taskNode.dataset.savedY);
                        if (this.isValidPosition(x, y)) {
                            taskNode.style.left = x + 'px';
                            taskNode.style.top = y + 'px';
                            restoredCount.taskNodes++;
                            restored = true;
                        }
                    }
                    
                    if (!restored) {
                        errorsCount++;
                        console.warn(`⚠️ Could not restore position for task node ${taskId}`);
                    }
                }
            });
            
            // Restore next action slot positions
            const nextActionSlots = document.querySelectorAll('.next-action-slot');
            nextActionSlots.forEach(slot => {
                const nodeId = slot.dataset.nodeId;
                const slotIndex = slot.dataset.slotIndex || 0;
                const slotKey = `${nodeId}-${slotIndex}`;
                
                if (nodeId) {
                    let restored = false;
                    
                    // Try localStorage first
                    if (storedPositions.nextActionSlots && storedPositions.nextActionSlots[slotKey]) {
                        const stored = storedPositions.nextActionSlots[slotKey];
                        if (this.isValidPosition(stored.x, stored.y)) {
                            slot.style.left = stored.x + 'px';
                            slot.style.top = stored.y + 'px';
                            slot.dataset.savedX = stored.x;
                            slot.dataset.savedY = stored.y;
                            restoredCount.slots++;
                            restored = true;
                        }
                    }
                    
                    // Fallback to dataset
                    if (!restored && slot.dataset.savedX && slot.dataset.savedY) {
                        const x = parseFloat(slot.dataset.savedX);
                        const y = parseFloat(slot.dataset.savedY);
                        if (this.isValidPosition(x, y)) {
                            slot.style.left = x + 'px';
                            slot.style.top = y + 'px';
                            restoredCount.slots++;
                            restored = true;
                        }
                    }
                    
                    if (!restored) {
                        errorsCount++;
                        console.warn(`⚠️ Could not restore position for next action slot ${slotKey}`);
                    }
                }
            });
            
            // Restore flowlines (connection data and trigger redraw)
            const flowlines = document.querySelectorAll('.flowline, .flowline-path');
            let flowlineConnectionsRestored = 0;
            
            // First, verify stored flowline connections
            if (storedPositions.flowlines && Object.keys(storedPositions.flowlines).length > 0) {
                for (const [flowlineKey, stored] of Object.entries(storedPositions.flowlines)) {
                    // Find matching flowline element
                    let foundFlowline = null;
                    flowlines.forEach(flowline => {
                        if (flowline.dataset.sourceId === stored.sourceId && 
                            flowline.dataset.targetId === stored.targetId) {
                            foundFlowline = flowline;
                        }
                    });
                    
                    if (foundFlowline) {
                        // Ensure connection data is preserved
                        foundFlowline.dataset.savedSourceId = stored.sourceId;
                        foundFlowline.dataset.savedTargetId = stored.targetId;
                        if (stored.type) {
                            foundFlowline.dataset.savedType = stored.type;
                        }
                        flowlineConnectionsRestored++;
                    }
                }
            }
            
            // Fallback: restore from dataset
            flowlines.forEach(flowline => {
                if (flowline.dataset.savedSourceId && flowline.dataset.savedTargetId) {
                    // Connection data preserved, will be redrawn
                    if (flowlineConnectionsRestored === 0) {
                        restoredCount.flowlines++;
                    }
                }
            });
            
            if (flowlineConnectionsRestored > 0) {
                restoredCount.flowlines = flowlineConnectionsRestored;
            }
            
            // Restore other workflow elements
            const otherWorkflowElements = document.querySelectorAll('[data-workflow-element]');
            otherWorkflowElements.forEach(element => {
                const elementId = element.id || element.dataset.workflowElement;
                if (elementId) {
                    let restored = false;
                    
                    // Try localStorage first
                    if (storedPositions.otherElements && storedPositions.otherElements[elementId]) {
                        const stored = storedPositions.otherElements[elementId];
                        if (this.isValidPosition(stored.x, stored.y)) {
                            element.style.left = stored.x + 'px';
                            element.style.top = stored.y + 'px';
                            element.dataset.savedX = stored.x;
                            element.dataset.savedY = stored.y;
                            restoredCount.otherElements++;
                            restored = true;
                        }
                    }
                    
                    // Fallback to dataset
                    if (!restored && element.dataset.savedX && element.dataset.savedY) {
                        const x = parseFloat(element.dataset.savedX);
                        const y = parseFloat(element.dataset.savedY);
                        if (this.isValidPosition(x, y)) {
                            element.style.left = x + 'px';
                            element.style.top = y + 'px';
                            restoredCount.otherElements++;
                            restored = true;
                        }
                    }
                    
                    if (!restored) {
                        errorsCount++;
                        console.warn(`⚠️ Could not restore position for workflow element ${elementId}`);
                    }
                }
            });
            
            // Trigger flowline redraw to ensure proper connections
            if (this.flowlineManager && restoredCount.flowlines > 0) {
                setTimeout(() => {
                    try {
                        this.flowlineManager.updateFlowlines();
                        console.log('🔄 Flowlines redrawn after position restoration');
                    } catch (flowlineError) {
                        console.error('❌ Error redrawing flowlines:', flowlineError);
                    }
                }, 100); // Longer delay to ensure all elements are positioned
            }
            
            // Verification: Check that restored positions are actually applied
            setTimeout(() => {
                this.verifyPositionRestoration(restoredCount);
            }, 200);
            
            const totalRestored = Object.values(restoredCount).reduce((sum, count) => sum + count, 0);
            console.log(`✅ Restored positions for ${totalRestored} elements: ${restoredCount.nodes} nodes, ${restoredCount.taskNodes} task nodes, ${restoredCount.slots} slots, ${restoredCount.flowlines} flowlines, ${restoredCount.otherElements} other elements`);
            
            if (errorsCount > 0) {
                console.warn(`⚠️ ${errorsCount} elements could not be restored to their saved positions`);
            }
            
            return restoredCount;
            
        } catch (error) {
            console.error('❌ Error restoring workflow positions:', error);
            return { nodes: 0, taskNodes: 0, slots: 0, flowlines: 0, otherElements: 0 };
        }
    }
    
    /**
     * Verify that position restoration actually worked correctly
     */
    verifyPositionRestoration(expectedCounts) {
        console.log('🔍 Verifying position restoration...');
        
        try {
            let verificationResults = {
                nodes: { expected: expectedCounts.nodes, actual: 0, positioned: 0 },
                taskNodes: { expected: expectedCounts.taskNodes, actual: 0, positioned: 0 },
                slots: { expected: expectedCounts.slots, actual: 0, positioned: 0 },
                otherElements: { expected: expectedCounts.otherElements, actual: 0, positioned: 0 }
            };
            
            // Verify node positions
            const nodes = document.querySelectorAll('.node');
            verificationResults.nodes.actual = nodes.length;
            nodes.forEach(node => {
                if (node.style.left && node.style.top && 
                    node.style.left !== '0px' && node.style.top !== '0px') {
                    verificationResults.nodes.positioned++;
                }
            });
            
            // Verify task node positions
            const taskNodes = document.querySelectorAll('.task-node');
            verificationResults.taskNodes.actual = taskNodes.length;
            taskNodes.forEach(taskNode => {
                if (taskNode.style.left && taskNode.style.top && 
                    taskNode.style.left !== '0px' && taskNode.style.top !== '0px') {
                    verificationResults.taskNodes.positioned++;
                }
            });
            
            // Verify next action slot positions
            const nextActionSlots = document.querySelectorAll('.next-action-slot');
            verificationResults.slots.actual = nextActionSlots.length;
            nextActionSlots.forEach(slot => {
                if (slot.style.left && slot.style.top && 
                    slot.style.left !== '0px' && slot.style.top !== '0px') {
                    verificationResults.slots.positioned++;
                }
            });
            
            // Verify other workflow elements
            const otherWorkflowElements = document.querySelectorAll('[data-workflow-element]');
            verificationResults.otherElements.actual = otherWorkflowElements.length;
            otherWorkflowElements.forEach(element => {
                if (element.style.left && element.style.top && 
                    element.style.left !== '0px' && element.style.top !== '0px') {
                    verificationResults.otherElements.positioned++;
                }
            });
            
            // Report verification results
            let allVerified = true;
            for (const [type, result] of Object.entries(verificationResults)) {
                if (result.expected > 0 && result.positioned < result.expected) {
                    console.warn(`⚠️ ${type}: Expected ${result.expected} positioned elements, but only ${result.positioned} out of ${result.actual} total elements are properly positioned`);
                    allVerified = false;
                } else if (result.positioned > 0) {
                    console.log(`✅ ${type}: ${result.positioned}/${result.actual} elements properly positioned`);
                }
            }
            
            if (allVerified && Object.values(verificationResults).some(result => result.positioned > 0)) {
                console.log('✅ Position restoration verification passed - all elements properly positioned');
            } else if (Object.values(verificationResults).every(result => result.positioned === 0)) {
                console.log('ℹ️ No positioned elements found - this may be expected for a new workspace');
            }
            
            return verificationResults;
            
        } catch (error) {
            console.error('❌ Error during position restoration verification:', error);
            return null;
        }
    }
    
    /**
     * Clear all stored workflow positions (for debugging or reset)
     */
    clearStoredWorkflowPositions() {
        try {
            localStorage.removeItem('workflowPositions');
            
            // Also clear backups
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('workflowPositions_backup_')) {
                    keysToRemove.push(key);
                }
            }
            
            keysToRemove.forEach(key => localStorage.removeItem(key));
            
            console.log(`🧹 Cleared all stored workflow positions and ${keysToRemove.length} backups`);
            return true;
        } catch (error) {
            console.error('❌ Error clearing stored positions:', error);
            return false;
        }
    }
    
    /**
     * Debug method to show current stored positions
     */
    debugStoredPositions() {
        try {
            const stored = this.getStoredWorkflowPositions();
            console.log('🔍 Current stored positions:', stored);
            
            const totalElements = 
                Object.keys(stored.nodes || {}).length +
                Object.keys(stored.taskNodes || {}).length +
                Object.keys(stored.nextActionSlots || {}).length +
                Object.keys(stored.flowlines || {}).length +
                Object.keys(stored.otherElements || {}).length;
                
            console.log(`📊 Total stored elements: ${totalElements}`);
            if (stored.timestamp) {
                console.log(`🕒 Last saved: ${new Date(stored.timestamp).toLocaleString()}`);
            }
            
            return stored;
        } catch (error) {
            console.error('❌ Error debugging stored positions:', error);
            return null;
        }
    }
    
    /**
     * Deactivate all modes and transition their elements off-screen
     */
    deactivateAllModes() {
        // Reset all toggle button states
        this.workflowToggle.classList.remove('active');
        this.eisenhowerToggle.classList.remove('active');
        this.opportunityToggle.classList.remove('active');
        this.knowledgeGraphToggle.classList.remove('active');
        
        // Reset button styles
        [this.workflowToggle, this.eisenhowerToggle, this.opportunityToggle, this.knowledgeGraphToggle].forEach(button => {
            button.style.background = '';
            button.style.color = '';
        });
        
        // Transition elements off-screen for each mode
        this.deactivateWorkflowMode();
        this.deactivateMatrixMode();
        this.deactivateOpportunitiesMode();
        this.deactivateKnowledgeGraphMode();
    }
    
    /**
     * Activate workflow mode
     */
    activateWorkflowMode() {
        this.workflowToggle.classList.add('active');
        this.workflowToggle.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
        this.workflowToggle.style.color = 'white';
        
        // Restore saved positions first
        this.restoreWorkflowPositions();
        
        // Then show workflow elements (nodes, flowlines, etc.)
        this.showWorkflowElements();
        
        console.log('📋 Workflow mode activated');
    }
    
    /**
     * Activate matrix mode
     */
    activateMatrixMode() {
        this.eisenhowerToggle.classList.add('active');
        this.eisenhowerToggle.style.background = 'linear-gradient(135deg, #FF6B6B, #FF5252)';
        this.eisenhowerToggle.style.color = 'white';
        
        // Delegate to matrix controller using new activate method
        if (this.matrixController) {
            this.matrixController.activate();
        }
        
        console.log('📊 Matrix mode activated');
    }
    
    /**
     * Activate opportunities mode
     */
    activateOpportunitiesMode() {
        this.opportunityToggle.classList.add('active');
        this.opportunityToggle.style.background = 'linear-gradient(135deg, #9C27B0, #7B1FA2)';
        this.opportunityToggle.style.color = 'white';
        
        // Delegate to opportunity controller
        if (this.opportunityController) {
            document.dispatchEvent(new CustomEvent('toggleOpportunityMode', { 
                detail: { enabled: true } 
            }));
        }
        
        console.log('💼 Opportunities mode activated');
    }
    
    /**
     * Activate knowledge graph mode
     */
    activateKnowledgeGraphMode() {
        this.knowledgeGraphToggle.classList.add('active');
        this.knowledgeGraphToggle.style.background = 'linear-gradient(135deg, #76b3fa, #0763f7)';
        this.knowledgeGraphToggle.style.color = 'white';
        
        // Add KG mode class to canvas
        const canvas = document.getElementById('canvas');
        canvas.classList.add('kg-mode');
        
        // Delegate to KG controller
        if (window.kgController) {
            window.kgController.activate();
        } else {
            console.warn('Knowledge Graph Controller not available yet');
        }
        
        console.log('🧠 Knowledge Graph mode activated');
    }
    
    /**
     * Deactivate workflow mode
     */
    deactivateWorkflowMode() {
        // Hide workflow elements with transitions
        this.hideWorkflowElements();
    }
    
    /**
     * Deactivate matrix mode
     */
    deactivateMatrixMode() {
        // Delegate to matrix controller using new deactivate method
        if (this.matrixController && this.matrixController.isMatrixMode) {
            this.matrixController.deactivate();
        }
    }
    
    /**
     * Deactivate opportunities mode
     */
    deactivateOpportunitiesMode() {
        // Delegate to opportunity controller
        if (this.opportunityController && this.opportunityController.isInOpportunityMode()) {
            document.dispatchEvent(new CustomEvent('toggleOpportunityMode', { 
                detail: { enabled: false } 
            }));
        }
    }
    
    /**
     * Deactivate knowledge graph mode
     */
    deactivateKnowledgeGraphMode() {
        // Remove KG mode class from canvas
        const canvas = document.getElementById('canvas');
        canvas.classList.remove('kg-mode');
        
        // Delegate to KG controller
        if (window.kgController) {
            window.kgController.deactivate();
        }
    }
    
    /**
     * Show workflow elements (nodes, flowlines, etc.)
     */
    showWorkflowElements() {
        const elements = [
            ...document.querySelectorAll('.node'),
            ...document.querySelectorAll('.task-node'),
            ...document.querySelectorAll('.flowline'),
            ...document.querySelectorAll('.next-action-slot')
        ];
        
        elements.forEach(element => {
            if (element) {
                element.style.display = 'block';
                element.style.opacity = '0';
                element.style.transform = 'translateY(20px)';
                
                // Force reflow
                element.offsetHeight;
                
                element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
        
        // Clear transitions after animation
        setTimeout(() => {
            elements.forEach(element => {
                if (element) {
                    element.style.transition = '';
                    element.style.transform = '';
                }
            });
        }, 500);
    }
    
    /**
     * Hide workflow elements
     */
    hideWorkflowElements() {
        const elements = [
            ...document.querySelectorAll('.node'),
            ...document.querySelectorAll('.task-node'),
            ...document.querySelectorAll('.flowline'),
            ...document.querySelectorAll('.next-action-slot')
        ];
        
        elements.forEach(element => {
            if (element && element.style.display !== 'none') {
                element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                element.style.opacity = '0';
                element.style.transform = 'translateY(-20px)';
                
                setTimeout(() => {
                    element.style.display = 'none';
                }, 500);
            }
        });
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
            'addButton', 'addContextMenu', 'nodeTypeMenu', 'workflowButton', 'workflowContextMenu',
            'taskModal', 'taskNameInput', 'taskModalCancel', 'taskModalCreate',
            'advanceTaskModal', 'advanceOptions', 'advanceModalCancel',
            'loadWorkflowInput', 'appendWorkflowInput', 'tagModal', 'currentTags',
            'tagCategoryDropdown', 'tagOptionDropdown', 'tagDateInput', 'tagDescriptionInput',
            'tagLinkInput', 'tagCompletedInput', 'tagModalCancel', 'tagModalAdd', 'tagModalSave',
            'tagContextMenu', 'tagAttributeMenu', 'tagDatePicker', 'workflowToggle', 'eisenhowerToggle', 'eisenhowerMatrix', 'opportunityToggle', 'knowledgeGraphToggle',
            'reassignTasksModal', 'reassignTasksList', 'reassignOptions', 'reassignModalCancel', 'reassignModalConfirm',
            'opportunityModal', 'opportunityTitle', 'opportunityDescription', 'opportunityStatus', 'opportunityTags',
            'opportunityValue', 'opportunityPriority', 'opportunityDeadline', 'opportunityContact', 'opportunityNotes',
            'opportunityModalCancel', 'opportunityModalExport', 'opportunityModalCreate',
            'taskEditModal', 'taskEditName', 'taskEditDescription', 'taskEditStatus', 'taskEditPriority',
            'taskEditDueDate', 'taskEditOpportunity', 'taskEditEstimatedHours', 'taskEditAssignedTo',
            'taskEditModalCancel', 'taskEditModalSave'
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
        
        // Initialize workflow ingestion service (Phase 3: Vector Search Integration)
        this.initializeWorkflowIngestion();
        
        // Set default mode to workflow
        setTimeout(() => {
            this.setMode('workflow');
        }, 100);
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
        
        // Workflow button and context menu event listeners
        this.setupWorkflowButtonEventListeners();
        
        // File input event listeners (still needed for actual file loading)
        this.loadWorkflowInput.addEventListener('change', (e) => this.loadWorkflow(e));
        this.appendWorkflowInput.addEventListener('change', (e) => this.appendWorkflow(e));
        
        // Mode toggle event listeners - exclusive toggle system
        this.workflowToggle.addEventListener('click', () => this.setMode('workflow'));
        this.eisenhowerToggle.addEventListener('click', () => this.setMode('matrix'));
        this.opportunityToggle.addEventListener('click', () => this.setMode('opportunities'));
        this.knowledgeGraphToggle.addEventListener('click', () => this.setMode('knowledgeGraph'));
        
        // Tag modal event listeners are now handled by ModalManager
        // Note: Tag category dropdown change listener is kept here as it's tag logic, not modal management
        
        // Note: Tag category dropdown change is now handled by TagManager
        
        // Tag modal click outside listener is now handled by ModalManager
        
        // Note: Tag context menu event listeners are now handled by ContextMenuManager
        
        // Add button context menu event listeners
        this.setupAddButtonEventListeners();
        
        // Opportunity modal event listeners
        this.setupOpportunityModalEventListeners();
        
        // Task edit modal event listeners
        this.setupTaskEditModalEventListeners();
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
        } else if (addType === 'task') {
            // Hide all context menus
            this.hideAllAddMenus();
            
            // Show task modal using ModalManager
            if (this.modalManager && typeof this.modalManager.showTaskModal === 'function') {
                this.modalManager.showTaskModal();
            } else {
                console.warn('ModalManager or showTaskModal method not available');
            }
        } else if (addType === 'opportunity') {
            // Hide all context menus
            this.hideAllAddMenus();
            
            // Show opportunity modal
            this.showOpportunityModal();
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
    
    // ==================== WORKFLOW BUTTON CONTEXT MENU METHODS ====================
    
    setupWorkflowButtonEventListeners() {
        // Workflow button click to show context menu
        this.workflowButton.addEventListener('click', (e) => this.showWorkflowContextMenu(e));
        
        // Workflow context menu item clicks
        this.workflowContextMenu.addEventListener('click', (e) => this.handleWorkflowContextMenuClick(e));
        
        // Global click to hide workflow menu
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#workflowButton') && 
                !e.target.closest('#workflowContextMenu')) {
                this.hideWorkflowContextMenu();
            }
        });
    }
    
    showWorkflowContextMenu(event) {
        event.stopPropagation();
        
        // Hide other menus first
        this.hideAllAddMenus();
        
        const rect = this.workflowButton.getBoundingClientRect();
        this.workflowContextMenu.style.left = `${rect.left}px`;
        this.workflowContextMenu.style.top = `${rect.bottom + 5}px`;
        this.workflowContextMenu.style.display = 'block';
        
        console.log('ProcessFlowDesigner: Workflow context menu shown');
    }
    
    hideWorkflowContextMenu() {
        if (this.workflowContextMenu) {
            this.workflowContextMenu.style.display = 'none';
        }
    }
    
    handleWorkflowContextMenuClick(event) {
        event.stopPropagation();
        
        const menuItem = event.target.closest('.menu-item');
        if (!menuItem) return;
        
        const action = menuItem.dataset.workflowAction;
        
        // Hide menu immediately
        this.hideWorkflowContextMenu();
        
        // Handle the action
        switch (action) {
            case 'save':
                this.saveWorkflow();
                break;
            case 'load':
                this.loadWorkflowInput.click();
                break;
            case 'append':
                this.appendWorkflowInput.click();
                break;
            default:
                console.warn('ProcessFlowDesigner: Unknown workflow action:', action);
                break;
        }
        
        console.log(`ProcessFlowDesigner: Workflow action "${action}" executed`);
    }
    
    // ==================== END WORKFLOW BUTTON CONTEXT MENU METHODS ====================
    
    // ==================== OPPORTUNITY MODAL METHODS ====================
    
    setupOpportunityModalEventListeners() {
        // Opportunity modal buttons
        if (this.opportunityModalCancel) {
            this.opportunityModalCancel.addEventListener('click', () => this.hideOpportunityModal());
        }
        
        if (this.opportunityModalCreate) {
            this.opportunityModalCreate.addEventListener('click', () => this.createOpportunity());
        }
        
        if (this.opportunityModalExport) {
            this.opportunityModalExport.addEventListener('click', () => this.createAndExportOpportunity());
        }
        
        // Modal backdrop click to close
        if (this.opportunityModal) {
            this.opportunityModal.addEventListener('click', (e) => {
                if (e.target === this.opportunityModal) {
                    this.hideOpportunityModal();
                }
            });
        }
    }
    
    showOpportunityModal() {
        if (!this.opportunityModal) {
            console.error('Opportunity modal not found');
            return;
        }
        
        // Reset form
        this.resetOpportunityForm();
        
        // Show modal
        this.opportunityModal.style.display = 'block';
        
        // Focus on title field
        if (this.opportunityTitle) {
            this.opportunityTitle.focus();
        }
    }
    
    hideOpportunityModal() {
        if (this.opportunityModal) {
            this.opportunityModal.style.display = 'none';
        }
    }
    
    resetOpportunityForm() {
        // Reset all form fields
        if (this.opportunityTitle) this.opportunityTitle.value = '';
        if (this.opportunityDescription) this.opportunityDescription.value = '';
        if (this.opportunityStatus) this.opportunityStatus.value = 'active';
        if (this.opportunityTags) this.opportunityTags.value = '';
        if (this.opportunityValue) this.opportunityValue.value = '';
        if (this.opportunityPriority) this.opportunityPriority.value = 'medium';
        if (this.opportunityDeadline) this.opportunityDeadline.value = '';
        if (this.opportunityContact) this.opportunityContact.value = '';
        if (this.opportunityNotes) this.opportunityNotes.value = '';
    }
    
    validateOpportunityForm() {
        const errors = [];
        
        // Required fields validation
        if (!this.opportunityTitle || !this.opportunityTitle.value.trim()) {
            errors.push('Title is required');
        }
        
        if (!this.opportunityDescription || !this.opportunityDescription.value.trim()) {
            errors.push('Description is required');
        }
        
        if (!this.opportunityStatus || !this.opportunityStatus.value) {
            errors.push('Status is required');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    createOpportunityData() {
        // Create opportunity object following the schema
        const opportunity = {
            opportunity_id: `opp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: this.opportunityTitle.value.trim(),
            description: this.opportunityDescription.value.trim(),
            status: this.opportunityStatus.value,
            tags: this.opportunityTags.value ? this.opportunityTags.value.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
            created_at: new Date().toISOString(),
            metadata: {
                source: 'manual'  // Mark as manually created
            }
        };
        
        // Add optional metadata fields
        if (this.opportunityValue.value) {
            opportunity.metadata.value = parseFloat(this.opportunityValue.value);
        }
        
        if (this.opportunityPriority.value) {
            opportunity.metadata.priority = this.opportunityPriority.value;
        }
        
        if (this.opportunityDeadline.value) {
            opportunity.metadata.deadline = this.opportunityDeadline.value;
        }
        
        if (this.opportunityContact.value.trim()) {
            opportunity.metadata.contact_person = this.opportunityContact.value.trim();
        }
        
        if (this.opportunityNotes.value.trim()) {
            opportunity.metadata.notes = this.opportunityNotes.value.trim();
        }
        
        return opportunity;
    }
    
    createOpportunity() {
        // Validate form
        const validation = this.validateOpportunityForm();
        if (!validation.isValid) {
            alert('Please fix the following errors:\n' + validation.errors.join('\n'));
            return;
        }
        
        // Create opportunity data
        const opportunity = this.createOpportunityData();
        
        // Add to opportunity controller
        if (this.opportunityController && typeof this.opportunityController.addOpportunity === 'function') {
            this.opportunityController.addOpportunity(opportunity);
        } else {
            console.warn('OpportunityController not available - opportunity created locally');
        }
        
        // Hide modal
        this.hideOpportunityModal();
        
        // Show success message
        alert(`Opportunity "${opportunity.title}" created successfully!`);
        
        console.log('Created opportunity:', opportunity);
    }
    
    createAndExportOpportunity() {
        // Validate form
        const validation = this.validateOpportunityForm();
        if (!validation.isValid) {
            alert('Please fix the following errors:\n' + validation.errors.join('\n'));
            return;
        }
        
        // Create opportunity data
        const opportunity = this.createOpportunityData();
        
        // Add to opportunity controller
        if (this.opportunityController && typeof this.opportunityController.addOpportunity === 'function') {
            this.opportunityController.addOpportunity(opportunity);
        } else {
            console.warn('OpportunityController not available - opportunity created locally');
        }
        
        // Export as JSON file
        this.exportOpportunityAsJSON(opportunity);
        
        // Hide modal
        this.hideOpportunityModal();
        
        // Show success message
        alert(`Opportunity "${opportunity.title}" created and exported successfully!`);
        
        console.log('Created and exported opportunity:', opportunity);
    }
    
    exportOpportunityAsJSON(opportunity) {
        // Create JSON blob
        const jsonContent = JSON.stringify(opportunity, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `opportunity-${opportunity.opportunity_id}.json`;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        URL.revokeObjectURL(url);
    }
    
    // ==================== END OPPORTUNITY MODAL METHODS ====================
    
    // ==================== TASK EDIT MODAL METHODS ====================
    
    setupTaskEditModalEventListeners() {
        // Task edit modal buttons
        if (this.taskEditModalCancel) {
            this.taskEditModalCancel.addEventListener('click', () => this.hideTaskEditModal());
        }
        
        if (this.taskEditModalSave) {
            this.taskEditModalSave.addEventListener('click', () => this.saveTaskEdit());
        }
        
        // Modal backdrop click to close
        if (this.taskEditModal) {
            this.taskEditModal.addEventListener('click', (e) => {
                if (e.target === this.taskEditModal) {
                    this.hideTaskEditModal();
                }
            });
        }
    }
    
    showTaskEditModal(taskNode) {
        if (!this.taskEditModal) {
            console.error('Task edit modal not found');
            return;
        }
        
        if (!taskNode) {
            console.error('No task node provided for editing');
            return;
        }
        
        // Store reference to the task being edited
        this.editingTaskNode = taskNode;
        
        // Populate form with current task data
        this.populateTaskEditForm(taskNode);
        
        // Populate opportunities dropdown
        this.populateOpportunityDropdown();
        
        // Show modal
        this.taskEditModal.style.display = 'block';
        
        // Focus on name field
        if (this.taskEditName) {
            this.taskEditName.focus();
            this.taskEditName.select();
        }
    }
    
    hideTaskEditModal() {
        if (this.taskEditModal) {
            this.taskEditModal.style.display = 'none';
        }
        this.editingTaskNode = null;
    }
    
    populateTaskEditForm(taskNode) {
        // Get current task text
        const taskTextElement = taskNode.querySelector('.task-text') || taskNode.querySelector('.node-text');
        const currentText = taskTextElement ? taskTextElement.textContent.trim() : '';
        
        // Populate basic fields
        if (this.taskEditName) this.taskEditName.value = currentText;
        if (this.taskEditDescription) this.taskEditDescription.value = taskNode.dataset.description || '';
        if (this.taskEditStatus) this.taskEditStatus.value = taskNode.dataset.status || 'not_started';
        if (this.taskEditPriority) this.taskEditPriority.value = taskNode.dataset.priority || 'medium';
        if (this.taskEditDueDate) this.taskEditDueDate.value = taskNode.dataset.dueDate || '';
        if (this.taskEditOpportunity) this.taskEditOpportunity.value = taskNode.dataset.opportunityId || '';
        if (this.taskEditEstimatedHours) this.taskEditEstimatedHours.value = taskNode.dataset.estimatedHours || '';
        if (this.taskEditAssignedTo) this.taskEditAssignedTo.value = taskNode.dataset.assignedTo || '';
    }
    
    populateOpportunityDropdown() {
        if (!this.taskEditOpportunity) return;
        
        // Clear existing options except the first one
        this.taskEditOpportunity.innerHTML = '<option value="">No opportunity linked</option>';
        
        // Get opportunities from OpportunityController
        const opportunities = this.opportunityController ? this.opportunityController.getAllOpportunities() : [];
        
        // Add opportunity options
        opportunities.forEach(opportunity => {
            const option = document.createElement('option');
            option.value = opportunity.opportunity_id;
            option.textContent = `${opportunity.title} (${opportunity.status})`;
            this.taskEditOpportunity.appendChild(option);
        });
        
        console.log(`TaskEdit: Populated ${opportunities.length} opportunities in dropdown`);
    }
    
    validateTaskEditForm() {
        const errors = [];
        
        // Required field validation
        if (!this.taskEditName || !this.taskEditName.value.trim()) {
            errors.push('Task name is required');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    saveTaskEdit() {
        // Validate form
        const validation = this.validateTaskEditForm();
        if (!validation.isValid) {
            alert('Please fix the following errors:\n' + validation.errors.join('\n'));
            return;
        }
        
        if (!this.editingTaskNode) {
            console.error('No task node being edited');
            return;
        }
        
        // Update task with new data
        this.updateTaskData(this.editingTaskNode);
        
        // Hide modal
        this.hideTaskEditModal();
        
        // Show success message
        const taskName = this.taskEditName.value.trim();
        alert(`Task "${taskName}" updated successfully!`);
        
        console.log('Updated task:', this.editingTaskNode);
    }
    
    updateTaskData(taskNode) {
        // Update task text in DOM
        const taskTextElement = taskNode.querySelector('.task-text') || taskNode.querySelector('.node-text');
        if (taskTextElement) {
            taskTextElement.textContent = this.taskEditName.value.trim();
        }
        
        // Update data attributes
        taskNode.dataset.description = this.taskEditDescription.value.trim();
        taskNode.dataset.status = this.taskEditStatus.value;
        taskNode.dataset.priority = this.taskEditPriority.value;
        taskNode.dataset.dueDate = this.taskEditDueDate.value;
        taskNode.dataset.opportunityId = this.taskEditOpportunity.value;
        taskNode.dataset.estimatedHours = this.taskEditEstimatedHours.value;
        taskNode.dataset.assignedTo = this.taskEditAssignedTo.value.trim();
        
        // Update last modified timestamp
        taskNode.dataset.lastModified = new Date().toISOString();
        
        // Update opportunity link display
        this.updateOpportunityLinkDisplay(taskNode);
        
        // Update relationships in relationship tracker
        this.syncTaskRelationships(taskNode);
        
        // Dispatch event for other components
        document.dispatchEvent(new CustomEvent('taskUpdated', { 
            detail: { taskNode, opportunityId: this.taskEditOpportunity.value } 
        }));
    }
    
    
    /**
     * Synchronize task relationships with the relationship tracker
     * @param {HTMLElement} taskNode - The task node element
     */
    syncTaskRelationships(taskNode) {
        if (!this.relationshipTracker || !taskNode) return;
        
        const taskId = taskNode.dataset.id;
        if (!taskId) return;
        
        // Remove existing relationships for this task
        const existingRelationships = this.relationshipTracker.getEntityRelationships(
            this.relationshipTracker.entityTypes.TASK, 
            taskId
        );
        
        existingRelationships.forEach(rel => {
            if (rel.metadata && rel.metadata.system) {
                this.relationshipTracker.removeRelationship(
                    rel.sourceType, rel.sourceId,
                    rel.targetType, rel.targetId,
                    rel.relationshipType
                );
            }
        });
        
        // Add current relationships
        
        // Task anchored to node
        if (taskNode.dataset.anchoredTo) {
            this.relationshipTracker.addRelationship(
                this.relationshipTracker.entityTypes.TASK, taskId,
                this.relationshipTracker.entityTypes.NODE, taskNode.dataset.anchoredTo,
                this.relationshipTracker.relationshipTypes.ANCHORED_TO,
                { system: true }
            );
        }
        
        // Task linked to opportunity
        if (taskNode.dataset.opportunityId) {
            this.relationshipTracker.addRelationship(
                this.relationshipTracker.entityTypes.TASK, taskId,
                this.relationshipTracker.entityTypes.OPPORTUNITY, taskNode.dataset.opportunityId,
                this.relationshipTracker.relationshipTypes.LINKED_TO,
                { system: true }
            );
        }
        
        // Task tags
        if (taskNode.dataset.tags) {
            try {
                const tags = JSON.parse(taskNode.dataset.tags);
                tags.forEach((tag, index) => {
                    const tagId = `${taskId}_tag_${index}`;
                    this.relationshipTracker.addRelationship(
                        this.relationshipTracker.entityTypes.TASK, taskId,
                        this.relationshipTracker.entityTypes.TAG, tagId,
                        this.relationshipTracker.relationshipTypes.TAGGED_WITH,
                        { 
                            system: true,
                            tagData: tag,
                            tagIndex: index
                        }
                    );
                });
            } catch (error) {
                console.warn('syncTaskRelationships: Error parsing task tags:', error);
            }
        }
    }
    
    /**
     * Synchronize all relationships from current application state
     */
    syncAllRelationships() {
        if (!this.relationshipTracker) return;
        
        console.log('ProcessFlowDesigner: Synchronizing all relationships');
        
        // Build application state object
        const appState = {
            taskNodes: this.taskNodes,
            flowlines: this.flowlineManager ? this.flowlineManager.getAllFlowlines() : [],
            opportunities: this.opportunityController ? this.opportunityController.getAllOpportunities() : []
        };
        
        // Sync with relationship tracker
        this.relationshipTracker.syncFromApplicationState(appState);
        
        // Log statistics
        const stats = this.relationshipTracker.getStats();
        console.log('Relationship Statistics:', stats);
    }
    
    /**
     * Get relationship statistics for debugging and analysis
     */
    getRelationshipStats() {
        if (!this.relationshipTracker) return null;
        return this.relationshipTracker.getStats();
    }
    
    /**
     * Export all relationship data
     */
    exportRelationshipData() {
        if (!this.relationshipTracker) return null;
        return this.relationshipTracker.exportRelationships();
    }
    
    /**
     * Find entities related to a given entity
     * @param {string} entityType - Type of the source entity
     * @param {string} entityId - ID of the source entity  
     * @param {string} targetEntityType - Type of entities to find
     * @param {string} relationshipType - Optional relationship type filter
     */
    findRelatedEntities(entityType, entityId, targetEntityType, relationshipType = null) {
        if (!this.relationshipTracker) return [];
        return this.relationshipTracker.findRelatedEntities(entityType, entityId, targetEntityType, relationshipType);
    }

    // ==================== END TASK EDIT MODAL METHODS ====================
    
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
    
    /**
     * Create opportunity link display div for a task
     * @param {HTMLElement} taskBanner - The task banner element
     * @returns {HTMLElement|null} Opportunity link div or null if no opportunity linked
     */
    createOpportunityLinkDisplay(taskBanner) {
        if (!taskBanner || !taskBanner.dataset.opportunityId) {
            return null;
        }
        
        const opportunityId = taskBanner.dataset.opportunityId;
        const opportunity = this.opportunityController ? this.opportunityController.getOpportunityById(opportunityId) : null;
        
        if (!opportunity) {
            console.warn(`Task ${taskBanner.dataset.id} linked to non-existent opportunity ${opportunityId}`);
            return null;
        }
        
        const opportunityLinkDiv = document.createElement('div');
        opportunityLinkDiv.className = 'task-opportunity-link';
        opportunityLinkDiv.dataset.opportunityId = opportunityId;
        
        // Create opportunity indicator with name and status
        opportunityLinkDiv.innerHTML = `
            <div class="opportunity-indicator">
                <div class="opportunity-icon">🔗</div>
                <div class="opportunity-info">
                    <div class="opportunity-name">${opportunity.title}</div>
                    <div class="opportunity-status">${opportunity.status || 'active'}</div>
                </div>
            </div>
        `;
        
        // Add click handler to navigate to opportunity
        opportunityLinkDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            this.navigateToOpportunity(opportunityId);
        });
        
        return opportunityLinkDiv;
    }
    
    /**
     * Navigate to opportunity view and highlight specific opportunity
     * @param {string} opportunityId - The opportunity ID to highlight
     */
    navigateToOpportunity(opportunityId) {
        // Switch to opportunity view if not already there
        if (!this.opportunityController || !this.opportunityController.isInOpportunityMode()) {
            this.setMode('opportunities');
        }
        
        // Highlight the specific opportunity card after a short delay
        setTimeout(() => {
            const opportunityCard = document.querySelector(`[data-opportunity-id="${opportunityId}"]`);
            if (opportunityCard) {
                opportunityCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                opportunityCard.classList.add('highlighted');
                setTimeout(() => opportunityCard.classList.remove('highlighted'), 2000);
            }
        }, 600);
    }
    
    /**
     * Update opportunity link display for a task
     * @param {HTMLElement} taskBanner - The task banner element
     */
    updateOpportunityLinkDisplay(taskBanner) {
        if (!taskBanner) return;
        
        const taskContainer = taskBanner.parentNode;
        if (!taskContainer) return;
        
        // Remove existing opportunity link
        const existingLink = taskContainer.querySelector('.task-opportunity-link');
        if (existingLink) {
            existingLink.remove();
        }
        
        // Create new opportunity link if needed
        const opportunityLinkDiv = this.createOpportunityLinkDisplay(taskBanner);
        if (opportunityLinkDiv) {
            // Insert between task-banner and task-tags-area
            const tagsArea = taskContainer.querySelector('.task-tags-area');
            if (tagsArea) {
                taskContainer.insertBefore(opportunityLinkDiv, tagsArea);
            }
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
        
        // Create opportunity link display (between banner and tags)
        const opportunityLinkDiv = this.createOpportunityLinkDisplay(taskBanner);
        
        // Add vertical structure: banner on top, opportunity link, tags area below
        taskContainer.appendChild(taskBanner);
        if (opportunityLinkDiv) {
            taskContainer.appendChild(opportunityLinkDiv);
        }
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
        
        // Get opportunities data
        const opportunities = this.opportunityController ? this.opportunityController.getAllOpportunities() : [];
        
        // Get relationships data
        const relationshipData = this.relationshipTracker ? this.relationshipTracker.exportRelationships() : null;
        
        // Count task-opportunity links
        const taskOpportunityLinks = [...new Set([...this.nodes, ...this.taskNodes])]
            .filter(node => node.dataset.opportunityId)
            .length;
        
        const workflow = {
            name: `Workflow ${new Date().toLocaleDateString()}`,
            version: "2.0.0", // Updated for new features
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
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
                    
                    // Enhanced task fields (new in v2.0)
                    description: node.dataset.description || null,
                    opportunityId: node.dataset.opportunityId || null,
                    priority: node.dataset.priority || null,
                    dueDate: node.dataset.dueDate || null,
                    status: node.dataset.status || null,
                    estimatedHours: node.dataset.estimatedHours ? parseFloat(node.dataset.estimatedHours) : null,
                    assignedTo: node.dataset.assignedTo || null,
                    lastModified: node.dataset.lastModified || null,
                    
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
            // Opportunities data (NEW in v2.0)
            opportunities: opportunities,
            
            // Relationship tracking data (NEW in v2.0)
            relationships: relationshipData ? {
                data: relationshipData,
                version: relationshipData.version || '1.0.0'
            } : null,
            
            // Enhanced metadata (NEW in v2.0)
            metadata: {
                description: 'Process flow workflow with opportunities and relationship tracking',
                author: 'Process Flow Designer',
                taskOpportunityLinks: taskOpportunityLinks,
                totalRelationships: relationshipData ? relationshipData.stats.totalRelationships : 0,
                exportedFeatures: [
                    'nodes',
                    'tasks',
                    'flowlines',
                    'opportunities',
                    'relationships',
                    'enhanced_task_fields',
                    'task_opportunity_linking'
                ]
            },
            
            settings: {
                flowlineType: this.flowlineTypeDropdown.value
            },
            // Structured sections for easier access and analysis
            structured: {
                tasks: this.taskNodes.map(node => ({
                    id: node.dataset.id,
                    type: 'task',
                    text: this.extractNodeText(node),
                    description: node.dataset.description || null,
                    tags: node.dataset.tags ? JSON.parse(node.dataset.tags) : [],
                    
                    // Enhanced task fields (NEW in v2.0)
                    opportunityId: node.dataset.opportunityId || null,
                    priority: node.dataset.priority || 'medium',
                    dueDate: node.dataset.dueDate || null,
                    status: node.dataset.status || 'not_started',
                    estimatedHours: node.dataset.estimatedHours ? parseFloat(node.dataset.estimatedHours) : null,
                    assignedTo: node.dataset.assignedTo || null,
                    lastModified: node.dataset.lastModified || null,
                    
                    position: {
                        left: parseInt(node.style.left) || 0,
                        top: parseInt(node.style.top) || 0
                    },
                    anchoredTo: node.dataset.anchoredTo || null,
                    previousAnchor: node.dataset.previousAnchor || null,
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
                    opportunityCount: opportunities.length,
                    taskOpportunityLinks: taskOpportunityLinks,
                    totalTagCount: this.taskNodes.reduce((count, node) => {
                        const tags = node.dataset.tags ? JSON.parse(node.dataset.tags) : [];
                        console.log(`Debug: Task ${node.dataset.id} has ${tags.length} tags:`, tags);
                        return count + tags.length;
                    }, 0),
                    relationshipCount: relationshipData ? relationshipData.stats.totalRelationships : 0
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
        
        console.log(`\n🎉 SAVE COMPLETED - Workflow saved successfully (v2.0.0 format)`);
        console.log(`📈 SAVE SUMMARY: ${summary.totalNodes} nodes, ${summary.taskCount} tasks, ${summary.opportunityCount} opportunities, ${summary.taskOpportunityLinks} task-opportunity links, ${summary.totalTagCount} tags, ${summary.flowlineCount} flowlines, ${summary.relationshipCount} relationships`);
        
        // Show final text values that were saved
        console.log(`\n📋 FINAL SAVED NODE TEXTS:`);
        workflow.nodes.forEach((nodeData, index) => {
            console.log(`  Node ${index + 1}: ID=${nodeData.id}, Type=${nodeData.type}, Text="${nodeData.text}", OpportunityId=${nodeData.opportunityId || 'None'}`);
        });
        
        if (opportunities.length > 0) {
            console.log(`\n💼 SAVED OPPORTUNITIES:`);
            opportunities.forEach((opp, index) => {
                console.log(`  Opportunity ${index + 1}: ID=${opp.opportunity_id}, Title="${opp.title}", Status=${opp.status}`);
            });
        }
        
        console.log(`\n🔚 SAVE WORKFLOW ENDED`);
        
        // Provide user feedback
        setTimeout(() => {
            const message = `Workflow saved successfully (v2.0.0)!\n\n` +
                          `📊 Summary:\n` +
                          `• ${summary.totalNodes} total nodes\n` +
                          `• ${summary.taskCount} tasks\n` +
                          `• ${summary.opportunityCount} opportunities\n` +
                          `• ${summary.taskOpportunityLinks} task-opportunity links\n` +
                          `• ${summary.totalTagCount} tags\n` +
                          `• ${summary.flowlineCount} flowlines\n` +
                          `• ${summary.relationshipCount} relationships`;
            alert(message);
        }, 100);
    }
    
    loadWorkflow(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const workflow = JSON.parse(e.target.result);
                
                // Check if this is a supported workflow format
                if (!workflow.version) {
                    throw new Error('Missing workflow version');
                }
                
                const supportedVersions = ['1.1', '2.0.0'];
                if (!supportedVersions.includes(workflow.version)) {
                    throw new Error(`Unsupported workflow version: ${workflow.version}. Supported versions: ${supportedVersions.join(', ')}`);
                }
                
                this.clearWorkflow();
                this.deserializeWorkflow(workflow);
                
                // Ingest workflow for vector search
                if (this.workflowIngestion) {
                    await this.workflowIngestion.ingestWorkflow(workflow);
                }
                
                // Provide detailed loading information
                const nodeCount = workflow.nodes ? workflow.nodes.length : 0;
                const taskCount = workflow.structured ? workflow.structured.summary.taskCount : 
                    (workflow.nodes ? workflow.nodes.filter(n => n.type === 'task').length : 0);
                const tagCount = workflow.structured ? workflow.structured.summary.totalTagCount : 
                    (workflow.nodes ? workflow.nodes.reduce((count, node) => count + (node.tags ? node.tags.length : 0), 0) : 0);
                const flowlineCount = workflow.flowlines ? workflow.flowlines.length : 0;
                const opportunityCount = workflow.opportunities ? workflow.opportunities.length : 0;
                const taskOpportunityLinks = workflow.metadata ? workflow.metadata.taskOpportunityLinks : 
                    (workflow.nodes ? workflow.nodes.filter(n => n.opportunityId).length : 0);
                const relationshipCount = workflow.relationships ? workflow.relationships.data.stats.totalRelationships : 0;
                
                console.log(`Workflow loaded successfully (${workflow.version} format)`);
                console.log(`Loaded: ${nodeCount} nodes, ${taskCount} tasks, ${opportunityCount} opportunities, ${taskOpportunityLinks} task-opportunity links, ${tagCount} tags, ${flowlineCount} flowlines, ${relationshipCount} relationships`);
                
                const message = `Workflow loaded successfully (${workflow.version})!\n\n` +
                              `📊 Loaded:\n` +
                              `• ${nodeCount} total nodes\n` +
                              `• ${taskCount} tasks\n` +
                              `• ${opportunityCount} opportunities\n` +
                              `• ${taskOpportunityLinks} task-opportunity links\n` +
                              `• ${tagCount} tags\n` +
                              `• ${flowlineCount} flowlines\n` +
                              `• ${relationshipCount} relationships`;
                alert(message);
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
        reader.onload = async (e) => {
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
                
                // Ingest appended workflow for vector search
                if (this.workflowIngestion) {
                    await this.workflowIngestion.ingestWorkflow(workflow);
                }
                
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
        
        // Clear workflow ingestion data
        if (this.workflowIngestion) {
            this.workflowIngestion.clearSession();
        }
        
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
        
        // Clear opportunities (NEW in v2.0.0)
        if (this.opportunityController) {
            console.log('Debug: Clearing opportunities...');
            // Clear the opportunities array but preserve the controller
            this.opportunityController.opportunities = [];
        }
        
        // Clear relationships (NEW in v2.0.0)  
        if (this.relationshipTracker) {
            console.log('Debug: Clearing relationships...');
            this.relationshipTracker.relationships.clear();
            this.relationshipTracker.relationshipMetadata.clear();
            this.relationshipTracker.updateStats();
        }
        
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
        
        // Load opportunities (NEW in v2.0.0)
        if (workflow.opportunities && this.opportunityController) {
            console.log(`Loading ${workflow.opportunities.length} opportunities`);
            workflow.opportunities.forEach(opportunityData => {
                this.opportunityController.addOpportunity(opportunityData);
            });
        }
        
        // Load relationships (NEW in v2.0.0)
        if (workflow.relationships && this.relationshipTracker) {
            console.log('Loading relationship data');
            this.relationshipTracker.importRelationships(workflow.relationships.data);
        }
        
        // Reposition all task nodes according to their anchoring after everything is loaded
        console.log(`Debug: After loading, taskNodes array has ${this.taskNodes.length} elements:`, this.taskNodes.map(n => ({ id: n.dataset.id, type: n.dataset.type })));
        this.taskNodes.forEach(taskNode => {
            console.log(`Debug: Processing task ${taskNode.dataset.id}:`);
            console.log(`  - anchoredTo: ${taskNode.dataset.anchoredTo}`);
            console.log(`  - slot: ${taskNode.dataset.slot}`);
            console.log(`  - opportunityId: ${taskNode.dataset.opportunityId}`);
            
            // Always reposition task nodes relative to their anchor nodes (ignore saved positions)
            if (taskNode.dataset.anchoredTo) {
                console.log(`Debug: Repositioning task ${taskNode.dataset.id} to anchor ${taskNode.dataset.anchoredTo}`);
                this.positionTaskInSlot(taskNode);
            } else {
                console.log(`Debug: Task ${taskNode.dataset.id} has no anchor, keeping saved position`);
            }
            
            // Update opportunity link display for loaded task nodes
            if (taskNode.dataset.opportunityId) {
                this.updateOpportunityLinkDisplay(taskNode);
            }
            
            // Update tags display for loaded task nodes
            console.log(`Debug: Updating tags display for task ${taskNode.dataset.id}, tags:`, taskNode.dataset.tags);
            this.updateTaskTagsDisplay(taskNode);
        });
        
        // Refresh relationships after all nodes are loaded
        if (this.relationshipTracker) {
            setTimeout(() => {
                this.syncAllRelationships();
                console.log('Synchronized relationships after workflow load');
            }, 100);
        }
        
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
            
            // Restore enhanced task fields (NEW in v2.0.0)
            if (nodeData.description) {
                taskBanner.dataset.description = nodeData.description;
            }
            if (nodeData.opportunityId) {
                taskBanner.dataset.opportunityId = nodeData.opportunityId;
            }
            if (nodeData.priority) {
                taskBanner.dataset.priority = nodeData.priority;
            }
            if (nodeData.dueDate) {
                taskBanner.dataset.dueDate = nodeData.dueDate;
            }
            if (nodeData.status) {
                taskBanner.dataset.status = nodeData.status;
            }
            if (nodeData.estimatedHours) {
                taskBanner.dataset.estimatedHours = nodeData.estimatedHours.toString();
            }
            if (nodeData.assignedTo) {
                taskBanner.dataset.assignedTo = nodeData.assignedTo;
            }
            if (nodeData.lastModified) {
                taskBanner.dataset.lastModified = nodeData.lastModified;
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
            
            // Create opportunity link display (between banner and tags)
            const opportunityLinkDiv = this.createOpportunityLinkDisplay(taskBanner);
            
            // Add vertical structure: banner on top, opportunity link, tags area below
            taskContainer.appendChild(taskBanner);
            if (opportunityLinkDiv) {
                taskContainer.appendChild(opportunityLinkDiv);
            }
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
    
    // ==================== WORKFLOW INGESTION (Phase 3) ====================
    
    /**
     * Initialize workflow ingestion service for vector search
     */
    async initializeWorkflowIngestion() {
        try {
            console.log('🔄 Initializing workflow ingestion for vector search...');
            
            // Import and initialize ingestion service
            const { getWorkflowIngestionService } = await import('./services/workflow-ingestion-service.js');
            this.workflowIngestion = getWorkflowIngestionService();
            
            // Initialize the service
            await this.workflowIngestion.initialize();
            
            console.log('✅ Workflow ingestion service ready');
            
        } catch (error) {
            console.warn('⚠️ Workflow ingestion initialization failed:', error);
            // Create fallback service
            this.workflowIngestion = {
                ingestWorkflow: async () => console.log('🔍 Ingestion service not available'),
                updateObject: async () => {},
                removeObject: () => {},
                searchSessionData: async () => ({ results: [], total: 0 }),
                clearSession: () => {},
                getSessionStats: () => ({ totalObjects: 0 })
            };
        }
    }
    
    // ==================== END WORKFLOW INGESTION ====================
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.processFlowDesigner = new ProcessFlowDesigner();
    
    // Initialize relationship tracking after a short delay to ensure all components are loaded
    setTimeout(() => {
        if (window.processFlowDesigner.syncAllRelationships) {
            window.processFlowDesigner.syncAllRelationships();
        }
    }, 500);
    
    // Make opportunity controller globally accessible for card actions
    window.opportunityController = window.processFlowDesigner.opportunityController;
});