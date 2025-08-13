/**
 * Canvas Manager - Handles canvas operations, panning, and transformations
 * Manages the main drawing canvas and viewport operations
 */
export class CanvasManager {
    constructor(context) {
        this.context = context;
        this.eventBus = context.eventBus;
        this.stateManager = context.stateManager;
        this.domService = context.getService('dom');
        
        this.canvas = context.getElement('canvas');
        this.setupEventListeners();
    }

    /**
     * Initialize canvas and create SVG definitions
     */
    initialize() {
        this.createSVGDefs();
        this.eventBus.emit('canvas.initialized');
    }

    /**
     * Setup canvas event listeners
     * @private
     */
    setupEventListeners() {
        // Canvas click to hide context menus
        this.domService.addEventListener(this.canvas, 'click', (e) => {
            if (e.target === this.canvas) {
                this.eventBus.emit('contextmenu.hide');
            }
        });

        // Canvas panning with right-click drag
        this.domService.addEventListener(this.canvas, 'mousedown', (e) => {
            if (e.button === 2 && e.target === this.canvas) {
                this.startCanvasPan(e);
            }
        });

        this.domService.addEventListener(this.canvas, 'mousemove', (e) => {
            if (this.stateManager.get('isPanning')) {
                this.updateCanvasPan(e);
            }
        });

        this.domService.addEventListener(this.canvas, 'mouseup', (e) => {
            if (e.button === 2 && this.stateManager.get('isPanning')) {
                this.endCanvasPan(e);
            }
        });

        // Handle panning when mouse leaves canvas
        this.domService.addEventListener(this.canvas, 'mouseleave', (e) => {
            if (this.stateManager.get('isPanning')) {
                this.endCanvasPan(e);
            }
        });

        // Prevent context menu on canvas
        this.domService.addEventListener(this.canvas, 'contextmenu', (e) => {
            if (!e.target.classList.contains('tag')) {
                e.preventDefault();
            }
        });

        // Handle drag operations
        this.domService.addEventListener(this.canvas, 'dragover', (e) => {
            this.handleDragOver(e);
        });

        this.domService.addEventListener(this.canvas, 'drop', (e) => {
            this.handleDrop(e);
        });
    }

    /**
     * Create SVG definitions for flowline arrows
     * @private
     */
    createSVGDefs() {
        const svg = this.domService.createSVGElement('svg', {
            style: 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 5;'
        });

        const defs = this.domService.createSVGElement('defs');
        const marker = this.domService.createSVGElement('marker', {
            id: 'arrowhead',
            markerWidth: '10',
            markerHeight: '7',
            refX: '9',
            refY: '3.5',
            orient: 'auto'
        });

        const polygon = this.domService.createSVGElement('polygon', {
            points: '0 0, 10 3.5, 0 7',
            fill: '#333'
        });

        marker.appendChild(polygon);
        defs.appendChild(marker);
        svg.appendChild(defs);
        this.canvas.appendChild(svg);

        this.svg = svg;
        this.eventBus.emit('canvas.svg.created', svg);
    }

    /**
     * Start canvas panning
     * @param {MouseEvent} e - Mouse event
     */
    startCanvasPan(e) {
        this.stateManager.update({
            isPanning: true,
            panStart: { x: e.clientX, y: e.clientY }
        });

        this.canvas.style.cursor = 'grabbing';
        e.preventDefault();

        this.eventBus.emit('canvas.pan.started', { x: e.clientX, y: e.clientY });
    }

    /**
     * Update canvas panning
     * @param {MouseEvent} e - Mouse event
     */
    updateCanvasPan(e) {
        if (!this.stateManager.get('isPanning')) return;

        const panStart = this.stateManager.get('panStart');
        const panOffset = this.stateManager.get('panOffset');
        
        const deltaX = e.clientX - panStart.x;
        const deltaY = e.clientY - panStart.y;
        
        const currentPanOffset = {
            x: panOffset.x + deltaX,
            y: panOffset.y + deltaY
        };

        this.stateManager.set('currentPanOffset', currentPanOffset);
        this.canvas.style.transform = `translate(${currentPanOffset.x}px, ${currentPanOffset.y}px)`;
        
        e.preventDefault();
        this.eventBus.emit('canvas.pan.updated', currentPanOffset);
    }

