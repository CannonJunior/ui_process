/**
 * DOM Utilities
 * Pure utility functions for DOM manipulation and element management
 * 
 * SAFETY: These functions handle DOM operations safely with validation
 * Risk Level: LOW - Simple DOM operations, easy to test and rollback
 */

class DOMUtils {
    /**
     * Safely gets element by ID with validation
     * @param {string} id - Element ID to find
     * @returns {HTMLElement|null} Element or null if not found
     */
    static getElementById(id) {
        if (typeof id !== 'string' || id.trim().length === 0) {
            console.warn('DOMUtils.getElementById: Invalid ID provided:', id);
            return null;
        }
        
        return document.getElementById(id);
    }
    
    /**
     * Safely gets element by selector with validation
     * @param {string} selector - CSS selector
     * @param {HTMLElement} parent - Parent element to search within (optional)
     * @returns {HTMLElement|null} Element or null if not found
     */
    static querySelector(selector, parent = document) {
        if (typeof selector !== 'string' || selector.trim().length === 0) {
            console.warn('DOMUtils.querySelector: Invalid selector provided:', selector);
            return null;
        }
        
        try {
            return parent.querySelector(selector);
        } catch (error) {
            console.warn('DOMUtils.querySelector: Invalid selector syntax:', selector, error);
            return null;
        }
    }
    
    /**
     * Safely gets all elements by selector
     * @param {string} selector - CSS selector
     * @param {HTMLElement} parent - Parent element to search within (optional)
     * @returns {NodeList} NodeList of matching elements (empty if none found)
     */
    static querySelectorAll(selector, parent = document) {
        if (typeof selector !== 'string' || selector.trim().length === 0) {
            console.warn('DOMUtils.querySelectorAll: Invalid selector provided:', selector);
            return document.querySelectorAll('nonexistent'); // Returns empty NodeList
        }
        
        try {
            return parent.querySelectorAll(selector);
        } catch (error) {
            console.warn('DOMUtils.querySelectorAll: Invalid selector syntax:', selector, error);
            return document.querySelectorAll('nonexistent'); // Returns empty NodeList
        }
    }
    
    /**
     * Creates element with optional classes and attributes
     * @param {string} tagName - HTML tag name
     * @param {Array|string} classes - CSS classes to add (optional)
     * @param {Object} attributes - Attributes to set (optional)
     * @param {string} textContent - Text content (optional)
     * @returns {HTMLElement} Created element
     */
    static createElement(tagName, classes = [], attributes = {}, textContent = '') {
        if (typeof tagName !== 'string' || tagName.trim().length === 0) {
            console.warn('DOMUtils.createElement: Invalid tagName provided:', tagName);
            return document.createElement('div'); // Safe fallback
        }
        
        const element = document.createElement(tagName);
        
        // Add classes
        if (typeof classes === 'string') {
            classes = [classes];
        }
        if (Array.isArray(classes)) {
            classes.forEach(className => {
                if (typeof className === 'string' && className.trim().length > 0) {
                    element.classList.add(className.trim());
                }
            });
        }
        
        // Set attributes
        if (attributes && typeof attributes === 'object') {
            Object.entries(attributes).forEach(([key, value]) => {
                if (typeof key === 'string' && key.trim().length > 0) {
                    element.setAttribute(key, String(value));
                }
            });
        }
        
        // Set text content
        if (typeof textContent === 'string' && textContent.length > 0) {
            element.textContent = textContent;
        }
        
        return element;
    }
    
    /**
     * Safely sets element position
     * @param {HTMLElement} element - Element to position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {string} position - CSS position value (default: 'absolute')
     * @returns {boolean} Success status
     */
    static setPosition(element, x, y, position = 'absolute') {
        if (!element || !(element instanceof HTMLElement)) {
            console.warn('DOMUtils.setPosition: Invalid element provided');
            return false;
        }
        
        if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) {
            console.warn('DOMUtils.setPosition: Invalid coordinates provided:', x, y);
            return false;
        }
        
