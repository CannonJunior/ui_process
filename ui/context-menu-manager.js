/**
 * Context Menu Manager
 * Centralized management of all context menu interactions and positioning
 * 
 * SAFETY: Manages UI context menu state with careful event and position handling
 * Risk Level: MEDIUM - Complex event handling, positioning logic, state dependencies
 */

class ContextMenuManager {
    constructor(mainApp) {
        // Reference to main application instance
        this.app = mainApp;
        
        // Get services
        this.domService = this.app.domService;
        this.configService = this.app.configService;
        
        // Cache context menu elements
        this.initializeContextMenuElements();
        
        // Context menu state tracking
        this.currentMenu = null;
        this.selectedElement = null;
        this.menuPosition = { x: 0, y: 0 };
        
        // Tag context menu state
        this.selectedTagForEdit = null;
        this.currentTagData = null;
        
        // Setup context menu event listeners
        this.setupContextMenuEventListeners();
    }
    
    /**
     * Initialize and cache all context menu elements
     */
    initializeContextMenuElements() {
        // Get context menu elements from DOM service
        const contextMenuElements = this.domService.getElementGroup('contextMenus');
        const canvasElements = this.domService.getElementGroup('canvas');
        
        // Assign to instance for easy access
        Object.assign(this, contextMenuElements, canvasElements);
        
        // Validate critical context menu elements
        const requiredElements = ['contextMenu', 'taskContextMenu', 'canvas'];
        const missingElements = requiredElements.filter(id => !this[id]);
        
        if (missingElements.length > 0) {
            throw new Error(`ContextMenuManager: Missing required elements: ${missingElements.join(', ')}`);
        }
    }
    
