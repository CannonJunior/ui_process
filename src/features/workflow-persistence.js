/**
 * Workflow Persistence - Handles save/load operations for workflows
 * Manages serialization and deserialization of complete workflow state
 */
export class WorkflowPersistence {
    constructor(context) {
        this.context = context;
        this.eventBus = context.eventBus;
        this.stateManager = context.stateManager;
        this.domService = context.getService('dom');
        this.validationService = context.getService('validation');
        
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     * @private
     */
    setupEventListeners() {
        this.eventBus.on('workflow.save', (filename) => this.saveWorkflow(filename));
        this.eventBus.on('workflow.load', (data) => this.loadWorkflow(data));
        this.eventBus.on('workflow.export', () => this.exportWorkflow());
        this.eventBus.on('workflow.import', (file) => this.importWorkflow(file));
    }

    /**
     * Save current workflow to JSON
     * @param {string} filename - Optional filename
     * @returns {Object} Workflow data object
     */
    saveWorkflow(filename = null) {
        try {
            const workflowData = this.serializeWorkflow();
            
            if (filename) {
                this.downloadWorkflow(workflowData, filename);
            }
            
            this.eventBus.emit('workflow.saved', { 
                data: workflowData, 
                filename: filename || 'workflow.json'
            });
            
            return workflowData;
        } catch (error) {
            console.error('Error saving workflow:', error);
            this.eventBus.emit('workflow.save.error', { error: error.message });
            throw error;
        }
    }

    /**
     * Load workflow from JSON data
     * @param {Object|string} data - Workflow data or JSON string
     */
    loadWorkflow(data) {
        try {
            let workflowData;
            
            if (typeof data === 'string') {
                workflowData = JSON.parse(data);
            } else {
                workflowData = data;
            }
            
            // Validate workflow data
            const validation = this.validateWorkflowData(workflowData);
            if (!validation.valid) {
                throw new Error(`Invalid workflow data: ${validation.errors.join(', ')}`);
            }
            
            // Clear current workflow
            this.clearCurrentWorkflow();
            
            // Load the workflow
            this.deserializeWorkflow(workflowData);
            
            this.eventBus.emit('workflow.loaded', { data: workflowData });
        } catch (error) {
            console.error('Error loading workflow:', error);
            this.eventBus.emit('workflow.load.error', { error: error.message });
            throw error;
        }
    }

    /**
     * Serialize current workflow state
     * @returns {Object} Serialized workflow data
     * @private
     */
    serializeWorkflow() {
        const nodeManager = this.context.getComponent('node');
        const taskManager = this.context.getComponent('task');
        const flowlineManager = this.context.getComponent('flowline');
        const tagSystem = this.context.getComponent('tag');
        const matrixVisualization = this.context.getComponent('matrix');
        const canvasManager = this.context.getComponent('canvas');
        
        // Get all nodes with accurate positions
        const nodes = this.serializeNodes();
        const tasks = this.serializeTasks();
        const flowlines = flowlineManager.exportFlowlinesData();
        const tags = this.serializeTags();
        const matrix = matrixVisualization ? matrixVisualization.exportMatrixData() : {};
        const canvas = this.serializeCanvasState();
        
        return {
            version: '2.0',
            timestamp: new Date().toISOString(),
            metadata: {
                nodeCount: nodes.length,
                taskCount: tasks.length,
                flowlineCount: flowlines.length,
                tagCount: tags.reduce((sum, task) => sum + task.tags.length, 0)
            },
            data: {
                nodes,
                tasks,
                flowlines,
                tags,
                matrix,
                canvas
            }
        };
    }

    /**
     * Serialize nodes with positions
     * @returns {Array} Serialized nodes
     * @private
     */
    serializeNodes() {
        const nodes = document.querySelectorAll('.node:not([data-type="task"])');
        const canvasManager = this.context.getComponent('canvas');
        const panOffset = canvasManager.getPanOffset();
        
        return Array.from(nodes).map(node => {
            const rect = node.getBoundingClientRect();
            const canvasRect = canvasManager.getBounds();
            
            return {
                id: node.dataset.id,
                type: node.dataset.type || 'node',
                text: node.querySelector('.node-text').textContent,
                position: {
                    x: rect.left - canvasRect.left + panOffset.x,
                    y: rect.top - canvasRect.top + panOffset.y
                },
                style: {
                    backgroundColor: node.style.backgroundColor || '',
                    color: node.style.color || ''
                }
            };
        });
    }

    /**
     * Serialize tasks with complete positioning data
     * @returns {Array} Serialized tasks
     * @private
     */
    serializeTasks() {
        const taskBanners = document.querySelectorAll('.task-banner[data-type="task"]');
        const canvasManager = this.context.getComponent('canvas');
        const panOffset = canvasManager.getPanOffset();
        const canvasRect = canvasManager.getBounds();
        
        return Array.from(taskBanners).map(taskBanner => {
            const taskContainer = taskBanner.closest('.task-container');
            const containerRect = taskContainer.getBoundingClientRect();
            
            // Get tags container position
            const tagsContainer = taskContainer.querySelector('.task-tags');
            const tagsRect = tagsContainer ? tagsContainer.getBoundingClientRect() : null;
            
            // Get next action slot position
            const nextActionSlot = taskContainer.querySelector('.next-action-slot');
            const slotRect = nextActionSlot ? nextActionSlot.getBoundingClientRect() : null;
            
            return {
                id: taskBanner.dataset.id,
                type: 'task',
                text: taskBanner.querySelector('.node-text').textContent,
                anchoredTo: taskBanner.dataset.anchoredTo || null,
                tags: JSON.parse(taskBanner.dataset.tags || '[]'),
                position: {
                    container: {
                        x: containerRect.left - canvasRect.left + panOffset.x,
                        y: containerRect.top - canvasRect.top + panOffset.y
                    },
                    tags: tagsRect ? {
                        x: tagsRect.left - canvasRect.left + panOffset.x,
                        y: tagsRect.top - canvasRect.top + panOffset.y
                    } : null,
                    slot: slotRect ? {
                        x: slotRect.left - canvasRect.left + panOffset.x,
                        y: slotRect.top - canvasRect.top + panOffset.y
                    } : null
                },
                style: {
                    backgroundColor: taskBanner.style.backgroundColor || '',
                    color: taskBanner.style.color || ''
                }
            };
        });
    }

    /**
     * Serialize tags data
     * @returns {Array} Serialized tags by task
     * @private
     */
    serializeTags() {
        const taskBanners = document.querySelectorAll('.task-banner[data-type="task"]');
        
        return Array.from(taskBanners).map(taskBanner => ({
            taskId: taskBanner.dataset.id,
            tags: JSON.parse(taskBanner.dataset.tags || '[]')
        }));
    }

    /**
     * Serialize canvas state
     * @returns {Object} Canvas state
     * @private
     */
    serializeCanvasState() {
        const canvasManager = this.context.getComponent('canvas');
        const panOffset = canvasManager.getPanOffset();
        
        return {
            panOffset: {
                x: panOffset.x,
                y: panOffset.y
            },
            zoom: 1.0 // For future zoom functionality
        };
    }

    /**
     * Deserialize and restore workflow
     * @param {Object} workflowData - Workflow data
     * @private
     */
    deserializeWorkflow(workflowData) {
        // Handle both old format (v1.1) and new format (v2.0)
        if (workflowData.version === '1.1') {
            // Delegate to legacy script.js deserializeWorkflow method
            console.log('WorkflowPersistence: Loading v1.1 format using legacy deserializer');
            
            // Check if app instance exists and has the old deserializeWorkflow method
            if (window.app && typeof window.app.deserializeWorkflow === 'function') {
                window.app.deserializeWorkflow(workflowData);
                return;
            } else {
                throw new Error('Legacy workflow loader not available for v1.1 format');
            }
        }
        
        // New format (v2.0)
        const { nodes, tasks, flowlines, tags, matrix, canvas } = workflowData.data;
        
        // Restore canvas state first
        if (canvas) {
            this.restoreCanvasState(canvas);
        }
        
        // Restore nodes
        if (nodes) {
            this.restoreNodes(nodes);
        }
        
        // Restore tasks with accurate positioning
        if (tasks) {
            this.restoreTasks(tasks);
        }
        
        // Restore flowlines
        if (flowlines) {
            setTimeout(() => {
                const flowlineManager = this.context.getComponent('flowline');
                flowlineManager.importFlowlinesData(flowlines);
            }, 100);
        }
        
        // Restore matrix state
        if (matrix) {
            setTimeout(() => {
                const matrixVisualization = this.context.getComponent('matrix');
                if (matrixVisualization) {
                    matrixVisualization.importMatrixData(matrix);
                }
            }, 200);
        }
    }

    /**
     * Restore nodes from data
     * @param {Array} nodesData - Nodes data
     * @private
     */
    restoreNodes(nodesData) {
        const nodeManager = this.context.getComponent('node');
        
        nodesData.forEach(nodeData => {
            try {
                const node = nodeManager.createNode(
                    nodeData.position.x,
                    nodeData.position.y,
                    nodeData.text,
                    nodeData.type
                );
                
                // Restore styling
                if (nodeData.style.backgroundColor) {
                    node.style.backgroundColor = nodeData.style.backgroundColor;
                }
                if (nodeData.style.color) {
                    node.style.color = nodeData.style.color;
                }
            } catch (error) {
                console.error('Error restoring node:', error);
            }
        });
    }

    /**
     * Restore tasks with accurate positioning
     * @param {Array} tasksData - Tasks data
     * @private
     */
    restoreTasks(tasksData) {
        const taskManager = this.context.getComponent('task');
        
        tasksData.forEach(taskData => {
            try {
                // Find anchor node if specified
                let anchorNode = null;
                if (taskData.anchoredTo) {
                    const nodeManager = this.context.getComponent('node');
                    anchorNode = nodeManager.findNodeById(taskData.anchoredTo);
                }
                
                // Create task
                const task = taskManager.createTask(
                    taskData.position.container.x,
                    taskData.position.container.y,
                    taskData.text,
                    anchorNode
                );
                
                // Restore tags
                if (taskData.tags && taskData.tags.length > 0) {
                    const taskBanner = task.querySelector('.task-banner');
                    taskBanner.dataset.tags = JSON.stringify(taskData.tags);
                    
                    // Update tags display
                    const tagSystem = this.context.getComponent('tag');
                    tagSystem.updateTaskTagsDisplay(taskBanner);
                }
                
                // Restore exact positioning after creation
                setTimeout(() => {
                    const taskContainer = task;
                    this.domService.setPosition(
                        taskContainer, 
                        taskData.position.container.x, 
                        taskData.position.container.y
                    );
                    
                    // Position child elements if data exists
                    if (taskData.position.tags) {
                        const tagsContainer = taskContainer.querySelector('.task-tags');
                        if (tagsContainer) {
                            this.domService.setPosition(
                                tagsContainer,
                                taskData.position.tags.x,
                                taskData.position.tags.y
                            );
                        }
                    }
                    
                    if (taskData.position.slot) {
                        const slotContainer = taskContainer.querySelector('.next-action-slot');
                        if (slotContainer) {
                            this.domService.setPosition(
                                slotContainer,
                                taskData.position.slot.x,
                                taskData.position.slot.y
                            );
                        }
                    }
                }, 50);
                
                // Restore styling
                const taskBanner = task.querySelector('.task-banner');
                if (taskData.style.backgroundColor) {
                    taskBanner.style.backgroundColor = taskData.style.backgroundColor;
                }
                if (taskData.style.color) {
                    taskBanner.style.color = taskData.style.color;
                }
            } catch (error) {
                console.error('Error restoring task:', error);
            }
        });
    }

    /**
     * Restore canvas state
     * @param {Object} canvasData - Canvas state data
     * @private
     */
    restoreCanvasState(canvasData) {
        if (canvasData.panOffset) {
            const canvasManager = this.context.getComponent('canvas');
            canvasManager.setPanOffset(canvasData.panOffset.x, canvasData.panOffset.y);
        }
    }

    /**
     * Clear current workflow
     * @private
     */
    clearCurrentWorkflow() {
        // Clear all nodes
        const nodes = document.querySelectorAll('.node');
        nodes.forEach(node => {
            if (node.parentNode) {
                node.parentNode.removeChild(node);
            }
        });
        
        // Clear all task containers
        const taskContainers = document.querySelectorAll('.task-container');
        taskContainers.forEach(container => {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
        });
        
        // Clear flowlines
        const flowlineManager = this.context.getComponent('flowline');
        flowlineManager.clearAllFlowlines();
        
        // Reset state
        this.stateManager.update({
            nodes: [],
            taskNodes: [],
            flowlines: [],
            selectedNode: null,
            matrixVisible: false
        });
    }

    /**
     * Download workflow as JSON file
     * @param {Object} workflowData - Workflow data
     * @param {string} filename - Filename
     * @private
     */
    downloadWorkflow(workflowData, filename) {
        const jsonString = JSON.stringify(workflowData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename.endsWith('.json') ? filename : `${filename}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }

    /**
     * Export workflow (trigger download)
     */
    exportWorkflow() {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `workflow-${timestamp}.json`;
        this.saveWorkflow(filename);
    }

    /**
     * Import workflow from file
     * @param {File} file - JSON file
     */
    importWorkflow(file) {
        if (!file || !file.name.endsWith('.json')) {
            throw new Error('Please select a valid JSON file');
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const workflowData = JSON.parse(e.target.result);
                this.loadWorkflow(workflowData);
                console.log('Workflow imported successfully');
            } catch (error) {
                console.error('Error parsing workflow file:', error);
                
                // Provide better error messages
                let errorMessage = error.message;
                if (error.message.includes('JSON')) {
                    errorMessage = 'Invalid JSON file format';
                } else if (error.message.includes('Legacy workflow')) {
                    errorMessage = 'Legacy workflow format detected but loader not available';
                } else if (error.message.includes('Unsupported workflow format')) {
                    errorMessage = 'Unsupported workflow version - please use a workflow saved from this application';
                }
                
                this.eventBus.emit('workflow.import.error', { error: errorMessage });
                
                // Also show alert for immediate user feedback
                alert(`Error loading workflow: ${errorMessage}`);
            }
        };
        reader.readAsText(file);
    }

    /**
     * Validate workflow data structure
     * @param {Object} workflowData - Workflow data to validate
     * @returns {Object} Validation result
     * @private
     */
    validateWorkflowData(workflowData) {
        const errors = [];
        
        if (!workflowData || typeof workflowData !== 'object') {
            errors.push('Invalid workflow data format');
            return { valid: false, errors };
        }
        
        if (!workflowData.version) {
            errors.push('Missing workflow version');
        }
        
        // Handle both old format (v1.1) and new format (v2.0)
        const isOldFormat = workflowData.version === '1.1' && workflowData.nodes;
        const isNewFormat = workflowData.version === '2.0' && workflowData.data;
        
        if (!isOldFormat && !isNewFormat) {
            errors.push('Unsupported workflow format - must be version 1.1 or 2.0');
            return { valid: false, errors };
        }
        
        if (isOldFormat) {
            // Validate old format (v1.1)
            if (!Array.isArray(workflowData.nodes)) {
                errors.push('Invalid nodes data');
            }
            
            if (!Array.isArray(workflowData.flowlines)) {
                errors.push('Invalid flowlines data');
            }
        } else {
            // Validate new format (v2.0)
            const { data } = workflowData;
            
            if (!Array.isArray(data.nodes)) {
                errors.push('Invalid nodes data');
            }
            
            if (!Array.isArray(data.tasks)) {
                errors.push('Invalid tasks data');
            }
            
            if (!Array.isArray(data.flowlines)) {
                errors.push('Invalid flowlines data');
            }
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get workflow statistics
     * @returns {Object} Workflow statistics
     */
    getWorkflowStatistics() {
        const nodes = document.querySelectorAll('.node:not([data-type="task"])');
        const tasks = document.querySelectorAll('.task-banner[data-type="task"]');
        const flowlineManager = this.context.getComponent('flowline');
        const flowlines = flowlineManager.getAllFlowlines();
        
        let totalTags = 0;
        tasks.forEach(task => {
            const tags = JSON.parse(task.dataset.tags || '[]');
            totalTags += tags.length;
        });
        
        return {
            nodeCount: nodes.length,
            taskCount: tasks.length,
            flowlineCount: flowlines.length,
            tagCount: totalTags,
            lastModified: new Date().toISOString()
        };
    }

    /**
     * Create workflow backup
     * @returns {Object} Backup data
     */
    createBackup() {
        const workflowData = this.serializeWorkflow();
        const backup = {
            ...workflowData,
            backupTimestamp: new Date().toISOString(),
            statistics: this.getWorkflowStatistics()
        };
        
        // Store in localStorage as backup
        try {
            localStorage.setItem('workflow-backup', JSON.stringify(backup));
        } catch (error) {
            console.warn('Could not save backup to localStorage:', error);
        }
        
        return backup;
    }

    /**
     * Restore from backup
     * @returns {boolean} Success status
     */
    restoreFromBackup() {
        try {
            const backupData = localStorage.getItem('workflow-backup');
            if (!backupData) {
                throw new Error('No backup found');
            }
            
            const backup = JSON.parse(backupData);
            this.loadWorkflow(backup);
            return true;
        } catch (error) {
            console.error('Error restoring from backup:', error);
            this.eventBus.emit('workflow.backup.restore.error', { error: error.message });
            return false;
        }
    }
}