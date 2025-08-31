/**
 * Opportunity View Controller
 * Manages the opportunity card display mode and transitions
 */

class OpportunityController {
    constructor(app) {
        this.app = app;
        this.isOpportunityMode = false;
        this.opportunities = [];
        this.opportunityContainer = null;
        
        this.initializeOpportunityView();
        this.bindEvents();
    }
    
    /**
     * Initialize the opportunity view container
     */
    initializeOpportunityView() {
        // Create opportunity container
        this.opportunityContainer = document.createElement('div');
        this.opportunityContainer.id = 'opportunityView';
        this.opportunityContainer.className = 'opportunity-view';
        this.opportunityContainer.style.display = 'none';
        
        // Add to canvas
        const canvas = document.getElementById('canvas');
        canvas.appendChild(this.opportunityContainer);
        
        console.log('OpportunityController: Initialized opportunity view');
    }
    
    /**
     * Bind event listeners
     */
    bindEvents() {
        // Listen for opportunity mode toggle
        document.addEventListener('toggleOpportunityMode', (event) => {
            if (event.detail.enabled) {
                this.enterOpportunityMode();
            } else {
                this.exitOpportunityMode();
            }
        });
        
        // Listen for opportunity updates
        document.addEventListener('opportunityUpdated', () => {
            if (this.isOpportunityMode) {
                this.refreshOpportunities();
            }
        });
    }
    
    /**
     * Enter opportunity display mode
     */
    async enterOpportunityMode() {
        if (this.isOpportunityMode) return;
        
        console.log('OpportunityController: Entering opportunity mode');
        this.isOpportunityMode = true;
        
        // Load opportunities from MCP (this now preserves manual ones)
        await this.loadOpportunities();
        
        // Transition out workflow elements
        this.hideWorkflowElements();
        
        // Show opportunity view
        this.showOpportunityView();
        
        // Update toggle button state
        this.updateToggleButton(true);
        
        // Dispatch event for other components
        document.dispatchEvent(new CustomEvent('opportunityModeEntered'));
    }
    
    /**
     * Exit opportunity display mode
     */
    exitOpportunityMode() {
        if (!this.isOpportunityMode) return;
        
        console.log('OpportunityController: Exiting opportunity mode');
        this.isOpportunityMode = false;
        
        // Hide opportunity view
        this.hideOpportunityView();
        
        // Transition in workflow elements
        this.showWorkflowElements();
        
        // Update toggle button state
        this.updateToggleButton(false);
        
        // Dispatch event for other components
        document.dispatchEvent(new CustomEvent('opportunityModeExited'));
    }
    
    /**
     * Load opportunities from MCP service
     */
    async loadOpportunities() {
        try {
            console.log('OpportunityController: Loading opportunities from MCP');
            
            // Store any manually created opportunities to preserve them
            const manuallyCreatedOpportunities = this.opportunities.filter(opp => 
                opp.metadata && opp.metadata.source === 'manual'
            );
            
            // Use the MCP client if available
            if (window.mcpClient) {
                const commandData = {
                    is_command: true,
                    action: 'list_opportunities',
                    parameters: {}
                };
                
                const result = await window.mcpClient.executeNoteCommand(commandData);
                const mcpOpportunities = result.opportunities || [];
                
                // Merge MCP opportunities with manually created ones
                this.opportunities = [...mcpOpportunities, ...manuallyCreatedOpportunities];
                
                console.log(`OpportunityController: Loaded ${mcpOpportunities.length} from MCP, preserved ${manuallyCreatedOpportunities.length} manual opportunities`);
            } else {
                // Fallback: use sample data + preserve manual opportunities
                if (this.opportunities.length === 0) {
                    // First time loading - add sample data
                    this.opportunities = this.createSampleOpportunities();
                    console.log('OpportunityController: Using sample opportunities (MCP not available, first load)');
                } else {
                    // Keep existing opportunities (including manually created ones)
                    // Filter to preserve manual opportunities and add samples if none exist
                    const manualOpportunities = this.opportunities.filter(opp => 
                        opp.metadata && opp.metadata.source === 'manual'
                    );
                    const sampleOpportunities = manualOpportunities.length === 0 && this.opportunities.length === 0 ? 
                        this.createSampleOpportunities() : [];
                    
                    // Don't overwrite - just preserve existing
                    console.log(`OpportunityController: Preserving ${this.opportunities.length} existing opportunities (${manualOpportunities.length} manual) (MCP not available)`);
                }
            }
            
            // Render opportunity cards
            this.renderOpportunityCards();
            
        } catch (error) {
            console.error('OpportunityController: Error loading opportunities:', error);
            
            // Store any manually created opportunities to preserve them
            const manuallyCreatedOpportunities = this.opportunities.filter(opp => 
                opp.metadata && opp.metadata.source === 'manual'
            );
            
            // Use sample data as fallback but preserve manual ones
            const sampleOpportunities = manuallyCreatedOpportunities.length === 0 ? this.createSampleOpportunities() : [];
            this.opportunities = [...sampleOpportunities, ...manuallyCreatedOpportunities];
            
            console.log(`OpportunityController: Error fallback - using ${sampleOpportunities.length} sample + ${manuallyCreatedOpportunities.length} manual opportunities`);
            
            this.renderOpportunityCards();
        }
    }
    
