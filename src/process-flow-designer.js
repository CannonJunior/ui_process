/**
 * Process Flow Designer - Main application coordinator
 * Integrates all modules and manages application lifecycle
 */

// Core Infrastructure
import { EventBus } from './core/event-bus.js';
import { StateManager } from './core/state-manager.js';
import { AppContext } from './core/app-context.js';

// Services
import { DOMService } from './services/dom-service.js';
import { PositioningService } from './services/positioning-service.js';
import { ValidationService } from './services/validation-service.js';

// Components
import { CanvasManager } from './components/canvas-manager.js';
import { NodeManager } from './components/node-manager.js';
import { TaskManager } from './components/task-manager.js';
import { FlowlineManager } from './components/flowline-manager.js';

// UI Components
import { ModalManager } from './ui/modal-manager.js';
import { ContextMenuManager } from './ui/context-menu-manager.js';
import { DragDropHandler } from './ui/drag-drop-handler.js';

// Features
import { TagSystem } from './features/tag-system.js';
import { MatrixVisualization } from './features/matrix-visualization.js';
import { WorkflowPersistence } from './features/workflow-persistence.js';

/**
 * Main Process Flow Designer Application
 */
export class ProcessFlowDesigner {
    constructor() {
        this.isInitialized = false;
        this.initializeCore();
    }

    /**
     * Initialize core infrastructure
     * @private
     */
    initializeCore() {
        // Create core infrastructure
        this.eventBus = new EventBus();
        this.stateManager = new StateManager(this.eventBus);
        this.context = new AppContext();
        this.context.initialize(this.eventBus, this.stateManager);
        
        // Initialize services
        this.initializeServices();
        
        // Initialize components
        this.initializeComponents();
        
        // Initialize UI components
        this.initializeUIComponents();
        
        // Initialize features
        this.initializeFeatures();
        
        // Setup global event handlers
        this.setupGlobalEventHandlers();
        
        this.isInitialized = true;
        this.eventBus.emit('app.initialized');
    }

    /**
     * Initialize services
     * @private
     */
    initializeServices() {
        const domService = new DOMService(this.context);
        const positioningService = new PositioningService(this.context);
        const validationService = new ValidationService(this.context);
        
        this.context.registerService('dom', domService);
        this.context.registerService('positioning', positioningService);
        this.context.registerService('validation', validationService);
    }

    /**
     * Initialize component managers
     * @private
     */
    initializeComponents() {
        const canvasManager = new CanvasManager(this.context);
        const nodeManager = new NodeManager(this.context);
        const taskManager = new TaskManager(this.context);
        const flowlineManager = new FlowlineManager(this.context);
        
        this.context.registerComponent('canvas', canvasManager);
        this.context.registerComponent('node', nodeManager);
        this.context.registerComponent('task', taskManager);
        this.context.registerComponent('flowline', flowlineManager);
    }

    /**
     * Initialize UI components
     * @private
     */
    initializeUIComponents() {
        const modalManager = new ModalManager(this.context);
        const contextMenuManager = new ContextMenuManager(this.context);
        const dragDropHandler = new DragDropHandler(this.context);
        
        this.context.registerComponent('modal', modalManager);
        this.context.registerComponent('contextMenu', contextMenuManager);
        this.context.registerComponent('dragDrop', dragDropHandler);
    }

    /**
     * Initialize feature modules
     * @private
     */
    initializeFeatures() {
        const tagSystem = new TagSystem(this.context);
        const matrixVisualization = new MatrixVisualization(this.context);
        const workflowPersistence = new WorkflowPersistence(this.context);
        
        this.context.registerComponent('tag', tagSystem);
        this.context.registerComponent('matrix', matrixVisualization);
        this.context.registerComponent('persistence', workflowPersistence);
    }

    /**
     * Setup global event handlers
     * @private
     */
    setupGlobalEventHandlers() {
        // Initialize canvas event handlers
        this.setupCanvasEventHandlers();
        
        // Initialize button event handlers
        this.setupButtonEventHandlers();
        
        // Initialize dropdown event handlers
        this.setupDropdownEventHandlers();
        
        // Initialize keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Initialize drag and drop zones
        this.setupDragDropZones();
    }

    /**
     * Setup canvas event handlers
     * @private
     */
    setupCanvasEventHandlers() {
        const canvas = this.context.getElement('canvas');
        const domService = this.context.getService('dom');
        
        // Canvas click for creating nodes
        domService.addEventListener(canvas, 'click', (e) => {
            // Only create node if clicking directly on canvas
            if (e.target === canvas) {
                this.handleCanvasClick(e);
            }
        });
        
        // Canvas right-click for panning
        domService.addEventListener(canvas, 'contextmenu', (e) => {
            if (e.target === canvas) {
                e.preventDefault();
                const canvasManager = this.context.getComponent('canvas');
                canvasManager.startCanvasPan(e);
            }
        });
        
        // Node clicks
        domService.addEventListener(canvas, 'click', (e) => {
            const node = e.target.closest('.node, .task-banner');
            if (node) {
                this.handleNodeClick(e, node);
            }
        });
        
        // Node right-clicks for context menu
        domService.addEventListener(canvas, 'contextmenu', (e) => {
            const node = e.target.closest('.node, .task-banner');
            if (node) {
                e.preventDefault();
                this.handleNodeRightClick(e, node);
            }
        });
    }

