/**
 * Real-time chat status debugging script
 * Run this to see exactly what's happening with the chat interface
 */

function debugChatStatus() {
    console.log('🔍 Real-time chat status debugging...');
    
    // Check if chat interface exists
    const chatInterface = window.chatInterface;
    console.log('Chat Interface Object:', chatInterface);
    
    if (!chatInterface) {
        console.log('❌ Chat interface not found in window.chatInterface');
        
        // Check if it's being created
        const chatSidebar = document.getElementById('chatSidebar');
        const statusText = document.getElementById('statusText');
        const statusIndicator = document.getElementById('statusIndicator');
        
        console.log('DOM Elements:', {
            chatSidebar: !!chatSidebar,
            statusText: statusText?.textContent,
            statusIndicator: statusIndicator?.className
        });
        
        // Check if ChatInterface class is available
        console.log('ChatInterface Class Available:', typeof ChatInterface !== 'undefined');
        
        return;
    }
    
    // Detailed chat interface state
    console.log('Chat Interface State:', {
        isConnected: chatInterface.isConnected,
        isOpen: chatInterface.isOpen,
        ollamaBaseUrl: chatInterface.ollamaBaseUrl,
        modelName: chatInterface.modelName
    });
    
    // Check DOM elements
    const elements = {
        chatSidebar: chatInterface.chatSidebar,
        statusText: chatInterface.statusText,
        statusIndicator: chatInterface.statusIndicator,
        retryButton: chatInterface.retryButton
    };
    
    console.log('DOM Elements Status:', {
        chatSidebar: !!elements.chatSidebar,
        statusText: !!elements.statusText && elements.statusText.textContent,
        statusIndicator: !!elements.statusIndicator && elements.statusIndicator.className,
        retryButton: !!elements.retryButton && elements.retryButton.style.display
    });
    
    // Check if connection check method exists
    console.log('Methods Available:', {
        checkOllamaConnection: typeof chatInterface.checkOllamaConnection,
        updateStatus: typeof chatInterface.updateStatus,
        retryConnection: typeof chatInterface.retryConnection
    });
}

// Monitor status changes in real-time
function monitorChatStatus() {
    console.log('👀 Starting real-time chat status monitoring...');
    
    const statusText = document.getElementById('statusText');
    const statusIndicator = document.getElementById('statusIndicator');
    
    if (!statusText || !statusIndicator) {
        console.log('❌ Status elements not found');
        return;
    }
    
    let lastStatusText = statusText.textContent;
    let lastStatusClass = statusIndicator.className;
    
    console.log('Initial Status:', {
        text: lastStatusText,
        class: lastStatusClass
    });
    
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' || mutation.type === 'characterData') {
                const currentStatusText = statusText.textContent;
                const currentStatusClass = statusIndicator.className;
                
                if (currentStatusText !== lastStatusText || currentStatusClass !== lastStatusClass) {
                    console.log('📊 Status Changed:', {
                        from: { text: lastStatusText, class: lastStatusClass },
                        to: { text: currentStatusText, class: currentStatusClass },
                        time: new Date().toLocaleTimeString()
                    });
                    
                    lastStatusText = currentStatusText;
                    lastStatusClass = currentStatusClass;
                }
            }
            
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const currentClass = mutation.target.className;
                if (currentClass !== lastStatusClass) {
                    console.log('🎨 Class Changed:', {
                        element: mutation.target.id,
                        from: lastStatusClass,
                        to: currentClass,
                        time: new Date().toLocaleTimeString()
                    });
                    lastStatusClass = currentClass;
                }
            }
        });
    });
    
    // Observe both text and class changes
    observer.observe(statusText, { childList: true, characterData: true, subtree: true });
    observer.observe(statusIndicator, { attributes: true, attributeFilter: ['class'] });
    
    console.log('✅ Monitoring started - status changes will be logged');
    
    // Stop monitoring after 60 seconds
    setTimeout(() => {
        observer.disconnect();
        console.log('⏰ Monitoring stopped after 60 seconds');
    }, 60000);
    
    return observer;
}