    /**
     * End canvas panning
     * @param {MouseEvent} e - Mouse event
     */
    endCanvasPan(e) {
        if (!this.stateManager.get('isPanning')) return;

        const currentPanOffset = this.stateManager.get('currentPanOffset');
        
        this.stateManager.update({
            isPanning: false,
            panOffset: { ...currentPanOffset }
        });

        this.canvas.style.cursor = '';
        e.preventDefault();

        this.eventBus.emit('canvas.pan.ended', currentPanOffset);
    }

    /**
     * Handle drag over canvas
     * @param {DragEvent} e - Drag event
     */
    handleDragOver(e) {
        const draggedTag = this.stateManager.get('draggedTag');
        
        if (!e.target.classList.contains('next-action-slot')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'none';
        } else if (draggedTag && e.target.dataset.taskId !== draggedTag.taskId) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'none';
        } else {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        }
    }

    /**
     * Handle drop on canvas
     * @param {DragEvent} e - Drop event
     */
    handleDrop(e) {
        const draggedTag = this.stateManager.get('draggedTag');
        
        if (!e.target.classList.contains('next-action-slot') || 
            (draggedTag && e.target.dataset.taskId !== draggedTag.taskId)) {
            e.preventDefault();
        }
    }

    /**
     * Set canvas transform
     * @param {number} x - X offset
     * @param {number} y - Y offset
     */
    setTransform(x, y) {
        this.canvas.style.transform = `translate(${x}px, ${y}px)`;
        this.stateManager.update({
            panOffset: { x, y },
            currentPanOffset: { x, y }
        });
        
        this.eventBus.emit('canvas.transform.set', { x, y });
    }

    /**
     * Reset canvas transform
     */
    resetTransform() {
        this.setTransform(0, 0);
        this.eventBus.emit('canvas.transform.reset');
    }

    /**
     * Get canvas bounds
     * @returns {DOMRect} Canvas bounding rectangle
     */
    getBounds() {
        return this.canvas.getBoundingClientRect();
    }

    /**
     * Get canvas center point
     * @returns {Object} Center coordinates {x, y}
     */
    getCenter() {
        const bounds = this.getBounds();
        return {
            x: bounds.width / 2,
            y: bounds.height / 2
        };
    }

    /**
     * Add matrix mode styling
     */
    enterMatrixMode() {
        this.canvas.classList.add('matrix-mode');
        this.eventBus.emit('canvas.matrix.entered');
    }

    /**
     * Remove matrix mode styling
     */
    exitMatrixMode() {
        this.canvas.classList.remove('matrix-mode');
        this.eventBus.emit('canvas.matrix.exited');
    }

    /**
     * Clear all elements from canvas
     */
    clear() {
        // Remove all child elements except SVG
        Array.from(this.canvas.children).forEach(child => {
            if (child !== this.svg) {
                this.canvas.removeChild(child);
            }
        });
        
        this.eventBus.emit('canvas.cleared');
    }

    /**
     * Get SVG element for flowlines
     * @returns {SVGElement} SVG element
     */
    getSVG() {
        return this.svg;
    }

    /**
     * Add element to canvas
     * @param {HTMLElement} element - Element to add
     */
    addElement(element) {
        this.canvas.appendChild(element);
        this.eventBus.emit('canvas.element.added', element);
    }

    /**
     * Remove element from canvas
     * @param {HTMLElement} element - Element to remove
     */
    removeElement(element) {
        if (element.parentNode === this.canvas) {
            this.canvas.removeChild(element);
            this.eventBus.emit('canvas.element.removed', element);
        }
    }

    /**
     * Get all elements of a specific type on canvas
     * @param {string} className - CSS class name
     * @returns {NodeList} Found elements
     */
    getElementsByClass(className) {
        return this.canvas.querySelectorAll(`.${className}`);
    }

    /**
     * Get current pan offset
     * @returns {Object} Pan offset {x, y}
     */
    getPanOffset() {
        return this.stateManager.get('panOffset') || { x: 0, y: 0 };
    }
}