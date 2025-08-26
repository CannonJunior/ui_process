/**
 * Workflow API Service
 * Replaces localStorage-based workflow management with API integration
 */

class WorkflowAPIService {
    constructor(apiClient, syncService) {
        this.apiClient = apiClient;
        this.syncService = syncService;
        this.currentWorkflowId = null;
        this.cache = new Map(); // Local cache for performance
        
        this.initialize();
    }
    
    initialize() {
        console.log('🏗️ Initializing Workflow API Service...');
        
        // Listen for real-time updates
        document.addEventListener('workflowUpdated', (event) => {
            this.handleWorkflowUpdate(event.detail);
        });
        
        document.addEventListener('nodeUpdated', (event) => {
            this.handleNodeUpdate(event.detail);
        });
        
        document.addEventListener('taskUpdated', (event) => {
            this.handleTaskUpdate(event.detail);
        });
        
        console.log('✅ Workflow API Service initialized');
    }
    
    handleWorkflowUpdate(workflow) {
        // Update cache
        this.cache.set(`workflow_${workflow.id}`, workflow);
        
        // If this is the current workflow, update the UI
        if (this.currentWorkflowId === workflow.id) {
            this.notifyWorkflowChanged(workflow);
        }
    }
    
    handleNodeUpdate(node) {
        // Update cache and notify UI
        this.cache.set(`node_${node.id}`, node);
        this.notifyNodeChanged(node);
    }
    
    handleTaskUpdate(task) {
        // Update cache and notify UI
        this.cache.set(`task_${task.id}`, task);
        this.notifyTaskChanged(task);
    }
    
    notifyWorkflowChanged(workflow) {
        document.dispatchEvent(new CustomEvent('workflowDataChanged', {
            detail: workflow
        }));
    }
    
    notifyNodeChanged(node) {
        document.dispatchEvent(new CustomEvent('nodeDataChanged', {
            detail: node
        }));
    }
    
    notifyTaskChanged(task) {
        document.dispatchEvent(new CustomEvent('taskDataChanged', {
            detail: task
        }));
    }
    
    // ===== WORKFLOW MANAGEMENT =====
    
    async saveWorkflow(workflowName, workflowData) {
        try {
            console.log(`💾 Saving workflow: ${workflowName}`);
            
            if (this.apiClient.isConnected()) {
                // Save to API
                const apiWorkflow = this.convertToAPIFormat(workflowName, workflowData);
                
                if (this.currentWorkflowId) {
                    // Update existing workflow
                    const result = await this.apiClient.updateWorkflow(this.currentWorkflowId, apiWorkflow);
                    this.cache.set(`workflow_${result.id}`, result);
                    return result;
                } else {
                    // Create new workflow
                    const result = await this.apiClient.createWorkflow(apiWorkflow);
                    this.currentWorkflowId = result.id;
                    this.cache.set(`workflow_${result.id}`, result);
                    return result;
                }
            } else {
                // Save to localStorage and queue for sync
                this.saveToLocalStorage(workflowName, workflowData);
                this.syncService.queueForSync('workflow', {
                    action: this.currentWorkflowId ? 'update' : 'create',
                    id: this.currentWorkflowId,
                    data: this.convertToAPIFormat(workflowName, workflowData)
                });
                
                return { saved: true, offline: true };
            }
        } catch (error) {
            console.error('Failed to save workflow:', error);
            
            // Fallback to localStorage
            this.saveToLocalStorage(workflowName, workflowData);
            throw error;
        }
    }
    
    async loadWorkflow(file) {
        try {
            const workflowData = JSON.parse(await this.readFileContent(file));
            console.log(`📂 Loading workflow: ${workflowData.name}`);
            
            if (this.apiClient.isConnected()) {
                // Import to API
                const result = await this.apiClient.importWorkflow(workflowData);
                this.currentWorkflowId = result.workflow.id;
                this.cache.set(`workflow_${result.workflow.id}`, result.workflow);
                
                // Get full workflow data for frontend
                const fullWorkflow = await this.apiClient.exportWorkflow(result.workflow.id);
                return this.convertFromAPIFormat(fullWorkflow);
            } else {
                // Load to localStorage and queue for sync
                this.loadToLocalStorage(workflowData);
                this.syncService.queueForSync('workflow', {
                    action: 'create',
                    data: workflowData
                });
                
                return workflowData;
            }
        } catch (error) {
            console.error('Failed to load workflow:', error);
            throw error;
        }
    }
    