// Force check connection
async function forceConnectionCheck() {
    console.log('🔧 Forcing connection check...');
    
    const chatInterface = window.chatInterface;
    if (!chatInterface) {
        console.log('❌ Chat interface not available');
        return;
    }
    
    console.log('Before connection check:', {
        isConnected: chatInterface.isConnected,
        statusText: chatInterface.statusText?.textContent
    });
    
    try {
        await chatInterface.checkOllamaConnection();
        
        console.log('After connection check:', {
            isConnected: chatInterface.isConnected,
            statusText: chatInterface.statusText?.textContent
        });
    } catch (error) {
        console.error('Connection check failed:', error);
    }
}

// Check if initialization is stuck
function checkInitialization() {
    console.log('🚀 Checking chat interface initialization...');
    
    // Check if script is loaded
    const scriptTags = Array.from(document.querySelectorAll('script')).filter(script => 
        script.src.includes('chat-interface.js') || script.textContent.includes('ChatInterface')
    );
    
    console.log('Chat Interface Scripts:', scriptTags.length);
    
    // Check if class is defined
    if (typeof ChatInterface === 'undefined') {
        console.log('❌ ChatInterface class not defined');
        return;
    }
    
    console.log('✅ ChatInterface class is available');
    
    // Check if instance exists
    if (!window.chatInterface) {
        console.log('⚠️ ChatInterface instance not created - attempting manual creation...');
        
        try {
            window.chatInterface = new ChatInterface();
            console.log('✅ ChatInterface instance created manually');
        } catch (error) {
            console.error('❌ Failed to create ChatInterface instance:', error);
        }
    } else {
        console.log('✅ ChatInterface instance exists');
    }
}

// Check for JavaScript errors
function checkForErrors() {
    console.log('🐛 Checking for JavaScript errors...');
    
    const originalError = window.onerror;
    const errors = [];
    
    window.onerror = function(message, source, lineno, colno, error) {
        errors.push({
            message,
            source,
            lineno,
            colno,
            error: error?.toString(),
            time: new Date().toLocaleTimeString()
        });
        
        console.log('🚨 JavaScript Error Detected:', {
            message,
            source,
            lineno,
            colno
        });
        
        if (originalError) {
            originalError.apply(this, arguments);
        }
    };
    
    // Also listen for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        console.log('🚨 Unhandled Promise Rejection:', event.reason);
        errors.push({
            type: 'unhandledrejection',
            reason: event.reason?.toString(),
            time: new Date().toLocaleTimeString()
        });
    });
    
    console.log('✅ Error monitoring started');
    
    // Return errors array for inspection
    return errors;
}

// Comprehensive diagnostic
async function runCompleteDiagnostic() {
    console.log('🔬 Running complete chat diagnostic...');
    console.log('====================================');
    
    // 1. Check initialization
    checkInitialization();
    
    // 2. Debug current status
    debugChatStatus();
    
    // 3. Start monitoring
    const monitor = monitorChatStatus();
    
    // 4. Check for errors
    const errors = checkForErrors();
    
    // 5. Force connection check after a delay
    setTimeout(async () => {
        await forceConnectionCheck();
    }, 2000);
    
    // 6. Check if stuck after 5 seconds
    setTimeout(() => {
        const statusText = document.getElementById('statusText');
        if (statusText && statusText.textContent.includes('Connecting to Ollama')) {
            console.log('⚠️ Still stuck on "Connecting to Ollama" after 5 seconds');
            console.log('💡 This suggests the connection check is not completing');
            
            // Try to manually trigger status update
            const chatInterface = window.chatInterface;
            if (chatInterface && typeof chatInterface.updateStatus === 'function') {
                console.log('🔧 Attempting manual status update...');
                chatInterface.updateStatus('error', 'Manual diagnostic - connection appears stuck');
            }
        }
    }, 5000);
    
    return { monitor, errors };
}

// Auto-run diagnostic
setTimeout(() => {
    console.log('🚀 Starting automatic chat diagnostic...');
    runCompleteDiagnostic();
}, 1000);

// Make functions available globally
window.debugChatStatus = debugChatStatus;
window.monitorChatStatus = monitorChatStatus;
window.forceConnectionCheck = forceConnectionCheck;
window.checkInitialization = checkInitialization;
window.runCompleteDiagnostic = runCompleteDiagnostic;

console.log('🔍 Chat status debug script loaded. Available functions:');
console.log('- debugChatStatus() - Check current state');
console.log('- monitorChatStatus() - Watch for changes');
console.log('- forceConnectionCheck() - Force connection attempt');
console.log('- checkInitialization() - Check if properly initialized');
console.log('- runCompleteDiagnostic() - Run all diagnostics');