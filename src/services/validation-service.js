/**
 * Validation Service - Input and business rule validation
 * Centralizes all validation logic for forms, data, and business rules
 */
export class ValidationService {
    constructor(context) {
        this.context = context;
        this.eventBus = context.eventBus;
        this.rules = new Map();
        this.setupDefaultRules();
    }

    /**
     * Setup default validation rules
     * @private
     */
    setupDefaultRules() {
        // Task name validation
        this.addRule('taskName', (value) => {
            if (!value || typeof value !== 'string') {
                return { valid: false, message: 'Task name is required' };
            }
            if (value.trim().length === 0) {
                return { valid: false, message: 'Task name cannot be empty' };
            }
            if (value.length > 50) {
                return { valid: false, message: 'Task name must be 50 characters or less' };
            }
            return { valid: true };
        });

        // Node name validation
        this.addRule('nodeName', (value) => {
            if (!value || typeof value !== 'string') {
                return { valid: false, message: 'Node name is required' };
            }
            if (value.trim().length === 0) {
                return { valid: false, message: 'Node name cannot be empty' };
            }
            if (value.length > 30) {
                return { valid: false, message: 'Node name must be 30 characters or less' };
            }
            return { valid: true };
        });

        // Tag description validation
        this.addRule('tagDescription', (value) => {
            if (value && value.length > 200) {
                return { valid: false, message: 'Description must be 200 characters or less' };
            }
            return { valid: true };
        });

        // URL validation
        this.addRule('url', (value) => {
            if (!value) return { valid: true }; // Optional field
            
            try {
                new URL(value);
                return { valid: true };
            } catch {
                return { valid: false, message: 'Please enter a valid URL' };
            }
        });

        // Email validation
        this.addRule('email', (value) => {
            if (!value) return { valid: true }; // Optional field
            
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                return { valid: false, message: 'Please enter a valid email address' };
            }
            return { valid: true };
        });

