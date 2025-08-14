/**
 * Configuration Service
 * Centralized management of application configuration and settings
 * 
 * SAFETY: Pure service functions, no side effects
 * Risk Level: LOW - Configuration management only
 */

class ConfigService {
    constructor() {
        // Store reference to main config
        this.config = AppConfig;
        this.utils = ConfigUtils;
    }
    
    /**
     * Get complete application configuration
     * @returns {Object} Full AppConfig object
     */
    getConfig() {
        return this.config;
    }
    
    /**
     * Get specific configuration section
     * @param {string} section - Configuration section name
     * @returns {*} Configuration section or null if not found
     */
    getSection(section) {
        return this.config[section] || null;
    }
    
    /**
     * Get node types configuration
     * @returns {Array} Node types array
     */
    getNodeTypes() {
        return this.config.nodeTypes || [];
    }
    
    /**
     * Get flowline types configuration
     * @returns {Array} Flowline types array
     */
    getFlowlineTypes() {
        return this.config.flowlineTypes || [];
    }
    
    /**
     * Get tag system configuration
     * @returns {Object} Tag system configuration
     */
    getTagSystem() {
        return this.config.tagSystem || {};
    }
    
    /**
     * Get tag categories
     * @returns {Array} Tag categories array
     */
    getTagCategories() {
        return this.config.tagSystem?.categories || [];
    }
    
    /**
     * Get tag options for specific category
     * @param {string} category - Tag category
     * @returns {Array} Tag options array
     */
    getTagOptions(category) {
        return this.config.tagSystem?.options?.[category] || [];
    }
    
    /**
     * Get tag display configuration
     * @param {string} category - Tag category
     * @returns {Object} Display configuration {color, bgColor}
     */
    getTagDisplay(category) {
        return this.utils.getTagDisplay(category);
    }
    
    /**
     * Get UI constants
     * @returns {Object} UI configuration object
     */
    getUIConfig() {
        return this.config.ui || {};
    }
    
    /**
     * Get specific UI constant
     * @param {string} key - UI constant key
     * @returns {*} UI constant value or null
     */
    getUIConstant(key) {
        return this.config.ui?.[key] || null;
    }
    
    /**
     * Populate dropdown element with configuration options
     * @param {HTMLSelectElement} selectElement - Target dropdown element
     * @param {string} configPath - Path to config options (e.g., 'nodeTypes', 'tagSystem.categories')
     * @returns {boolean} Success status
     */
    populateDropdown(selectElement, configPath) {
        if (!selectElement || !(selectElement instanceof HTMLSelectElement)) {
            console.warn('ConfigService.populateDropdown: Invalid select element');
            return false;
        }
        
        let options;
        
        // Handle nested config paths
        if (configPath === 'nodeTypes') {
            options = this.getNodeTypes();
        } else if (configPath === 'flowlineTypes') {
            options = this.getFlowlineTypes();
        } else if (configPath === 'tagSystem.categories') {
            options = this.getTagCategories();
        } else if (configPath.startsWith('tagSystem.options.')) {
            const category = configPath.split('.')[2];
            options = this.getTagOptions(category);
        } else {
            console.warn('ConfigService.populateDropdown: Unknown config path:', configPath);
            return false;
        }
        
        if (!Array.isArray(options)) {
            console.warn('ConfigService.populateDropdown: Options is not an array:', options);
            return false;
        }
        
        // Use existing ConfigUtils functionality
        this.utils.populateDropdown(selectElement, options);
        return true;
    }
    
    /**
     * Get human-readable label for tag category
     * @param {string} categoryValue - Category value
     * @returns {string} Category label
     */
    getTagCategoryLabel(categoryValue) {
        return this.utils.getTagCategoryLabel(categoryValue);
    }
    
    /**
     * Get human-readable label for tag option
     * @param {string} category - Tag category
     * @param {string} value - Option value
     * @returns {string} Option label
     */
    getTagOptionLabel(category, value) {
        return this.utils.getTagOptionLabel(category, value);
    }
    
    /**
     * Validate configuration structure
     * @returns {Object} Validation result with isValid boolean and errors array
     */
    validateConfig() {
        const errors = [];
        
        // Check required sections
        const requiredSections = ['nodeTypes', 'flowlineTypes', 'tagSystem', 'ui'];
        requiredSections.forEach(section => {
            if (!this.config[section]) {
                errors.push(`Missing required config section: ${section}`);
            }
        });
        
        // Check nodeTypes structure
        if (this.config.nodeTypes && Array.isArray(this.config.nodeTypes)) {
            this.config.nodeTypes.forEach((nodeType, index) => {
                if (!nodeType.value && nodeType.value !== '' || !nodeType.label) {
                    errors.push(`Invalid nodeType at index ${index}: missing value or label`);
                }
            });
        } else if (this.config.nodeTypes) {
            errors.push('nodeTypes must be an array');
        }
        
        // Check tagSystem structure
        if (this.config.tagSystem) {
            if (!this.config.tagSystem.categories) {
                errors.push('tagSystem missing categories array');
            }
            if (!this.config.tagSystem.options) {
                errors.push('tagSystem missing options object');
            }
            if (!this.config.tagSystem.display) {
                errors.push('tagSystem missing display object');
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    /**
     * Get configuration summary for debugging
     * @returns {Object} Configuration summary
     */
    getConfigSummary() {
        return {
            nodeTypesCount: this.getNodeTypes().length,
            flowlineTypesCount: this.getFlowlineTypes().length,
            tagCategoriesCount: this.getTagCategories().length,
            tagOptionsCategories: Object.keys(this.config.tagSystem?.options || {}),
            uiConstants: Object.keys(this.getUIConfig()),
            validationResult: this.validateConfig()
        };
    }
    
    /**
     * Create a deep copy of configuration section for safe external use
     * @param {string} section - Configuration section name
     * @returns {*} Deep copy of configuration section
     */
    getConfigCopy(section) {
        const configSection = this.getSection(section);
        if (!configSection) {
            return null;
        }
        
        try {
            return JSON.parse(JSON.stringify(configSection));
        } catch (error) {
            console.warn('ConfigService.getConfigCopy: Error copying config section:', error);
            return null;
        }
    }
    
    /**
     * Check if a specific feature is enabled
     * @param {string} feature - Feature name
     * @returns {boolean} Feature enabled status
     */
    isFeatureEnabled(feature) {
        // For future feature flags
        const features = this.config.features || {};
        return features[feature] === true;
    }
}

// Create singleton instance
let configServiceInstance = null;

/**
 * Get singleton instance of ConfigService
 * @returns {ConfigService} ConfigService instance
 */
function getConfigService() {
    if (!configServiceInstance) {
        configServiceInstance = new ConfigService();
    }
    return configServiceInstance;
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ConfigService, getConfigService };
}

// Make available globally for direct use
if (typeof window !== 'undefined') {
    window.ConfigService = ConfigService;
    window.getConfigService = getConfigService;
}