/**
 * Tag Manager
 * Comprehensive management of tag system including CRUD, display, drag/drop, and Eisenhower Matrix integration
 * 
 * SAFETY: Manages complex tag operations with careful state and UI synchronization
 * Risk Level: HIGH - Complex interactions with Eisenhower Matrix, D3 animations, save/load format
 */

class TagManager {
    constructor(mainApp) {
        // Reference to main application instance
        this.app = mainApp;
        
        // Get services
        this.domService = this.app.domService;
        this.configService = this.app.configService;
        
        // Cache tag-related DOM elements
        this.initializeTagElements();
        
        // Tag state tracking
        this.selectedTaskForTags = null;
        this.draggedTag = null;
        this.successfulDrop = false;
        
        // Setup tag-specific event listeners
        this.setupTagEventListeners();
    }
    
    /**
     * Initialize and cache all tag-related elements
     */
    initializeTagElements() {
        // Get tag-related elements from DOM service
        const canvasElements = this.domService.getElementGroup('canvas') || {};
        
        // Assign to instance for easy access
        Object.assign(this, canvasElements);
        
        // Get tag-related elements individually
        this.currentTags = this.domService.getElement('currentTags');
        this.tagCategoryDropdown = this.domService.getElement('tagCategoryDropdown');
        this.tagOptionDropdown = this.domService.getElement('tagOptionDropdown');
        this.tagDateInput = this.domService.getElement('tagDateInput');
        this.tagDescriptionInput = this.domService.getElement('tagDescriptionInput');
        this.tagLinkInput = this.domService.getElement('tagLinkInput');
        this.tagCompletedInput = this.domService.getElement('tagCompletedInput');
        
        // Validate critical tag elements
        const requiredElements = ['canvas', 'currentTags', 'tagCategoryDropdown'];
        const missingElements = requiredElements.filter(id => !this[id]);
        
        if (missingElements.length > 0) {
            console.warn(`TagManager: Some tag elements missing: ${missingElements.join(', ')}`);
        }
    }
    
    /**
     * Setup event listeners for tag-specific functionality
     */
    setupTagEventListeners() {
        // Tag category dropdown change
        if (this.tagCategoryDropdown) {
            this.tagCategoryDropdown.addEventListener('change', (e) => this.handleTagCategoryChange(e));
        }
        
        // Canvas drag and drop events for tags
        if (this.canvas) {
            // Prevent dragging tags to invalid locations
            this.canvas.addEventListener('dragover', (e) => {
                // Clear all drag-over classes first
                document.querySelectorAll('.next-action-slot.drag-over').forEach(slot => {
                    slot.classList.remove('drag-over');
                });
                
                // Only allow dropping on next-action-slots for the same task
                if (!e.target.classList.contains('next-action-slot')) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'none';
                } else if (this.draggedTag && e.target.dataset.taskId !== this.draggedTag.taskId) {
                    // Prevent dropping on other tasks' next-action-slots
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'none';
                } else if (this.draggedTag && e.target.dataset.taskId === this.draggedTag.taskId) {
                    // Allow dropping on same task's next-action-slot
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    e.target.classList.add('drag-over');
                } else {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'none';
                }
            });
            
            this.canvas.addEventListener('dragleave', (e) => {
                // Remove drag-over class when leaving a drop zone
                if (e.target.classList.contains('next-action-slot')) {
                    e.target.classList.remove('drag-over');
                }
            });
            
            this.canvas.addEventListener('drop', (e) => {
                // Clear all drag-over classes
                document.querySelectorAll('.next-action-slot.drag-over').forEach(slot => {
                    slot.classList.remove('drag-over');
                });
                
                // Handle valid drops
                if (e.target.classList.contains('next-action-slot') && 
                    this.draggedTag && e.target.dataset.taskId === this.draggedTag.taskId) {
                    e.preventDefault();
                    this.successfulDrop = true;
                    this.snapTagToSlot(this.draggedTag.element, e.target);
                } else {
                    // Prevent drops on invalid locations
                    e.preventDefault();
                }
            });
        }
        