    /**
     * Setup button event handlers
     * @private
     */
    setupButtonEventHandlers() {
        const domService = this.context.getService('dom');
        
        // Add New Task button
        const addNewTaskBtn = this.context.getElement('addTaskButton');
        if (addNewTaskBtn) {
            domService.addEventListener(addNewTaskBtn, 'click', () => {
                this.eventBus.emit('modal.task.show');
            });
        }
        
        // Save Workflow button
        const saveWorkflowBtn = this.context.getElement('saveWorkflowButton');
        if (saveWorkflowBtn) {
            domService.addEventListener(saveWorkflowBtn, 'click', () => {
                this.eventBus.emit('workflow.export');
            });
        }
        
        // Load Workflow button and file input
        const loadWorkflowBtn = this.context.getElement('loadWorkflowButton');
        const loadWorkflowInput = this.context.getElement('loadWorkflowInput');
        
        if (loadWorkflowBtn && loadWorkflowInput) {
            domService.addEventListener(loadWorkflowBtn, 'click', () => {
                loadWorkflowInput.click();
            });
            
            domService.addEventListener(loadWorkflowInput, 'change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.eventBus.emit('workflow.import', file);
                    e.target.value = ''; // Reset input
                }
            });
        }
        
        // Eisenhower Matrix toggle
        const eisenhowerToggle = this.context.getElement('eisenhowerToggle');
        if (eisenhowerToggle) {
            domService.addEventListener(eisenhowerToggle, 'change', (e) => {
                this.eventBus.emit('matrix.toggle', e.target.checked);
            });
        }
    }

    /**
     * Setup dropdown event handlers
     * @private
     */
    setupDropdownEventHandlers() {
        const domService = this.context.getService('dom');
        
        // Node type dropdown
        const nodeTypeDropdown = this.context.getElement('nodeTypeDropdown');
        domService.addEventListener(nodeTypeDropdown, 'change', (e) => {
            this.stateManager.set('selectedNodeType', e.target.value);
        });
        
        // Flowline type dropdown
        const flowlineTypeDropdown = this.context.getElement('flowlineTypeDropdown');
        domService.addEventListener(flowlineTypeDropdown, 'change', (e) => {
            this.stateManager.set('selectedFlowlineType', e.target.value);
        });
    }

    /**
     * Setup keyboard shortcuts
     * @private
     */
    setupKeyboardShortcuts() {
        const domService = this.context.getService('dom');
        
        domService.addEventListener(document, 'keydown', (e) => {
            // Don't process shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            // Escape key - cancel operations or close modals
            if (e.key === 'Escape') {
                this.handleEscapeKey();
            }
            
            // Delete key - delete selected node
            if (e.key === 'Delete') {
                this.handleDeleteKey();
            }
            
            // Ctrl+S - save workflow
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.eventBus.emit('workflow.export');
            }
            
            // Ctrl+O - open workflow
            if (e.ctrlKey && e.key === 'o') {
                e.preventDefault();
                const loadWorkflowBtn = this.context.getElement('loadWorkflowBtn');
                loadWorkflowBtn.click();
            }
            
            // Ctrl+N - new task
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                this.eventBus.emit('modal.task.show');
            }
        });
    }

    /**
     * Setup drag and drop zones
     * @private
     */
    setupDragDropZones() {
        const dragDropHandler = this.context.getComponent('dragDrop');
        
        // Setup next action slots as drop zones
        const nextActionSlots = document.querySelectorAll('.next-action-slot');
        nextActionSlots.forEach(slot => {
            dragDropHandler.createDropZone(slot, {
                constraints: { acceptedTypes: ['tag'] },
                onDrop: (e, element) => {
                    this.eventBus.emit('tag.drop', { slot: element, event: e });
                }
            });
        });
    }

    /**
     * Handle canvas click
     * @private
     */
    handleCanvasClick(e) {
        const selectedNodeType = this.stateManager.get('selectedNodeType') || 'basic';
        const canvasManager = this.context.getComponent('canvas');
        const canvasRect = canvasManager.getBounds();
        const panOffset = canvasManager.getPanOffset();
        
        const x = e.clientX - canvasRect.left + panOffset.x;
        const y = e.clientY - canvasRect.top + panOffset.y;
        
        if (selectedNodeType === 'task') {
            this.eventBus.emit('modal.task.show');
        } else {
            const nodeManager = this.context.getComponent('node');
            nodeManager.createNode(x, y, 'New Node', selectedNodeType);
        }
    }

    /**
     * Handle node click
     * @private
     */
    handleNodeClick(e, node) {
        // Handle flowline creation mode
        const flowlineCreationMode = this.stateManager.get('flowlineCreationMode');
        if (flowlineCreationMode) {
            const flowlineManager = this.context.getComponent('flowline');
            flowlineManager.handleNodeClickForFlowline(node);
            return;
        }
        
        // Regular node selection
        this.stateManager.set('selectedNode', node);
        this.eventBus.emit('node.selected', node);
    }

    /**
     * Handle node right-click
     * @private
     */
    handleNodeRightClick(e, node) {
        this.stateManager.set('selectedNode', node);
        
        const isTask = node.dataset.type === 'task';
        this.eventBus.emit('contextmenu.show', {
            type: isTask ? 'task' : 'node',
            x: e.clientX,
            y: e.clientY,
            node: node
        });
    }

    /**
     * Handle escape key
     * @private
     */
    handleEscapeKey() {
        // Close modals
        const modalManager = this.context.getComponent('modal');
        if (modalManager.isModalOpen()) {
            modalManager.closeAllModals();
            return;
        }
        
        // Hide context menus
        const contextMenuManager = this.context.getComponent('contextMenu');
        if (contextMenuManager.isMenuVisible()) {
            contextMenuManager.hideAllContextMenus();
            return;
        }
        
        // Exit flowline creation mode
        const flowlineCreationMode = this.stateManager.get('flowlineCreationMode');
        if (flowlineCreationMode) {
            const flowlineManager = this.context.getComponent('flowline');
            flowlineManager.exitFlowlineCreationMode();
            return;
        }
        
        // Clear selection
        this.stateManager.set('selectedNode', null);
    }

    /**
     * Handle delete key
     * @private
     */
    handleDeleteKey() {
        const selectedNode = this.stateManager.get('selectedNode');
        if (!selectedNode) return;
        
        const nodeId = selectedNode.dataset.id;
        const isTask = selectedNode.dataset.type === 'task';
        
        if (isTask) {
            this.eventBus.emit('task.delete', nodeId);
        } else {
            this.eventBus.emit('node.delete', nodeId);
        }
    }

    /**
     * Get application context
     * @returns {AppContext} Application context
     */
    getContext() {
        return this.context;
    }

    /**
     * Get event bus
     * @returns {EventBus} Event bus
     */
    getEventBus() {
        return this.eventBus;
    }

    /**
     * Get state manager
     * @returns {StateManager} State manager
     */
    getStateManager() {
        return this.stateManager;
    }

    /**
     * Check if application is initialized
     * @returns {boolean} Initialization status
     */
    isReady() {
        return this.isInitialized;
    }

    /**
     * Destroy application and cleanup
     */
    destroy() {
        if (!this.isInitialized) return;
        
        this.eventBus.emit('app.destroying');
        
        // Clear all state
        this.stateManager.clear();
        
        // Remove all event listeners
        this.eventBus.removeAllListeners();
        
        // Clear context
        this.context.clear();
        
        this.isInitialized = false;
        this.eventBus.emit('app.destroyed');
    }

    /**
     * Reset application to initial state
     */
    reset() {
        this.eventBus.emit('app.resetting');
        
        // Clear workflow
        const workflowPersistence = this.context.getComponent('persistence');
        workflowPersistence.clearCurrentWorkflow();
        
        // Reset matrix
        const matrixVisualization = this.context.getComponent('matrix');
        if (matrixVisualization.isMatrixVisible()) {
            matrixVisualization.hideMatrix();
        }
        
        // Reset canvas
        const canvasManager = this.context.getComponent('canvas');
        canvasManager.resetCanvas();
        
        // Clear selection
        this.stateManager.update({
            selectedNode: null,
            selectedNodeType: 'basic',
            selectedFlowlineType: 'straight'
        });
        
        this.eventBus.emit('app.reset');
    }

    /**
     * Get application statistics
     * @returns {Object} Application statistics
     */
    getStatistics() {
        const workflowPersistence = this.context.getComponent('persistence');
        return workflowPersistence.getWorkflowStatistics();
    }

    /**
     * Create application backup
     * @returns {Object} Backup data
     */
    createBackup() {
        const workflowPersistence = this.context.getComponent('persistence');
        return workflowPersistence.createBackup();
    }

    /**
     * Restore from backup
     * @returns {boolean} Success status
     */
    restoreFromBackup() {
        const workflowPersistence = this.context.getComponent('persistence');
        return workflowPersistence.restoreFromBackup();
    }
}