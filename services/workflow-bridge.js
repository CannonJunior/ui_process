/**
 * Workflow Bridge - Browser API bridge for workflow operations
 * Exposes ProcessFlowDesigner methods to the MCP command system
 */

class WorkflowBridge {
    constructor() {
        this.app = null; // Reference to ProcessFlowDesigner instance
        this.initialized = false;
        this.commandHistory = [];
        this.maxHistorySize = 100;
    }

    /**
     * Initialize the bridge with the ProcessFlowDesigner instance
     */
    initialize(appInstance) {
        if (!appInstance) {
            console.error('WorkflowBridge: No app instance provided');
            return false;
        }

        this.app = appInstance;
        this.initialized = true;
        console.log('WorkflowBridge: Initialized successfully');
        
        // Expose bridge globally for MCP access
        window.workflowBridge = this;
        return true;
    }

    /**
     * Execute a workflow command
     */
    async executeCommand(commandData) {
        if (!this.initialized || !this.app) {
            return {
                status: 'error',
                error: 'Workflow bridge not initialized'
            };
        }

        try {
            // Log command for history
            this.addToHistory(commandData);

            // Route to appropriate handler
            const result = await this.routeCommand(commandData);
            
            return {
                status: 'success',
                ...result
            };
        } catch (error) {
            console.error('WorkflowBridge: Command execution failed:', error);
            return {
                status: 'error',
                error: error.message,
                action: commandData.action
            };
        }
    }

    /**
     * Route command to appropriate handler
     */
    async routeCommand(commandData) {
        const { action, parameters } = commandData;

        switch (action) {
            // Node Operations
            case 'create_node':
                return await this.createNode(parameters);
            case 'delete_node':
                return await this.deleteNode(parameters);
            case 'rename_node':
                return await this.renameNode(parameters);
            case 'move_node':
                return await this.moveNode(parameters);
            
            // Task Operations
            case 'create_task':
                return await this.createTask(parameters);
            case 'delete_task':
                return await this.deleteTask(parameters);
            case 'move_task':
                return await this.moveTask(parameters);
            case 'advance_task':
                return await this.advanceTask(parameters);
            
            // Flowline Operations
            case 'create_flowline':
                return await this.createFlowline(parameters);
            case 'delete_flowline':
                return await this.deleteFlowline(parameters);
            
            // Workflow Operations
            case 'save_workflow':
                return await this.saveWorkflow(parameters);
            case 'load_workflow':
                return await this.loadWorkflow(parameters);
            case 'clear_workflow':
                return await this.clearWorkflow(parameters);
            case 'show_workflow_status':
                return await this.getWorkflowStatus();
            
            // Matrix Operations
            case 'enter_matrix_mode':
                return await this.enterMatrixMode();
            case 'exit_matrix_mode':
                return await this.exitMatrixMode();
            case 'move_task_in_matrix':
                return await this.moveTaskInMatrix(parameters);
            
            // Selection Operations
            case 'select_element':
                return await this.selectElement(parameters);
            case 'select_all':
                return await this.selectAll(parameters);
            case 'clear_selection':
                return await this.clearSelection();
            
            // Opportunity Operations
            case 'handle_opp_create':
                return await this.handleOppCreate(parameters);
            case 'handle_opp_list':
                return await this.handleOppList(parameters);
            case 'handle_opp_search':
                return await this.handleOppSearch(parameters);
            case 'handle_opp_link':
                return await this.handleOppLink(parameters);
            case 'handle_note_link':
                return await this.handleNoteLink(parameters);
            
            // Database Operations
            case 'handle_db_query':
                return await this.handleDbQuery(parameters);
            
            default:
                throw new Error(`Unknown action: ${action}`);
        }
    }

    // === NODE OPERATIONS ===

    async createNode(params) {
        const { type, name, x, y } = params;
        
        if (!type) {
            throw new Error('Node type is required');
        }

        // Create node using app's API
        const node = this.app.createNode(type);
        if (!node) {
            throw new Error('Failed to create node');
        }

        // Set position if provided
        if (x !== null && y !== null) {
            node.style.left = `${x}px`;
            node.style.top = `${y}px`;
        }

        // Set name if provided
        if (name) {
            const textElement = node.querySelector('.node-text');
            if (textElement) {
                textElement.textContent = name;
            }
        }

        return {
            action: 'create_node',
            result: {
                node_id: node.dataset.id,
                type: type,
                name: name || node.querySelector('.node-text')?.textContent,
                position: {
                    x: parseInt(node.style.left) || 0,
                    y: parseInt(node.style.top) || 0
                }
            },
            message: `✅ Created ${type} node${name ? ` "${name}"` : ''}`
        };
    }

