/**
 * DOM Service
 * Centralized DOM element management and caching
 * 
 * SAFETY: Manages DOM element references safely with validation
 * Risk Level: LOW - Element management and caching only
 */

class DOMService {
    constructor() {
        // Cache for DOM elements to avoid repeated queries
        this.elementCache = new Map();
        
        // Element groups for organized access
        this.elementGroups = {
            canvas: ['canvas'],
            contextMenus: ['contextMenu', 'taskContextMenu', 'tagContextMenu', 'tagAttributeMenu'],
            modals: ['taskModal', 'taskEditModal', 'advanceTaskModal', 'tagModal'],
            buttons: ['addTaskButton', 'saveWorkflowButton', 'loadWorkflowButton', 'eisenhowerToggle'],
            dropdowns: ['nodeTypeDropdown', 'flowlineTypeDropdown', 'tagCategoryDropdown', 'tagOptionDropdown'],
            inputs: ['taskNameInput', 'taskEditName', 'taskEditDescription', 'taskEditStatus', 'taskEditPriority', 'taskEditDueDate', 'taskEditOpportunity', 'taskEditEstimatedHours', 'taskEditAssignedTo', 'tagDateInput', 'tagDescriptionInput', 'tagLinkInput', 'tagCompletedInput', 'loadWorkflowInput'],
            modalControls: ['taskModalCancel', 'taskModalCreate', 'taskEditModalCancel', 'taskEditModalSave', 'advanceModalCancel', 'tagModalCancel', 'tagModalAdd', 'tagModalSave'],
            matrix: ['eisenhowerMatrix', 'eisenhowerToggle'],
            tags: ['currentTags', 'tagDatePicker'],
            options: ['advanceOptions']
        };
        
        // Initialize element cache
        this.initializeElements();
    }
    