        console.log('TagManager: Event listeners initialized');
    }
    
    // ==================== TAG DATA MANAGEMENT METHODS ====================
    
    /**
     * Get tags for a specific task node
     * @param {HTMLElement} taskNode - Task node element
     * @returns {Array} Array of tag objects
     */
    getTaskTags(taskNode) {
        if (!taskNode) return [];
        
        try {
            return JSON.parse(taskNode.dataset.tags || '[]');
        } catch (e) {
            console.error('TagManager: Error parsing task tags:', e);
            return [];
        }
    }
    
    /**
     * Set tags for a specific task node
     * @param {HTMLElement} taskNode - Task node element
     * @param {Array} tags - Array of tag objects
     */
    setTaskTags(taskNode, tags) {
        if (!taskNode) return;
        
        try {
            taskNode.dataset.tags = JSON.stringify(tags || []);
        } catch (e) {
            console.error('TagManager: Error setting task tags:', e);
        }
    }
    
    /**
     * Update a specific tag attribute
     * @param {string} attribute - Attribute to update
     * @param {string} value - New value
     */
    updateTagAttribute(attribute, value) {
        if (!this.app.contextMenuManager || !this.app.contextMenuManager.currentTagData) {
            console.error('TagManager: No current tag data available for update');
            return;
        }
        
        const currentTagData = this.app.contextMenuManager.currentTagData;
        const tags = this.getTaskTags(currentTagData.taskNode);
        const tagIndex = currentTagData.tagIndex;
        
        if (tagIndex >= 0 && tagIndex < tags.length) {
            // Update the specific attribute
            tags[tagIndex][attribute] = value;
            
            // Special handling for certain attributes
            if (attribute === 'category') {
                // Reset option when category changes
                delete tags[tagIndex].option;
            }
            
            // Save updated tags
            this.setTaskTags(currentTagData.taskNode, tags);
            
            // Refresh displays
            this.updateTaskTagsDisplay(currentTagData.taskNode);
            if (this.app.selectedTaskForTags === currentTagData.taskNode) {
                this.displayCurrentTags();
            }
            
            // Reposition tasks if in matrix mode
            if (this.app.isMatrixMode) {
                this.app.repositionTaskInMatrix(currentTagData.taskNode);
            }
            
            console.log(`TagManager: Updated tag attribute ${attribute} to ${value}`);
        }
    }
    
    // ==================== TAG CRUD OPERATIONS ====================
    
    /**
     * Add a new tag to the currently selected task
     */
    addTagToTask() {
        if (!this.app.selectedTaskForTags) {
            console.error('TagManager: No task selected for tagging');
            return;
        }
        
        const category = this.tagCategoryDropdown ? this.tagCategoryDropdown.value : '';
        const option = this.tagOptionDropdown ? this.tagOptionDropdown.value : '';
        const date = this.tagDateInput ? this.tagDateInput.value : '';
        const description = this.tagDescriptionInput ? this.tagDescriptionInput.value.trim() : '';
        const link = this.tagLinkInput ? this.tagLinkInput.value.trim() : '';
        const completed = this.tagCompletedInput ? this.tagCompletedInput.checked : false;
        
        if (!category || !option) {
            alert('Please select both a tag category and option.');
            return;
        }
        
        const tags = this.getTaskTags(this.app.selectedTaskForTags);
        
        // Create tag object with optional fields
        const tagData = { category, option };
        if (date) tagData.date = date;
        if (description) tagData.description = description;
        if (link) tagData.link = link;
        if (completed) tagData.completed = completed;
        
        // Check if this tag category already exists
        const existingTagIndex = tags.findIndex(tag => tag.category === category);
        
        if (existingTagIndex >= 0) {
            // Update existing tag
            tags[existingTagIndex] = tagData;
        } else {
            // Add new tag
            tags.push(tagData);
        }
        
        // Update task tags
        this.setTaskTags(this.app.selectedTaskForTags, tags);
        
        // Refresh displays
        this.displayCurrentTags();
        this.updateTaskTagsDisplay(this.app.selectedTaskForTags);
        
        // Reposition tasks below this one since height may have changed
        if (typeof this.app.repositionTasksAfterHeightChange === 'function') {
            this.app.repositionTasksAfterHeightChange(this.app.selectedTaskForTags);
        }
        
        // Reset form
        this.resetTagForm();
        
        console.log('TagManager: Added tag to task', tagData);
    }
    
    /**
     * Remove a tag by index from the currently selected task
     * @param {number} index - Index of tag to remove
     */
    removeTag(index) {
        if (!this.app.selectedTaskForTags) {
            console.error('TagManager: No task selected for tag removal');
            return;
        }
        
        const tags = this.getTaskTags(this.app.selectedTaskForTags);
        
        if (index >= 0 && index < tags.length) {
            tags.splice(index, 1);
            
            this.setTaskTags(this.app.selectedTaskForTags, tags);
            this.displayCurrentTags();
            this.updateTaskTagsDisplay(this.app.selectedTaskForTags);
            
            // Reposition tasks below this one since height may have changed
            if (typeof this.app.repositionTasksAfterHeightChange === 'function') {
                this.app.repositionTasksAfterHeightChange(this.app.selectedTaskForTags);
            }
            
            console.log(`TagManager: Removed tag at index ${index}`);
        }
    }
    
    /**
     * Reset the tag form to its default state
     */
    resetTagForm() {
        if (this.tagCategoryDropdown) {
            this.tagCategoryDropdown.value = '';
        }
        
        if (this.tagOptionDropdown) {
            this.tagOptionDropdown.disabled = true;
            this.tagOptionDropdown.innerHTML = '<option value="">Select category first</option>';
        }
        
        if (this.tagDateInput) this.tagDateInput.value = '';
        if (this.tagDescriptionInput) this.tagDescriptionInput.value = '';
        if (this.tagLinkInput) this.tagLinkInput.value = '';
        if (this.tagCompletedInput) this.tagCompletedInput.checked = false;
    }
    
    // ==================== TAG DISPLAY METHODS ====================
    
    /**
     * Display current tags in the tag modal
     */
    displayCurrentTags() {
        if (!this.currentTags || !this.app.selectedTaskForTags) return;
        
        const tags = this.getTaskTags(this.app.selectedTaskForTags);
        this.currentTags.innerHTML = '';
        
        tags.forEach((tag, index) => {
            const tagElement = this.createTagModalElement(tag, index);
            this.currentTags.appendChild(tagElement);
        });
        
        console.log(`TagManager: Displayed ${tags.length} tags in modal`);
    }
    
    /**
     * Create a tag element for the modal display
     * @param {Object} tag - Tag data object
     * @param {number} index - Tag index
     * @returns {HTMLElement} Tag element
     */
    createTagModalElement(tag, index) {
        const tagElement = document.createElement('div');
        tagElement.className = 'tag';
        
        // Apply tag styling
        const display = this.configService.getTagDisplay(tag.category);
        tagElement.style.color = display.color;
        tagElement.style.backgroundColor = display.bgColor;
        
        // Create tag content
        const categoryLabel = this.configService.getTagCategoryLabel(tag.category);
        const optionLabel = this.configService.getTagOptionLabel(tag.category, tag.option);
        const dateText = tag.date ? ` (${this.formatDateForDisplay(tag.date)})` : '';
        
        tagElement.innerHTML = `
            <span>${categoryLabel}: ${optionLabel}${dateText}</span>
            <button class="tag-remove" data-index="${index}">×</button>
        `;
        
        // Add remove event listener
        const removeButton = tagElement.querySelector('.tag-remove');
        if (removeButton) {
            removeButton.addEventListener('click', (e) => {
                this.removeTag(parseInt(e.target.dataset.index));
            });
        }
        
        return tagElement;
    }
    
    /**
     * Update task tags display in the canvas
     * @param {HTMLElement} taskNode - Task node element
     */
    updateTaskTagsDisplay(taskNode) {
        if (!taskNode) return;
        
        // Find the task container (parent of the banner)
        const taskContainer = taskNode.parentNode;
        if (!taskContainer) return;
        
        // Find the tags container within the task-tags-area
        const tagsContainer = taskContainer.querySelector('.task-tags');
        if (!tagsContainer) return;
        
        const tags = this.getTaskTags(taskNode);
        
        // Find the next-action-slot for this task
        const nextActionSlot = this.canvas.querySelector(`.next-action-slot[data-task-id="${taskNode.dataset.id}"]`);
        
        // Get existing tag elements that are in next-action state (in the slot)
        const existingTagElements = nextActionSlot ? 
            Array.from(nextActionSlot.querySelectorAll(`.tag-in-slot[data-task-id="${taskNode.dataset.id}"]`)) : [];
        
        tagsContainer.innerHTML = '';
        
        tags.forEach((tag, index) => {
            // Check if this tag is already positioned in the next-action-slot
            const existingNextActionTag = existingTagElements.find(el => 
                parseInt(el.dataset.tagIndex) === index && el.dataset.isInNextAction === 'true'
            );
            
            if (existingNextActionTag) {
                // Update the existing next-action tag's data but don't recreate it
                existingNextActionTag.dataset.tagIndex = index;
                return; // Skip creating a new element
            }
            
            const tagElement = this.createTaskTagElement(tag, index, taskNode);
            tagsContainer.appendChild(tagElement);
        });
        
        console.log(`TagManager: Updated task tags display for task ${taskNode.dataset.id}`);
    }
    
    /**
     * Create a tag element for task display
     * @param {Object} tag - Tag data object
     * @param {number} index - Tag index
     * @param {HTMLElement} taskNode - Task node element
     * @returns {HTMLElement} Tag element
     */
    createTaskTagElement(tag, index, taskNode) {
        const tagElement = document.createElement('div');
        tagElement.className = 'tag';
        tagElement.draggable = true;
        tagElement.dataset.type = 'tag';  // Add type for context menu system
        tagElement.dataset.tagIndex = index;
        tagElement.dataset.taskId = taskNode.dataset.id;
        
        // Apply tag styling
        const display = this.configService.getTagDisplay(tag.category);
        tagElement.style.color = display.color;
        tagElement.style.backgroundColor = display.bgColor;
        
        // Create tag content
        const categoryLabel = this.configService.getTagCategoryLabel(tag.category);
        const optionLabel = this.configService.getTagOptionLabel(tag.category, tag.option);
        const dateText = tag.date ? ` (${this.formatDateForDisplay(tag.date)})` : '';
        
        tagElement.textContent = `${categoryLabel}: ${optionLabel}${dateText}`;
        
        // Add visual indicator if tag has a link
        if (tag.link && tag.link.trim()) {
            tagElement.dataset.hasLink = 'true';
            tagElement.title = `Double-click to open: ${tag.link}`;
        }
        
        // Add drag event listeners
        tagElement.addEventListener('dragstart', (e) => this.handleTagDragStart(e));
        tagElement.addEventListener('dragend', (e) => this.handleTagDragEnd(e));
        
        // Add context menu event listener - same pattern as tasks
        tagElement.addEventListener('contextmenu', (e) => this.app.handleContextMenu(e, tagElement));
        
        // Add double-click event listener to open links
        tagElement.addEventListener('dblclick', (e) => this.handleTagDoubleClick(e, tagElement, tag));
        
        return tagElement;
    }
    
    /**
     * Handle tag double-click to open links
     * @param {Event} e - Double-click event
     * @param {HTMLElement} tagElement - Tag element
     * @param {Object} tag - Tag data object
     */
    handleTagDoubleClick(e, tagElement, tag) {
        console.log('TagManager: Tag double-clicked:', tag);
        
        // Prevent event bubbling
        e.preventDefault();
        e.stopPropagation();
        
        // Check if tag has a link
        if (tag.link && tag.link.trim()) {
            const link = tag.link.trim();
            console.log('TagManager: Opening tag link:', link);
            
            try {
                // Validate URL format
                let url = link;
                if (!link.startsWith('http://') && !link.startsWith('https://')) {
                    url = 'https://' + link;
                }
                
                // Open link in new tab
                window.open(url, '_blank', 'noopener,noreferrer');
                console.log('TagManager: Link opened successfully');
            } catch (error) {
                console.error('TagManager: Error opening link:', error);
                alert(`Unable to open link: ${link}`);
            }
        } else {
            console.log('TagManager: Tag has no link to open');
            // Optional: Show a subtle indication that there's no link
            // Could flash the tag or show a tooltip
        }
    }
    
    // ==================== TAG DRAG AND DROP METHODS ====================
    
    /**
     * Handle tag drag start
     * @param {Event} e - Drag start event
     */
    handleTagDragStart(e) {
        console.log('TagManager: Drag start:', e.target);
        this.successfulDrop = false; // Reset flag for new drag operation
        
        this.draggedTag = {
            element: e.target,
            taskId: e.target.dataset.taskId,
            tagIndex: parseInt(e.target.dataset.tagIndex),
            originalParent: e.target.parentNode,
            originalPosition: Array.from(e.target.parentNode.children).indexOf(e.target)
        };
        
        console.log('TagManager: Dragged tag data:', this.draggedTag);
        
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', ''); // Required for Firefox
    }
    
    /**
     * Handle tag drag end
     * @param {Event} e - Drag end event
     */
    handleTagDragEnd(e) {
        console.log('TagManager: Drag end, successful drop:', this.successfulDrop);
        e.target.classList.remove('dragging');
        
        // Clear all drag-over classes
        document.querySelectorAll('.next-action-slot.drag-over').forEach(slot => {
            slot.classList.remove('drag-over');
        });
        
        // If drag ended without a successful drop, snap back
        if (this.draggedTag && !this.successfulDrop) {
            console.log('TagManager: Snapping tag back');
            this.snapTagBack();
        } else {
            console.log('TagManager: Drop was successful, not snapping back');
        }
        
        // Clean up drag state
        this.draggedTag = null;
    }
    
    /**
     * Snap tag to next-action slot with animation
     * @param {HTMLElement} tagElement - Tag element
     * @param {HTMLElement} slotElement - Slot element
     */
    snapTagToSlot(tagElement, slotElement) {
        // Store restoration data on the tag element
        tagElement.dataset.originalParent = 'task-tags';
        
        // Get current and target positions for animation
        const tagRect = tagElement.getBoundingClientRect();
        const slotRect = slotElement.getBoundingClientRect();
        
        // Calculate animation offset
        const deltaX = slotRect.left - tagRect.left;
        const deltaY = slotRect.top - tagRect.top;
        
        // Clone the tag for the animation
        const tagClone = tagElement.cloneNode(true);
        tagClone.classList.add('tag-in-slot');
        tagClone.dataset.isInNextAction = 'true';
        tagClone.style.position = 'absolute';
        tagClone.style.left = tagRect.left + 'px';
        tagClone.style.top = tagRect.top + 'px';
        tagClone.style.zIndex = '1000';
        
        // Add the clone to the document
        document.body.appendChild(tagClone);
        
        // Animate to the slot position
        tagClone.style.transition = 'all 0.3s ease-out';
        requestAnimationFrame(() => {
            tagClone.style.left = slotRect.left + 'px';
            tagClone.style.top = slotRect.top + 'px';
        });
        
        // After animation, move to slot and clean up
        setTimeout(() => {
            // Remove the animated clone
            if (tagClone.parentNode) {
                tagClone.parentNode.removeChild(tagClone);
            }
            
            // Create a new tag in the slot
            const slotTag = tagElement.cloneNode(true);
            slotTag.classList.add('tag-in-slot');
            slotTag.dataset.type = 'tag';  // Ensure type is set for context menu
            slotTag.dataset.isInNextAction = 'true';
            slotTag.style.position = 'relative';
            slotTag.style.left = 'auto';
            slotTag.style.top = 'auto';
            slotTag.style.zIndex = 'auto';
            
            // Add context menu event listener - same pattern as tasks
            slotTag.addEventListener('contextmenu', (e) => this.app.handleContextMenu(e, slotTag));
            
            // Add double-click event listener to open links (need to get tag data)
            const taskNode = this.draggedTag.element.closest('.task-banner') || 
                            this.draggedTag.element.closest('[data-type="task"]') ||
                            document.querySelector(`.task-banner[data-id="${this.draggedTag.taskId}"]`);
            if (taskNode) {
                const tags = this.getTaskTags(taskNode);
                const tagData = tags[this.draggedTag.tagIndex];
                if (tagData) {
                    slotTag.addEventListener('dblclick', (e) => this.handleTagDoubleClick(e, slotTag, tagData));
                }
            }
            
            slotElement.appendChild(slotTag);
            
            // Hide the original tag
            tagElement.style.display = 'none';
            
            console.log('TagManager: Tag animation complete and positioned in slot');
        }, 300);
    }
    
    /**
     * Snap tag back to original position
     */
    snapTagBack() {
        if (!this.draggedTag) return;
        
        const tagElement = this.draggedTag.element;
        const originalParent = this.draggedTag.originalParent;
        
        // Restore tag to original position if needed
        if (tagElement.parentNode !== originalParent) {
            originalParent.appendChild(tagElement);
        }
        
        console.log('TagManager: Tag snapped back to original position');
    }
    
    // ==================== TAG UI INTERACTION METHODS ====================
    
    /**
     * Handle tag category dropdown change
     * @param {Event} e - Change event
     */
    handleTagCategoryChange(e) {
        const selectedCategory = e.target.value;
        
        if (!selectedCategory) {
            if (this.tagOptionDropdown) {
                this.tagOptionDropdown.disabled = true;
                this.tagOptionDropdown.innerHTML = '<option value="">Select category first</option>';
            }
            return;
        }
        
        if (this.tagOptionDropdown) {
            const success = this.configService.populateDropdown(
                this.tagOptionDropdown, 
                `tagSystem.options.${selectedCategory}`
            );
            
            if (success) {
                this.tagOptionDropdown.disabled = false;
            } else {
                console.warn(`TagManager: No options found for category: ${selectedCategory}`);
                this.tagOptionDropdown.innerHTML = '<option value="">No options available</option>';
            }
        }
        
        console.log(`TagManager: Category changed to ${selectedCategory}`);
    }
    
    
    
    // ==================== UTILITY METHODS ====================
    
    /**
     * Format date string for display
     * @param {string} dateString - ISO date string
     * @returns {string} Formatted date string
     */
    formatDateForDisplay(dateString) {
        if (!dateString) return '';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString();
        } catch (e) {
            console.error('TagManager: Error formatting date:', e);
            return dateString;
        }
    }
    
    /**
     * Set the selected task for tagging
     * @param {HTMLElement} taskNode - Task node element
     */
    setSelectedTaskForTags(taskNode) {
        this.app.selectedTaskForTags = taskNode;
        console.log('TagManager: Selected task for tagging:', taskNode ? taskNode.dataset.id : 'none');
    }
    
    /**
     * Save task tags (used for matrix repositioning)
     */
    saveTaskTags() {
        // Tags are already saved when added/removed, but if matrix is active,
        // reposition the task based on its updated tags
        if (this.app.selectedTaskForTags && this.app.isMatrixMode) {
            if (typeof this.app.repositionTaskInMatrix === 'function') {
                this.app.repositionTaskInMatrix(this.app.selectedTaskForTags);
            }
            console.log('TagManager: Task repositioned in matrix after tag save');
        }
    }
    
    /**
     * Get tag manager state information for debugging
     * @returns {Object} Tag manager state information
     */
    getTagManagerState() {
        return {
            selectedTaskForTags: this.app.selectedTaskForTags ? this.app.selectedTaskForTags.dataset.id : null,
            draggedTag: this.draggedTag ? {
                taskId: this.draggedTag.taskId,
                tagIndex: this.draggedTag.tagIndex
            } : null,
            successfulDrop: this.successfulDrop,
            elementsLoaded: {
                currentTags: !!this.currentTags,
                tagCategoryDropdown: !!this.tagCategoryDropdown,
                tagOptionDropdown: !!this.tagOptionDropdown,
                canvas: !!this.canvas
            }
        };
    }
    
    /**
     * Validate tag manager elements
     * @returns {Object} Validation result
     */
    validateTagElements() {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };
        
        // Check critical elements
        const criticalElements = ['canvas', 'currentTags'];
        criticalElements.forEach(elementName => {
            if (!this[elementName]) {
                result.isValid = false;
                result.errors.push(`Missing critical element: ${elementName}`);
            }
        });
        
        // Check optional elements
        const optionalElements = ['tagCategoryDropdown', 'tagOptionDropdown', 'tagDateInput'];
        optionalElements.forEach(elementName => {
            if (!this[elementName]) {
                result.warnings.push(`Missing optional element: ${elementName}`);
            }
        });
        
        return result;
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TagManager;
}

// Make available globally for direct use
if (typeof window !== 'undefined') {
    window.TagManager = TagManager;
}