    async appendWorkflow(file) {
        try {
            const appendData = JSON.parse(await this.readFileContent(file));
            console.log(`📎 Appending workflow: ${appendData.name}`);
            
            if (this.apiClient.isConnected() && this.currentWorkflowId) {
                // Get current workflow
                const currentWorkflow = await this.apiClient.exportWorkflow(this.currentWorkflowId);
                
                // Merge the data
                const mergedData = this.mergeWorkflowData(currentWorkflow, appendData);
                
                // Update workflow
                const result = await this.apiClient.updateWorkflow(this.currentWorkflowId, {
                    name: mergedData.name,
                    version: mergedData.version,
                    metadata: mergedData.metadata
                });
                
                // Import additional data (nodes, tasks, etc.)
                // This would need more sophisticated merging logic
                
                return this.convertFromAPIFormat(mergedData);
            } else {
                // Fallback to localStorage
                const currentLocal = this.getFromLocalStorage();
                const merged = this.mergeWorkflowData(currentLocal, appendData);
                this.saveToLocalStorage(merged.name, merged);
                
                return merged;
            }
        } catch (error) {
            console.error('Failed to append workflow:', error);
            throw error;
        }
    }
    
    // ===== NODE MANAGEMENT =====
    
    async createNode(nodeData) {
        try {
            if (this.apiClient.isConnected() && this.currentWorkflowId) {
                const apiNodeData = {
                    workflowId: this.currentWorkflowId,
                    type: nodeData.type,
                    text: nodeData.text,
                    positionX: nodeData.position?.left || 0,
                    positionY: nodeData.position?.top || 0,
                    style: nodeData.style || {},
                    metadata: nodeData.metadata || {}
                };
                
                const result = await this.apiClient.createNode(apiNodeData);
                this.cache.set(`node_${result.id}`, result);
                
                // Notify UI
                document.dispatchEvent(new CustomEvent('nodeCreated', {
                    detail: result
                }));
                
                return result;
            } else {
                // Offline mode - queue for sync
                this.syncService.queueForSync('node', {
                    action: 'create',
                    data: nodeData
                });
                
                return nodeData;
            }
        } catch (error) {
            console.error('Failed to create node:', error);
            throw error;
        }
    }
    
    // ===== TASK MANAGEMENT =====
    
    async createTask(taskData) {
        try {
            if (this.apiClient.isConnected() && this.currentWorkflowId) {
                const apiTaskData = {
                    workflowId: this.currentWorkflowId,
                    anchoredTo: taskData.anchoredTo,
                    opportunityId: taskData.opportunityId,
                    text: taskData.text,
                    description: taskData.description,
                    status: taskData.status || 'not_started',
                    priority: taskData.priority || 'medium',
                    dueDate: taskData.dueDate,
                    estimatedHours: taskData.estimatedHours,
                    assignedTo: taskData.assignedTo,
                    positionX: taskData.position?.left || 0,
                    positionY: taskData.position?.top || 0,
                    slot: taskData.slot || 0
                };
                
                const result = await this.apiClient.createTask(apiTaskData);
                this.cache.set(`task_${result.id}`, result);
                
                // Notify UI
                document.dispatchEvent(new CustomEvent('taskCreated', {
                    detail: result
                }));
                
                return result;
            } else {
                // Offline mode - queue for sync
                this.syncService.queueForSync('task', {
                    action: 'create',
                    data: taskData
                });
                
                return taskData;
            }
        } catch (error) {
            console.error('Failed to create task:', error);
            throw error;
        }
    }
    
    // ===== OPPORTUNITY MANAGEMENT =====
    