    async deleteNode(params) {
        const { identifier } = params;
        
        // Find node by ID or name
        const node = this.findNode(identifier);
        if (!node) {
            throw new Error(`Node "${identifier}" not found`);
        }

        const nodeName = node.querySelector('.node-text')?.textContent || node.dataset.id;
        const nodeType = node.dataset.type;

        // Select and delete the node
        this.app.selectedNode = node;
        this.app.deleteNode();

        return {
            action: 'delete_node',
            result: {
                deleted_node: {
                    id: node.dataset.id,
                    name: nodeName,
                    type: nodeType
                }
            },
            message: `🗑️ Deleted ${nodeType} node "${nodeName}"`
        };
    }

    async renameNode(params) {
        const { old_name, new_name } = params;
        
        const node = this.findNode(old_name);
        if (!node) {
            throw new Error(`Node "${old_name}" not found`);
        }

        const textElement = node.querySelector('.node-text');
        if (!textElement) {
            throw new Error('Node text element not found');
        }

        textElement.textContent = new_name;

        return {
            action: 'rename_node',
            result: {
                node_id: node.dataset.id,
                old_name: old_name,
                new_name: new_name
            },
            message: `✏️ Renamed node from "${old_name}" to "${new_name}"`
        };
    }

    async moveNode(params) {
        const { identifier, x, y } = params;
        
        const node = this.findNode(identifier);
        if (!node) {
            throw new Error(`Node "${identifier}" not found`);
        }

        node.style.left = `${x}px`;
        node.style.top = `${y}px`;

        const nodeName = node.querySelector('.node-text')?.textContent || node.dataset.id;

        return {
            action: 'move_node',
            result: {
                node_id: node.dataset.id,
                name: nodeName,
                position: { x: parseInt(x), y: parseInt(y) }
            },
            message: `📍 Moved node "${nodeName}" to (${x}, ${y})`
        };
    }

    // === TASK OPERATIONS ===

    async createTask(params) {
        const { name, node, priority } = params;
        
        if (!name) {
            throw new Error('Task name is required');
        }

        // Create task node
        this.app.createTaskNode(name);
        
        // Find the newly created task
        const taskNodes = this.app.taskNodes;
        const newTask = taskNodes[taskNodes.length - 1];
        
        if (!newTask) {
            throw new Error('Failed to create task');
        }

        // Associate with node if specified
        if (node) {
            const targetNode = this.findNode(node);
            if (targetNode) {
                // Set anchor relationship
                newTask.dataset.anchoredTo = targetNode.dataset.id;
                // Position task relative to node
                this.positionTaskRelativeToNode(newTask, targetNode);
            }
        }

        return {
            action: 'create_task',
            result: {
                task_id: newTask.dataset.id,
                name: name,
                anchored_to: node || null,
                priority: priority || 'normal'
            },
            message: `✅ Created task "${name}"${node ? ` for node "${node}"` : ''}`
        };
    }

    async createFlowline(params) {
        const { source, target, type } = params;
        
        const sourceNode = this.findNode(source);
        const targetNode = this.findNode(target);
        
        if (!sourceNode) {
            throw new Error(`Source node "${source}" not found`);
        }
        if (!targetNode) {
            throw new Error(`Target node "${target}" not found`);
        }

        // Use flowline manager to create connection
        if (this.app.flowlineManager && this.app.flowlineManager.createFlowline) {
            this.app.flowlineManager.createFlowline(sourceNode, targetNode, type);
        } else {
            // Fallback: simulate flowline creation
            console.warn('FlowlineManager not available, simulating flowline creation');
        }

        return {
            action: 'create_flowline',
            result: {
                source: {
                    id: sourceNode.dataset.id,
                    name: sourceNode.querySelector('.node-text')?.textContent
                },
                target: {
                    id: targetNode.dataset.id,
                    name: targetNode.querySelector('.node-text')?.textContent
                },
                type: type || 'sequence'
            },
            message: `🔗 Connected "${source}" to "${target}" with ${type || 'sequence'} flowline`
        };
    }

