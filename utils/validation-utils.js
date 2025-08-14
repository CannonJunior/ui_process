/**
 * Validation Utilities
 * Pure utility functions for input validation and data checking
 * 
 * SAFETY: These are pure functions with no side effects
 * Risk Level: LOW - Simple validation logic, easy to test
 */

class ValidationUtils {
    /**
     * Validates and sanitizes task name input
     * @param {string} taskName - Raw task name input
     * @returns {Object} Validation result with isValid boolean and sanitized value
     */
    static validateTaskName(taskName) {
        if (typeof taskName !== 'string') {
            return { isValid: false, value: '', error: 'Task name must be a string' };
        }
        
        const trimmed = taskName.trim();
        
        if (trimmed.length === 0) {
            return { isValid: false, value: '', error: 'Task name cannot be empty' };
        }
        
        if (trimmed.length > 100) {
            return { isValid: false, value: trimmed.substring(0, 100), error: 'Task name too long (max 100 characters)' };
        }
        
        return { isValid: true, value: trimmed, error: null };
    }
    
    /**
     * Validates node type
     * @param {string} nodeType - Node type to validate
     * @param {Array} validTypes - Array of valid node types (default: process, decision, terminal)
     * @returns {Object} Validation result
     */
    static validateNodeType(nodeType, validTypes = ['process', 'decision', 'terminal']) {
        if (typeof nodeType !== 'string') {
            return { isValid: false, value: 'process', error: 'Node type must be a string' };
        }
        
        const trimmed = nodeType.trim().toLowerCase();
        
        if (!validTypes.includes(trimmed)) {
            return { isValid: false, value: 'process', error: `Invalid node type. Must be one of: ${validTypes.join(', ')}` };
        }
        
        return { isValid: true, value: trimmed, error: null };
    }
    
    /**
     * Validates element existence and type
     * @param {HTMLElement} element - Element to validate
     * @param {string} expectedType - Expected element type (optional)
     * @returns {Object} Validation result
     */
    static validateElement(element, expectedType = null) {
        if (!element) {
            return { isValid: false, error: 'Element is null or undefined' };
        }
        
        if (!(element instanceof HTMLElement)) {
            return { isValid: false, error: 'Element is not an HTMLElement' };
        }
        
        if (expectedType && !element.classList.contains(expectedType)) {
            return { isValid: false, error: `Element does not have expected class: ${expectedType}` };
        }
        
        return { isValid: true, error: null };
    }
    
    /**
     * Validates array has content
     * @param {Array} array - Array to validate
     * @param {number} minLength - Minimum required length (default: 1)
     * @returns {Object} Validation result
     */
    static validateArray(array, minLength = 1) {
        if (!Array.isArray(array)) {
            return { isValid: false, error: 'Value is not an array' };
        }
        
        if (array.length < minLength) {
            return { isValid: false, error: `Array must have at least ${minLength} items` };
        }
        
        return { isValid: true, error: null };
    }
    
    /**
     * Validates dataset ID exists and is valid
     * @param {string} id - ID to validate
     * @returns {Object} Validation result
     */
    static validateId(id) {
        if (typeof id !== 'string') {
            return { isValid: false, error: 'ID must be a string' };
        }
        
        const trimmed = id.trim();
        
        if (trimmed.length === 0) {
            return { isValid: false, error: 'ID cannot be empty' };
        }
        
        if (trimmed === 'null' || trimmed === 'undefined') {
            return { isValid: false, error: 'ID cannot be null or undefined string' };
        }
        
        return { isValid: true, value: trimmed, error: null };
    }
    
    /**
     * Validates tag data structure
     * @param {Object} tag - Tag object to validate
     * @returns {Object} Validation result
     */
    static validateTag(tag) {
        if (!tag || typeof tag !== 'object') {
            return { isValid: false, error: 'Tag must be an object' };
        }
        
        if (!tag.category || typeof tag.category !== 'string') {
            return { isValid: false, error: 'Tag must have a valid category' };
        }
        
        if (!tag.option || typeof tag.option !== 'string') {
            return { isValid: false, error: 'Tag must have a valid option' };
        }
        
        return { isValid: true, error: null };
    }
    
    /**
     * Validates flowline connection is possible
     * @param {HTMLElement} sourceNode - Source node element
     * @param {HTMLElement} targetNode - Target node element
     * @returns {Object} Validation result
     */
    static validateFlowlineConnection(sourceNode, targetNode) {
        const sourceValidation = this.validateElement(sourceNode, 'node');
        if (!sourceValidation.isValid) {
            return { isValid: false, error: `Invalid source node: ${sourceValidation.error}` };
        }
        
        const targetValidation = this.validateElement(targetNode, 'node');
        if (!targetValidation.isValid) {
            return { isValid: false, error: `Invalid target node: ${targetValidation.error}` };
        }
        
        if (sourceNode === targetNode) {
            return { isValid: false, error: 'Cannot create flowline to same node' };
        }
        
        return { isValid: true, error: null };
    }
    
    /**
     * Validates coordinates are numeric and finite
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Object} Validation result
     */
    static validateCoordinates(x, y) {
        if (typeof x !== 'number' || typeof y !== 'number') {
            return { isValid: false, error: 'Coordinates must be numbers' };
        }
        
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            return { isValid: false, error: 'Coordinates must be finite numbers' };
        }
        
        if (x < 0 || y < 0) {
            return { isValid: false, error: 'Coordinates must be non-negative' };
        }
        
        return { isValid: true, error: null };
    }
    
    /**
     * Validates slot index for task positioning
     * @param {number|string} slotIndex - Slot index to validate
     * @returns {Object} Validation result with parsed integer value
     */
    static validateSlotIndex(slotIndex) {
        const parsed = parseInt(slotIndex);
        
        if (isNaN(parsed)) {
            return { isValid: false, value: 0, error: 'Slot index must be a valid number' };
        }
        
        if (parsed < 0) {
            return { isValid: false, value: 0, error: 'Slot index cannot be negative' };
        }
        
        if (parsed > 100) { // Reasonable upper limit
            return { isValid: false, value: 100, error: 'Slot index too large (max 100)' };
        }
        
        return { isValid: true, value: parsed, error: null };
    }
    
    /**
     * Sanitizes text input for safe display
     * @param {string} text - Text to sanitize
     * @param {number} maxLength - Maximum allowed length (default: 1000)
     * @returns {string} Sanitized text
     */
    static sanitizeText(text, maxLength = 1000) {
        if (typeof text !== 'string') {
            return '';
        }
        
        // Trim and limit length
        let sanitized = text.trim().substring(0, maxLength);
        
        // Basic HTML escape for safety
        sanitized = sanitized
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        
        return sanitized;
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ValidationUtils;
}

// Make available globally for direct use
if (typeof window !== 'undefined') {
    window.ValidationUtils = ValidationUtils;
}