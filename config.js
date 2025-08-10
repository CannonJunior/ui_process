/**
 * Central Configuration for Process Flow Designer
 * Manages all dropdown options, tag definitions, and application settings
 */

const AppConfig = {
    // Node types for the main node creation dropdown
    nodeTypes: [
        { value: "", label: "Select Node Type", disabled: true },
        { value: "process", label: "Process" },
        { value: "decision", label: "Decision" },
        { value: "terminal", label: "Terminal" }
    ],

    // Flowline types for the flowline style dropdown
    flowlineTypes: [
        { value: "straight", label: "Straight Lines" },
        { value: "perpendicular", label: "Perpendicular Lines" }
    ],

    // Tag system configuration
    tagSystem: {
        // Main tag categories
        categories: [
            { value: "", label: "Select Tag Type", disabled: true },
            { value: "stage", label: "Stage" },
            { value: "bnb", label: "BNB" },
            { value: "boe", label: "BOE" },
            { value: "urgency", label: "Urgency" },
            { value: "importance", label: "Importance" }
        ],

        // Sub-options for each tag category
        options: {
            stage: [
                { value: "", label: "Select Stage", disabled: true },
                { value: "long-lead", label: "Long-lead" },
                { value: "draft-rfi", label: "Draft RFI" },
                { value: "rfi", label: "RFI" },
                { value: "draft-rfp", label: "Draft RFP" },
                { value: "rfp", label: "RFP" },
                { value: "other", label: "Other" }
            ],
            bnb: [
                { value: "", label: "Select BNB", disabled: true },
                { value: "draft", label: "Draft" },
                { value: "ready", label: "Ready" },
                { value: "briefed-awaiting", label: "Briefed/Awaiting" },
                { value: "bid", label: "Bid" },
                { value: "no-bid", label: "No-Bid" }
            ],
            boe: [
                { value: "", label: "Select BOE", disabled: true },
                { value: "in-progress", label: "In-Progress" },
                { value: "draft", label: "Draft" },
                { value: "ready", label: "Ready" },
                { value: "approved", label: "Approved" }
            ],
            urgency: [
                { value: "", label: "Select Urgency", disabled: true },
                { value: "urgent", label: "Urgent" },
                { value: "not-urgent", label: "Not-Urgent" }
            ],
            importance: [
                { value: "", label: "Select Importance", disabled: true },
                { value: "important", label: "Important" },
                { value: "not-important", label: "Not-Important" }
            ]
        },

        // Display configurations for tag styling
        display: {
            stage: { color: "#007bff", bgColor: "#e3f2fd" },
            bnb: { color: "#28a745", bgColor: "#e8f5e8" },
            boe: { color: "#ffc107", bgColor: "#fff8e1" },
            urgency: { color: "#dc3545", bgColor: "#ffebee" },
            importance: { color: "#6f42c1", bgColor: "#f3e5f5" }
        }
    },

    // UI Constants
    ui: {
        taskOffset: 80,        // Distance below anchor node for first task
        taskSpacing: 50,       // Spacing between tasks in slots
        tagSpacing: 4,         // Spacing between tags
        tagHeight: 20          // Height of tag elements
    }
};

// Utility functions for working with configuration
const ConfigUtils = {
    /**
     * Populate a dropdown element with options from config
     * @param {HTMLSelectElement} selectElement - The select element to populate
     * @param {Array} options - Array of option objects {value, label, disabled?}
     */
    populateDropdown(selectElement, options) {
        selectElement.innerHTML = '';
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            if (option.disabled) {
                optionElement.disabled = true;
            }
            selectElement.appendChild(optionElement);
        });
    },

    /**
     * Get tag category label by value
     * @param {string} categoryValue - The category value
     * @returns {string} The category label
     */
    getTagCategoryLabel(categoryValue) {
        const category = AppConfig.tagSystem.categories.find(cat => cat.value === categoryValue);
        return category ? category.label : categoryValue;
    },

    /**
     * Get tag option label by category and value
     * @param {string} category - The tag category
     * @param {string} value - The option value
     * @returns {string} The option label
     */
    getTagOptionLabel(category, value) {
        const options = AppConfig.tagSystem.options[category];
        if (!options) return value;
        const option = options.find(opt => opt.value === value);
        return option ? option.label : value;
    },

    /**
     * Get tag display configuration
     * @param {string} category - The tag category
     * @returns {Object} Display configuration {color, bgColor}
     */
    getTagDisplay(category) {
        return AppConfig.tagSystem.display[category] || { color: "#666", bgColor: "#f5f5f5" };
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AppConfig, ConfigUtils };
}