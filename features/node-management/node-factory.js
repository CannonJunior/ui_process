/**
 * Node Factory
 * Specialized factory for creating different types of nodes with proper configuration
 * 
 * SAFETY: Creates properly configured nodes with validation
 * Risk Level: LOW - Pure creation logic with no side effects
 */

class NodeFactory {
    constructor(configService = null) {
        this.configService = configService;
        this.nodeTemplates = this.initializeNodeTemplates();
        
        console.log('NodeFactory: Initialized with node templates');
    }
    
    /**
     * Initialize node templates with default configurations
     * @returns {Object} Node templates configuration
     */
    initializeNodeTemplates() {
        return {
            process: {
                className: 'node process',
                shape: 'rectangle',
                defaultText: 'Process',
                allowsConnections: true,
                allowsDragging: true,
                contextMenuActions: ['delete', 'edit', 'connect']
            },
            decision: {
                className: 'node decision',
                shape: 'diamond',
                defaultText: 'Decision',
                allowsConnections: true,
                allowsDragging: true,
                contextMenuActions: ['delete', 'edit', 'connect']
            },
            terminal: {
                className: 'node terminal',
                shape: 'rounded-rectangle',
                defaultText: 'Terminal',
                allowsConnections: true,
                allowsDragging: true,
                contextMenuActions: ['delete', 'edit']
            },
            task: {
                className: 'node task',
                shape: 'task-banner',
                defaultText: 'Task',
                allowsConnections: false,
                allowsDragging: false,
                contextMenuActions: ['delete', 'edit', 'tag', 'advance']
            }
        };
    }
    
    /**
     * Create a standard node element
     * @param {string} type - Node type (process, decision, terminal, task)
     * @param {Object} options - Creation options
     * @returns {HTMLElement} Created node element
     */
    createNode(type, options = {}) {
        const template = this.nodeTemplates[type];
        if (!template) {
            console.error(`NodeFactory: Unknown node type: ${type}`);
            return null;
        }
        
        const {
            id = null,
            text = null,
            position = null,
            className = null,
            data = {}
        } = options;
        
        // Create main node element
        const node = document.createElement('div');
        node.className = className || template.className;
        node.dataset.type = type;
        
        if (id) {
            node.dataset.id = id;
        }
        
        // Add any additional data attributes
        Object.entries(data).forEach(([key, value]) => {
            node.dataset[key] = value;
        });
        
        // Create and add text element
        const textElement = this.createNodeText(text || template.defaultText, type, id);
        node.appendChild(textElement);
        
        // Set position if provided
        if (position) {
            node.style.left = `${position.x}px`;
            node.style.top = `${position.y}px`;
        }
        
        // Add node-specific features
        this.enhanceNodeWithFeatures(node, template, options);
        
        return node;
    }
    
    /**
     * Create a start node (special terminal node)
     * @param {Object} options - Creation options
     * @returns {HTMLElement} Created start node element
     */
    createStartNode(options = {}) {
        const startOptions = {
            ...options,
            text: 'Start',
            position: options.position || { x: 50, y: 100 },
            data: { isStart: 'true', ...options.data }
        };
        
        const node = this.createNode('terminal', startOptions);
        if (node) {
            node.classList.add('start-node');
        }
        
        return node;
    }
    
    /**
     * Create a task node with special task-specific features
     * @param {Object} taskData - Task data
     * @param {Object} options - Creation options
     * @returns {HTMLElement} Created task node element
     */
    createTaskNode(taskData, options = {}) {
        const {
            id = null,
            anchoredTo = null,
            slot = 0,
            position = null
        } = options;
        
        // Create task banner element
        const taskBanner = document.createElement('div');
        taskBanner.className = 'task-banner';
        taskBanner.dataset.type = 'task';
        
        if (id) {
            taskBanner.dataset.id = id;
        }
        
        if (anchoredTo) {
            taskBanner.dataset.anchoredTo = anchoredTo;
            taskBanner.dataset.slot = slot.toString();
        }
        
        // Create task content structure
        const taskContent = this.createTaskContent(taskData);
        taskBanner.appendChild(taskContent);
        
        // Set position if provided
        if (position) {
            taskBanner.style.left = `${position.x}px`;
            taskBanner.style.top = `${position.y}px`;
        }
        
        return taskBanner;
    }
    
