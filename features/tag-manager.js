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
        
        // Get custom field elements
        this.tagCustomFields = this.domService.getElement('tagCustomFields');
        this.tagSharePointName = this.domService.getElement('tagSharePointName');
        this.tagCrmOpportunityId = this.domService.getElement('tagCrmOpportunityId');
        this.tagConfluenceName = this.domService.getElement('tagConfluenceName');
        this.tagConfluenceAuthor = this.domService.getElement('tagConfluenceAuthor');
        
        // Validate critical tag elements
        const requiredElements = ['canvas', 'currentTags', 'tagCategoryDropdown', 'tagOptionDropdown'];
        const missingElements = requiredElements.filter(id => !this[id]);
        
        if (missingElements.length > 0) {
            console.error(`TagManager: Critical tag elements missing: ${missingElements.join(', ')}`);
            console.error('TagManager element states:', {
                canvas: !!this.canvas,
                currentTags: !!this.currentTags,
                tagCategoryDropdown: !!this.tagCategoryDropdown,
                tagOptionDropdown: !!this.tagOptionDropdown,
                tagDateInput: !!this.tagDateInput,
                tagDescriptionInput: !!this.tagDescriptionInput
            });
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
                console.log('TagManager: Drop event triggered on:', e.target);
                console.log('TagManager: Target has next-action-slot class:', e.target.classList.contains('next-action-slot'));
                console.log('TagManager: draggedTag exists:', !!this.draggedTag);
                console.log('TagManager: Target taskId:', e.target.dataset.taskId);
                console.log('TagManager: draggedTag taskId:', this.draggedTag ? this.draggedTag.taskId : 'none');
                
                // Clear all drag-over classes
                document.querySelectorAll('.next-action-slot.drag-over').forEach(slot => {
                    slot.classList.remove('drag-over');
                });
                
                // Handle valid drops
                if (e.target.classList.contains('next-action-slot') && 
                    this.draggedTag && e.target.dataset.taskId === this.draggedTag.taskId) {
                    console.log('TagManager: Valid drop detected, calling snapTagToSlot');
                    
                    // Debug slot position
                    const slotRect = e.target.getBoundingClientRect();
                    console.log('🎯 POSITION: Next-action-slot position:', {
                        left: slotRect.left,
                        top: slotRect.top,
                        width: slotRect.width,
                        height: slotRect.height
                    });
                    
                    e.preventDefault();
                    this.successfulDrop = true;
                    this.snapTagToSlot(this.draggedTag.element, e.target);
                } else {
                    console.log('TagManager: Invalid drop, preventing default');
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
        
        // Validate custom fields for advanced tag types
        const customFieldsValidation = this.validateCustomFields(category);
        if (!customFieldsValidation.isValid) {
            alert(customFieldsValidation.message);
            return;
        }
        
        const tags = this.getTaskTags(this.app.selectedTaskForTags);
        
        // Create tag object with optional fields
        const tagData = { category, option };
        if (date) tagData.date = date;
        if (description) tagData.description = description;
        if (link) tagData.link = link;
        if (completed) tagData.completed = completed;
        
        // Add custom fields for advanced tag types
        this.addCustomFieldsToTag(tagData, category);
        
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
        
        // Clear custom fields
        if (this.tagSharePointName) this.tagSharePointName.value = '';
        if (this.tagCrmOpportunityId) this.tagCrmOpportunityId.value = '';
        if (this.tagConfluenceName) this.tagConfluenceName.value = '';
        if (this.tagConfluenceAuthor) this.tagConfluenceAuthor.value = '';
        
        // Hide custom fields container
        if (this.tagCustomFields) this.tagCustomFields.style.display = 'none';
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
        const customFieldText = this.getCustomFieldDisplayText(tag);
        
        tagElement.innerHTML = `
            <span>${categoryLabel}: ${optionLabel}${customFieldText}${dateText}</span>
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
        const customFieldText = this.getCustomFieldDisplayText(tag);
        
        tagElement.textContent = `${categoryLabel}: ${optionLabel}${customFieldText}${dateText}`;
        
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
        console.log('TagManager: Target dataset:', e.target.dataset);
        this.successfulDrop = false; // Reset flag for new drag operation
        
        // Get initial positions for debugging
        const tagRect = e.target.getBoundingClientRect();
        const originalPos = {
            left: tagRect.left,
            top: tagRect.top,
            parent: e.target.parentNode.className
        };
        
        this.draggedTag = {
            element: e.target,
            taskId: e.target.dataset.taskId,
            tagIndex: parseInt(e.target.dataset.tagIndex),
            originalParent: e.target.parentNode,
            originalPosition: Array.from(e.target.parentNode.children).indexOf(e.target),
            originalPos: originalPos // Store for position debugging
        };
        
        console.log('🎯 POSITION: Tag original position:', originalPos);
        console.log('TagManager: Dragged tag data:', this.draggedTag);
        console.log('TagManager: draggedTag.taskId set to:', this.draggedTag.taskId);
        
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', ''); // Required for Firefox
    }
    
    /**
     * Handle tag drag end
     * @param {Event} e - Drag end event
     */
    handleTagDragEnd(e) {
        console.log('TagManager: Drag end, successful drop (before timeout):', this.successfulDrop);
        e.target.classList.remove('dragging');
        
        // Clear all drag-over classes
        document.querySelectorAll('.next-action-slot.drag-over').forEach(slot => {
            slot.classList.remove('drag-over');
        });
        
        // Add a small delay to let the drop event fire first
        setTimeout(() => {
            console.log('TagManager: Drag end, successful drop (after timeout):', this.successfulDrop);
            
            // Debug final position
            if (this.draggedTag) {
                const finalRect = this.draggedTag.element.getBoundingClientRect();
                const finalPos = {
                    left: finalRect.left,
                    top: finalRect.top,
                    parent: this.draggedTag.element.parentNode.className,
                    display: this.draggedTag.element.style.display
                };
                console.log('🎯 POSITION: Tag final position:', finalPos);
                console.log('🎯 POSITION: Original vs Final:', {
                    original: this.draggedTag.originalPos,
                    final: finalPos,
                    moved: finalPos.left !== this.draggedTag.originalPos.left || finalPos.top !== this.draggedTag.originalPos.top
                });
            }
            
            // If drag ended without a successful drop, snap back
            if (this.draggedTag && !this.successfulDrop) {
                console.log('TagManager: Snapping tag back');
                this.snapTagBack();
                
                // Debug position after snap back
                if (this.draggedTag) {
                    const snapBackRect = this.draggedTag.element.getBoundingClientRect();
                    console.log('🎯 POSITION: After snap back:', {
                        left: snapBackRect.left,
                        top: snapBackRect.top,
                        parent: this.draggedTag.element.parentNode.className
                    });
                }
            } else {
                console.log('TagManager: Drop was successful, not snapping back');
            }
            
            // Clean up drag state
            this.draggedTag = null;
        }, 10); // Small delay to let drop event fire
    }
    
    /**
     * Snap tag to next-action slot with animation
     * @param {HTMLElement} tagElement - Tag element
     * @param {HTMLElement} slotElement - Slot element
     */
    snapTagToSlot(tagElement, slotElement) {
        console.log('🎯 SIMPLE: Moving tag directly to slot');
        console.log('🎯 SIMPLE: Tag element:', tagElement);
        console.log('🎯 SIMPLE: Slot element:', slotElement);
        
        // Store restoration data
        tagElement.dataset.originalParent = 'task-tags';
        tagElement.dataset.isInNextAction = 'true';
        
        // Add slot classes
        tagElement.classList.add('tag-in-slot');
        
        // Clear the slot and move the tag directly
        slotElement.innerHTML = '';
        slotElement.appendChild(tagElement);
        
        // Reset positioning styles
        tagElement.style.position = 'relative';
        tagElement.style.left = 'auto';
        tagElement.style.top = 'auto';
        tagElement.style.display = '';
        
        // Verify it worked
        const finalRect = tagElement.getBoundingClientRect();
        console.log('🎯 SIMPLE: Tag moved to slot position:', {
            left: finalRect.left,
            top: finalRect.top,
            parent: tagElement.parentNode.className,
            slotChildren: slotElement.children.length,
            inDOM: document.contains(tagElement)
        });
        
        console.log('🎯 SIMPLE: Tag move complete');
    }
    
    /**
     * Snap tag back to original position
     */
    snapTagBack() {
        console.log('TagManager: snapTagBack called, draggedTag exists:', !!this.draggedTag);
        if (!this.draggedTag) return;
        
        const tagElement = this.draggedTag.element;
        const originalParent = this.draggedTag.originalParent;
        console.log('TagManager: Snapping back element:', tagElement, 'to parent:', originalParent);
        
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
        console.log('TagManager.handleTagCategoryChange called with category:', selectedCategory);
        
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
                console.log(`TagManager: Successfully populated ${selectedCategory} options`);
            } else {
                console.warn(`TagManager: No options found for category: ${selectedCategory}`);
                this.tagOptionDropdown.innerHTML = '<option value="">No options available</option>';
            }
        } else {
            console.error('TagManager: tagOptionDropdown element not found');
        }
        
        // Show/hide custom fields based on selected category
        this.toggleCustomFields(selectedCategory);
        
        console.log(`TagManager: Category changed to ${selectedCategory}`);
    }
    
    /**
     * Toggle custom fields visibility based on selected category
     * @param {string} selectedCategory - The selected tag category
     */
    toggleCustomFields(selectedCategory) {
        if (!this.tagCustomFields) return;
        
        // Hide all custom field groups first
        const customFieldGroups = this.tagCustomFields.querySelectorAll('.custom-field');
        customFieldGroups.forEach(group => {
            group.style.display = 'none';
        });
        
        // Show the custom fields container if we have a category with custom fields
        const hasCustomFields = ['sharepoint', 'crm', 'confluence'].includes(selectedCategory);
        this.tagCustomFields.style.display = hasCustomFields ? 'block' : 'none';
        
        // Show the specific custom field group for the selected category
        if (hasCustomFields) {
            const targetGroup = this.tagCustomFields.querySelector(`.custom-field[data-category="${selectedCategory}"]`);
            if (targetGroup) {
                targetGroup.style.display = 'block';
                console.log(`TagManager: Showing custom fields for ${selectedCategory}`);
            }
        }
        
        // Update link field label based on category
        if (this.tagLinkInput && this.tagLinkInput.previousElementSibling) {
            const linkLabel = this.tagLinkInput.previousElementSibling;
            if (hasCustomFields) {
                linkLabel.textContent = 'Link (required):';
                this.tagLinkInput.required = true;
            } else {
                linkLabel.textContent = 'Link (optional):';
                this.tagLinkInput.required = false;
            }
        }
    }
    
    /**
     * Validate custom fields for advanced tag types
     * @param {string} category - The tag category
     * @returns {Object} Validation result with isValid and message
     */
    validateCustomFields(category) {
        const customFieldsConfig = AppConfig.tagSystem.customFields;
        
        if (!customFieldsConfig || !customFieldsConfig[category]) {
            return { isValid: true, message: '' };
        }
        
        const config = customFieldsConfig[category];
        const requiredFields = config.required || [];
        
        // Check SharePoint specific fields
        if (category === 'sharepoint') {
            if (requiredFields.includes('name') && (!this.tagSharePointName || !this.tagSharePointName.value.trim())) {
                return { isValid: false, message: 'SharePoint Name is required.' };
            }
            if (requiredFields.includes('link') && (!this.tagLinkInput || !this.tagLinkInput.value.trim())) {
                return { isValid: false, message: 'SharePoint Link is required.' };
            }
        }
        
        // Check CRM specific fields
        if (category === 'crm') {
            if (requiredFields.includes('opportunity_id') && (!this.tagCrmOpportunityId || !this.tagCrmOpportunityId.value.trim())) {
                return { isValid: false, message: 'Opportunity ID is required.' };
            }
            if (requiredFields.includes('link') && (!this.tagLinkInput || !this.tagLinkInput.value.trim())) {
                return { isValid: false, message: 'CRM Link is required.' };
            }
        }
        
        // Check Confluence specific fields
        if (category === 'confluence') {
            if (requiredFields.includes('name') && (!this.tagConfluenceName || !this.tagConfluenceName.value.trim())) {
                return { isValid: false, message: 'Confluence Name is required.' };
            }
            if (requiredFields.includes('link') && (!this.tagLinkInput || !this.tagLinkInput.value.trim())) {
                return { isValid: false, message: 'Confluence Link is required.' };
            }
        }
        
        return { isValid: true, message: '' };
    }
    
    /**
     * Add custom fields to tag object
     * @param {Object} tagData - The tag data object to modify
     * @param {string} category - The tag category
     */
    addCustomFieldsToTag(tagData, category) {
        switch (category) {
            case 'sharepoint':
                if (this.tagSharePointName && this.tagSharePointName.value.trim()) {
                    tagData.sharepoint_name = this.tagSharePointName.value.trim();
                }
                break;
                
            case 'crm':
                if (this.tagCrmOpportunityId && this.tagCrmOpportunityId.value.trim()) {
                    tagData.opportunity_id = this.tagCrmOpportunityId.value.trim();
                }
                break;
                
            case 'confluence':
                if (this.tagConfluenceName && this.tagConfluenceName.value.trim()) {
                    tagData.confluence_name = this.tagConfluenceName.value.trim();
                }
                if (this.tagConfluenceAuthor && this.tagConfluenceAuthor.value.trim()) {
                    tagData.author = this.tagConfluenceAuthor.value.trim();
                }
                break;
        }
    }
    
    /**
     * Get display text for custom fields in a tag
     * @param {Object} tag - Tag data object
     * @returns {string} Formatted custom field display text
     */
    getCustomFieldDisplayText(tag) {
        let customText = '';
        
        switch (tag.category) {
            case 'sharepoint':
                if (tag.sharepoint_name) {
                    customText += ` - ${tag.sharepoint_name}`;
                }
                break;
                
            case 'crm':
                if (tag.opportunity_id) {
                    customText += ` - ID: ${tag.opportunity_id}`;
                }
                break;
                
            case 'confluence':
                if (tag.confluence_name) {
                    customText += ` - ${tag.confluence_name}`;
                }
                if (tag.author) {
                    customText += ` (${tag.author})`;
                }
                break;
        }
        
        return customText;
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