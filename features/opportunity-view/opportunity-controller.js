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
        
        // Load opportunities from MCP
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
            
            // Use the MCP client if available
            if (window.mcpClient) {
                const commandData = {
                    is_command: true,
                    action: 'list_opportunities',
                    parameters: {}
                };
                
                const result = await window.mcpClient.executeNoteCommand(commandData);
                this.opportunities = result.opportunities || [];
                
                console.log(`OpportunityController: Loaded ${this.opportunities.length} opportunities`);
            } else {
                // Fallback: create sample data for development
                this.opportunities = this.createSampleOpportunities();
                console.log('OpportunityController: Using sample opportunities (MCP not available)');
            }
            
            // Render opportunity cards
            this.renderOpportunityCards();
            
        } catch (error) {
            console.error('OpportunityController: Error loading opportunities:', error);
            // Use sample data as fallback
            this.opportunities = this.createSampleOpportunities();
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
     * Create a single opportunity card
     */
    createOpportunityCard(opportunity) {
        const card = document.createElement('div');
        card.className = 'opportunity-card';
        card.dataset.opportunityId = opportunity.opportunity_id;
        
        // Format date
        const createdDate = new Date(opportunity.created_at).toLocaleDateString();
        
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
            ...document.querySelectorAll('.flowline'),
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
            toggleButton.textContent = isActive ? '📋 Workflow' : '💼 Opportunities';
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
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OpportunityController;
} else {
    window.OpportunityController = OpportunityController;
}