    /**
     * Setup event listeners for all context menu interactions
     */
    setupContextMenuEventListeners() {
        // Canvas click to hide context menu
        if (this.canvas) {
            this.canvas.addEventListener('click', (e) => {
                if (e.target === this.canvas) {
                    this.hideContextMenu();
                }
            });
        }
        
        // Node context menu click handling
        if (this.contextMenu) {
            this.contextMenu.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                if (action) {
                    this.handleContextMenuAction(action);
                }
                this.hideContextMenu();
            });
        }
        
        // Task context menu click handling
        if (this.taskContextMenu) {
            this.taskContextMenu.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                if (action) {
                    this.handleTaskContextMenuAction(action);
                }
                this.hideContextMenu();
            });
        }
        
        // Tag context menu handling
        if (this.tagContextMenu) {
            this.tagContextMenu.addEventListener('click', (e) => {
                console.log('ContextMenuManager: Tag context menu clicked');
                const action = e.target.dataset.action;
                const attribute = e.target.dataset.attribute;
                
                if (action) {
                    console.log('ContextMenuManager: Tag action:', action);
                    this.handleTagContextMenuAction(action);
                } else if (attribute) {
                    console.log('ContextMenuManager: Tag attribute:', attribute);
                    this.handleTagAttributeClick(attribute, e);
                } else {
                    console.log('ContextMenuManager: No action or attribute found');
                }
                
                this.hideTagContextMenus();
            });
        }
        
        // Tag attribute menu handling
        if (this.tagAttributeMenu) {
            this.tagAttributeMenu.addEventListener('click', (e) => {
                const value = e.target.dataset.value;
                if (value && this.selectedTagForEdit && this.currentTagData) {
                    this.updateTagAttribute(this.currentTagData.attribute, value);
                    this.hideTagContextMenus();
                }
            });
        }
        
        // Global click to hide context menus
        document.addEventListener('click', (e) => {
            if (!this.isClickInsideContextMenus(e)) {
                this.hideTagContextMenus();
            }
        });
        
        // Global escape key to hide context menus
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllContextMenus();
            }
        });
    }
    
    /**
     * Check if click is inside any context menu
     * @param {Event} e - Click event
     * @returns {boolean} True if click is inside a context menu
     */
    isClickInsideContextMenus(e) {
        const contextMenus = [this.tagContextMenu, this.tagAttributeMenu, this.tagDatePicker];
        
        // Check if click is inside any context menu or on a tag element
        return contextMenus.some(menu => menu && menu.contains(e.target)) ||
               e.target.classList.contains('tag');
    }
    
    // ==================== MAIN CONTEXT MENU METHODS ====================
    
    /**
     * Handle right-click context menu display for nodes and tasks
     * @param {Event} e - Context menu event
     * @param {HTMLElement} node - Node element
     */
    handleContextMenu(e, node) {
        e.preventDefault();
        this.app.selectedNode = node;
        this.selectedElement = node;
        
        const canvasRect = this.canvas.getBoundingClientRect();
        const isTaskNode = node.dataset.type === 'task';
        const menu = isTaskNode ? this.taskContextMenu : this.contextMenu;
        
        // For task nodes, show/hide the reverse option based on previous anchor availability
        if (isTaskNode) {
            this.updateTaskContextMenuOptions(node, menu);
        }
        
        // Position and show menu
        const menuPosition = this.calculateMenuPosition(e, canvasRect, menu);
        this.showContextMenuAt(menu, menuPosition.x, menuPosition.y);
        
        console.log(`ContextMenuManager: ${isTaskNode ? 'Task' : 'Node'} context menu opened`);
    }
    
    /**
     * Update task context menu options based on task state
     * @param {HTMLElement} node - Task node element
     * @param {HTMLElement} menu - Context menu element
     */
    updateTaskContextMenuOptions(node, menu) {
        const reverseMenuItem = menu.querySelector('[data-action="reverse"]');
        const hasPreviousAnchor = node.dataset.previousAnchor && node.dataset.previousAnchor !== 'null';
        
        if (reverseMenuItem) {
            reverseMenuItem.style.display = hasPreviousAnchor ? 'block' : 'none';
        }
    }
    
    /**
     * Calculate optimal position for context menu
     * @param {Event} e - Context menu event
     * @param {DOMRect} canvasRect - Canvas bounding rectangle
     * @param {HTMLElement} menu - Menu element
     * @returns {Object} Position coordinates {x, y}
     */
    calculateMenuPosition(e, canvasRect, menu) {
        const baseX = e.clientX - canvasRect.left;
        const baseY = e.clientY - canvasRect.top;
        
        // Use GeometryUtils for position calculation if available
        if (typeof GeometryUtils !== 'undefined') {
            const canvasPosition = GeometryUtils.viewportToCanvas(e.clientX, e.clientY, this.canvas);
            return { x: canvasPosition.x, y: canvasPosition.y };
        }
        
        return { x: baseX, y: baseY };
    }
    
    /**
     * Show context menu at specified position
     * @param {HTMLElement} menu - Menu element to show
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    showContextMenuAt(menu, x, y) {
        if (!menu) return;
        
        this.menuPosition = { x, y };
        this.currentMenu = menu;
        
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.style.display = 'block';
    }
    
    /**
     * Hide all context menus
     */
    hideContextMenu() {
        if (this.contextMenu) {
            this.contextMenu.style.display = 'none';
        }
        
        if (this.taskContextMenu) {
            this.taskContextMenu.style.display = 'none';
        }
        
        this.hideTagContextMenus();
        this.app.selectedNode = null;
        this.selectedElement = null;
        this.currentMenu = null;
        
        console.log('ContextMenuManager: Context menus hidden');
    }
    
    /**
     * Handle node context menu action selection
     * @param {string} action - Selected action
     */
    handleContextMenuAction(action) {
        console.log(`ContextMenuManager: Node context action: ${action}`);
        
        switch (action) {
            case 'flowline':
                this.app.startFlowlineCreation();
                break;
            case 'rename':
                this.app.renameNode();
                break;
            case 'delete':
                this.app.deleteNode();
                break;
            default:
                console.warn(`ContextMenuManager: Unknown node action: ${action}`);
        }
    }
    
    /**
     * Handle task context menu action selection
     * @param {string} action - Selected action
     */
    handleTaskContextMenuAction(action) {
        console.log(`ContextMenuManager: Task context action: ${action}`);
        
        switch (action) {
            case 'advance':
                this.app.advanceTask();
                break;
            case 'reverse':
                this.app.reverseTask();
                break;
            case 'tags':
                this.app.showTagModal();
                break;
            case 'rename':
                this.app.renameNode();
                break;
            case 'delete':
                this.app.deleteTaskNode();
                break;
            default:
                console.warn(`ContextMenuManager: Unknown task action: ${action}`);
        }
    }
    
    /**
     * Handle tag context menu action selection
     * @param {string} action - Selected action
     */
    handleTagContextMenuAction(action) {
        console.log(`ContextMenuManager: Tag context action: ${action}`);
        
        switch (action) {
            case 'delete':
                this.deleteSelectedTag();
                break;
            case 'reset-next-action':
                this.resetTagFromNextAction();
                break;
            case 'close':
                // Just hide the menu, no additional action needed
                break;
            default:
                console.warn(`ContextMenuManager: Unknown tag action: ${action}`);
        }
    }
    
    // ==================== TAG CONTEXT MENU METHODS ====================
    
    /**
     * Show tag context menu for specific tag
     * @param {HTMLElement} tagElement - Tag element
     * @param {Event} e - Context menu event
     */
    showTagContextMenu(tagElement, e) {
        console.log('ContextMenuManager: showTagContextMenu called with:', tagElement);
        this.selectedTagForEdit = tagElement;
        
        // Parse tag data
        const taskNode = tagElement.closest('.task-banner');
        const tagIndex = Array.from(tagElement.parentNode.children).indexOf(tagElement);
        
        this.currentTagData = {
            taskNode: taskNode,
            tagIndex: tagIndex,
            tagElement: tagElement
        };
        
        console.log('ContextMenuManager: Tag context menu state set:');
        console.log('  selectedTagForEdit:', this.selectedTagForEdit);
        console.log('  currentTagData:', this.currentTagData);
        
        // Hide other menus first, but preserve the tag state we just set
        this.hideContextMenu();
        
        // Hide tag context menu elements but preserve state
        if (this.tagContextMenu) {
            this.tagContextMenu.style.display = 'none';
        }
        if (this.tagAttributeMenu) {
            this.tagAttributeMenu.style.display = 'none';
        }
        if (this.tagDatePicker) {
            this.tagDatePicker.style.display = 'none';
        }
        
        // Create tag context menu content
        this.createTagContextMenuContent(tagElement);
        
        // Position and show menu
        const canvasRect = this.canvas.getBoundingClientRect();
        const menuPosition = this.calculateMenuPosition(e, canvasRect, this.tagContextMenu);
        this.showContextMenuAt(this.tagContextMenu, menuPosition.x, menuPosition.y);
        
        // Hide other menus
        if (this.tagAttributeMenu) {
            this.tagAttributeMenu.style.display = 'none';
        }
        
        if (this.tagDatePicker) {
            this.tagDatePicker.style.display = 'none';
        }
        
        console.log('ContextMenuManager: Tag context menu opened');
    }
    
    /**
     * Create tag context menu content
     * @param {HTMLElement} tagElement - Tag element
     */
    createTagContextMenuContent(tagElement) {
        if (!this.tagContextMenu) return;
        
        // Clear existing content
        this.tagContextMenu.innerHTML = '';
        
        // Add edit options
        const editOptions = [
            { text: 'Edit Category', attribute: 'category' },
            { text: 'Edit Option', attribute: 'option' },
            { text: 'Edit Date', attribute: 'date' },
            { text: 'Edit Description', attribute: 'description' },
            { text: 'Edit Link', attribute: 'link' }
        ];
        
        editOptions.forEach(option => {
            const item = document.createElement('div');
            item.className = 'menu-item';
            item.textContent = option.text;
            item.dataset.attribute = option.attribute;
            this.tagContextMenu.appendChild(item);
        });
        
        // Add separator
        const separator = document.createElement('div');
        separator.className = 'menu-separator';
        this.tagContextMenu.appendChild(separator);
        
        // Add action options
        const deleteItem = document.createElement('div');
        deleteItem.className = 'menu-item delete';
        deleteItem.textContent = 'Delete Tag';
        deleteItem.dataset.action = 'delete';
        this.tagContextMenu.appendChild(deleteItem);
        
        // Add reset next action option (conditional)
        const resetItem = document.createElement('div');
        resetItem.className = 'menu-item';
        resetItem.textContent = 'Reset from Next Action';
        resetItem.dataset.action = 'reset-next-action';
        resetItem.style.display = tagElement.dataset.isInNextAction === 'true' ? 'block' : 'none';
        this.tagContextMenu.appendChild(resetItem);
        
        // Add close option
        const closeItem = document.createElement('div');
        closeItem.className = 'menu-item';
        closeItem.textContent = 'Close';
        closeItem.dataset.action = 'close';
        this.tagContextMenu.appendChild(closeItem);
    }
    
    /**
     * Handle tag attribute click for editing
     * @param {string} attribute - Attribute to edit
     * @param {Event} e - Click event
     */
    handleTagAttributeClick(attribute, e) {
        this.currentTagData.attribute = attribute;
        
        if (attribute === 'date') {
            this.showTagDatePicker(e);
        } else {
            this.showTagAttributeMenu(attribute, e);
        }
    }
    
    /**
     * Show tag attribute editing menu
     * @param {string} attribute - Attribute being edited
     * @param {Event} e - Click event
     */
    showTagAttributeMenu(attribute, e) {
        if (!this.tagAttributeMenu || !this.tagContextMenu) return;
        
        const canvasRect = this.canvas.getBoundingClientRect();
        const menuRect = this.tagContextMenu.getBoundingClientRect();
        
        // Position to the right of the context menu
        this.tagAttributeMenu.style.left = (menuRect.right - canvasRect.left + 5) + 'px';
        this.tagAttributeMenu.style.top = (e.clientY - canvasRect.top) + 'px';
        
        // Populate options based on attribute type
        this.populateTagAttributeMenu(attribute);
        
        this.tagAttributeMenu.style.display = 'block';
    }
    
    /**
     * Populate tag attribute menu with appropriate options
     * @param {string} attribute - Attribute being edited
     */
    populateTagAttributeMenu(attribute) {
        if (!this.tagAttributeMenu) return;
        
        this.tagAttributeMenu.innerHTML = '';
        
        if (attribute === 'category') {
            const categories = this.configService.getTagCategories();
            categories.forEach(category => {
                if (category.value) { // Skip disabled placeholder options
                    const option = document.createElement('div');
                    option.className = 'menu-item';
                    option.textContent = category.label;
                    option.dataset.value = category.value;
                    this.tagAttributeMenu.appendChild(option);
                }
            });
        } else if (attribute === 'option') {
            const currentTag = this.getCurrentTagData();
            if (currentTag && currentTag.category) {
                const options = this.configService.getTagOptions(currentTag.category);
                options.forEach(option => {
                    if (option.value) { // Skip disabled placeholder options
                        const menuItem = document.createElement('div');
                        menuItem.className = 'menu-item';
                        menuItem.textContent = option.label;
                        menuItem.dataset.value = option.value;
                        this.tagAttributeMenu.appendChild(menuItem);
                    }
                });
            }
        }
    }
    
    /**
     * Show tag date picker
     * @param {Event} e - Click event
     */
    showTagDatePicker(e) {
        if (!this.tagDatePicker || !this.tagContextMenu) return;
        
        const canvasRect = this.canvas.getBoundingClientRect();
        const menuRect = this.tagContextMenu.getBoundingClientRect();
        
        // Position to the right of the context menu
        this.tagDatePicker.style.left = (menuRect.right - canvasRect.left + 5) + 'px';
        this.tagDatePicker.style.top = (e.clientY - canvasRect.top) + 'px';
        
        // Get current date value
        const currentTag = this.getCurrentTagData();
        const currentDate = currentTag.date || '';
        
        // Create date picker content
        this.tagDatePicker.innerHTML = `
            <input type="date" id="tagDatePickerInput" value="${currentDate}" style="padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px;">
            <div style="margin-top: 5px;">
                <button onclick="window.processFlowDesigner.contextMenuManager.applyTagDate()" style="padding: 4px 8px; background: #007bff; color: white; border: none; border-radius: 3px; margin-right: 5px;">Apply</button>
                <button onclick="window.processFlowDesigner.contextMenuManager.clearTagDate()" style="padding: 4px 8px; background: #6c757d; color: white; border: none; border-radius: 3px;">Clear</button>
            </div>
        `;
        
        this.tagDatePicker.style.display = 'block';
        
        // Focus the date input
        setTimeout(() => {
            const input = document.getElementById('tagDatePickerInput');
            if (input) input.focus();
        }, 10);
    }
    
    /**
     * Apply tag date from picker
     */
    applyTagDate() {
        const input = document.getElementById('tagDatePickerInput');
        if (input && this.currentTagData) {
            const newDate = input.value;
            this.updateTagAttribute('date', newDate);
            this.hideTagContextMenus();
        }
    }
    
    /**
     * Clear tag date
     */
    clearTagDate() {
        if (this.currentTagData) {
            this.updateTagAttribute('date', '');
            this.hideTagContextMenus();
        }
    }
    
    /**
     * Update tag attribute with new value
     * @param {string} attribute - Attribute to update
     * @param {string} value - New value
     */
    updateTagAttribute(attribute, value) {
        if (!this.currentTagData || !this.currentTagData.taskNode) {
            console.error('ContextMenuManager: No tag data available for update');
            return;
        }
        
        console.log(`ContextMenuManager: Updating tag attribute ${attribute} to ${value}`);
        
        // Delegate to tag manager for tag update logic
        if (this.app.tagManager && typeof this.app.tagManager.updateTagAttribute === 'function') {
            this.app.tagManager.updateTagAttribute(attribute, value);
        } else {
            // Fallback to main app method
            this.app.updateTagAttribute(attribute, value);
        }
        
        console.log('ContextMenuManager: Tag attribute updated successfully');
    }
    
    /**
     * Delete selected tag
     */
    deleteSelectedTag() {
        if (this.currentTagData && this.currentTagData.taskNode) {
            // Set the selected task for tag manager operations
            const originalSelectedTask = this.app.selectedTaskForTags;
            this.app.selectedTaskForTags = this.currentTagData.taskNode;
            
            try {
                // Delegate to tag manager for tag deletion logic
                if (this.app.tagManager && typeof this.app.tagManager.removeTag === 'function') {
                    this.app.tagManager.removeTag(this.currentTagData.tagIndex);
                } else {
                    // Fallback to main app method
                    this.app.removeTag(this.currentTagData.tagIndex);
                }
            } finally {
                // Restore original selected task
                this.app.selectedTaskForTags = originalSelectedTask;
            }
            
            console.log('ContextMenuManager: Tag deleted successfully');
        } else {
            console.error('ContextMenuManager: No tag data available for deletion');
        }
    }
    
    /**
     * Reset tag from next action
     */
    resetTagFromNextAction() {
        // Pass the tag data to main app for reset logic
        if (this.selectedTagForEdit && this.currentTagData) {
            this.app.resetTagFromNextAction(this.selectedTagForEdit, this.currentTagData);
        } else {
            console.error('ContextMenuManager: No tag selected for reset operation');
        }
    }
    
    /**
     * Get current tag data
     * @returns {Object|null} Current tag data
     */
    getCurrentTagData() {
        if (!this.currentTagData || !this.currentTagData.taskNode) return null;
        
        const tags = this.app.getTaskTags(this.currentTagData.taskNode);
        return tags[this.currentTagData.tagIndex] || null;
    }
    
    /**
     * Hide all tag context menus
     */
    hideTagContextMenus() {
        if (this.tagContextMenu) {
            this.tagContextMenu.style.display = 'none';
        }
        
        if (this.tagAttributeMenu) {
            this.tagAttributeMenu.style.display = 'none';
        }
        
        if (this.tagDatePicker) {
            this.tagDatePicker.style.display = 'none';
        }
        
        this.selectedTagForEdit = null;
        this.currentTagData = null;
    }
    
    /**
     * Hide all context menus (main and tag)
     */
    hideAllContextMenus() {
        this.hideContextMenu();
        this.hideTagContextMenus();
    }
    
    // ==================== UTILITY METHODS ====================
    
    /**
     * Check if any context menu is currently open
     * @returns {boolean} True if a context menu is open
     */
    isContextMenuOpen() {
        return this.currentMenu !== null || 
               (this.tagContextMenu && this.tagContextMenu.style.display === 'block');
    }
    
    /**
     * Get currently open context menu type
     * @returns {string|null} Context menu type or null
     */
    getCurrentContextMenuType() {
        if (this.contextMenu && this.contextMenu.style.display === 'block') {
            return 'node';
        }
        
        if (this.taskContextMenu && this.taskContextMenu.style.display === 'block') {
            return 'task';
        }
        
        if (this.tagContextMenu && this.tagContextMenu.style.display === 'block') {
            return 'tag';
        }
        
        return null;
    }
    
    /**
     * Get context menu state information for debugging
     * @returns {Object} Context menu state information
     */
    getContextMenuState() {
        return {
            currentMenu: this.currentMenu,
            menuType: this.getCurrentContextMenuType(),
            isOpen: this.isContextMenuOpen(),
            selectedElement: this.selectedElement,
            menuPosition: { ...this.menuPosition },
            tagEditState: {
                selectedTag: this.selectedTagForEdit,
                tagData: this.currentTagData
            }
        };
    }
    
    /**
     * Validate context menu elements
     * @returns {Object} Validation result
     */
    validateContextMenuElements() {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };
        
        // Check critical elements
        const criticalElements = ['contextMenu', 'taskContextMenu', 'canvas'];
        criticalElements.forEach(elementName => {
            if (!this[elementName]) {
                result.isValid = false;
                result.errors.push(`Missing critical element: ${elementName}`);
            }
        });
        
        // Check tag context menu elements
        const tagElements = ['tagContextMenu', 'tagAttributeMenu', 'tagDatePicker'];
        tagElements.forEach(elementName => {
            if (!this[elementName]) {
                result.warnings.push(`Missing tag context menu element: ${elementName}`);
            }
        });
        
        return result;
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContextMenuManager;
}

// Make available globally for direct use
if (typeof window !== 'undefined') {
    window.ContextMenuManager = ContextMenuManager;
}