    /**
     * Initialize all DOM elements and cache them
     * @returns {Object} Initialization result with success status and missing elements
     */
    initializeElements() {
        const missing = [];
        const allElementIds = new Set();
        
        // Collect all element IDs from groups
        Object.values(this.elementGroups).forEach(group => {
            group.forEach(id => allElementIds.add(id));
        });
        
        // Cache all elements
        allElementIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                this.elementCache.set(id, element);
            } else {
                missing.push(id);
                console.warn(`DOMService: Element not found: ${id}`);
            }
        });
        
        return {
            success: missing.length === 0,
            cachedCount: this.elementCache.size,
            missingElements: missing
        };
    }
    
    /**
     * Get element by ID with caching
     * @param {string} id - Element ID
     * @returns {HTMLElement|null} Element or null if not found
     */
    getElement(id) {
        if (typeof id !== 'string' || id.trim().length === 0) {
            console.warn('DOMService.getElement: Invalid ID provided:', id);
            return null;
        }
        
        // Check cache first
        if (this.elementCache.has(id)) {
            return this.elementCache.get(id);
        }
        
        // Query DOM and cache result
        const element = document.getElementById(id);
        if (element) {
            this.elementCache.set(id, element);
        }
        
        return element;
    }
    
    /**
     * Get multiple elements by IDs
     * @param {Array<string>} ids - Array of element IDs
     * @returns {Object} Object with ID keys and element values
     */
    getElements(ids) {
        if (!Array.isArray(ids)) {
            console.warn('DOMService.getElements: IDs must be an array');
            return {};
        }
        
        const elements = {};
        ids.forEach(id => {
            elements[id] = this.getElement(id);
        });
        
        return elements;
    }
    
    /**
     * Get all elements in a specific group
     * @param {string} groupName - Group name (e.g., 'modals', 'buttons')
     * @returns {Object} Object with element IDs as keys and elements as values
     */
    getElementGroup(groupName) {
        if (!this.elementGroups[groupName]) {
            console.warn('DOMService.getElementGroup: Unknown group:', groupName);
            return {};
        }
        
        return this.getElements(this.elementGroups[groupName]);
    }
    
    /**
     * Check if element exists and is available
     * @param {string} id - Element ID
     * @returns {boolean} Element existence status
     */
    hasElement(id) {
        return this.getElement(id) !== null;
    }
    
    /**
     * Refresh element cache for specific ID
     * @param {string} id - Element ID to refresh
     * @returns {HTMLElement|null} Updated element reference
     */
    refreshElement(id) {
        // Remove from cache and re-query
        this.elementCache.delete(id);
        return this.getElement(id);
    }
    
    /**
     * Clear entire element cache
     */
    clearCache() {
        this.elementCache.clear();
        console.log('DOMService: Element cache cleared');
    }
    
    /**
     * Add new element to cache
     * @param {string} id - Element ID
     * @param {HTMLElement} element - Element to cache
     * @returns {boolean} Success status
     */
    cacheElement(id, element) {
        if (typeof id !== 'string' || !element || !(element instanceof HTMLElement)) {
            console.warn('DOMService.cacheElement: Invalid parameters');
            return false;
        }
        
        this.elementCache.set(id, element);
        return true;
    }
    
    /**
     * Remove element from cache
     * @param {string} id - Element ID to remove
     * @returns {boolean} Success status
     */
    uncacheElement(id) {
        return this.elementCache.delete(id);
    }
    
    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        const stats = {
            cachedCount: this.elementCache.size,
            groupCounts: {},
            missingInGroups: {}
        };
        
        // Check each group
        Object.entries(this.elementGroups).forEach(([groupName, ids]) => {
            const existing = ids.filter(id => this.hasElement(id));
            const missing = ids.filter(id => !this.hasElement(id));
            
            stats.groupCounts[groupName] = {
                total: ids.length,
                existing: existing.length,
                missing: missing.length
            };
            
            if (missing.length > 0) {
                stats.missingInGroups[groupName] = missing;
            }
        });
        
        return stats;
    }
    
    /**
     * Validate all expected elements are present
     * @returns {Object} Validation result
     */
    validateElements() {
        const result = {
            isValid: true,
            errors: [],
            warnings: [],
            stats: this.getCacheStats()
        };
        
        // Check for missing critical elements
        const criticalElements = ['canvas', 'taskModal', 'tagModal'];
        criticalElements.forEach(id => {
            if (!this.hasElement(id)) {
                result.isValid = false;
                result.errors.push(`Critical element missing: ${id}`);
            }
        });
        
        // Check for missing non-critical elements
        Object.entries(this.elementGroups).forEach(([groupName, ids]) => {
            ids.forEach(id => {
                if (!criticalElements.includes(id) && !this.hasElement(id)) {
                    result.warnings.push(`Element missing: ${id} (group: ${groupName})`);
                }
            });
        });
        
        return result;
    }
    
    /**
     * Get all canvas-related elements
     * @returns {Object} Canvas-related elements
     */
    getCanvasElements() {
        return this.getElementGroup('canvas');
    }
    
    /**
     * Get all modal elements
     * @returns {Object} Modal elements
     */
    getModalElements() {
        return this.getElementGroup('modals');
    }
    
    /**
     * Get all context menu elements
     * @returns {Object} Context menu elements
     */
    getContextMenuElements() {
        return this.getElementGroup('contextMenus');
    }
    
    /**
     * Get all form input elements
     * @returns {Object} Input elements
     */
    getInputElements() {
        return this.getElementGroup('inputs');
    }
    
    /**
     * Get all dropdown elements
     * @returns {Object} Dropdown elements
     */
    getDropdownElements() {
        return this.getElementGroup('dropdowns');
    }
    
    /**
     * Get all button elements
     * @returns {Object} Button elements
     */
    getButtonElements() {
        return this.getElementGroup('buttons');
    }
    
    /**
     * Get matrix-related elements
     * @returns {Object} Matrix elements
     */
    getMatrixElements() {
        return this.getElementGroup('matrix');
    }
    
    /**
     * Safely set element display style
     * @param {string} id - Element ID
     * @param {string} display - Display value ('block', 'none', etc.)
     * @returns {boolean} Success status
     */
    setDisplay(id, display) {
        const element = this.getElement(id);
        if (!element) {
            console.warn(`DOMService.setDisplay: Element not found: ${id}`);
            return false;
        }
        
        try {
            element.style.display = display;
            return true;
        } catch (error) {
            console.warn(`DOMService.setDisplay: Error setting display for ${id}:`, error);
            return false;
        }
    }
    
    /**
     * Show element
     * @param {string} id - Element ID
     * @param {string} displayType - Display type (default: 'block')
     * @returns {boolean} Success status
     */
    show(id, displayType = 'block') {
        return this.setDisplay(id, displayType);
    }
    
    /**
     * Hide element
     * @param {string} id - Element ID
     * @returns {boolean} Success status
     */
    hide(id) {
        return this.setDisplay(id, 'none');
    }
    
    /**
     * Toggle element visibility
     * @param {string} id - Element ID
     * @param {string} showDisplayType - Display type when showing (default: 'block')
     * @returns {boolean} New visibility state (true = visible, false = hidden)
     */
    toggle(id, showDisplayType = 'block') {
        const element = this.getElement(id);
        if (!element) {
            console.warn(`DOMService.toggle: Element not found: ${id}`);
            return false;
        }
        
        const isHidden = element.style.display === 'none' || 
                        getComputedStyle(element).display === 'none';
        
        if (isHidden) {
            this.show(id, showDisplayType);
            return true;
        } else {
            this.hide(id);
            return false;
        }
    }
}

// Create singleton instance
let domServiceInstance = null;

/**
 * Get singleton instance of DOMService
 * @returns {DOMService} DOMService instance
 */
function getDOMService() {
    if (!domServiceInstance) {
        domServiceInstance = new DOMService();
    }
    return domServiceInstance;
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DOMService, getDOMService };
}

// Make available globally for direct use
if (typeof window !== 'undefined') {
    window.DOMService = DOMService;
    window.getDOMService = getDOMService;
}