    /**
     * Create task container with task banner and supporting elements
     * @param {Object} taskData - Task data
     * @param {Object} options - Creation options
     * @returns {HTMLElement} Created task container element
     */
    createTaskContainer(taskData, options = {}) {
        const taskContainer = document.createElement('div');
        taskContainer.className = 'task-container';
        
        // Create task banner
        const taskBanner = this.createTaskNode(taskData, options);
        taskContainer.appendChild(taskBanner);
        
        // Create task tags area
        const tagsArea = this.createTaskTagsArea();
        taskContainer.appendChild(tagsArea);
        
        // Create next action slot if needed
        if (options.createNextActionSlot) {
            const nextActionSlot = this.createNextActionSlot(taskBanner.dataset.id);
            taskContainer.appendChild(nextActionSlot);
        }
        
        return taskContainer;
    }
    
    /**
     * Create node text element
     * @param {string} text - Text content
     * @param {string} type - Node type
     * @param {string} id - Node ID
     * @returns {HTMLElement} Text element
     */
    createNodeText(text, type, id) {
        const textElement = document.createElement('div');
        textElement.className = 'node-text';
        
        if (type === 'task') {
            textElement.className = 'task-text';
        }
        
        textElement.textContent = text;
        textElement.contentEditable = 'true';
        
        // Add blur event to handle text changes
        textElement.addEventListener('blur', () => {
            // Sanitize the text content
            const sanitizedText = textElement.textContent.trim();
            if (sanitizedText) {
                textElement.textContent = sanitizedText;
            } else {
                // Restore default text if empty
                textElement.textContent = text;
            }
        });
        
        return textElement;
    }
    
    /**
     * Create task content structure
     * @param {Object} taskData - Task data
     * @returns {HTMLElement} Task content element
     */
    createTaskContent(taskData) {
        const content = document.createElement('div');
        content.className = 'task-content';
        
        // Create task text
        const textElement = this.createNodeText(
            taskData.text || 'New Task',
            'task',
            taskData.id
        );
        content.appendChild(textElement);
        
        // Add task-specific data
        if (taskData.tags) {
            content.dataset.tags = JSON.stringify(taskData.tags);
        }
        
        if (taskData.priority) {
            content.dataset.priority = taskData.priority;
        }
        
        if (taskData.status) {
            content.dataset.status = taskData.status;
        }
        
        return content;
    }
    
    /**
     * Create task tags area
     * @returns {HTMLElement} Task tags area element
     */
    createTaskTagsArea() {
        const tagsArea = document.createElement('div');
        tagsArea.className = 'task-tags-area';
        
        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'task-tags';
        tagsArea.appendChild(tagsContainer);
        
        return tagsArea;
    }
    
    /**
     * Create next action slot for a task
     * @param {string} taskId - Task ID
     * @returns {HTMLElement} Next action slot element
     */
    createNextActionSlot(taskId) {
        const slot = document.createElement('div');
        slot.className = 'next-action-slot';
        slot.dataset.taskId = taskId;
        
        // Add drop zone styling and behavior
        slot.style.minHeight = '30px';
        slot.style.border = '2px dashed #ccc';
        slot.style.borderRadius = '4px';
        slot.style.padding = '5px';
        slot.style.marginTop = '5px';
        slot.style.backgroundColor = '#f9f9f9';
        
        // Add placeholder text
        const placeholder = document.createElement('div');
        placeholder.className = 'slot-placeholder';
        placeholder.textContent = 'Drop tags here for next actions';
        placeholder.style.color = '#999';
        placeholder.style.fontSize = '12px';
        placeholder.style.textAlign = 'center';
        slot.appendChild(placeholder);
        
        return slot;
    }
    