    /**
     * Create sample opportunities for development
     */
    createSampleOpportunities() {
        return [
            {
                opportunity_id: 'opp-sample-1',
                title: 'Fast & Furious Franchise',
                description: 'High-octane action movie series',
                status: 'active',
                tags: ['action', 'franchise'],
                created_at: new Date().toISOString(),
                metadata: {}
            },
            {
                opportunity_id: 'opp-sample-2',
                title: 'Racing Championship',
                description: 'International racing competition',
                status: 'planning',
                tags: ['racing', 'competition'],
                created_at: new Date().toISOString(),
                metadata: {}
            },
            {
                opportunity_id: 'opp-sample-3',
                title: 'Automotive Partnership',
                description: 'Strategic partnership with car manufacturers',
                status: 'negotiation',
                tags: ['partnership', 'automotive'],
                created_at: new Date().toISOString(),
                metadata: {}
            }
        ];
    }
    
    /**
     * Render opportunity cards
     */
    renderOpportunityCards() {
        // Clear existing cards
        this.opportunityContainer.innerHTML = '';
        
        // Create header
        const header = document.createElement('div');
        header.className = 'opportunity-header';
        header.innerHTML = `
            <h2>Business Opportunities</h2>
            <div class="opportunity-stats">
                <span class="stat-item">${this.opportunities.length} Opportunities</span>
            </div>
        `;
        this.opportunityContainer.appendChild(header);
        
        // Create cards container
        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'opportunity-cards';
        
        // Create cards
        this.opportunities.forEach(opportunity => {
            const card = this.createOpportunityCard(opportunity);
            cardsContainer.appendChild(card);
        });
        
        this.opportunityContainer.appendChild(cardsContainer);
        
        console.log(`OpportunityController: Rendered ${this.opportunities.length} opportunity cards`);
    }
    
    /**
     * Get tasks linked to a specific opportunity
     * @param {string} opportunityId - The opportunity ID
     * @returns {Array} Array of task objects linked to the opportunity
     */
    getLinkedTasks(opportunityId) {
        if (!this.app || !this.app.taskNodes) return [];
        
        const linkedTasks = [];
        this.app.taskNodes.forEach(taskNode => {
            if (taskNode.dataset.opportunityId === opportunityId) {
                const taskTextElement = taskNode.querySelector('.task-text') || taskNode.querySelector('.node-text');
                const taskName = taskTextElement ? taskTextElement.textContent.trim() : 'Unnamed Task';
                
                linkedTasks.push({
                    id: taskNode.dataset.id,
                    name: taskName,
                    status: taskNode.dataset.status || 'not_started',
                    priority: taskNode.dataset.priority || 'medium',
                    node: taskNode
                });
            }
        });
        
        return linkedTasks;
    }

    /**
     * Create a single opportunity card
     */
    createOpportunityCard(opportunity) {
        const card = document.createElement('div');
        card.className = 'opportunity-card';
        card.dataset.opportunityId = opportunity.opportunity_id;
        
        // Format date
        const createdDate = new Date(opportunity.created_at).toLocaleDateString();
        
        // Get linked tasks for this opportunity
        const linkedTasks = this.getLinkedTasks(opportunity.opportunity_id);
        const linkedTasksHtml = linkedTasks.length > 0 ? `
            <div class="card-linked-tasks">
                <div class="linked-tasks-header">Linked Tasks (${linkedTasks.length})</div>
                <div class="linked-tasks-list">
                    ${linkedTasks.map(task => `
                        <div class="linked-task-item" data-task-id="${task.id}">
                            <div class="task-name">${task.name}</div>
                            <div class="task-meta">
                                <span class="task-status ${task.status}">${task.status.replace('_', ' ')}</span>
                                <span class="task-priority priority-${task.priority}">${task.priority}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '<div class="card-linked-tasks"><div class="no-linked-tasks">No linked tasks</div></div>';
        
        // Create card content
        card.innerHTML = `
            <div class="card-header">
                <div class="card-title">${opportunity.title}</div>
                <div class="card-status ${opportunity.status || 'active'}">${(opportunity.status || 'active').charAt(0).toUpperCase() + (opportunity.status || 'active').slice(1)}</div>
            </div>
            <div class="card-content">
                <div class="card-description">${opportunity.description || 'No description available'}</div>
                <div class="card-meta">
                    <span class="card-date">Created: ${createdDate}</span>
                </div>
                ${linkedTasksHtml}
            </div>
            <div class="card-tags">
                ${(opportunity.tags || []).map(tag => `<span class="card-tag">${tag}</span>`).join('')}
            </div>
            <div class="card-actions">
                <button class="card-btn primary" onclick="opportunityController.editOpportunity('${opportunity.opportunity_id}')">Edit</button>
                <button class="card-btn secondary" onclick="opportunityController.linkTasks('${opportunity.opportunity_id}')">Link Tasks</button>
            </div>
        `;
        
        return card;
    }
    