        try {
            element.style.position = position;
            element.style.left = `${x}px`;
            element.style.top = `${y}px`;
            return true;
        } catch (error) {
            console.warn('DOMUtils.setPosition: Error setting position:', error);
            return false;
        }
    }
    
    /**
     * Safely shows/hides element
     * @param {HTMLElement} element - Element to show/hide
     * @param {boolean} show - True to show, false to hide
     * @param {string} displayType - Display type when showing (default: 'block')
     * @returns {boolean} Success status
     */
    static setVisible(element, show, displayType = 'block') {
        if (!element || !(element instanceof HTMLElement)) {
            console.warn('DOMUtils.setVisible: Invalid element provided');
            return false;
        }
        
        try {
            element.style.display = show ? displayType : 'none';
            return true;
        } catch (error) {
            console.warn('DOMUtils.setVisible: Error setting visibility:', error);
            return false;
        }
    }
    
    /**
     * Safely adds CSS classes to element
     * @param {HTMLElement} element - Target element
     * @param {Array|string} classes - Classes to add
     * @returns {boolean} Success status
     */
    static addClass(element, classes) {
        if (!element || !(element instanceof HTMLElement)) {
            console.warn('DOMUtils.addClass: Invalid element provided');
            return false;
        }
        
        if (typeof classes === 'string') {
            classes = [classes];
        }
        
        if (!Array.isArray(classes)) {
            console.warn('DOMUtils.addClass: Invalid classes provided:', classes);
            return false;
        }
        
        try {
            classes.forEach(className => {
                if (typeof className === 'string' && className.trim().length > 0) {
                    element.classList.add(className.trim());
                }
            });
            return true;
        } catch (error) {
            console.warn('DOMUtils.addClass: Error adding classes:', error);
            return false;
        }
    }
    
    /**
     * Safely removes CSS classes from element
     * @param {HTMLElement} element - Target element
     * @param {Array|string} classes - Classes to remove
     * @returns {boolean} Success status
     */
    static removeClass(element, classes) {
        if (!element || !(element instanceof HTMLElement)) {
            console.warn('DOMUtils.removeClass: Invalid element provided');
            return false;
        }
        
        if (typeof classes === 'string') {
            classes = [classes];
        }
        
        if (!Array.isArray(classes)) {
            console.warn('DOMUtils.removeClass: Invalid classes provided:', classes);
            return false;
        }
        
        try {
            classes.forEach(className => {
                if (typeof className === 'string' && className.trim().length > 0) {
                    element.classList.remove(className.trim());
                }
            });
            return true;
        } catch (error) {
            console.warn('DOMUtils.removeClass: Error removing classes:', error);
            return false;
        }
    }
    
    /**
     * Safely sets dataset properties
     * @param {HTMLElement} element - Target element
     * @param {string} key - Dataset key
     * @param {string} value - Dataset value
     * @returns {boolean} Success status
     */
    static setDataset(element, key, value) {
        if (!element || !(element instanceof HTMLElement)) {
            console.warn('DOMUtils.setDataset: Invalid element provided');
            return false;
        }
        
        if (typeof key !== 'string' || key.trim().length === 0) {
            console.warn('DOMUtils.setDataset: Invalid key provided:', key);
            return false;
        }
        
        try {
            element.dataset[key] = String(value);
            return true;
        } catch (error) {
            console.warn('DOMUtils.setDataset: Error setting dataset:', error);
            return false;
        }
    }
    
    /**
     * Safely gets dataset property
     * @param {HTMLElement} element - Target element
     * @param {string} key - Dataset key
     * @returns {string|null} Dataset value or null if not found
     */
    static getDataset(element, key) {
        if (!element || !(element instanceof HTMLElement)) {
            console.warn('DOMUtils.getDataset: Invalid element provided');
            return null;
        }
        
        if (typeof key !== 'string' || key.trim().length === 0) {
            console.warn('DOMUtils.getDataset: Invalid key provided:', key);
            return null;
        }
        
        try {
            return element.dataset[key] || null;
        } catch (error) {
            console.warn('DOMUtils.getDataset: Error getting dataset:', error);
            return null;
        }
    }
    
    /**
     * Safely removes element from DOM
     * @param {HTMLElement} element - Element to remove
     * @returns {boolean} Success status
     */
    static removeElement(element) {
        if (!element || !(element instanceof HTMLElement)) {
            console.warn('DOMUtils.removeElement: Invalid element provided');
            return false;
        }
        
        try {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            return true;
        } catch (error) {
            console.warn('DOMUtils.removeElement: Error removing element:', error);
            return false;
        }
    }
    
    /**
     * Safely appends child element
     * @param {HTMLElement} parent - Parent element
     * @param {HTMLElement} child - Child element to append
     * @returns {boolean} Success status
     */
    static appendChild(parent, child) {
        if (!parent || !(parent instanceof HTMLElement)) {
            console.warn('DOMUtils.appendChild: Invalid parent element provided');
            return false;
        }
        
        if (!child || !(child instanceof HTMLElement)) {
            console.warn('DOMUtils.appendChild: Invalid child element provided');
            return false;
        }
        
        try {
            parent.appendChild(child);
            return true;
        } catch (error) {
            console.warn('DOMUtils.appendChild: Error appending child:', error);
            return false;
        }
    }
    
    /**
     * Gets element dimensions safely
     * @param {HTMLElement} element - Element to measure
     * @returns {Object|null} Dimensions object {width, height} or null if invalid
     */
    static getDimensions(element) {
        if (!element || !(element instanceof HTMLElement)) {
            console.warn('DOMUtils.getDimensions: Invalid element provided');
            return null;
        }
        
        try {
            const rect = element.getBoundingClientRect();
            return {
                width: rect.width,
                height: rect.height,
                offsetWidth: element.offsetWidth,
                offsetHeight: element.offsetHeight
            };
        } catch (error) {
            console.warn('DOMUtils.getDimensions: Error getting dimensions:', error);
            return null;
        }
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DOMUtils;
}

// Make available globally for direct use
if (typeof window !== 'undefined') {
    window.DOMUtils = DOMUtils;
}