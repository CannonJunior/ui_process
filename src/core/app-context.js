/**
 * Application Context - Shared context and dependency container
 * Provides centralized access to core services and DOM elements
 */
export class AppContext {
    constructor() {
        this.eventBus = null;
        this.stateManager = null;
        this.services = new Map();
        this.components = new Map();
        this.domElements = new Map();
        this.isInitialized = false;
    }

    /**
     * Initialize the application context
     * @param {EventBus} eventBus - Event bus instance
     * @param {StateManager} stateManager - State manager instance
     */
    initialize(eventBus, stateManager) {
        this.eventBus = eventBus;
        this.stateManager = stateManager;
        this.cacheDOMElements();
        this.initializeState();
        this.isInitialized = true;
        
        this.eventBus.emit('context.initialized', this);
    }

    /**
     * Register a service
     * @param {string} name - Service name
     * @param {*} service - Service instance
     */
    registerService(name, service) {
        this.services.set(name, service);
        this.eventBus.emit('service.registered', { name, service });
    }

    /**
     * Get a service by name
     * @param {string} name - Service name
     * @returns {*} Service instance
     */
    getService(name) {
        return this.services.get(name);
    }

    /**
     * Register a component
     * @param {string} name - Component name
     * @param {*} component - Component instance
     */
    registerComponent(name, component) {
        this.components.set(name, component);
        this.eventBus.emit('component.registered', { name, component });
    }

    /**
     * Get a component by name
     * @param {string} name - Component name
     * @returns {*} Component instance
     */
    getComponent(name) {
        return this.components.get(name);
    }

    /**
     * Get cached DOM element
     * @param {string} id - Element ID
     * @returns {HTMLElement} DOM element
     */
    getElement(id) {
        return this.domElements.get(id);
    }

    /**
     * Cache important DOM elements
     * @private
     */
    cacheDOMElements() {
        const elementIds = [
            'canvas',
            'contextMenu',
            'taskContextMenu',
            'tagContextMenu',
            'tagAttributeMenu',
            'tagDatePicker',
            'nodeTypeDropdown',
            'flowlineTypeDropdown',
            'addTaskButton',
            'taskModal',
            'taskNameInput',
            'taskModalCancel',
            'taskModalCreate',
            'advanceTaskModal',
            'advanceOptions',
            'advanceModalCancel',
            'saveWorkflowButton',
            'loadWorkflowButton',
            'loadWorkflowInput',
            'tagModal',
            'currentTags',
            'tagCategoryDropdown',
            'tagOptionDropdown',
            'tagDateInput',
            'tagDescriptionInput',
            'tagLinkInput',
            'tagCompletedInput',
            'tagModalCancel',
            'tagModalAdd',
            'tagModalSave',
            'eisenhowerToggle',
            'eisenhowerMatrix'
        ];

        elementIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                this.domElements.set(id, element);
            } else {
                console.warn(`Element with id '${id}' not found`);
            }
        });
    }

    /**
     * Initialize default application state
     * @private
     */
    initializeState() {
        this.stateManager.update({
            nodes: [],
            taskNodes: [],
            flowlines: [],
            nodeCounter: 0,
            selectedNode: null,
            startNode: null,
            dragData: { isDragging: false, offset: { x: 0, y: 0 } },
            flowlineCreationMode: false,
            sourceNodeForFlowline: null,
            selectedTaskForAdvance: null,
            selectedTaskForTags: null,
            draggedTag: null,
            successfulDrop: false,
            selectedTagForEdit: null,
            currentTagData: null,
            isMatrixMode: false,
            matrixTasks: [],
            originalPositions: new Map(),
            isPanning: false,
            panStart: { x: 0, y: 0 },
            panOffset: { x: 0, y: 0 },
            currentPanOffset: { x: 0, y: 0 }
        });
    }

    /**
     * Get application state
     */
    getState() {
        return this.stateManager.getState();
    }

    /**
     * Check if context is initialized
     */
    isReady() {
        return this.isInitialized;
    }

    /**
     * Destroy context and clean up
     */
    destroy() {
        this.eventBus.emit('context.destroying', this);
        this.services.clear();
        this.components.clear();
        this.domElements.clear();
        this.isInitialized = false;
    }
}