    /**
     * Enhance node with template-specific features
     * @param {HTMLElement} node - Node element
     * @param {Object} template - Node template
     * @param {Object} options - Creation options
     */
    enhanceNodeWithFeatures(node, template, options) {
        // Add draggable attribute based on template
        if (template.allowsDragging) {
            node.draggable = false; // We handle dragging manually
            node.style.cursor = 'move';
        }
        
        // Add connection points for nodes that allow connections
        if (template.allowsConnections) {
            this.addConnectionPoints(node);
        }
        
        // Add accessibility attributes
        node.setAttribute('role', 'button');
        node.setAttribute('tabindex', '0');
        node.setAttribute('aria-label', `${template.defaultText} node`);
        
        // Add keyboard navigation support
        node.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                node.click();
            }
        });
    }
    
    /**
     * Add connection points to a node
     * @param {HTMLElement} node - Node element
     */
    addConnectionPoints(node) {
        const positions = ['top', 'right', 'bottom', 'left'];
        
        positions.forEach(position => {
            const point = document.createElement('div');
            point.className = `connection-point connection-${position}`;
            point.style.position = 'absolute';
            point.style.width = '8px';
            point.style.height = '8px';
            point.style.backgroundColor = '#007bff';
            point.style.borderRadius = '50%';
            point.style.opacity = '0';
            point.style.transition = 'opacity 0.2s';
            
            // Position the connection point
            switch (position) {
                case 'top':
                    point.style.left = '50%';
                    point.style.top = '-4px';
                    point.style.transform = 'translateX(-50%)';
                    break;
                case 'right':
                    point.style.right = '-4px';
                    point.style.top = '50%';
                    point.style.transform = 'translateY(-50%)';
                    break;
                case 'bottom':
                    point.style.left = '50%';
                    point.style.bottom = '-4px';
                    point.style.transform = 'translateX(-50%)';
                    break;
                case 'left':
                    point.style.left = '-4px';
                    point.style.top = '50%';
                    point.style.transform = 'translateY(-50%)';
                    break;
            }
            
            node.appendChild(point);
        });
        
        // Show connection points on hover
        node.addEventListener('mouseenter', () => {
            const points = node.querySelectorAll('.connection-point');
            points.forEach(point => point.style.opacity = '1');
        });
        
        node.addEventListener('mouseleave', () => {
            const points = node.querySelectorAll('.connection-point');
            points.forEach(point => point.style.opacity = '0');
        });
    }
    
    /**
     * Create a node from serialized data with full restoration
     * @param {Object} nodeData - Serialized node data
     * @returns {HTMLElement} Restored node element
     */
    createNodeFromSerializedData(nodeData) {
        if (!nodeData || !nodeData.type) {
            console.error('NodeFactory: Invalid serialized node data');
            return null;
        }
        
        const options = {
            id: nodeData.id,
            text: nodeData.text,
            position: { x: nodeData.x, y: nodeData.y },
            data: {}
        };
        
        // Restore additional data attributes
        Object.keys(nodeData).forEach(key => {
            if (!['type', 'id', 'text', 'x', 'y'].includes(key)) {
                options.data[key] = nodeData[key];
            }
        });
        
        return this.createNode(nodeData.type, options);
    }
    
    /**
     * Get available node types
     * @returns {Array} Array of available node types
     */
    getAvailableNodeTypes() {
        return Object.keys(this.nodeTemplates);
    }
    
    /**
     * Get node template for a specific type
     * @param {string} type - Node type
     * @returns {Object|null} Node template or null if not found
     */
    getNodeTemplate(type) {
        return this.nodeTemplates[type] || null;
    }
    
    /**
     * Register a new node template
     * @param {string} type - Node type
     * @param {Object} template - Node template configuration
     */
    registerNodeTemplate(type, template) {
        this.nodeTemplates[type] = {
            className: `node ${type}`,
            shape: 'rectangle',
            defaultText: type.charAt(0).toUpperCase() + type.slice(1),
            allowsConnections: true,
            allowsDragging: true,
            contextMenuActions: ['delete', 'edit'],
            ...template
        };
        
        console.log(`NodeFactory: Registered new node template: ${type}`);
    }
    
    /**
     * Validate node data for creation
     * @param {string} type - Node type
     * @param {Object} data - Node data
     * @returns {Object} Validation result
     */
    validateNodeData(type, data = {}) {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };
        
        // Check if type exists
        if (!this.nodeTemplates[type]) {
            result.isValid = false;
            result.errors.push(`Unknown node type: ${type}`);
            return result;
        }
        
        // Validate required fields
        if (data.id && (typeof data.id !== 'string' && typeof data.id !== 'number')) {
            result.warnings.push('Node ID should be a string or number');
        }
        
        if (data.position && (typeof data.position.x !== 'number' || typeof data.position.y !== 'number')) {
            result.warnings.push('Node position should have numeric x and y coordinates');
        }
        
        return result;
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NodeFactory;
}

// Make available globally for direct use
if (typeof window !== 'undefined') {
    window.NodeFactory = NodeFactory;
}