    /**
     * Hide workflow elements with transition
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
     * Show workflow elements with transition
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
     * Show opportunity view with transition
     */
    showOpportunityView() {
        this.opportunityContainer.style.display = 'block';
        this.opportunityContainer.style.opacity = '0';
        this.opportunityContainer.style.transform = 'translateY(20px)';
        
        // Force reflow
        this.opportunityContainer.offsetHeight;
        
        this.opportunityContainer.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        this.opportunityContainer.style.opacity = '1';
        this.opportunityContainer.style.transform = 'translateY(0)';
    }
    
    /**
     * Hide opportunity view with transition
     */
    hideOpportunityView() {
        this.opportunityContainer.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        this.opportunityContainer.style.opacity = '0';
        this.opportunityContainer.style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
            this.opportunityContainer.style.display = 'none';
            this.opportunityContainer.style.transition = '';
            this.opportunityContainer.style.transform = '';
        }, 500);
    }
    
    /**
     * Update toggle button state
     */
    updateToggleButton(isActive) {
        const toggleButton = document.getElementById('opportunityToggle');
        if (toggleButton) {
            toggleButton.textContent = isActive ? '💼 Opportunities' : '💼 Opportunities';
            toggleButton.classList.toggle('active', isActive);
        }
    }
    
    /**
     * Refresh opportunities data
     */
    async refreshOpportunities() {
        await this.loadOpportunities();
    }
    
    /**
     * Edit opportunity (placeholder for future implementation)
     */
    editOpportunity(opportunityId) {
        console.log('OpportunityController: Edit opportunity:', opportunityId);
        // TODO: Implement opportunity editing
        alert(`Edit opportunity: ${opportunityId}\n(Feature coming soon)`);
    }
    
    /**
     * Link tasks to opportunity (placeholder for future implementation)
     */
    linkTasks(opportunityId) {
        console.log('OpportunityController: Link tasks to opportunity:', opportunityId);
        // TODO: Implement task linking
        alert(`Link tasks to opportunity: ${opportunityId}\n(Feature coming soon)`);
    }
    
    /**
     * Get current mode state
     */
    isInOpportunityMode() {
        return this.isOpportunityMode;
    }
    
    /**
     * Get opportunities data
     */
    getOpportunities() {
        return this.opportunities;
    }
    
    /**
     * Add a new opportunity to the collection
     * @param {Object} opportunity - Opportunity data following the schema
     */
    addOpportunity(opportunity) {
        if (!opportunity) {
            console.error('OpportunityController: No opportunity data provided');
            return;
        }
        
        // Add to opportunities array
        this.opportunities.push(opportunity);
        
        // Refresh the display if we're in opportunity mode
        if (this.isOpportunityMode) {
            this.renderOpportunityCards();
        }
        
        console.log(`OpportunityController: Added opportunity "${opportunity.title}" (${opportunity.opportunity_id})`);
        
        // Dispatch event for other components
        document.dispatchEvent(new CustomEvent('opportunityAdded', { 
            detail: { opportunity } 
        }));
    }
    
    /**
     * Remove an opportunity by ID
     * @param {string} opportunityId - Opportunity ID to remove
     */
    removeOpportunity(opportunityId) {
        const index = this.opportunities.findIndex(opp => opp.opportunity_id === opportunityId);
        if (index !== -1) {
            const removed = this.opportunities.splice(index, 1)[0];
            
            // Refresh the display if we're in opportunity mode
            if (this.isOpportunityMode) {
                this.renderOpportunityCards();
            }
            
            console.log(`OpportunityController: Removed opportunity "${removed.title}"`);
            
            // Dispatch event for other components
            document.dispatchEvent(new CustomEvent('opportunityRemoved', { 
                detail: { opportunity: removed } 
            }));
        } else {
            console.warn(`OpportunityController: Opportunity ${opportunityId} not found`);
        }
    }
    
    /**
     * Get all opportunities
     * @returns {Array} Array of opportunity objects
     */
    getAllOpportunities() {
        return [...this.opportunities];
    }
    
    /**
     * Get opportunity by ID
     * @param {string} opportunityId - Opportunity ID
     * @returns {Object|null} Opportunity object or null if not found
     */
    getOpportunityById(opportunityId) {
        return this.opportunities.find(opp => opp.opportunity_id === opportunityId) || null;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OpportunityController;
} else {
    window.OpportunityController = OpportunityController;
}
