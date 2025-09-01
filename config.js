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
            { value: "importance", label: "Importance" },
            { value: "sharepoint", label: "SharePoint" },
            { value: "crm", label: "CRM" },
            { value: "confluence", label: "Confluence" }
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
            ],
            sharepoint: [
                { value: "", label: "Select SharePoint Type", disabled: true },
                { value: "document", label: "Document" },
                { value: "list", label: "List" },
                { value: "library", label: "Library" },
                { value: "site", label: "Site" },
                { value: "workflow", label: "Workflow" }
            ],
            crm: [
                { value: "", label: "Select CRM Type", disabled: true },
                { value: "opportunity", label: "Opportunity" },
                { value: "account", label: "Account" },
                { value: "contact", label: "Contact" },
                { value: "lead", label: "Lead" },
                { value: "case", label: "Case" }
            ],
            confluence: [
                { value: "", label: "Select Confluence Type", disabled: true },
                { value: "page", label: "Page" },
                { value: "blog", label: "Blog Post" },
                { value: "space", label: "Space" },
                { value: "template", label: "Template" },
                { value: "attachment", label: "Attachment" }
            ]
        },

        // Display configurations for tag styling
        display: {
            stage: { color: "#007bff", bgColor: "#e3f2fd" },
            bnb: { color: "#28a745", bgColor: "#e8f5e8" },
            boe: { color: "#ffc107", bgColor: "#fff8e1" },
            urgency: { color: "#dc3545", bgColor: "#ffebee" },
            importance: { color: "#6f42c1", bgColor: "#f3e5f5" },
            sharepoint: { color: "#0078d4", bgColor: "#e6f3ff" },
            crm: { color: "#d83b01", bgColor: "#ffeae6" },
            confluence: { color: "#0052cc", bgColor: "#e6f0ff" }
        },

        // Custom field configurations for advanced tag types
        customFields: {
            sharepoint: {
                required: ["name", "link"],
                optional: ["description", "date"],
                fields: {
                    name: { type: "text", label: "SharePoint Name", placeholder: "Enter SharePoint item name" }
                }
            },
            crm: {
                required: ["opportunity_id", "link"],
                optional: ["description", "date"],
                fields: {
                    opportunity_id: { type: "text", label: "Opportunity ID", placeholder: "Enter opportunity ID" }
                }
            },
            confluence: {
                required: ["name", "link"],
                optional: ["author", "description", "date"],
                fields: {
                    name: { type: "text", label: "Confluence Name", placeholder: "Enter page/document name" },
                    author: { type: "text", label: "Author", placeholder: "Enter author name" }
                }
            }
        }
    },

    // UI Constants
    ui: {
        taskOffset: 80,        // Distance below anchor node for first task
        taskSpacing: 50,       // Spacing between tasks in slots
        tagSpacing: 4,         // Spacing between tags
        tagHeight: 20          // Height of tag elements
    },

    // Health Check Configuration
    healthCheck: {
        apiHealthInterval: 10000,      // API health check interval in milliseconds (10 seconds)
        dataHealthInterval: 10000,     // Database health check interval in milliseconds (10 seconds)
        mcpHealthInterval: 10000,      // MCP services health check interval in milliseconds (10 seconds)
        ollamaHealthInterval: 10000,   // Ollama AI health check interval in milliseconds (10 seconds)
        searchHealthInterval: 10000    // Search service health check interval in milliseconds (10 seconds)
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