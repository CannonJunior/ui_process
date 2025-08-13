/**
 * Application State - Centralized state model
 * Defines the structure and initial values for application state
 */
export class AppState {
    constructor() {
        this.initialState = this.getInitialState();
    }

    /**
     * Get initial application state
     * @returns {Object} Initial state object
     */
    getInitialState() {
        return {
            // Core application data
            nodes: [],
            taskNodes: [],
            flowlines: [],
            nodeCounter: 0,
            
            // UI state
            selectedNode: null,
            selectedTaskForAdvance: null,
            selectedTaskForTags: null,
            selectedTagForEdit: null,
            currentTagData: null,
            
            // Drag and drop state
            dragData: {
                isDragging: false,
                offset: { x: 0, y: 0 }
            },
            draggedTag: null,
            successfulDrop: false,
            
            // Flowline creation state
            flowlineCreationMode: false,
            sourceNodeForFlowline: null,
            
            // Canvas panning state
            isPanning: false,
            panStart: { x: 0, y: 0 },
            panOffset: { x: 0, y: 0 },
            currentPanOffset: { x: 0, y: 0 },
            
            // Eisenhower Matrix state
            isMatrixMode: false,
            matrixTasks: [],
            originalPositions: new Map(),
            
            // Application references
            startNode: null,
            
            // UI settings
            settings: {
                flowlineType: 'straight',
                autoSave: false,
                theme: 'light'
            }
        };
    }

    /**
     * Get state schema for validation
     * @returns {Object} State schema
     */
    getStateSchema() {
        return {
            nodes: { type: 'array', required: true },
            taskNodes: { type: 'array', required: true },
            flowlines: { type: 'array', required: true },
            nodeCounter: { type: 'number', required: true, min: 0 },
            selectedNode: { type: 'object', required: false },
            dragData: {
                type: 'object',
                required: true,
                properties: {
                    isDragging: { type: 'boolean', required: true },
                    offset: {
                        type: 'object',
                        required: true,
                        properties: {
                            x: { type: 'number', required: true },
                            y: { type: 'number', required: true }
                        }
                    }
                }
            },
            panOffset: {
                type: 'object',
                required: true,
                properties: {
                    x: { type: 'number', required: true },
                    y: { type: 'number', required: true }
                }
            },
            isMatrixMode: { type: 'boolean', required: true },
            settings: {
                type: 'object',
                required: true,
                properties: {
                    flowlineType: { type: 'string', required: true },
                    autoSave: { type: 'boolean', required: true },
                    theme: { type: 'string', required: true }
                }
            }
        };
    }

    /**
     * Validate state structure
     * @param {Object} state - State to validate
     * @returns {Object} Validation result
     */
    validateState(state) {
        const errors = [];
        const schema = this.getStateSchema();
        
        this.validateObject(state, schema, '', errors);
        
        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : null
        };
    }

    /**
     * Recursively validate object against schema
     * @private
     */
    validateObject(obj, schema, path, errors) {
        for (const [key, definition] of Object.entries(schema)) {
            const fullPath = path ? `${path}.${key}` : key;
            const value = obj[key];
            
            // Check required fields
            if (definition.required && (value === undefined || value === null)) {
                errors.push(`Missing required field: ${fullPath}`);
                continue;
            }
            
            // Skip validation if field is not required and missing
            if (!definition.required && (value === undefined || value === null)) {
                continue;
            }
            
            // Type validation
            if (definition.type) {
                if (!this.validateType(value, definition.type)) {
                    errors.push(`Invalid type for ${fullPath}: expected ${definition.type}, got ${typeof value}`);
                    continue;
                }
            }
            
            // Number constraints
            if (definition.type === 'number') {
                if (definition.min !== undefined && value < definition.min) {
                    errors.push(`Value for ${fullPath} is below minimum: ${value} < ${definition.min}`);
                }
                if (definition.max !== undefined && value > definition.max) {
                    errors.push(`Value for ${fullPath} is above maximum: ${value} > ${definition.max}`);
                }
            }
            
            // Nested object validation
            if (definition.type === 'object' && definition.properties) {
                this.validateObject(value, definition.properties, fullPath, errors);
            }
        }
    }

    /**
     * Validate value type
     * @private
     */
    validateType(value, expectedType) {
        switch (expectedType) {
            case 'array':
                return Array.isArray(value);
            case 'object':
                return typeof value === 'object' && value !== null && !Array.isArray(value);
            case 'string':
                return typeof value === 'string';
            case 'number':
                return typeof value === 'number' && !isNaN(value);
            case 'boolean':
                return typeof value === 'boolean';
            default:
                return true;
        }
    }

    /**
     * Create a deep copy of the initial state
     * @returns {Object} Clean initial state
     */
    createInitialState() {
        return JSON.parse(JSON.stringify(this.initialState));
    }

    /**
     * Merge partial state with current state
     * @param {Object} currentState - Current state
     * @param {Object} partialState - Partial state to merge
     * @returns {Object} Merged state
     */
    mergeState(currentState, partialState) {
        return {
            ...currentState,
            ...partialState
        };
    }

    /**
     * Reset specific state section to initial values
     * @param {Object} currentState - Current state
     * @param {string[]} sections - Sections to reset
     * @returns {Object} State with reset sections
     */
    resetSections(currentState, sections) {
        const newState = { ...currentState };
        const initial = this.getInitialState();
        
        sections.forEach(section => {
            if (initial.hasOwnProperty(section)) {
                newState[section] = JSON.parse(JSON.stringify(initial[section]));
            }
        });
        
        return newState;
    }

    /**
     * Get state diff between two states
     * @param {Object} oldState - Previous state
     * @param {Object} newState - Current state
     * @returns {Object} Diff object
     */
    getStateDiff(oldState, newState) {
        const diff = {};
        
        for (const key in newState) {
            if (oldState[key] !== newState[key]) {
                diff[key] = {
                    old: oldState[key],
                    new: newState[key]
                };
            }
        }
        
        return diff;
    }
}