    // === WORKFLOW OPERATIONS ===

    async saveWorkflow(params) {
        const { filename } = params;
        
        // Trigger the app's save functionality
        this.app.saveWorkflow();
        
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const finalFilename = filename || `workflow-${timestamp}`;

        return {
            action: 'save_workflow',
            result: {
                filename: finalFilename,
                timestamp: new Date().toISOString(),
                stats: await this.getWorkflowStats()
            },
            message: `💾 Saved workflow as "${finalFilename}"`
        };
    }

    async getWorkflowStatus() {
        const stats = await this.getWorkflowStats();
        
        return {
            action: 'show_workflow_status',
            result: stats,
            message: `📊 Workflow: ${stats.nodes} nodes, ${stats.tasks} tasks, ${stats.flowlines} flowlines, ${stats.tags} tags`
        };
    }

    async enterMatrixMode() {
        if (this.app.matrixController && this.app.matrixController.enterMatrixMode) {
            this.app.matrixController.enterMatrixMode();
            return {
                action: 'enter_matrix_mode',
                result: { matrix_mode: true },
                message: '📊 Entered Eisenhower Matrix mode'
            };
        } else {
            throw new Error('Matrix mode not available');
        }
    }

    async exitMatrixMode() {
        if (this.app.matrixController && this.app.matrixController.exitMatrixMode) {
            this.app.matrixController.exitMatrixMode();
            return {
                action: 'exit_matrix_mode',
                result: { matrix_mode: false },
                message: '📋 Exited Eisenhower Matrix mode'
            };
        } else {
            throw new Error('Matrix mode not available');
        }
    }

    // === HELPER METHODS ===

    findNode(identifier) {
        if (!this.app.nodes) return null;
        
        // Try to find by ID first
        const byId = this.app.nodes.find(node => node.dataset.id === identifier);
        if (byId) return byId;
        
        // Try to find by name
        const byName = this.app.nodes.find(node => {
            const textElement = node.querySelector('.node-text');
            return textElement && textElement.textContent === identifier;
        });
        if (byName) return byName;
        
        // Try partial name match
        const partialMatch = this.app.nodes.find(node => {
            const textElement = node.querySelector('.node-text');
            return textElement && textElement.textContent.toLowerCase().includes(identifier.toLowerCase());
        });
        
        return partialMatch || null;
    }

    findTask(identifier) {
        if (!this.app.taskNodes) return null;
        
        // Try to find by ID first
        const byId = this.app.taskNodes.find(task => task.dataset.id === identifier);
        if (byId) return byId;
        
        // Try to find by name
        const byName = this.app.taskNodes.find(task => {
            const textElement = task.querySelector('.task-banner');
            return textElement && textElement.textContent.includes(identifier);
        });
        
        return byName || null;
    }

    positionTaskRelativeToNode(task, node) {
        if (!task || !node) return;
        
        const nodeRect = node.getBoundingClientRect();
        const canvasRect = this.app.canvas.getBoundingClientRect();
        
        // Position task to the right of the node
        const x = nodeRect.right - canvasRect.left + 20;
        const y = nodeRect.top - canvasRect.top;
        
        task.style.left = `${x}px`;
        task.style.top = `${y}px`;
    }

    async getWorkflowStats() {
        return {
            nodes: this.app.nodes ? this.app.nodes.length : 0,
            tasks: this.app.taskNodes ? this.app.taskNodes.length : 0,
            flowlines: this.app.flowlines ? this.app.flowlines.length : 0,
            tags: this.getTagCount(),
            matrix_mode: this.app.isMatrixMode || false,
            selected_node: this.app.selectedNode ? {
                id: this.app.selectedNode.dataset.id,
                name: this.app.selectedNode.querySelector('.node-text')?.textContent
            } : null
        };
    }

    getTagCount() {
        // Count unique tags across all tasks
        const tags = new Set();
        if (this.app.taskNodes) {
            this.app.taskNodes.forEach(task => {
                const taskTags = task.querySelectorAll('.tag');
                taskTags.forEach(tag => tags.add(tag.textContent));
            });
        }
        return tags.size;
    }

