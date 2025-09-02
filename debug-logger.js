/**
 * Debug Logger
 * Logs frontend messages to backend for debugging
 */

window.debugLog = function(level, message, data) {
    // Also log to console
    console.log(`[${level}] ${message}`, data || '');
    
    // Send to backend
    fetch('/api/v1/debug/log', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            level: level,
            message: message,
            data: data
        })
    }).catch(err => console.error('Debug log failed:', err));
};

// Log that the debug logger is loaded
window.debugLog('info', '🧪 Debug logger loaded');
window.debugLog('info', '🧪 ProcessFlowDesigner available: ' + (typeof window.processFlowDesigner !== 'undefined'));
window.debugLog('info', '🧪 API Integration available: ' + (typeof window.apiIntegration !== 'undefined'));

// Test opportunity creation logging
setTimeout(() => {
    window.debugLog('info', '🧪 5-second test - checking if opportunity creation works');
    
    // Test manual event dispatch
    const testOpportunity = {
        title: 'Debug Test Opportunity',
        description: 'Test opportunity from debug logger',
        status: 'active',
        created_at: new Date().toISOString()
    };
    
    window.debugLog('info', '🧪 Dispatching test opportunity event', testOpportunity);
    document.dispatchEvent(new CustomEvent('opportunity.created', {
        detail: testOpportunity
    }));
    window.debugLog('info', '🧪 Test event dispatched');
    
}, 5000);