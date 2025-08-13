/**
 * Context Menu Manager - Handles all context menu operations
 * Manages node, task, and tag context menus with positioning
 */
export class ContextMenuManager {
    constructor(context) {
        this.context = context;
        this.eventBus = context.eventBus;
        this.stateManager = context.stateManager;
        this.domService = context.getService('dom');
        
        this.setupEventListeners();
        this.setupMenuElements();
    }

    /**
     * Setup event listeners
     * @private
     */
    setupEventListeners() {
        this.eventBus.on('contextmenu.show', (data) => this.showContextMenu(data));
        this.eventBus.on('contextmenu.hide', () => this.hideAllContextMenus());
        this.eventBus.on('contextmenu.tag.show', (data) => this.showTagContextMenu(data));

        // Global click handler to close menus
        this.domService.addEventListener(document, 'click', (e) => {
            if (!this.isContextMenuElement(e.target)) {
                this.hideAllContextMenus();
            }
        });
    }

    /**
     * Setup context menu elements and handlers
     * @private
     */
    setupMenuElements() {
        // Main context menu (for nodes)
        this.contextMenu = this.context.getElement('contextMenu');
        this.setupContextMenuHandlers();

        // Task context menu
        this.taskContextMenu = this.context.getElement('taskContextMenu');
        this.setupTaskContextMenuHandlers();

        // Tag context menu
        this.tagContextMenu = this.context.getElement('tagContextMenu');
        this.tagAttributeMenu = this.context.getElement('tagAttributeMenu');
        this.tagDatePicker = this.context.getElement('tagDatePicker');
        this.setupTagContextMenuHandlers();
    }

    /**
     * Setup main context menu handlers
     * @private
     */
    setupContextMenuHandlers() {
        this.domService.addEventListener(this.contextMenu, 'click', (e) => {
            const action = e.target.dataset.action;
            if (action) {
                this.handleContextMenuAction(action);
                this.hideAllContextMenus();
            }
        });
    }

    /**
     * Setup task context menu handlers
     * @private
     */
    setupTaskContextMenuHandlers() {
        this.domService.addEventListener(this.taskContextMenu, 'click', (e) => {
            const action = e.target.dataset.action;
            if (action) {
                this.handleTaskContextMenuAction(action);
                this.hideAllContextMenus();
            }
        });
    }

    /**
     * Setup tag context menu handlers
     * @private
     */
    setupTagContextMenuHandlers() {
        this.domService.addEventListener(this.tagContextMenu, 'click', (e) => {
            const attribute = e.target.dataset.attribute;
            const action = e.target.dataset.action;

            if (attribute) {
                this.handleTagAttributeClick(attribute, e);
            } else if (action === 'delete') {
                this.deleteSelectedTag();
                this.hideAllContextMenus();
            } else if (action === 'reset-next-action') {
                this.resetTagFromNextAction();
                this.hideAllContextMenus();
            }
        });

        this.domService.addEventListener(this.tagAttributeMenu, 'click', (e) => {
            const value = e.target.dataset.value;
            const selectedTag = this.stateManager.get('selectedTagForEdit');
            const currentTagData = this.stateManager.get('currentTagData');
            
            if (value && selectedTag && currentTagData) {
                this.updateTagAttribute(currentTagData.attribute, value);
                this.hideAllContextMenus();
            }
        });
    }

    /**
     * Show context menu
     * @param {Object} data - Context menu data {type, x, y, node/taskBanner}
     */
    showContextMenu(data) {
        this.hideAllContextMenus();

        let menu;
        if (data.type === 'task') {
            menu = this.taskContextMenu;
        } else {
            menu = this.contextMenu;
        }

        this.positionContextMenu(menu, data.x, data.y);
        this.domService.show(menu);

        this.eventBus.emit('contextmenu.shown', { type: data.type, menu });
    }

    /**
     * Show tag context menu
     * @param {Object} data - Tag context data {tag, x, y}
     */
    showTagContextMenu(data) {
        this.hideAllContextMenus();

        const { tag, x, y } = data;
        
        this.stateManager.set('selectedTagForEdit', tag);

        // Show/hide "Move Back to Task" option based on tag location
        const resetOption = this.tagContextMenu.querySelector('[data-action="reset-next-action"]');
        if (resetOption) {
            if (tag.closest('.next-action-slot')) {
                this.domService.show(resetOption);
            } else {
                this.domService.hide(resetOption);
            }
        }

        this.positionContextMenu(this.tagContextMenu, x, y);
        this.domService.show(this.tagContextMenu);

        this.eventBus.emit('contextmenu.tag.shown', { tag });
    }

    /**
     * Position context menu at coordinates
     * @param {HTMLElement} menu - Menu element
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @private
     */
    positionContextMenu(menu, x, y) {
        // Ensure menu is visible to get dimensions
        menu.style.visibility = 'hidden';
        this.domService.show(menu);
        
        const menuRect = menu.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // Adjust position if menu would go off screen
        let adjustedX = x;
        let adjustedY = y;

        if (x + menuRect.width > windowWidth) {
            adjustedX = windowWidth - menuRect.width - 10;
        }

        if (y + menuRect.height > windowHeight) {
            adjustedY = windowHeight - menuRect.height - 10;
        }

        menu.style.left = adjustedX + 'px';
        menu.style.top = adjustedY + 'px';
        menu.style.visibility = 'visible';
    }

    /**
     * Handle main context menu action
     * @param {string} action - Action to handle
     */
    handleContextMenuAction(action) {
        const selectedNode = this.stateManager.get('selectedNode');
        if (!selectedNode) return;

        switch (action) {
            case 'flowline':
                this.eventBus.emit('flowline.creation.start', selectedNode);
                break;
            case 'rename':
                this.eventBus.emit('node.rename.start', selectedNode);
                break;
            case 'delete':
                this.eventBus.emit('node.delete', selectedNode.dataset.id);
                break;
        }
    }