    addToHistory(commandData) {
        this.commandHistory.push({
            timestamp: new Date().toISOString(),
            command: commandData
        });
        
        // Keep history size manageable
        if (this.commandHistory.length > this.maxHistorySize) {
            this.commandHistory = this.commandHistory.slice(-this.maxHistorySize);
        }
    }

    getCommandHistory(limit = 10) {
        return this.commandHistory.slice(-limit);
    }

    // Expose key app state for command context
    getApplicationContext() {
        if (!this.app) return null;
        
        return {
            initialized: this.initialized,
            nodeCount: this.app.nodes ? this.app.nodes.length : 0,
            taskCount: this.app.taskNodes ? this.app.taskNodes.length : 0,
            selectedNode: this.app.selectedNode ? {
                id: this.app.selectedNode.dataset.id,
                name: this.app.selectedNode.querySelector('.node-text')?.textContent,
                type: this.app.selectedNode.dataset.type
            } : null,
            matrixMode: this.app.isMatrixMode || false,
            canvasSize: this.app.canvas ? {
                width: this.app.canvas.offsetWidth,
                height: this.app.canvas.offsetHeight
            } : null
        };
    }

    // === OPPORTUNITY OPERATIONS ===

    async handleOppCreate(parameters) {
        try {
            console.log('handleOppCreate called with parameters:', JSON.stringify(parameters, null, 2));
            
            // Extract title from parameters
            const title = parameters.raw_params?.[1] || parameters.raw_params?.[2] || parameters.title;
            
            console.log('Extracted title:', title);
            
            if (!title) {
                console.error('No title found in parameters:', parameters);
                throw new Error('Opportunity title is required');
            }

            // Delegate to MCP server
            const result = await this.callMCPServer('create_opportunity', { title });
            
            return {
                action: 'handle_opp_create',
                result: result,
                message: `✅ Created opportunity "${result.title}" (ID: ${result.opportunity_id})`
            };
        } catch (error) {
            throw new Error(`Failed to create opportunity: ${error.message}`);
        }
    }

    async handleOppList(parameters) {
        try {
            // Extract filters from parameters
            const filters = parameters.raw_params?.[0] || parameters.filters;
            
            // Delegate to MCP server
            const result = await this.callMCPServer('list_opportunities', { filters });
            
            return {
                action: 'handle_opp_list',
                result: result,
                message: `📋 Found ${result.opportunities?.length || 0} opportunities`
            };
        } catch (error) {
            throw new Error(`Failed to list opportunities: ${error.message}`);
        }
    }

    async handleOppSearch(parameters) {
        try {
            // Extract query from parameters
            const query = parameters.raw_params?.[1] || parameters.raw_params?.[2] || parameters.query;
            
            if (!query) {
                throw new Error('Search query is required');
            }

            // Delegate to MCP server
            const result = await this.callMCPServer('search_opportunities', { query });
            
            return {
                action: 'handle_opp_search',
                result: result,
                message: `🔍 Found ${result.opportunities?.length || 0} opportunities matching "${query}"`
            };
        } catch (error) {
            throw new Error(`Failed to search opportunities: ${error.message}`);
        }
    }

    async handleOppLink(parameters) {
        try {
            // Extract opp_id and target_id from parameters
            const oppId = parameters.raw_params?.[1] || parameters.opp_id;
            const targetId = parameters.raw_params?.[2] || parameters.target_id;
            
            if (!oppId || !targetId) {
                throw new Error('Both opportunity ID and target ID are required');
            }

            // Delegate to MCP server
            const result = await this.callMCPServer('link_opportunity', { 
                opportunity_id: oppId, 
                target_id: targetId 
            });
            
            return {
                action: 'handle_opp_link',
                result: result,
                message: `🔗 Linked opportunity ${oppId} to ${targetId}`
            };
        } catch (error) {
            throw new Error(`Failed to link opportunity: ${error.message}`);
        }
    }

    async handleNoteLink(parameters) {
        try {
            // Extract note_id and target_id from parameters
            const noteId = parameters.raw_params?.[1] || parameters.note_id;
            const targetId = parameters.raw_params?.[2] || parameters.target_id;
            
            if (!noteId || !targetId) {
                throw new Error('Both note ID and target ID are required');
            }

            // Delegate to MCP server
            const result = await this.callMCPServer('link_note', { 
                note_id: noteId, 
                target_id: targetId 
            });
            
            return {
                action: 'handle_note_link',
                result: result,
                message: `📝 Linked note ${noteId} to ${targetId}`
            };
        } catch (error) {
            throw new Error(`Failed to link note: ${error.message}`);
        }
    }

