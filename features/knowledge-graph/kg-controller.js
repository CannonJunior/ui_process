/**
 * Knowledge Graph Controller
 * Manages KG nodes, transitions, and integration with the main UI
 */

class KnowledgeGraphController {
    constructor() {
        this.isKGMode = false;
        this.kgNodes = [];
        this.selectedKGNode = null;
        this.draggedKGNode = null;
        this.kgConnections = [];
        
        this.init();
    }
    
    /**
     * Get the base API URL for KG operations
     */
    getApiBaseUrl() {
        return typeof PortConfig !== 'undefined' ? PortConfig.getDatabaseApiUrl() : 'http://localhost:3001';
    }
    
    init() {
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        console.log('✅ Knowledge Graph Controller initialized');
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only in KG mode
            if (!this.isKGMode) return;
            
            // C key to start connection from selected node
            if (e.key.toLowerCase() === 'c' && this.selectedKGNode && !this.connectionMode?.active) {
                this.startConnectionMode(this.selectedKGNode);
                e.preventDefault();
            }
            
            // Delete key to delete selected node
            if (e.key === 'Delete' && this.selectedKGNode && !this.connectionMode?.active) {
                if (confirm(`Delete KG node "${this.selectedKGNode.entity.name}"?`)) {
                    this.deleteKGNode(this.selectedKGNode);
                }
                e.preventDefault();
            }
        });
    }
    
    setupEventListeners() {
        // Note: KG Toggle button is now handled by main script's radio button system
        // The main script calls our methods directly via setMode('knowledgeGraph')
        
        // Add KG Node from dropdown
        document.addEventListener('click', (e) => {
            if (e.target.dataset.addType === 'kg-node') {
                this.openKGNodeModal();
            }
        });
        
        // KG Modal events
        this.setupKGModalEvents();
    }
    
    setupKGModalEvents() {
        const modal = document.getElementById('kgNodeModal');
        const typeSelect = document.getElementById('kgNodeType');
        const createBtn = document.getElementById('kgNodeModalCreate');
        const cancelBtn = document.getElementById('kgNodeModalCancel');
        
        // Entity type change handler
        if (typeSelect) {
            typeSelect.addEventListener('change', (e) => {
                this.showEntityFields(e.target.value);
            });
        }
        
        // Create button
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                this.createKGNodeFromModal();
            });
        }
        
        // Cancel button
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.closeKGNodeModal();
            });
        }
    }
    
    /**
     * Activate Knowledge Graph mode (called by main script)
     */
    activate() {
        if (!this.isKGMode) {
            this.isKGMode = true;
            console.log('🧠 Knowledge Graph mode activated');
            
            // Hide workflow elements with the same transition as opportunities mode
            this.hideWorkflowElements();
            
            // Load existing KG nodes from API or show existing ones
            if (this.kgNodes.length === 0) {
                this.loadKGNodesFromAPI();
            } else {
                // Show existing nodes with transition
                this.showKGNodesWithTransition();
            }
        }
    }
    
    /**
     * Deactivate Knowledge Graph mode (called by main script)
     */
    deactivate() {
        if (this.isKGMode) {
            this.isKGMode = false;
            console.log('📊 Knowledge Graph mode deactivated');
            
            // Animate KG nodes off-canvas (similar to opportunity cards)
            this.hideKGNodesWithTransition();
            
            // Show workflow elements with transition
            this.showWorkflowElements();
        }
    }
    
    /**
     * Legacy toggle method - kept for backward compatibility but now managed by main script
     * @deprecated Use activate()/deactivate() methods instead
     */
    toggleKGMode() {
        console.warn('toggleKGMode() is deprecated. Mode switching is now managed by the main script.');
        // This method is kept for backward compatibility but does nothing
        // The main script handles mode switching via activate()/deactivate()
    }
    
    async loadKGNodesFromAPI() {
        try {
            console.log('📡 Loading KG nodes from API...');
            const response = await fetch(`${this.getApiBaseUrl()}/api/v1/kg/entities`);
            
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }
            
            const entities = await response.json();
            console.log(`✅ Loaded ${entities.length} KG entities from API`);
            
            // Clear existing KG nodes and create new ones
            this.clearKGNodes();
            
            entities.forEach((entity, index) => {
                this.createKGNodeFromEntity(entity, {
                    x: 100 + (index % 5) * 220,
                    y: 100 + Math.floor(index / 5) * 150
                });
            });
            
            // Load existing relationships after nodes are created
            setTimeout(() => {
                this.loadKGConnectionsFromAPI();
            }, 500);
            
        } catch (error) {
            console.error('❌ Failed to load KG nodes:', error);
            // Show a few demo nodes if API fails
            this.createDemoKGNodes();
        }
    }
    
    createDemoKGNodes() {
        console.log('🔧 Creating demo KG nodes...');
        const demoNodes = [
            {
                name: 'Alice Johnson',
                entity_type: 'person',
                description: 'Senior Software Engineer specializing in AI systems',
                properties: { title: 'Senior Engineer', department: 'AI Research' }
            },
            {
                name: 'TechCorp Industries',
                entity_type: 'company',
                description: 'Leading technology company',
                properties: { industry: 'Technology', size: '5000+ employees' }
            },
            {
                name: 'AI System Spec',
                entity_type: 'document',
                description: 'Technical specification for AI system design',
                properties: { type: 'Technical Document', format: 'PDF' }
            }
        ];
        
        demoNodes.forEach((entity, index) => {
            this.createKGNodeFromEntity(entity, {
                x: 150 + index * 220,
                y: 150
            });
        });
    }
    
    createKGNodeFromEntity(entity, position) {
        const kgNode = document.createElement('div');
        kgNode.className = `kg-node ${entity.entity_type}`;
        kgNode.style.left = position.x + 'px';
        kgNode.style.top = position.y + 'px';
        
        // Create node structure
        kgNode.innerHTML = `
            <div class="kg-node-header">
                <div class="kg-node-icon"></div>
                <div class="kg-node-name">${entity.name}</div>
            </div>
            <div class="kg-node-type">${entity.entity_type}</div>
            <div class="kg-node-description">${entity.description}</div>
        `;
        
        // Add to canvas
        document.getElementById('canvas').appendChild(kgNode);
        
        // Store reference
        const nodeData = {
            id: entity.id || `kg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            element: kgNode,
            entity: entity,
            position: position
        };
        
        this.kgNodes.push(nodeData);
        
        // Setup interactions
        this.setupKGNodeInteractions(kgNode, nodeData);
        
        console.log(`✅ Created KG node: ${entity.name} (${entity.entity_type})`);
        return nodeData;
    }
    
    setupKGNodeInteractions(element, nodeData) {
        let isDragging = false;
        let startX, startY, initialX, initialY;
        
        element.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // Only left click
            
            isDragging = true;
            this.draggedKGNode = nodeData;
            
            element.classList.add('dragging');
            
            const rect = element.getBoundingClientRect();
            const canvas = document.getElementById('canvas');
            const canvasRect = canvas.getBoundingClientRect();
            
            startX = e.clientX;
            startY = e.clientY;
            initialX = rect.left - canvasRect.left;
            initialY = rect.top - canvasRect.top;
            
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging || this.draggedKGNode !== nodeData) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const newX = initialX + deltaX;
            const newY = initialY + deltaY;
            
            element.style.left = Math.max(0, newX) + 'px';
            element.style.top = Math.max(0, newY) + 'px';
            
            nodeData.position.x = newX;
            nodeData.position.y = newY;
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging && this.draggedKGNode === nodeData) {
                isDragging = false;
                element.classList.remove('dragging');
                this.draggedKGNode = null;
                
                // Update all connections involving this node
                this.updateNodeConnections(nodeData);
            }
        });
        
        // Click selection or connection completion
        element.addEventListener('click', (e) => {
            if (isDragging) return;
            
            // Check if we're in connection mode
            if (this.connectionMode?.active) {
                if (this.connectionMode.source !== nodeData) {
                    this.completeConnection(this.connectionMode.source, nodeData);
                } else {
                    console.log('🚫 Cannot connect node to itself');
                }
            } else {
                this.selectKGNode(nodeData);
            }
            e.stopPropagation();
        });
        
        // Context menu
        element.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showKGNodeContextMenu(nodeData, e.clientX, e.clientY);
        });
    }
    
    selectKGNode(nodeData) {
        // Clear previous selection
        this.kgNodes.forEach(node => {
            node.element.classList.remove('selected');
        });
        
        // Select new node
        nodeData.element.classList.add('selected');
        this.selectedKGNode = nodeData;
        
        console.log('🎯 Selected KG node:', nodeData.entity.name);
    }
    
    showKGNodeContextMenu(nodeData, x, y) {
        // Create context menu if it doesn't exist
        let contextMenu = document.getElementById('kgNodeContextMenu');
        if (!contextMenu) {
            contextMenu = document.createElement('div');
            contextMenu.id = 'kgNodeContextMenu';
            contextMenu.className = 'context-menu kg-node-context-menu';
            contextMenu.innerHTML = `
                <div class="menu-item" data-action="edit">Edit Node</div>
                <div class="menu-item" data-action="duplicate">Duplicate Node</div>
                <div class="menu-item" data-action="connect">Create Connection</div>
                <div class="menu-separator"></div>
                <div class="menu-item" data-action="delete">Delete Node</div>
            `;
            document.body.appendChild(contextMenu);
        }
        
        // Position and show menu
        contextMenu.style.left = x + 'px';
        contextMenu.style.top = y + 'px';
        contextMenu.style.display = 'block';
        
        // Handle menu actions
        contextMenu.onclick = (e) => {
            const action = e.target.dataset.action;
            if (action) {
                this.handleKGNodeAction(action, nodeData);
                contextMenu.style.display = 'none';
            }
        };
        
        // Hide menu on outside click
        const hideMenu = (e) => {
            if (!contextMenu.contains(e.target)) {
                contextMenu.style.display = 'none';
                document.removeEventListener('click', hideMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', hideMenu), 10);
    }
    
    handleKGNodeAction(action, nodeData) {
        switch (action) {
            case 'edit':
                this.editKGNode(nodeData);
                break;
            case 'duplicate':
                this.duplicateKGNode(nodeData);
                break;
            case 'connect':
                this.startConnectionMode(nodeData);
                break;
            case 'delete':
                this.deleteKGNode(nodeData);
                break;
        }
    }
    
    startConnectionMode(sourceNode) {
        // Enter connection creation mode
        this.connectionMode = {
            active: true,
            source: sourceNode,
            preview: null
        };
        
        // Visual feedback
        sourceNode.element.classList.add('connecting');
        document.body.style.cursor = 'crosshair';
        
        // Add visual indicator
        const canvas = document.getElementById('canvas');
        canvas.classList.add('connection-mode');
        
        // Create connection preview line
        this.createConnectionPreview();
        
        console.log('🔗 Connection mode started from:', sourceNode.entity.name);
        
        // Show instructions
        this.showConnectionInstructions();
    }
    
    createConnectionPreview() {
        // Remove existing preview
        const existingPreview = document.getElementById('connectionPreview');
        if (existingPreview) existingPreview.remove();
        
        // Create SVG for connection preview
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'connectionPreview';
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '20';
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('stroke', '#76b3fa');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-dasharray', '5,5');
        line.style.opacity = '0.7';
        
        svg.appendChild(line);
        document.getElementById('canvas').appendChild(svg);
        
        this.connectionMode.preview = { svg, line };
        
        // Update preview on mouse move
        document.addEventListener('mousemove', this.updateConnectionPreview.bind(this));
    }
    
    updateConnectionPreview(e) {
        if (!this.connectionMode?.active || !this.connectionMode.preview) return;
        
        const canvas = document.getElementById('canvas');
        const canvasRect = canvas.getBoundingClientRect();
        const sourceNode = this.connectionMode.source;
        
        // Get source node center
        const sourceRect = sourceNode.element.getBoundingClientRect();
        const sourceX = sourceRect.left + sourceRect.width / 2 - canvasRect.left;
        const sourceY = sourceRect.top + sourceRect.height / 2 - canvasRect.top;
        
        // Get mouse position relative to canvas
        const mouseX = e.clientX - canvasRect.left;
        const mouseY = e.clientY - canvasRect.top;
        
        // Update preview line
        const line = this.connectionMode.preview.line;
        line.setAttribute('x1', sourceX);
        line.setAttribute('y1', sourceY);
        line.setAttribute('x2', mouseX);
        line.setAttribute('y2', mouseY);
    }
    
    showConnectionInstructions() {
        // Create or update instructions overlay
        let instructions = document.getElementById('connectionInstructions');
        if (!instructions) {
            instructions = document.createElement('div');
            instructions.id = 'connectionInstructions';
            instructions.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(36, 37, 44, 0.95);
                border: 2px solid #76b3fa;
                border-radius: 8px;
                padding: 15px;
                color: #a3a7ad;
                font-family: 'IBM Plex Mono', monospace;
                font-size: 12px;
                z-index: 3000;
                max-width: 250px;
            `;
            document.body.appendChild(instructions);
        }
        
        instructions.innerHTML = `
            <div style="color: #76b3fa; font-weight: bold; margin-bottom: 8px;">🔗 Connection Mode</div>
            <div>• Click on target KG node to connect</div>
            <div>• Press ESC to cancel</div>
            <div style="margin-top: 8px; font-size: 11px; opacity: 0.8;">
                Connecting from: <strong>${this.connectionMode.source.entity.name}</strong>
            </div>
        `;
        
        // Auto-hide after connection or cancel
        document.addEventListener('keydown', this.handleConnectionKeypress.bind(this));
    }
    
    handleConnectionKeypress(e) {
        if (e.key === 'Escape' && this.connectionMode?.active) {
            this.cancelConnectionMode();
        }
    }
    
    cancelConnectionMode() {
        if (!this.connectionMode?.active) return;
        
        // Clean up visual elements
        this.connectionMode.source.element.classList.remove('connecting');
        document.body.style.cursor = '';
        document.getElementById('canvas').classList.remove('connection-mode');
        
        // Remove preview
        if (this.connectionMode.preview) {
            this.connectionMode.preview.svg.remove();
            document.removeEventListener('mousemove', this.updateConnectionPreview.bind(this));
        }
        
        // Remove instructions
        const instructions = document.getElementById('connectionInstructions');
        if (instructions) instructions.remove();
        
        // Reset state
        this.connectionMode = { active: false };
        
        console.log('🚫 Connection mode cancelled');
    }
    
    async completeConnection(sourceNode, targetNode) {
        // Cancel connection mode first
        this.cancelConnectionMode();
        
        // Show relationship selection modal
        this.showRelationshipModal(sourceNode, targetNode);
    }
    
    showRelationshipModal(sourceNode, targetNode) {
        // Create relationship modal if it doesn't exist
        let modal = document.getElementById('relationshipModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'relationshipModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>Create Relationship</h3>
                    <div class="relationship-form">
                        <div class="connection-preview">
                            <div class="connection-node source">
                                <span class="node-name"></span>
                                <span class="node-type"></span>
                            </div>
                            <div class="connection-arrow">→</div>
                            <div class="connection-node target">
                                <span class="node-name"></span>
                                <span class="node-type"></span>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="relationshipType">Relationship Type:</label>
                            <select id="relationshipType" required>
                                <option value="">Select relationship type...</option>
                                <option value="works_for">Works For</option>
                                <option value="manages">Manages</option>
                                <option value="authored_by">Authored By</option>
                                <option value="owns">Owns</option>
                                <option value="collaborates_with">Collaborates With</option>
                                <option value="reports_to">Reports To</option>
                                <option value="part_of">Part Of</option>
                                <option value="uses">Uses</option>
                                <option value="located_in">Located In</option>
                                <option value="custom">Custom (specify below)</option>
                            </select>
                        </div>
                        
                        <div class="form-group" id="customRelationshipGroup" style="display: none;">
                            <label for="customRelationship">Custom Relationship:</label>
                            <input type="text" id="customRelationship" placeholder="e.g., supervises, created_by">
                        </div>
                        
                        <div class="form-group">
                            <label for="relationshipDirection">Direction:</label>
                            <select id="relationshipDirection">
                                <option value="outgoing">Source → Target</option>
                                <option value="incoming">Target → Source</option>
                                <option value="bidirectional">Bidirectional ↔</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="relationshipStrength">Strength (1-10):</label>
                            <input type="range" id="relationshipStrength" min="1" max="10" value="5">
                            <span id="strengthValue">5</span>
                        </div>
                        
                        <div class="form-group">
                            <label for="relationshipNotes">Notes (optional):</label>
                            <textarea id="relationshipNotes" placeholder="Additional context about this relationship..." rows="3"></textarea>
                        </div>
                    </div>
                    
                    <div class="modal-buttons">
                        <button id="relationshipModalCancel" class="modal-button cancel">Cancel</button>
                        <button id="relationshipModalCreate" class="modal-button create">Create Relationship</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Setup modal event listeners
            this.setupRelationshipModalEvents();
        }
        
        // Populate modal with node information
        modal.querySelector('.source .node-name').textContent = sourceNode.entity.name;
        modal.querySelector('.source .node-type').textContent = sourceNode.entity.entity_type;
        modal.querySelector('.target .node-name').textContent = targetNode.entity.name;
        modal.querySelector('.target .node-type').textContent = targetNode.entity.entity_type;
        
        // Store nodes for later use
        modal.sourceNode = sourceNode;
        modal.targetNode = targetNode;
        
        // Show modal
        modal.style.display = 'block';
        
        console.log('🔗 Relationship modal opened:', sourceNode.entity.name, '→', targetNode.entity.name);
    }
    
    setupRelationshipModalEvents() {
        const modal = document.getElementById('relationshipModal');
        const typeSelect = document.getElementById('relationshipType');
        const customGroup = document.getElementById('customRelationshipGroup');
        const strengthRange = document.getElementById('relationshipStrength');
        const strengthValue = document.getElementById('strengthValue');
        const createBtn = document.getElementById('relationshipModalCreate');
        const cancelBtn = document.getElementById('relationshipModalCancel');
        
        // Custom relationship toggle
        typeSelect.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                customGroup.style.display = 'block';
            } else {
                customGroup.style.display = 'none';
            }
        });
        
        // Strength slider update
        strengthRange.addEventListener('input', (e) => {
            strengthValue.textContent = e.target.value;
        });
        
        // Create button
        createBtn.addEventListener('click', () => {
            this.createRelationshipFromModal();
        });
        
        // Cancel button
        cancelBtn.addEventListener('click', () => {
            this.closeRelationshipModal();
        });
    }
    
    async createRelationshipFromModal() {
        const modal = document.getElementById('relationshipModal');
        const sourceNode = modal.sourceNode;
        const targetNode = modal.targetNode;
        
        const relType = document.getElementById('relationshipType').value;
        const customType = document.getElementById('customRelationship').value;
        const direction = document.getElementById('relationshipDirection').value;
        const strength = parseInt(document.getElementById('relationshipStrength').value);
        const notes = document.getElementById('relationshipNotes').value;
        
        if (!relType || (relType === 'custom' && !customType)) {
            alert('Please select or specify a relationship type');
            return;
        }
        
        const relationshipType = relType === 'custom' ? customType : relType;
        
        // Create relationship data
        const relationshipData = {
            relationship_type_name: relationshipType,
            source_entity_id: sourceNode.id,
            target_entity_id: targetNode.id,
            properties: {
                strength: strength,
                direction: direction,
                notes: notes || undefined,
                created_via: 'ui'
            }
        };
        
        // Handle bidirectional relationships
        if (direction === 'bidirectional') {
            // Create two relationships
            await this.createRelationshipInAPI(relationshipData);
            const reverseData = {
                ...relationshipData,
                source_entity_id: targetNode.id,
                target_entity_id: sourceNode.id
            };
            await this.createRelationshipInAPI(reverseData);
        } else if (direction === 'incoming') {
            // Swap source and target
            relationshipData.source_entity_id = targetNode.id;
            relationshipData.target_entity_id = sourceNode.id;
            await this.createRelationshipInAPI(relationshipData);
        } else {
            // Normal outgoing relationship
            await this.createRelationshipInAPI(relationshipData);
        }
        
        // Create visual connection
        this.createVisualConnection(sourceNode, targetNode, {
            type: relationshipType,
            direction: direction,
            strength: strength
        });
        
        // Close modal
        this.closeRelationshipModal();
        
        console.log('✅ Relationship created:', relationshipType, sourceNode.entity.name, '→', targetNode.entity.name);
    }
    
    async createRelationshipInAPI(relationshipData) {
        try {
            console.log('💾 Saving relationship to API...', relationshipData);
            
            const response = await fetch(`${this.getApiBaseUrl()}/api/v1/kg/relationships`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(relationshipData)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ Relationship saved to API with ID:', result.id);
                return result;
            } else {
                console.warn('⚠️ Failed to save relationship to API:', response.status);
                return null;
            }
        } catch (error) {
            console.error('❌ Error saving relationship to API:', error);
            return null;
        }
    }
    
    createVisualConnection(sourceNode, targetNode, relationshipInfo) {
        // Create SVG connection if not exists
        let connectionsLayer = document.getElementById('kgConnections');
        if (!connectionsLayer) {
            connectionsLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            connectionsLayer.id = 'kgConnections';
            connectionsLayer.style.position = 'absolute';
            connectionsLayer.style.top = '0';
            connectionsLayer.style.left = '0';
            connectionsLayer.style.width = '100%';
            connectionsLayer.style.height = '100%';
            connectionsLayer.style.pointerEvents = 'none';
            connectionsLayer.style.zIndex = '10';
            document.getElementById('canvas').appendChild(connectionsLayer);
        }
        
        // Create connection line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        const connectionId = `connection-${sourceNode.id}-${targetNode.id}-${Date.now()}`;
        line.id = connectionId;
        line.classList.add('kg-connection');
        
        // Set connection strength styling
        if (relationshipInfo.strength >= 8) {
            line.classList.add('strong');
        } else if (relationshipInfo.strength <= 3) {
            line.classList.add('weak');
        }
        
        connectionsLayer.appendChild(line);
        
        // Store connection data
        const connectionData = {
            id: connectionId,
            element: line,
            source: sourceNode,
            target: targetNode,
            relationship: relationshipInfo
        };
        
        this.kgConnections.push(connectionData);
        
        // Update connection position
        this.updateConnectionPosition(connectionData);
        
        // Add tooltip
        this.addConnectionTooltip(line, relationshipInfo);
        
        console.log('🎨 Visual connection created:', connectionId);
    }
    
    updateConnectionPosition(connectionData) {
        const canvas = document.getElementById('canvas');
        const canvasRect = canvas.getBoundingClientRect();
        
        // Get source node center
        const sourceRect = connectionData.source.element.getBoundingClientRect();
        const sourceX = sourceRect.left + sourceRect.width / 2 - canvasRect.left;
        const sourceY = sourceRect.top + sourceRect.height / 2 - canvasRect.top;
        
        // Get target node center
        const targetRect = connectionData.target.element.getBoundingClientRect();
        const targetX = targetRect.left + targetRect.width / 2 - canvasRect.left;
        const targetY = targetRect.top + targetRect.height / 2 - canvasRect.top;
        
        // Update line position
        connectionData.element.setAttribute('x1', sourceX);
        connectionData.element.setAttribute('y1', sourceY);
        connectionData.element.setAttribute('x2', targetX);
        connectionData.element.setAttribute('y2', targetY);
    }
    
    addConnectionTooltip(element, relationshipInfo) {
        element.style.pointerEvents = 'auto'; // Enable pointer events for tooltip
        
        const tooltip = document.createElement('div');
        tooltip.style.cssText = `
            position: absolute;
            background: rgba(36, 37, 44, 0.95);
            border: 1px solid #76b3fa;
            border-radius: 4px;
            padding: 8px;
            color: #a3a7ad;
            font-family: 'IBM Plex Mono', monospace;
            font-size: 10px;
            pointer-events: none;
            z-index: 3000;
            display: none;
        `;
        tooltip.innerHTML = `
            <div style="color: #76b3fa; font-weight: bold;">${relationshipInfo.type}</div>
            <div>Strength: ${relationshipInfo.strength}/10</div>
            <div>Direction: ${relationshipInfo.direction}</div>
        `;
        document.body.appendChild(tooltip);
        
        element.addEventListener('mouseenter', (e) => {
            tooltip.style.display = 'block';
            tooltip.style.left = e.pageX + 10 + 'px';
            tooltip.style.top = e.pageY - 10 + 'px';
        });
        
        element.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
        
        element.addEventListener('mousemove', (e) => {
            tooltip.style.left = e.pageX + 10 + 'px';
            tooltip.style.top = e.pageY - 10 + 'px';
        });
    }
    
    closeRelationshipModal() {
        const modal = document.getElementById('relationshipModal');
        if (modal) {
            modal.style.display = 'none';
            
            // Reset form
            document.getElementById('relationshipType').value = '';
            document.getElementById('customRelationship').value = '';
            document.getElementById('relationshipDirection').value = 'outgoing';
            document.getElementById('relationshipStrength').value = '5';
            document.getElementById('strengthValue').textContent = '5';
            document.getElementById('relationshipNotes').value = '';
            document.getElementById('customRelationshipGroup').style.display = 'none';
        }
    }
    
    updateNodeConnections(nodeData) {
        // Update all connections involving this node
        this.kgConnections.forEach(connectionData => {
            if (connectionData.source === nodeData || connectionData.target === nodeData) {
                this.updateConnectionPosition(connectionData);
            }
        });
    }
    
    // Method 2: Load existing connections from API
    async loadKGConnectionsFromAPI() {
        try {
            console.log('📡 Loading KG relationships from API...');
            const response = await fetch(`${this.getApiBaseUrl()}/api/v1/kg/relationships`);
            
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }
            
            const relationships = await response.json();
            console.log(`✅ Loaded ${relationships.length} KG relationships from API`);
            
            // Create visual connections for existing relationships
            relationships.forEach(rel => {
                const sourceNode = this.kgNodes.find(n => n.id === rel.source_entity_id);
                const targetNode = this.kgNodes.find(n => n.id === rel.target_entity_id);
                
                if (sourceNode && targetNode) {
                    this.createVisualConnection(sourceNode, targetNode, {
                        type: rel.relationship_type,
                        direction: 'outgoing', // Default, could be enhanced
                        strength: rel.properties?.strength || 5
                    });
                }
            });
            
        } catch (error) {
            console.error('❌ Failed to load KG relationships:', error);
        }
    }
    
    editKGNode(nodeData) {
        console.log('✏️ Edit KG node not implemented yet');
        // TODO: Open modal with node data pre-filled
    }
    
    duplicateKGNode(nodeData) {
        const newPosition = {
            x: nodeData.position.x + 20,
            y: nodeData.position.y + 20
        };
        
        const duplicatedEntity = { ...nodeData.entity };
        duplicatedEntity.name += ' (Copy)';
        delete duplicatedEntity.id; // Remove ID so a new one is generated
        
        this.createKGNodeFromEntity(duplicatedEntity, newPosition);
    }
    
    deleteKGNode(nodeData) {
        // Remove from DOM
        nodeData.element.remove();
        
        // Remove from array
        const index = this.kgNodes.indexOf(nodeData);
        if (index > -1) {
            this.kgNodes.splice(index, 1);
        }
        
        // Clear selection if this was selected
        if (this.selectedKGNode === nodeData) {
            this.selectedKGNode = null;
        }
        
        console.log('🗑️ Deleted KG node:', nodeData.entity.name);
    }
    
    clearKGNodes() {
        this.kgNodes.forEach(nodeData => {
            nodeData.element.remove();
        });
        this.kgNodes = [];
        this.selectedKGNode = null;
    }
    
    openKGNodeModal() {
        const modal = document.getElementById('kgNodeModal');
        if (modal) {
            modal.style.display = 'block';
            
            // Reset form
            this.resetKGNodeModal();
            
            // Populate linking options
            this.populateLinkingOptions();
        }
    }
    
    closeKGNodeModal() {
        const modal = document.getElementById('kgNodeModal');
        if (modal) {
            modal.style.display = 'none';
            this.resetKGNodeModal();
        }
    }
    
    resetKGNodeModal() {
        // Clear form fields
        document.getElementById('kgNodeName').value = '';
        document.getElementById('kgNodeType').value = '';
        document.getElementById('kgNodeDescription').value = '';
        
        // Hide all entity fields
        document.querySelectorAll('.entity-fields').forEach(field => {
            field.style.display = 'none';
            field.classList.remove('active');
        });
        
        // Clear entity-specific fields
        document.querySelectorAll('.entity-fields input, .entity-fields select, .entity-fields textarea').forEach(input => {
            input.value = '';
        });
        
        // Reset linking options
        document.getElementById('kgLinkNode').value = '';
        document.getElementById('kgLinkTask').value = '';
        document.getElementById('kgLinkOpportunity').value = '';
    }
    
    showEntityFields(entityType) {
        // Hide all entity fields first
        document.querySelectorAll('.entity-fields').forEach(field => {
            field.style.display = 'none';
            field.classList.remove('active');
        });
        
        // Show relevant fields
        if (entityType) {
            const targetField = document.querySelector(`.entity-fields[data-type="${entityType}"]`);
            if (targetField) {
                targetField.style.display = 'block';
                targetField.classList.add('active');
            }
        }
    }
    
    populateLinkingOptions() {
        // Populate node options (from existing nodes)
        const nodeSelect = document.getElementById('kgLinkNode');
        if (nodeSelect && window.nodes) {
            nodeSelect.innerHTML = '<option value="">No node linked</option>';
            window.nodes.forEach(node => {
                const option = document.createElement('option');
                option.value = node.id;
                option.textContent = node.name || `${node.type} Node`;
                nodeSelect.appendChild(option);
            });
        }
        
        // Populate task options (from existing tasks)
        const taskSelect = document.getElementById('kgLinkTask');
        if (taskSelect && window.tasks) {
            taskSelect.innerHTML = '<option value="">No task linked</option>';
            window.tasks.forEach(task => {
                const option = document.createElement('option');
                option.value = task.id;
                option.textContent = task.name;
                taskSelect.appendChild(option);
            });
        }
        
        // Populate opportunity options
        const oppSelect = document.getElementById('kgLinkOpportunity');
        if (oppSelect && window.opportunities) {
            oppSelect.innerHTML = '<option value="">No opportunity linked</option>';
            window.opportunities.forEach(opp => {
                const option = document.createElement('option');
                option.value = opp.id;
                option.textContent = opp.title;
                oppSelect.appendChild(option);
            });
        }
    }
    
    createKGNodeFromModal() {
        const name = document.getElementById('kgNodeName').value.trim();
        const type = document.getElementById('kgNodeType').value;
        const description = document.getElementById('kgNodeDescription').value.trim();
        
        if (!name || !type || !description) {
            alert('Please fill in all required fields (Name, Type, Description)');
            return;
        }
        
        // Gather entity-specific properties
        const properties = this.gatherEntityProperties(type);
        
        // Gather linking information
        const links = {
            node: document.getElementById('kgLinkNode').value || null,
            task: document.getElementById('kgLinkTask').value || null,
            opportunity: document.getElementById('kgLinkOpportunity').value || null
        };
        
        // Create entity object
        const entity = {
            name,
            entity_type: type,
            description,
            properties,
            links
        };
        
        // Create node at center of canvas
        const canvas = document.getElementById('canvas');
        const canvasRect = canvas.getBoundingClientRect();
        const position = {
            x: (canvasRect.width / 2) - 100,
            y: (canvasRect.height / 2) - 50
        };
        
        // Create the KG node
        const nodeData = this.createKGNodeFromEntity(entity, position);
        
        // Save to API (async)
        this.saveKGNodeToAPI(nodeData);
        
        // Close modal
        this.closeKGNodeModal();
        
        console.log('✅ Created new KG node:', entity.name);
    }
    
    gatherEntityProperties(entityType) {
        const properties = {};
        
        const activeFields = document.querySelector(`.entity-fields[data-type="${entityType}"]`);
        if (!activeFields) return properties;
        
        const inputs = activeFields.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input.value.trim()) {
                const fieldName = input.id.replace(`kg${entityType.charAt(0).toUpperCase() + entityType.slice(1)}`, '').toLowerCase();
                
                if (fieldName === 'skills' && input.value.includes(',')) {
                    properties[fieldName] = input.value.split(',').map(s => s.trim()).filter(s => s);
                } else {
                    properties[fieldName] = input.value.trim();
                }
            }
        });
        
        return properties;
    }
    
    async saveKGNodeToAPI(nodeData) {
        try {
            const payload = {
                entity_type_name: nodeData.entity.entity_type,
                name: nodeData.entity.name,
                description: nodeData.entity.description,
                properties: nodeData.entity.properties || {}
            };
            
            console.log('💾 Saving KG node to API...', payload);
            
            const response = await fetch(`${this.getApiBaseUrl()}/api/v1/kg/entities`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (response.ok) {
                const result = await response.json();
                nodeData.id = result.id;
                console.log('✅ KG node saved to API with ID:', result.id);
            } else {
                console.warn('⚠️ Failed to save KG node to API:', response.status);
            }
        } catch (error) {
            console.error('❌ Error saving KG node to API:', error);
        }
    }
    
    addKGNodeAtPosition(clientX, clientY) {
        const canvas = document.getElementById('canvas');
        const rect = canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        
        // Quick-create a basic KG node
        const entity = {
            name: 'New Entity',
            entity_type: 'person',
            description: 'New knowledge graph entity',
            properties: {}
        };
        
        this.createKGNodeFromEntity(entity, { x, y });
    }
    
    /**
     * Hide KG nodes with smooth off-canvas transition (similar to opportunity cards)
     */
    hideKGNodesWithTransition() {
        console.log('🎬 Animating KG nodes off-canvas...');
        
        // Apply transition animation to each KG node
        this.kgNodes.forEach(nodeData => {
            if (nodeData.element) {
                nodeData.element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                nodeData.element.style.opacity = '0';
                nodeData.element.style.transform = 'translateX(-100vw)'; // Slide off-canvas to the left
            }
        });
        
        // Hide connections as well
        this.hideKGConnectionsWithTransition();
        
        // After animation completes, hide the elements completely
        setTimeout(() => {
            this.kgNodes.forEach(nodeData => {
                if (nodeData.element) {
                    nodeData.element.style.display = 'none';
                    // Reset styles for when KG mode is re-enabled
                    nodeData.element.style.transition = '';
                    nodeData.element.style.transform = '';
                }
            });
            console.log('✅ KG nodes hidden off-canvas');
        }, 500); // Match transition duration
    }
    
    /**
     * Hide KG connections with transition
     */
    hideKGConnectionsWithTransition() {
        const connectionsLayer = document.getElementById('kgConnections');
        if (connectionsLayer) {
            connectionsLayer.style.transition = 'opacity 0.5s ease';
            connectionsLayer.style.opacity = '0';
            
            setTimeout(() => {
                connectionsLayer.style.display = 'none';
                connectionsLayer.style.transition = '';
            }, 500);
        }
    }
    
    /**
     * Show KG nodes with smooth on-canvas transition when KG mode is activated
     */
    showKGNodesWithTransition() {
        console.log('🎬 Animating KG nodes on-canvas...');
        
        // Show and animate each KG node back onto canvas
        this.kgNodes.forEach(nodeData => {
            if (nodeData.element) {
                // First, make sure the element is visible and reset any previous transitions
                nodeData.element.style.display = 'block';
                nodeData.element.style.transition = 'none'; // Disable transitions temporarily
                nodeData.element.style.opacity = '0';
                nodeData.element.style.transform = 'translateX(-100vw)';
                
                // Force reflow to apply the initial styles
                nodeData.element.offsetHeight;
                
                // Now enable transitions and animate to normal position
                nodeData.element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                nodeData.element.style.opacity = '1';
                nodeData.element.style.transform = 'translateX(0)';
            }
        });
        
        // Show connections as well
        this.showKGConnectionsWithTransition();
        
        // Clean up transition styles after animation completes
        setTimeout(() => {
            this.kgNodes.forEach(nodeData => {
                if (nodeData.element) {
                    nodeData.element.style.transition = '';
                }
            });
            console.log('✅ KG nodes animated on-canvas');
        }, 500);
    }
    
    /**
     * Show KG connections with transition
     */
    showKGConnectionsWithTransition() {
        const connectionsLayer = document.getElementById('kgConnections');
        if (connectionsLayer) {
            // Reset any previous styles and make visible
            connectionsLayer.style.display = 'block';
            connectionsLayer.style.transition = 'none'; // Disable transitions temporarily
            connectionsLayer.style.opacity = '0';
            
            // Force reflow to apply the initial styles
            connectionsLayer.offsetHeight;
            
            // Now enable transitions and animate to visible
            connectionsLayer.style.transition = 'opacity 0.5s ease';
            connectionsLayer.style.opacity = '1';
            
            // Clean up transition styles after animation completes
            setTimeout(() => {
                connectionsLayer.style.transition = '';
            }, 500);
        }
    }
    
    // ==================== WORKFLOW ELEMENT TRANSITION METHODS ====================
    
    /**
     * Hide workflow elements with transition (matches opportunities mode behavior)
     */
    hideWorkflowElements() {
        const elements = [
            ...document.querySelectorAll('.node'),
            ...document.querySelectorAll('.task-node'),
            ...document.querySelectorAll('.flowline, .flowline-path'),
            ...document.querySelectorAll('.next-action-slot'),
            document.getElementById('eisenhowerMatrix')
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
    
    /**
     * Show workflow elements with transition (matches opportunities mode behavior)
     */
    showWorkflowElements() {
        const elements = [
            ...document.querySelectorAll('.node'),
            ...document.querySelectorAll('.task-node'),
            ...document.querySelectorAll('.flowline, .flowline-path'),
            ...document.querySelectorAll('.next-action-slot'),
            document.getElementById('eisenhowerMatrix')
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
                
                // Clean up transition styles after animation completes
                setTimeout(() => {
                    element.style.transition = '';
                    element.style.transform = '';
                }, 500);
            }
        });
        
        console.log('KnowledgeGraphController: Showing workflow elements with transition');
    }
}

// Initialize Knowledge Graph Controller
const kgController = new KnowledgeGraphController();

// Make available globally for debugging
window.kgController = kgController;