    /**
     * Handle task context menu action
     * @param {string} action - Action to handle
     */
    handleTaskContextMenuAction(action) {
        const selectedNode = this.stateManager.get('selectedNode');
        if (!selectedNode || selectedNode.dataset.type !== 'task') return;

        switch (action) {
            case 'advance':
                this.eventBus.emit('modal.advance.show', selectedNode);
                break;
            case 'reverse':
                this.eventBus.emit('task.reverse', selectedNode.dataset.id);
                break;
            case 'tags':
                this.eventBus.emit('modal.tag.show', selectedNode);
                break;
            case 'rename':
                this.eventBus.emit('node.rename.start', selectedNode);
                break;
            case 'delete':
                this.eventBus.emit('task.delete', selectedNode.dataset.id);
                break;
        }
    }

    /**
     * Handle tag attribute click
     * @param {string} attribute - Attribute name
     * @param {MouseEvent} e - Mouse event
     */
    handleTagAttributeClick(attribute, e) {
        const selectedTag = this.stateManager.get('selectedTagForEdit');
        if (!selectedTag) return;

        this.stateManager.set('currentTagData', { attribute });

        if (attribute === 'date') {
            this.showTagDatePicker(e);
        } else {
            this.showTagAttributeMenu(attribute, e);
        }
    }

    /**
     * Show tag attribute menu
     * @param {string} attribute - Attribute name
     * @param {MouseEvent} e - Mouse event
     * @private
     */
    showTagAttributeMenu(attribute, e) {
        this.tagAttributeMenu.innerHTML = '';

        let options = [];
        if (attribute === 'category') {
            options = AppConfig.tagSystem.categories.filter(cat => !cat.disabled);
        } else if (attribute === 'option') {
            // Get current category to show relevant options
            const selectedTag = this.stateManager.get('selectedTagForEdit');
            const currentCategory = selectedTag.dataset.category;
            if (currentCategory && AppConfig.tagSystem.options[currentCategory]) {
                options = AppConfig.tagSystem.options[currentCategory].filter(opt => !opt.disabled);
            }
        }

        options.forEach(option => {
            const item = this.domService.createElement('div', {
                className: 'menu-item',
                textContent: option.label,
                dataset: { value: option.value }
            });
            this.tagAttributeMenu.appendChild(item);
        });

        const rect = this.tagContextMenu.getBoundingClientRect();
        this.positionContextMenu(this.tagAttributeMenu, rect.right, rect.top);
        this.domService.show(this.tagAttributeMenu);
    }

    /**
     * Show tag date picker
     * @param {MouseEvent} e - Mouse event
     * @private
     */
    showTagDatePicker(e) {
        // This would integrate with PrimeReact calendar
        // For now, show a simple date input
        const rect = this.tagContextMenu.getBoundingClientRect();
        this.positionContextMenu(this.tagDatePicker, rect.right, rect.top);
        this.domService.show(this.tagDatePicker);
    }

    /**
     * Update tag attribute
     * @param {string} attribute - Attribute name
     * @param {string} value - New value
     */
    updateTagAttribute(attribute, value) {
        const selectedTag = this.stateManager.get('selectedTagForEdit');
        if (!selectedTag) return;

        this.eventBus.emit('tag.attribute.update', {
            tag: selectedTag,
            attribute,
            value
        });
    }

    /**
     * Delete selected tag
     */
    deleteSelectedTag() {
        const selectedTag = this.stateManager.get('selectedTagForEdit');
        if (!selectedTag) return;

        this.eventBus.emit('tag.delete', { tag: selectedTag });
    }

    /**
     * Reset tag from next action to task area
     */
    resetTagFromNextAction() {
        const selectedTag = this.stateManager.get('selectedTagForEdit');
        if (!selectedTag) return;

        this.eventBus.emit('tag.reset.from.next.action', { tag: selectedTag });
    }

    /**
     * Hide all context menus
     */
    hideAllContextMenus() {
        this.domService.hide(this.contextMenu);
        this.domService.hide(this.taskContextMenu);
        this.domService.hide(this.tagContextMenu);
        this.domService.hide(this.tagAttributeMenu);
        this.domService.hide(this.tagDatePicker);

        this.stateManager.update({
            selectedTagForEdit: null,
            currentTagData: null
        });

        this.eventBus.emit('contextmenus.hidden');
    }

    /**
     * Check if element is part of context menu system
     * @param {HTMLElement} element - Element to check
     * @returns {boolean} True if element is part of context menu
     * @private
     */
    isContextMenuElement(element) {
        return this.contextMenu.contains(element) ||
               this.taskContextMenu.contains(element) ||
               this.tagContextMenu.contains(element) ||
               this.tagAttributeMenu.contains(element) ||
               this.tagDatePicker.contains(element) ||
               element.classList.contains('tag');
    }

    /**
     * Get currently visible context menu
     * @returns {HTMLElement|null} Currently visible menu or null
     */
    getCurrentMenu() {
        if (this.domService.isVisible(this.contextMenu)) return this.contextMenu;
        if (this.domService.isVisible(this.taskContextMenu)) return this.taskContextMenu;
        if (this.domService.isVisible(this.tagContextMenu)) return this.tagContextMenu;
        if (this.domService.isVisible(this.tagAttributeMenu)) return this.tagAttributeMenu;
        if (this.domService.isVisible(this.tagDatePicker)) return this.tagDatePicker;
        return null;
    }

    /**
     * Check if any context menu is visible
     * @returns {boolean} True if any menu is visible
     */
    isMenuVisible() {
        return this.getCurrentMenu() !== null;
    }
}