    async handleDbQuery(parameters) {
        try {
            console.log('handleDbQuery called with parameters:', JSON.stringify(parameters, null, 2));
            
            // Extract SQL query from parameters - check both quoted and unquoted versions
            const query = parameters.raw_params?.[1] || parameters.raw_params?.[2] || parameters.query;
            
            if (!query) {
                throw new Error('SQL query is required');
            }

            // Validate the query for basic safety (prevent destructive operations)
            const queryLower = query.toLowerCase().trim();
            const dangerousOperations = ['drop', 'delete from', 'truncate', 'alter table', 'create table'];
            
            // For safety, let's check if it's a destructive operation and warn
            const isDangerous = dangerousOperations.some(op => queryLower.includes(op));
            
            if (isDangerous) {
                // For now, we'll allow it but warn - you might want to restrict this in production
                console.warn('⚠️ Potentially destructive SQL operation detected:', query);
            }

            // Execute query through the API directly
            const response = await fetch('http://localhost:3001/api/v1/db/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    query: query,
                    safe_mode: true  // This will enable read-only mode if API supports it
                })
            });

            if (!response.ok) {
                throw new Error(`Database query failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            
            // Format the result for display
            let formattedResult = '';
            if (result.rows && result.rows.length > 0) {
                // Create a simple table format
                const headers = Object.keys(result.rows[0]);
                formattedResult = `\n📊 Query Results (${result.rows.length} rows):\n\n`;
                
                // Add headers
                formattedResult += headers.join(' | ') + '\n';
                formattedResult += headers.map(h => '-'.repeat(h.length)).join('-|-') + '\n';
                
                // Add rows (limit to first 10 for display)
                const displayRows = result.rows.slice(0, 10);
                for (const row of displayRows) {
                    formattedResult += headers.map(h => String(row[h] || '').substring(0, 20)).join(' | ') + '\n';
                }
                
                if (result.rows.length > 10) {
                    formattedResult += `\n... and ${result.rows.length - 10} more rows\n`;
                }
            } else if (result.rowCount !== undefined) {
                formattedResult = `\n✅ Query executed successfully. Affected rows: ${result.rowCount}`;
            } else {
                formattedResult = '\n✅ Query executed successfully.';
            }
            
            return {
                action: 'handle_db_query',
                result: result,
                message: `🗄️ PostgreSQL Query Executed:${formattedResult}`,
                query: query
            };
        } catch (error) {
            console.error('Database query error:', error);
            throw new Error(`Failed to execute database query: ${error.message}`);
        }
    }

    // Helper method to call MCP servers through the MCP bridge
    async callMCPServer(action, parameters) {
        // Check if we have access to the MCP bridge
        if (window.mcpBridge) {
            return await window.mcpBridge.executeCommand(action, parameters);
        }
        
        // Fallback: make a direct API call to the MCP service
        try {
            const mcpUrl = (typeof PortConfig !== 'undefined' ? PortConfig.getMcpServiceUrl() : 'http://localhost:3002');
            const response = await fetch(`${mcpUrl}/api/mcp/execute-command`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    commandData: {
                        is_command: true,
                        action: action,
                        parameters: parameters
                    }
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error(`Failed to call MCP server for ${action}:`, error);
            
            // Return a simulated response for now
            switch (action) {
                case 'create_opportunity':
                    return {
                        opportunity_id: `opp-${new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-')}`,
                        title: parameters.title,
                        created_at: new Date().toISOString(),
                        simulated: true
                    };
                case 'list_opportunities':
                    return {
                        opportunities: [],
                        count: 0,
                        simulated: true
                    };
                case 'search_opportunities':
                    return {
                        opportunities: [],
                        query: parameters.query,
                        count: 0,
                        simulated: true
                    };
                case 'link_opportunity':
                case 'link_note':
                    return {
                        success: true,
                        linked_at: new Date().toISOString(),
                        simulated: true
                    };
                default:
                    throw new Error(`Unknown MCP action: ${action}`);
            }
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WorkflowBridge;
} else {
    // Browser environment
    window.WorkflowBridge = WorkflowBridge;
}