    async createOpportunity(opportunityData) {
        try {
            if (this.apiClient.isConnected() && this.currentWorkflowId) {
                const apiOpportunityData = {
                    workflowId: this.currentWorkflowId,
                    title: opportunityData.title,
                    description: opportunityData.description,
                    status: opportunityData.status || 'active',
                    tags: opportunityData.tags || [],
                    value: opportunityData.metadata?.value,
                    priority: opportunityData.metadata?.priority || 'medium',
                    deadline: opportunityData.metadata?.deadline,
                    contactPerson: opportunityData.metadata?.contact_person,
                    notes: opportunityData.metadata?.notes
                };
                
                const result = await this.apiClient.createOpportunity(apiOpportunityData);
                this.cache.set(`opportunity_${result.id}`, result);
                
                // Notify UI
                document.dispatchEvent(new CustomEvent('opportunityCreated', {
                    detail: result
                }));
                
                return result;
            } else {
                // Offline mode - queue for sync
                this.syncService.queueForSync('opportunity', {
                    action: 'create',
                    data: opportunityData
                });
                
                return opportunityData;
            }
        } catch (error) {
            console.error('Failed to create opportunity:', error);
            throw error;
        }
    }
    
    // ===== DATA FORMAT CONVERSION =====
    
    convertToAPIFormat(workflowName, workflowData) {
        return {
            name: workflowName,
            description: workflowData.description || '',
            version: workflowData.version || '2.0.0',
            metadata: {
                ...workflowData.metadata,
                frontendVersion: '1.0.0',
                convertedAt: new Date().toISOString()
            }
        };
    }
    
    convertFromAPIFormat(apiWorkflow) {
        return {
            name: apiWorkflow.name,
            version: apiWorkflow.version,
            description: apiWorkflow.description,
            nodes: apiWorkflow.nodes || [],
            tasks: apiWorkflow.tasks || [],
            flowlines: apiWorkflow.flowlines || [],
            opportunities: apiWorkflow.opportunities || [],
            relationships: apiWorkflow.relationships,
            metadata: {
                ...apiWorkflow.metadata,
                apiId: apiWorkflow.id,
                lastSynced: new Date().toISOString()
            }
        };
    }
    
    mergeWorkflowData(current, append) {
        return {
            name: current.name + ' + ' + append.name,
            version: '2.0.0',
            nodes: [...(current.nodes || []), ...(append.nodes || [])],
            tasks: [...(current.tasks || []), ...(append.tasks || [])],
            flowlines: [...(current.flowlines || []), ...(append.flowlines || [])],
            opportunities: [...(current.opportunities || []), ...(append.opportunities || [])],
            relationships: current.relationships || append.relationships,
            metadata: {
                ...current.metadata,
                ...append.metadata,
                mergedAt: new Date().toISOString(),
                mergedFrom: [current.name, append.name]
            }
        };
    }
    
    // ===== UTILITY METHODS =====
    
    async readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }
    
    saveToLocalStorage(workflowName, workflowData) {
        try {
            const workflows = JSON.parse(localStorage.getItem('workflows') || '[]');
            workflows.push({
                name: workflowName,
                ...workflowData,
                savedAt: new Date().toISOString()
            });
            localStorage.setItem('workflows', JSON.stringify(workflows));
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
        }
    }
    
    loadToLocalStorage(workflowData) {
        try {
            localStorage.setItem('currentWorkflow', JSON.stringify({
                ...workflowData,
                loadedAt: new Date().toISOString()
            }));
        } catch (error) {
            console.error('Failed to load to localStorage:', error);
        }
    }
    
    getFromLocalStorage() {
        try {
            const current = localStorage.getItem('currentWorkflow');
            return current ? JSON.parse(current) : {};
        } catch (error) {
            console.error('Failed to get from localStorage:', error);
            return {};
        }
    }
    
    // ===== PUBLIC METHODS =====
    
    setCurrentWorkflow(workflowId) {
        this.currentWorkflowId = workflowId;
        
        // Subscribe to updates for this workflow
        if (this.apiClient.ws) {
            this.apiClient.subscribeToWorkflow(workflowId);
        }
    }
    
    getCurrentWorkflowId() {
        return this.currentWorkflowId;
    }
    
    async getCurrentWorkflow() {
        if (this.currentWorkflowId) {
            const cached = this.cache.get(`workflow_${this.currentWorkflowId}`);
            if (cached) {
                return cached;
            }
            
            if (this.apiClient.isConnected()) {
                const workflow = await this.apiClient.exportWorkflow(this.currentWorkflowId);
                this.cache.set(`workflow_${this.currentWorkflowId}`, workflow);
                return workflow;
            }
        }
        
        return null;
    }
    
    isOnline() {
        return this.apiClient.isConnected();
    }
    
    getConnectionStatus() {
        return this.apiClient.getConnectionStatus();
    }
}

export default WorkflowAPIService;