        // Coordinates validation
        this.addRule('coordinates', (value) => {
            if (typeof value !== 'object' || !value.hasOwnProperty('x') || !value.hasOwnProperty('y')) {
                return { valid: false, message: 'Invalid coordinates format' };
            }
            if (typeof value.x !== 'number' || typeof value.y !== 'number') {
                return { valid: false, message: 'Coordinates must be numbers' };
            }
            if (isNaN(value.x) || isNaN(value.y)) {
                return { valid: false, message: 'Coordinates cannot be NaN' };
            }
            return { valid: true };
        });
    }

    /**
     * Add a validation rule
     * @param {string} ruleName - Rule name
     * @param {Function} validator - Validator function
     */
    addRule(ruleName, validator) {
        this.rules.set(ruleName, validator);
    }

    /**
     * Remove a validation rule
     * @param {string} ruleName - Rule name
     */
    removeRule(ruleName) {
        this.rules.delete(ruleName);
    }

    /**
     * Validate a value against a rule
     * @param {string} ruleName - Rule name
     * @param {*} value - Value to validate
     * @returns {Object} Validation result {valid, message?}
     */
    validate(ruleName, value) {
        const rule = this.rules.get(ruleName);
        if (!rule) {
            throw new Error(`Validation rule '${ruleName}' not found`);
        }
        
        try {
            return rule(value);
        } catch (error) {
            return {
                valid: false,
                message: `Validation error: ${error.message}`
            };
        }
    }

    /**
     * Validate multiple values against rules
     * @param {Object} data - Object with key-value pairs to validate
     * @param {Object} ruleMap - Object mapping data keys to rule names
     * @returns {Object} Validation results {valid, errors}
     */
    validateMultiple(data, ruleMap) {
        const errors = {};
        let allValid = true;

        for (const [key, ruleName] of Object.entries(ruleMap)) {
            const value = data[key];
            const result = this.validate(ruleName, value);
            
            if (!result.valid) {
                errors[key] = result.message;
                allValid = false;
            }
        }

        return {
            valid: allValid,
            errors: allValid ? null : errors
        };
    }

    /**
     * Validate task data
     * @param {Object} taskData - Task data object
     * @returns {Object} Validation result
     */
    validateTaskData(taskData) {
        const rules = {
            name: 'taskName'
        };

        if (taskData.description) {
            rules.description = 'tagDescription';
        }

        if (taskData.link) {
            rules.link = 'url';
        }

        return this.validateMultiple(taskData, rules);
    }

    /**
     * Validate node data
     * @param {Object} nodeData - Node data object
     * @returns {Object} Validation result
     */
    validateNodeData(nodeData) {
        const rules = {
            text: 'nodeName'
        };

        if (nodeData.position) {
            rules.position = 'coordinates';
        }

        return this.validateMultiple(nodeData, rules);
    }

    /**
     * Validate tag data
     * @param {Object} tagData - Tag data object
     * @returns {Object} Validation result
     */
    validateTagData(tagData) {
        const result = { valid: true, errors: {} };

        // Validate required fields
        if (!tagData.category) {
            result.valid = false;
            result.errors.category = 'Tag category is required';
        }

        if (!tagData.option) {
            result.valid = false;
            result.errors.option = 'Tag option is required';
        }

        // Validate optional fields
        if (tagData.description) {
            const descResult = this.validate('tagDescription', tagData.description);
            if (!descResult.valid) {
                result.valid = false;
                result.errors.description = descResult.message;
            }
        }

        if (tagData.link) {
            const linkResult = this.validate('url', tagData.link);
            if (!linkResult.valid) {
                result.valid = false;
                result.errors.link = linkResult.message;
            }
        }

        return result;
    }

    /**
     * Validate workflow data for save/load
     * @param {Object} workflowData - Workflow data object
     * @returns {Object} Validation result
     */
    validateWorkflowData(workflowData) {
        const result = { valid: true, errors: {} };

        // Check required fields
        if (!workflowData.version) {
            result.valid = false;
            result.errors.version = 'Workflow version is required';
        }

        if (!workflowData.nodes || !Array.isArray(workflowData.nodes)) {
            result.valid = false;
            result.errors.nodes = 'Workflow must contain nodes array';
        }

        if (!workflowData.flowlines || !Array.isArray(workflowData.flowlines)) {
            result.valid = false;
            result.errors.flowlines = 'Workflow must contain flowlines array';
        }

        // Validate node data
        if (workflowData.nodes) {
            workflowData.nodes.forEach((node, index) => {
                const nodeValidation = this.validateNodeData(node);
                if (!nodeValidation.valid) {
                    result.valid = false;
                    result.errors[`node_${index}`] = nodeValidation.errors;
                }
            });
        }

        return result;
    }

    /**
     * Check if element is in valid drop zone
     * @param {HTMLElement} element - Element being dropped
     * @param {HTMLElement} dropZone - Drop zone element
     * @param {Object} constraints - Drop constraints
     * @returns {Object} Validation result
     */
    validateDropZone(element, dropZone, constraints = {}) {
        const result = { valid: true, message: null };

        // Check if drop zone accepts this element type
        if (constraints.acceptedTypes) {
            const elementType = element.dataset.type || element.className;
            if (!constraints.acceptedTypes.includes(elementType)) {
                result.valid = false;
                result.message = 'This element cannot be dropped here';
                return result;
            }
        }

        // Check task-specific constraints
        if (element.classList.contains('tag') && dropZone.classList.contains('next-action-slot')) {
            const tagTaskId = element.dataset.taskId;
            const slotTaskId = dropZone.dataset.taskId;
            
            if (tagTaskId !== slotTaskId) {
                result.valid = false;
                result.message = 'Tags can only be dropped on their own task\'s next-action slot';
                return result;
            }
        }

        return result;
    }

    /**
     * Sanitize input string
     * @param {string} input - Input string
     * @returns {string} Sanitized string
     */
    sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        
        return input
            .trim()
            .replace(/[<>]/g, '') // Remove angle brackets
            .substring(0, 1000); // Limit length
    }

    /**
     * Check if all required fields are present
     * @param {Object} data - Data object
     * @param {string[]} requiredFields - Array of required field names
     * @returns {Object} Validation result
     */
    validateRequired(data, requiredFields) {
        const missing = [];
        
        for (const field of requiredFields) {
            if (!data.hasOwnProperty(field) || data[field] === null || data[field] === undefined || data[field] === '') {
                missing.push(field);
            }
        }

        return {
            valid: missing.length === 0,
            missing: missing.length > 0 ? missing : null,
            message: missing.length > 0 ? `Missing required fields: ${missing.join(', ')}` : null
        };
    }
}