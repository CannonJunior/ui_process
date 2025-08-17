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
        
        // Initialize tag link modal elements
        this.initializeTagLinkModal();
        
        // Initialize tag description modal elements
        this.initializeTagDescriptionModal();
        
        // Initialize tag date modal elements
        this.initializeTagDateModal();
        
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
     * Initialize tag link modal elements
     */
    initializeTagLinkModal() {
        this.tagLinkModal = document.getElementById('tagLinkModal');
        this.tagLinkEdit = document.getElementById('tagLinkEdit');
        this.tagLinkModalCancel = document.getElementById('tagLinkModalCancel');
        this.tagLinkModalSave = document.getElementById('tagLinkModalSave');
        
        // Set up tag link modal event listeners
        if (this.tagLinkModalCancel) {
            this.tagLinkModalCancel.addEventListener('click', () => this.hideTagLinkModal());
        }
        
        if (this.tagLinkModalSave) {
            this.tagLinkModalSave.addEventListener('click', () => this.saveTagLink());
        }
        
        // Close modal on escape key
        if (this.tagLinkModal) {
            this.tagLinkModal.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.hideTagLinkModal();
                }
            });
        }
        
        // Close modal on background click only (not on content clicks)
        if (this.tagLinkModal) {
            this.tagLinkModal.addEventListener('click', (e) => {
                if (e.target === this.tagLinkModal) {
                    this.hideTagLinkModal();
                }
            });
            
            // Prevent modal content clicks from bubbling up to modal background
            const modalContent = this.tagLinkModal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }
        }
    }
    
    /**
     * Initialize tag description modal elements
     */
    initializeTagDescriptionModal() {
        this.tagDescriptionModal = document.getElementById('tagDescriptionModal');
        this.tagDescriptionEdit = document.getElementById('tagDescriptionEdit');
        this.tagDescriptionModalCancel = document.getElementById('tagDescriptionModalCancel');
        this.tagDescriptionModalSave = document.getElementById('tagDescriptionModalSave');
        
        // Set up tag description modal event listeners
        if (this.tagDescriptionModalCancel) {
            this.tagDescriptionModalCancel.addEventListener('click', () => this.hideTagDescriptionModal());
        }
        
        if (this.tagDescriptionModalSave) {
            this.tagDescriptionModalSave.addEventListener('click', () => this.saveTagDescription());
        }
        
        // Close modal on escape key
        if (this.tagDescriptionModal) {
            this.tagDescriptionModal.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.hideTagDescriptionModal();
                }
            });
        }
        
        // Close modal on background click only (not on content clicks)
        if (this.tagDescriptionModal) {
            this.tagDescriptionModal.addEventListener('click', (e) => {
                if (e.target === this.tagDescriptionModal) {
                    this.hideTagDescriptionModal();
                }
            });
            
            // Prevent modal content clicks from bubbling up to modal background
            const modalContent = this.tagDescriptionModal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }
        }
    }
    
    /**
     * Initialize tag date modal elements
     */
    initializeTagDateModal() {
        this.tagDateModal = document.getElementById('tagDateModal');
        this.tagDateCalendar = document.getElementById('tagDateCalendar');
        this.tagDateModalCancel = document.getElementById('tagDateModalCancel');
        this.tagDateModalClear = document.getElementById('tagDateModalClear');
        this.tagDateModalSave = document.getElementById('tagDateModalSave');
        
        // Initialize calendar component reference
        this.tagDateCalendarComponent = null;
        
        // Set up tag date modal event listeners
        if (this.tagDateModalCancel) {
            this.tagDateModalCancel.addEventListener('click', () => this.hideTagDateModal());
        }
        
        if (this.tagDateModalClear) {
            this.tagDateModalClear.addEventListener('click', () => this.clearTagDateModal());
        }
        
        if (this.tagDateModalSave) {
            this.tagDateModalSave.addEventListener('click', () => this.saveTagDateModal());
        }
        
        // Close modal on escape key
        if (this.tagDateModal) {
            this.tagDateModal.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.hideTagDateModal();
                }
            });
        }
        
        // Close modal on background click only (not on content clicks)
        if (this.tagDateModal) {
            this.tagDateModal.addEventListener('click', (e) => {
                if (e.target === this.tagDateModal) {
                    this.hideTagDateModal();
                }
            });
            
            // Prevent modal content clicks from bubbling up to modal background
            const modalContent = this.tagDateModal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }
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
                const attribute = e.target.dataset.attribute;
                const action = e.target.dataset.action;
                
                if (attribute) {
                    this.handleTagAttributeClick(attribute, e);
                } else if (action === 'delete') {
                    this.deleteSelectedTag();
                    this.hideTagContextMenus();
                } else if (action === 'reset-next-action') {
                    this.resetTagFromNextAction();
                    this.hideTagContextMenus();
                } else if (action === 'close') {
                    this.hideTagContextMenus();
                }
            });
        }
        
        // Tag attribute menu handling
        if (this.tagAttributeMenu) {
            this.tagAttributeMenu.addEventListener('click', (e) => {
                console.log('ContextMenuManager: Tag attribute menu clicked');
                console.log('ContextMenuManager: Click target:', e.target);
                console.log('ContextMenuManager: Target dataset.value:', e.target.dataset.value);
                console.log('ContextMenuManager: Current tag data:', this.currentTagData);
                console.log('ContextMenuManager: Selected tag for edit:', this.selectedTagForEdit);
                
                const value = e.target.dataset.value;
                if (value && this.selectedTagForEdit && this.currentTagData) {
                    console.log('ContextMenuManager: Updating tag attribute:', this.currentTagData.attribute, 'to:', value);
                    this.updateTagAttribute(this.currentTagData.attribute, value);
                    this.hideTagContextMenus();
                } else {
                    console.log('ContextMenuManager: Cannot update - missing data:', {
                        value: !!value,
                        selectedTagForEdit: !!this.selectedTagForEdit,
                        currentTagData: !!this.currentTagData,
                        attribute: this.currentTagData ? this.currentTagData.attribute : 'no currentTagData'
                    });
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
        
        // Check if this is a tag element
        const isTagElement = node.dataset.type === 'tag' || node.classList.contains('tag');
        
        if (isTagElement) {
            // Route to tag context menu
            this.showTagContextMenu(node, e);
            return;
        }
        
        // Handle regular node/task context menus
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
    
    // ==================== TAG CONTEXT MENU METHODS ====================
    
    /**
     * Show tag context menu for specific tag
     * @param {HTMLElement} tagElement - Tag element
     * @param {Event} e - Context menu event
     */
    showTagContextMenu(tagElement, e) {
        console.log('ContextMenuManager: showTagContextMenu called with:', tagElement);
        console.log('ContextMenuManager: Tag element classes:', tagElement.className);
        console.log('ContextMenuManager: Tag element parent:', tagElement.parentNode);
        console.log('ContextMenuManager: Tag element closest task-banner:', tagElement.closest('.task-banner'));
        
        // Hide other context menus first (but not tag data)
        this.hideContextMenu();
        this.hideTagMenusVisual();
        
        this.selectedTagForEdit = tagElement;
        
        // Parse tag data - find the task banner within the task container
        // Tags are in: taskContainer > tagsArea > tagsContainer > tag
        // We need to find: taskContainer > taskBanner
        const tagsContainer = tagElement.closest('.task-tags');
        const tagsArea = tagsContainer ? tagsContainer.closest('.task-tags-area') : null;
        const taskContainer = tagsArea ? tagsArea.parentNode : null;
        const taskNode = taskContainer ? taskContainer.querySelector('.task-banner') : null;
        
        console.log('ContextMenuManager: Found taskNode:', taskNode);
        console.log('ContextMenuManager: TaskNode dataset:', taskNode ? taskNode.dataset : 'null');
        
        const tagIndex = Array.from(tagElement.parentNode.children).indexOf(tagElement);
        
        this.currentTagData = {
            taskNode: taskNode,
            tagIndex: tagIndex,
            tagElement: tagElement
        };
        
        console.log('ContextMenuManager: Tag context menu state set:', {
            selectedTagForEdit: !!this.selectedTagForEdit,
            currentTagData: !!this.currentTagData,
            taskNode: !!this.currentTagData.taskNode,
            tagIndex: this.currentTagData.tagIndex
        });
        
        // Use static HTML menu - no dynamic creation needed
        
        // Position and show menu
        const canvasRect = this.canvas.getBoundingClientRect();
        const menuPosition = this.calculateMenuPosition(e, canvasRect, this.tagContextMenu);
        this.showContextMenuAt(this.tagContextMenu, menuPosition.x, menuPosition.y);
        
        console.log('ContextMenuManager: Tag context menu opened');
    }
    
    
    /**
     * Handle tag attribute click for editing
     * @param {string} attribute - Attribute to edit
     * @param {Event} e - Click event
     */
    handleTagAttributeClick(attribute, e) {
        this.currentTagData.attribute = attribute;
        
        if (attribute === 'date') {
            this.showTagDateModal();
        } else if (attribute === 'link') {
            this.showTagLinkModal();
        } else if (attribute === 'description') {
            this.showTagDescriptionModal();
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
     * Show tag link editing modal
     */
    showTagLinkModal() {
        if (!this.tagLinkModal || !this.currentTagData) return;
        
        console.log('ContextMenuManager: Showing tag link modal');
        
        // Get current tag data to populate the input
        const currentTag = this.getCurrentTagData();
        const currentLink = currentTag && currentTag.link ? currentTag.link : '';
        
        // Populate the input with current link
        if (this.tagLinkEdit) {
            this.tagLinkEdit.value = currentLink;
        }
        
        // Hide context menus and show modal
        this.hideTagMenusVisual();
        this.tagLinkModal.style.display = 'block';
        
        // Focus the input
        setTimeout(() => {
            if (this.tagLinkEdit) {
                this.tagLinkEdit.focus();
                this.tagLinkEdit.select();
            }
        }, 100);
    }
    
    /**
     * Hide tag link editing modal
     */
    hideTagLinkModal() {
        if (this.tagLinkModal) {
            this.tagLinkModal.style.display = 'none';
        }
    }
    
    /**
     * Save tag link from modal
     */
    saveTagLink() {
        if (!this.tagLinkEdit || !this.currentTagData) {
            console.error('ContextMenuManager: Cannot save tag link - missing data');
            return;
        }
        
        const newLink = this.tagLinkEdit.value.trim();
        console.log('ContextMenuManager: Saving tag link:', newLink);
        
        // Update the tag attribute
        this.updateTagAttribute('link', newLink);
        
        // Hide the modal
        this.hideTagLinkModal();
        
        // Clear any remaining context menus
        this.hideTagContextMenus();
    }
    
    /**
     * Show tag description editing modal
     */
    showTagDescriptionModal() {
        if (!this.tagDescriptionModal || !this.currentTagData) return;
        
        console.log('ContextMenuManager: Showing tag description modal');
        
        // Get current tag data to populate the textarea
        const currentTag = this.getCurrentTagData();
        const currentDescription = currentTag && currentTag.description ? currentTag.description : '';
        
        // Populate the textarea with current description
        if (this.tagDescriptionEdit) {
            this.tagDescriptionEdit.value = currentDescription;
        }
        
        // Hide context menus and show modal
        this.hideTagMenusVisual();
        this.tagDescriptionModal.style.display = 'block';
        
        // Focus the textarea
        setTimeout(() => {
            if (this.tagDescriptionEdit) {
                this.tagDescriptionEdit.focus();
                this.tagDescriptionEdit.select();
            }
        }, 100);
    }
    
    /**
     * Hide tag description editing modal
     */
    hideTagDescriptionModal() {
        if (this.tagDescriptionModal) {
            this.tagDescriptionModal.style.display = 'none';
        }
    }
    
    /**
     * Save tag description from modal
     */
    saveTagDescription() {
        if (!this.tagDescriptionEdit || !this.currentTagData) {
            console.error('ContextMenuManager: Cannot save tag description - missing data');
            return;
        }
        
        const newDescription = this.tagDescriptionEdit.value.trim();
        console.log('ContextMenuManager: Saving tag description:', newDescription);
        
        // Update the tag attribute
        this.updateTagAttribute('description', newDescription);
        
        // Hide the modal
        this.hideTagDescriptionModal();
        
        // Clear any remaining context menus
        this.hideTagContextMenus();
    }
    
    /**
     * Show tag date editing modal with PrimeReact calendar
     */
    showTagDateModal() {
        if (!this.tagDateModal || !this.currentTagData) return;
        
        console.log('ContextMenuManager: Showing tag date modal');
        
        // Get current tag data to populate the calendar
        const currentTag = this.getCurrentTagData();
        const currentDate = currentTag && currentTag.date ? new Date(currentTag.date) : null;
        
        // Hide context menus and show modal
        this.hideTagMenusVisual();
        this.tagDateModal.style.display = 'block';
        
        // Initialize PrimeReact Calendar component
        this.createTagDateCalendar(currentDate);
    }
    
    /**
     * Create PrimeReact Calendar component for tag date editing
     * @param {Date|null} initialDate - Initial date to display
     */
    createTagDateCalendar(initialDate) {
        if (!this.tagDateCalendar) return;
        
        // Clear previous calendar
        this.tagDateCalendar.innerHTML = '';
        
        // Check if PrimeReact is available
        if (typeof primereact === 'undefined') {
            console.error('PrimeReact is not loaded');
            this.createFallbackDateInput(initialDate);
            return;
        }
        
        // Try different ways to access the Calendar component
        let CalendarComponent = null;
        
        if (primereact && primereact.calendar && primereact.calendar.Calendar) {
            CalendarComponent = primereact.calendar.Calendar;
        } else if (window.primereact && window.primereact.calendar) {
            CalendarComponent = window.primereact.calendar.Calendar;
        } else if (typeof Calendar !== 'undefined') {
            CalendarComponent = Calendar;
        } else {
            console.error('PrimeReact Calendar component not found, using fallback');
            this.createFallbackDateInput(initialDate);
            return;
        }
        
        try {
            // Create React element for Calendar
            const calendarElement = React.createElement(CalendarComponent, {
                value: initialDate,
                onChange: (e) => {
                    this.selectedTagDate = e.value;
                    console.log('ContextMenuManager: Date selected:', e.value);
                },
                showIcon: true,
                dateFormat: 'yy-mm-dd',
                placeholder: 'Select a date',
                inline: true,
                style: { width: '100%' }
            });
            
            // Render the calendar
            ReactDOM.render(calendarElement, this.tagDateCalendar);
            
            // Store initial date
            this.selectedTagDate = initialDate;
            
            console.log('ContextMenuManager: Calendar created with date:', initialDate);
        } catch (error) {
            console.error('Error creating PrimeReact Calendar:', error);
            this.createFallbackDateInput(initialDate);
        }
    }
    
    /**
     * Create fallback date input if PrimeReact Calendar fails
     * @param {Date|null} initialDate - Initial date to display
     */
    createFallbackDateInput(initialDate) {
        console.log('ContextMenuManager: Creating fallback date input');
        
        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.className = 'tag-date-fallback-input';
        dateInput.style.width = '100%';
        dateInput.style.padding = '10px';
        dateInput.style.border = '2px solid #ddd';
        dateInput.style.borderRadius = '6px';
        dateInput.style.fontSize = '14px';
        
        if (initialDate) {
            dateInput.value = initialDate.toISOString().split('T')[0];
        }
        
        dateInput.addEventListener('change', (e) => {
            this.selectedTagDate = e.target.value ? new Date(e.target.value) : null;
            console.log('ContextMenuManager: Date selected (fallback):', this.selectedTagDate);
        });
        
        this.tagDateCalendar.appendChild(dateInput);
        this.selectedTagDate = initialDate;
    }
    
    /**
     * Hide tag date editing modal
     */
    hideTagDateModal() {
        if (this.tagDateModal) {
            this.tagDateModal.style.display = 'none';
        }
        
        // Cleanup calendar component
        if (this.tagDateCalendar) {
            ReactDOM.unmountComponentAtNode(this.tagDateCalendar);
        }
        
        this.selectedTagDate = null;
    }
    
    /**
     * Clear tag date from modal
     */
    clearTagDateModal() {
        console.log('ContextMenuManager: Clearing tag date');
        
        // Update the tag attribute with empty date
        this.updateTagAttribute('date', '');
        
        // Hide the modal
        this.hideTagDateModal();
        
        // Clear any remaining context menus
        this.hideTagContextMenus();
    }
    
    /**
     * Save tag date from modal
     */
    saveTagDateModal() {
        if (!this.currentTagData) {
            console.error('ContextMenuManager: Cannot save tag date - missing data');
            return;
        }
        
        const newDate = this.selectedTagDate ? this.selectedTagDate.toISOString().split('T')[0] : '';
        console.log('ContextMenuManager: Saving tag date:', newDate);
        
        // Update the tag attribute
        this.updateTagAttribute('date', newDate);
        
        // Hide the modal
        this.hideTagDateModal();
        
        // Clear any remaining context menus
        this.hideTagContextMenus();
    }
    
    /**
     * Apply tag date from picker (legacy method - keeping for compatibility)
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
        console.log('ContextMenuManager: updateTagAttribute called with:', attribute, value);
        
        if (!this.currentTagData || !this.currentTagData.taskNode) {
            console.error('ContextMenuManager: No current tag data available for update');
            return;
        }
        
        const taskNode = this.currentTagData.taskNode;
        const tagIndex = this.currentTagData.tagIndex;
        
        try {
            // Get current tags from task dataset
            const currentTags = JSON.parse(taskNode.dataset.tags || '[]');
            console.log('ContextMenuManager: Current tags before update:', currentTags);
            
            if (tagIndex >= 0 && tagIndex < currentTags.length) {
                // Update the specific attribute
                currentTags[tagIndex][attribute] = value;
                
                // Special handling for certain attributes
                if (attribute === 'category') {
                    // Reset option when category changes
                    delete currentTags[tagIndex].option;
                }
                
                // Update task dataset
                taskNode.dataset.tags = JSON.stringify(currentTags);
                console.log('ContextMenuManager: Updated tags after attribute change:', currentTags);
                
                // Update task display if tag manager is available
                if (this.app.tagManager && this.app.tagManager.updateTaskTagsDisplay) {
                    this.app.tagManager.updateTaskTagsDisplay(taskNode);
                }
                
                // Update modal display if this task is selected for tags
                if (this.app.selectedTaskForTags === taskNode && this.app.tagManager && this.app.tagManager.displayCurrentTags) {
                    this.app.tagManager.displayCurrentTags();
                }
                
                // If in matrix mode, reposition task
                if (this.app.isMatrixMode && this.app.repositionTaskInMatrix) {
                    this.app.repositionTaskInMatrix(taskNode);
                }
                
                console.log(`ContextMenuManager: Successfully updated tag attribute ${attribute} to ${value}`);
            } else {
                console.error('ContextMenuManager: Tag index out of bounds:', tagIndex, 'Total tags:', currentTags.length);
            }
        } catch (error) {
            console.error('ContextMenuManager: Error updating tag attribute:', error);
        }
    }
    
    /**
     * Delete selected tag
     */
    deleteSelectedTag() {
        console.log('ContextMenuManager: Tag context action: delete');
        console.log('ContextMenuManager: Current tag data available:', !!this.currentTagData);
        
        if (this.currentTagData && this.currentTagData.tagIndex !== undefined) {
            console.log('ContextMenuManager: Deleting tag at index:', this.currentTagData.tagIndex);
            
            const taskNode = this.currentTagData.taskNode;
            const tagIndex = this.currentTagData.tagIndex;
            const tagElement = this.selectedTagForEdit;
            
            try {
                // Get current tags from task dataset
                const currentTags = JSON.parse(taskNode.dataset.tags || '[]');
                console.log('ContextMenuManager: Current tags before deletion:', currentTags);
                
                if (tagIndex >= 0 && tagIndex < currentTags.length) {
                    // Remove the tag from data
                    currentTags.splice(tagIndex, 1);
                    
                    // Update task dataset
                    taskNode.dataset.tags = JSON.stringify(currentTags);
                    console.log('ContextMenuManager: Updated tags after deletion:', currentTags);
                    
                    // Remove the tag element from DOM
                    if (tagElement && tagElement.parentNode) {
                        tagElement.parentNode.removeChild(tagElement);
                        console.log('ContextMenuManager: Tag element removed from DOM');
                    }
                    
                    // Update task display if tag manager is available
                    if (this.app.tagManager && this.app.tagManager.updateTaskTagsDisplay) {
                        this.app.tagManager.updateTaskTagsDisplay(taskNode);
                    }
                    
                    // If in matrix mode, reposition task
                    if (this.app.isMatrixMode && this.app.repositionTaskInMatrix) {
                        this.app.repositionTaskInMatrix(taskNode);
                    }
                    
                    console.log(`ContextMenuManager: Successfully removed tag from task ${taskNode.dataset.id}`);
                } else {
                    console.error('ContextMenuManager: Tag index out of bounds:', tagIndex, 'Total tags:', currentTags.length);
                }
            } catch (error) {
                console.error('ContextMenuManager: Error removing tag:', error);
            }
        } else {
            console.error('ContextMenuManager: No tag data available for deletion');
        }
    }
    
    /**
     * Reset tag from next action
     */
    resetTagFromNextAction() {
        // Delegate to main app for reset logic
        this.app.resetTagFromNextAction();
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
     * Hide tag context menus visual elements only (preserve state)
     */
    hideTagMenusVisual() {
        if (this.tagContextMenu) {
            this.tagContextMenu.style.display = 'none';
        }
        
        if (this.tagAttributeMenu) {
            this.tagAttributeMenu.style.display = 'none';
        }
        
        if (this.tagDatePicker) {
            this.tagDatePicker.style.display = 'none';
        }
        
        if (this.tagLinkModal) {
            this.tagLinkModal.style.display = 'none';
        }
        
        if (this.tagDescriptionModal) {
            this.tagDescriptionModal.style.display = 'none';
        }
        
        if (this.tagDateModal) {
            this.tagDateModal.style.display = 'none';
        }
    }
    
    /**
     * Hide all tag context menus and clear state
     */
    hideTagContextMenus() {
        this.hideTagMenusVisual();
        
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