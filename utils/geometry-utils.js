/**
 * Geometry Utilities
 * Pure utility functions for position calculations and geometric operations
 * 
 * SAFETY: These are pure functions with no side effects
 * Risk Level: LOW - Easy to test and rollback
 */

class GeometryUtils {
    /**
     * Calculates task slot position based on anchor node and slot index
     * @param {HTMLElement} anchorNode - The node the task is anchored to
     * @param {HTMLElement} canvas - The canvas container for coordinate reference
     * @param {number} slotIndex - The slot index for the task
     * @param {Object} config - Configuration object with UI settings
     * @returns {Object} Position object with x, y coordinates
     */
    static calculateTaskSlotPosition(anchorNode, canvas, slotIndex = 0, config = {}) {
        if (!anchorNode || !canvas) {
            return { x: 100, y: 100 }; // Default position
        }
        
        // Use provided config or defaults
        const taskOffset = config.taskOffset || 20;
        const taskSpacing = config.taskSpacing || 10;
        
        // Calculate position based on anchor node and slot
        const anchorRect = anchorNode.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        
        // Convert from viewport coordinates to canvas-relative coordinates
        const anchorX = anchorRect.left - canvasRect.left + anchorNode.offsetWidth / 2 - 60; // Center and adjust
        const anchorY = anchorRect.top - canvasRect.top + anchorNode.offsetHeight;
        
        // Calculate slot position
        const taskY = anchorY + taskOffset + (slotIndex * (taskSpacing + 60));
        
        return { x: anchorX, y: taskY };
    }
    
    /**
     * Calculates random position within canvas bounds
     * @param {HTMLElement} canvas - The canvas container
     * @param {number} elementWidth - Width of element to position (default: 150)
     * @param {number} elementHeight - Height of element to position (default: 150)
     * @param {number} topOffset - Minimum top offset (default: 100)
     * @returns {Object} Position object with x, y coordinates
     */
    static calculateRandomPosition(canvas, elementWidth = 150, elementHeight = 150, topOffset = 100) {
        if (!canvas) {
            return { x: 100, y: 100 }; // Default position
        }
        
        const canvasRect = canvas.getBoundingClientRect();
        const x = Math.random() * (canvasRect.width - elementWidth);
        const y = Math.random() * (canvasRect.height - elementHeight) + topOffset;
        
        return { x, y };
    }
    
    /**
     * Constrains position within canvas bounds
     * @param {number} x - X coordinate to constrain
     * @param {number} y - Y coordinate to constrain
     * @param {HTMLElement} canvas - Canvas container for bounds
     * @param {HTMLElement} element - Element being positioned
     * @returns {Object} Constrained position object with x, y coordinates
     */
    static constrainToCanvas(x, y, canvas, element) {
        if (!canvas || !element) {
            return { x, y }; // Return original if validation fails
        }
        
        const canvasRect = canvas.getBoundingClientRect();
        const constrainedX = Math.max(0, Math.min(x, canvasRect.width - element.offsetWidth));
        const constrainedY = Math.max(0, Math.min(y, canvasRect.height - element.offsetHeight));
        
        return { x: constrainedX, y: constrainedY };
    }
    
    /**
     * Converts viewport coordinates to canvas-relative coordinates
     * @param {number} viewportX - X coordinate in viewport
     * @param {number} viewportY - Y coordinate in viewport  
     * @param {HTMLElement} canvas - Canvas container for reference
     * @returns {Object} Canvas-relative position object with x, y coordinates
     */
    static viewportToCanvas(viewportX, viewportY, canvas) {
        if (!canvas) {
            return { x: viewportX, y: viewportY }; // Fallback to original
        }
        
        const canvasRect = canvas.getBoundingClientRect();
        return {
            x: viewportX - canvasRect.left,
            y: viewportY - canvasRect.top
        };
    }
    
    /**
     * Calculates distance between two points
     * @param {Object} point1 - First point with x, y properties
     * @param {Object} point2 - Second point with x, y properties
     * @returns {number} Distance between points
     */
    static calculateDistance(point1, point2) {
        if (!point1 || !point2 || 
            typeof point1.x !== 'number' || typeof point1.y !== 'number' ||
            typeof point2.x !== 'number' || typeof point2.y !== 'number') {
            return 0; // Safe default
        }
        
        const deltaX = point2.x - point1.x;
        const deltaY = point2.y - point1.y;
        return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    }
    
    /**
     * Calculates center point of an element
     * @param {HTMLElement} element - Element to find center of
     * @param {HTMLElement} canvas - Canvas for coordinate reference
     * @returns {Object} Center position object with x, y coordinates
     */
    static getElementCenter(element, canvas) {
        if (!element) {
            return { x: 0, y: 0 }; // Safe default
        }
        
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        if (canvas) {
            return this.viewportToCanvas(centerX, centerY, canvas);
        }
        
        return { x: centerX, y: centerY };
    }
    
    /**
     * Calculates next-action slot position relative to task container
     * @param {HTMLElement} taskContainer - Task container element
     * @param {HTMLElement} canvas - Canvas for coordinate reference
     * @param {number} offsetX - X offset from task container (default: 130)
     * @param {number} offsetY - Y offset from task container (default: 0)
     * @returns {Object} Position object with x, y coordinates
     */
    static calculateNextActionSlotPosition(taskContainer, canvas, offsetX = 130, offsetY = 0) {
        if (!taskContainer) {
            return { x: 100, y: 100 }; // Safe default
        }
        
        const taskRect = taskContainer.getBoundingClientRect();
        const canvasRect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
        
        // Position to the right of the task container
        const slotX = taskRect.right - canvasRect.left + offsetX;
        const slotY = taskRect.top - canvasRect.top + offsetY;
        
        return { x: slotX, y: slotY };
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GeometryUtils;
}

// Make available globally for direct use
if (typeof window !== 'undefined') {
    window.GeometryUtils = GeometryUtils;
}