/**
 * DOM Service - Centralized DOM manipulation utilities
 * Handles element creation, styling, and common DOM operations
 */
export class DOMService {
    constructor(context) {
        this.context = context;
        this.eventBus = context.eventBus;
    }

    /**
     * Create element with attributes and styles
     * @param {string} tagName - Element tag name
     * @param {Object} options - Element configuration
     * @returns {HTMLElement}
     */
    createElement(tagName, options = {}) {
        const element = document.createElement(tagName);
        
        if (options.className) {
            element.className = options.className;
        }
        
        if (options.id) {
            element.id = options.id;
        }
        
        if (options.textContent) {
            element.textContent = options.textContent;
        }
        
        if (options.innerHTML) {
            element.innerHTML = options.innerHTML;
        }
        
        if (options.attributes) {
            Object.entries(options.attributes).forEach(([key, value]) => {
                element.setAttribute(key, value);
            });
        }
        
        if (options.dataset) {
            Object.entries(options.dataset).forEach(([key, value]) => {
                element.dataset[key] = value;
            });
        }
        
        if (options.styles) {
            Object.entries(options.styles).forEach(([property, value]) => {
                element.style[property] = value;
            });
        }
        
        if (options.parent) {
            options.parent.appendChild(element);
        }
        
        return element;
    }

    /**
     * Set element position
     * @param {HTMLElement} element - Target element
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    setPosition(element, x, y) {
        element.style.position = 'absolute';
        element.style.left = x + 'px';
        element.style.top = y + 'px';
    }

    /**
     * Get element position relative to canvas
     * @param {HTMLElement} element - Target element
     * @returns {Object} Position object {x, y}
     */
    getCanvasPosition(element) {
        const canvas = this.context.getElement('canvas');
        const elementRect = element.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        
        return {
            x: elementRect.left - canvasRect.left,
            y: elementRect.top - canvasRect.top
        };
    }

    /**
     * Show element
     * @param {HTMLElement} element - Target element
     */
    show(element) {
        element.style.display = '';
    }

    /**
     * Hide element
     * @param {HTMLElement} element - Target element
     */
    hide(element) {
        element.style.display = 'none';
    }

    /**
     * Remove element from DOM
     * @param {HTMLElement} element - Target element
     */
    remove(element) {
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
    }

    /**
     * Add event listener with automatic cleanup tracking
     * @param {HTMLElement} element - Target element
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     * @param {Object} options - Event options
     */
    addEventListener(element, event, handler, options = {}) {
        if (!element) {
            console.warn('Attempting to add event listener to undefined element');
            return;
        }
        
        element.addEventListener(event, handler, options);
        
        // Track for cleanup if needed
        if (!element._eventListeners) {
            element._eventListeners = [];
        }
        element._eventListeners.push({ event, handler, options });
    }

    /**
     * Remove all event listeners from element
     * @param {HTMLElement} element - Target element
     */
    removeAllEventListeners(element) {
        if (element._eventListeners) {
            element._eventListeners.forEach(({ event, handler, options }) => {
                element.removeEventListener(event, handler, options);
            });
            element._eventListeners = [];
        }
    }

    /**
     * Create SVG element with attributes
     * @param {string} tagName - SVG element tag name
     * @param {Object} attributes - SVG attributes
     * @returns {SVGElement}
     */
    createSVGElement(tagName, attributes = {}) {
        const element = document.createElementNS('http://www.w3.org/2000/svg', tagName);
        
        Object.entries(attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
        
        return element;
    }

    /**
     * Get computed style property
     * @param {HTMLElement} element - Target element
     * @param {string} property - CSS property name
     * @returns {string} Computed style value
     */
    getComputedStyle(element, property) {
        return window.getComputedStyle(element)[property];
    }

    /**
     * Check if element is visible
     * @param {HTMLElement} element - Target element
     * @returns {boolean}
     */
    isVisible(element) {
        return element.offsetParent !== null;
    }

    /**
     * Get element bounds
     * @param {HTMLElement} element - Target element
     * @returns {DOMRect}
     */
    getBounds(element) {
        return element.getBoundingClientRect();
    }

    /**
     * Find elements by selector within context
     * @param {string} selector - CSS selector
     * @param {HTMLElement} context - Context element (default: document)
     * @returns {NodeList}
     */
    findElements(selector, context = document) {
        return context.querySelectorAll(selector);
    }

    /**
     * Find single element by selector
     * @param {string} selector - CSS selector
     * @param {HTMLElement} context - Context element (default: document)
     * @returns {HTMLElement}
     */
    findElement(selector, context = document) {
        return context.querySelector(selector);
    }
}