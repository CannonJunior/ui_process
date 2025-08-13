/**
 * Positioning Service - Handles coordinate calculations and layout algorithms
 * Centralizes all positioning logic for nodes, tasks, and UI elements
 */
export class PositioningService {
    constructor(context) {
        this.context = context;
        this.eventBus = context.eventBus;
        this.stateManager = context.stateManager;
    }

    /**
     * Calculate task position in slot
     * @param {string} anchorNodeId - Anchor node ID
     * @param {number} slot - Slot number
     * @returns {Object} Position {x, y}
     */
    calculateTaskSlotPosition(anchorNodeId, slot) {
        const anchorNode = this.findNodeById(anchorNodeId);
        if (!anchorNode) return { x: 0, y: 0 };

        const anchorX = parseInt(anchorNode.style.left) || 0;
        const anchorY = parseInt(anchorNode.style.top) || 0;
        
        const TASK_OFFSET_Y = 80;
        const MIN_TASK_GAP = 10;
        
        let yPosition = anchorY + TASK_OFFSET_Y;
        
        if (slot > 0) {
            const allTasks = this.getTasksForNode(anchorNodeId);
            const sortedTasks = allTasks.sort((a, b) => {
                const slotA = parseInt(a.dataset.slot) || 0;
                const slotB = parseInt(b.dataset.slot) || 0;
                return slotA - slotB;
            });
            
            for (let i = 0; i < slot && i < sortedTasks.length; i++) {
                const prevTask = sortedTasks[i];
                const prevTaskContainer = prevTask.parentNode;
                
                if (prevTaskContainer && prevTaskContainer.classList.contains('task-container')) {
                    const prevTaskHeight = this.getTaskContainerTotalHeight(prevTaskContainer);
                    yPosition += prevTaskHeight + MIN_TASK_GAP;
                }
            }
        }
        
        return { x: anchorX, y: yPosition };
    }

    /**
     * Calculate next action slot position relative to task container
     * @param {HTMLElement} taskContainer - Task container element
     * @returns {Object} Position {x, y}
     */
    calculateNextActionSlotPosition(taskContainer) {
        const canvas = this.context.getElement('canvas');
        const taskRect = taskContainer.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        
        // Account for canvas pan offset
        const panOffset = this.stateManager.get('panOffset') || { x: 0, y: 0 };
        
        return {
            x: Math.round(taskRect.right - canvasRect.left + 10 - panOffset.x),
            y: Math.round(taskRect.top - canvasRect.top - panOffset.y)
        };
    }

    /**
     * Get task container total height including tags
     * @param {HTMLElement} taskContainer - Task container element
     * @returns {number} Total height
     */
    getTaskContainerTotalHeight(taskContainer) {
        const taskBanner = taskContainer.querySelector('.task-banner');
        const tagsArea = taskContainer.querySelector('.task-tags-area');
        
        let totalHeight = 0;
        
        if (taskBanner) {
            totalHeight += taskBanner.offsetHeight;
        }
        
        if (tagsArea) {
            totalHeight += tagsArea.offsetHeight;
        }
        
        // Add gap between banner and tags
        if (taskBanner && tagsArea) {
            totalHeight += 4; // CSS gap
        }
        
        return totalHeight;
    }

    /**
     * Find available slot for task in node
     * @param {string} anchorNodeId - Anchor node ID
     * @returns {number} Available slot number
     */
    findAvailableSlot(anchorNodeId) {
        const existingTasks = this.getTasksForNode(anchorNodeId);
        const usedSlots = existingTasks
            .map(task => parseInt(task.dataset.slot) || 0)
            .sort((a, b) => a - b);
        
        let slot = 0;
        for (const usedSlot of usedSlots) {
            if (usedSlot === slot) {
                slot++;
            } else {
                break;
            }
        }
        
        return slot;
    }

    /**
     * Check if two rectangles collide
     * @param {Object} rect1 - First rectangle {x, y, width, height}
     * @param {Object} rect2 - Second rectangle {x, y, width, height}
     * @returns {boolean} True if collision detected
     */
    checkCollision(rect1, rect2) {
        return !(rect1.x + rect1.width < rect2.x ||
                rect2.x + rect2.width < rect1.x ||
                rect1.y + rect1.height < rect2.y ||
                rect2.y + rect2.height < rect1.y);
    }

    /**
     * Calculate Eisenhower Matrix quadrant position
     * @param {string} urgency - 'urgent' or 'not-urgent'
     * @param {string} importance - 'important' or 'not-important'
     * @returns {Object} Position {x, y}
     */
    calculateMatrixPosition(urgency, importance) {
        const canvas = this.context.getElement('canvas');
        const canvasRect = canvas.getBoundingClientRect();
        
        const centerX = canvasRect.width / 2;
        const centerY = canvasRect.height / 2;
        const padding = 50;
        
        let quadrantX, quadrantY;
        
        if (importance === 'important' && urgency === 'urgent') {
            // Top-left: Important & Urgent
            quadrantX = centerX / 2;
            quadrantY = centerY / 2;
        } else if (importance === 'important' && urgency === 'not-urgent') {
            // Top-right: Important & Not Urgent
            quadrantX = centerX + (centerX / 2);
            quadrantY = centerY / 2;
        } else if (importance === 'not-important' && urgency === 'urgent') {
            // Bottom-left: Not Important & Urgent
            quadrantX = centerX / 2;
            quadrantY = centerY + (centerY / 2);
        } else {
            // Bottom-right: Not Important & Not Urgent
            quadrantX = centerX + (centerX / 2);
            quadrantY = centerY + (centerY / 2);
        }
        
        // Add some randomization to avoid overlap
        const randomOffset = 30;
        quadrantX += (Math.random() - 0.5) * randomOffset;
        quadrantY += (Math.random() - 0.5) * randomOffset;
        
        return {
            x: Math.max(padding, Math.min(quadrantX, canvasRect.width - padding)),
            y: Math.max(padding, Math.min(quadrantY, canvasRect.height - padding))
        };
    }

    /**
     * Convert screen coordinates to canvas coordinates
     * @param {number} screenX - Screen X coordinate
     * @param {number} screenY - Screen Y coordinate
     * @returns {Object} Canvas coordinates {x, y}
     */
    screenToCanvas(screenX, screenY) {
        const canvas = this.context.getElement('canvas');
        const canvasRect = canvas.getBoundingClientRect();
        const panOffset = this.stateManager.get('panOffset') || { x: 0, y: 0 };
        
        return {
            x: screenX - canvasRect.left - panOffset.x,
            y: screenY - canvasRect.top - panOffset.y
        };
    }

    /**
     * Convert canvas coordinates to screen coordinates
     * @param {number} canvasX - Canvas X coordinate
     * @param {number} canvasY - Canvas Y coordinate
     * @returns {Object} Screen coordinates {x, y}
     */
    canvasToScreen(canvasX, canvasY) {
        const canvas = this.context.getElement('canvas');
        const canvasRect = canvas.getBoundingClientRect();
        const panOffset = this.stateManager.get('panOffset') || { x: 0, y: 0 };
        
        return {
            x: canvasX + canvasRect.left + panOffset.x,
            y: canvasY + canvasRect.top + panOffset.y
        };
    }

    // Helper methods

    findNodeById(nodeId) {
        const nodes = this.stateManager.get('nodes') || [];
        return nodes.find(node => node.dataset.id === nodeId);
    }

    getTasksForNode(nodeId) {
        const taskNodes = this.stateManager.get('taskNodes') || [];
        return taskNodes.filter(task => task.dataset.anchoredTo === nodeId);
    }
}