/**
 * Simplified chat debug script to identify the core issue
 */

// Wait for everything to load then diagnose
setTimeout(() => {
    console.log('🔍 Chat Debug - Starting diagnostic...');
    
    // 1. Check if ChatInterface class exists
    if (typeof ChatInterface === 'undefined') {
        console.error('❌ ChatInterface class not defined - script loading issue');
        return;
    }
    console.log('✅ ChatInterface class found');
    
    // 2. Check if instance exists
    if (!window.chatInterface) {
        console.error('❌ ChatInterface instance not created');
        console.log('🔧 Attempting to create instance manually...');
        try {
            window.chatInterface = new ChatInterface();
            console.log('✅ ChatInterface instance created manually');
        } catch (error) {
            console.error('❌ Failed to create instance:', error);
            return;
        }
    } else {
        console.log('✅ ChatInterface instance exists');
    }
    
    // 3. Check instance properties
    const chat = window.chatInterface;
    console.log('📊 ChatInterface state:', {
        isConnected: chat.isConnected,
        ollamaBaseUrl: chat.ollamaBaseUrl,
        modelName: chat.modelName
    });
    
    // 4. Check DOM elements
    const statusText = document.getElementById('statusText');
    const statusIndicator = document.getElementById('statusIndicator');
    
    console.log('🎨 DOM elements:', {
        statusText: statusText ? statusText.textContent : 'NOT FOUND',
        statusIndicator: statusIndicator ? statusIndicator.className : 'NOT FOUND'
    });
    
    // 5. Check if connection method exists and is being called
    if (chat && typeof chat.checkOllamaConnection === 'function') {
        console.log('✅ checkOllamaConnection method exists');
        
        // Override to see if it's being called
        const originalCheck = chat.checkOllamaConnection.bind(chat);
        chat.checkOllamaConnection = async function() {
            console.log('🔄 checkOllamaConnection called');
            try {
                const result = await originalCheck();
                console.log('✅ checkOllamaConnection completed');
                return result;
            } catch (error) {
                console.error('❌ checkOllamaConnection failed:', error);
                throw error;
            }
        };
        
        // Force call it manually
        console.log('🔧 Forcing connection check...');
        chat.checkOllamaConnection().catch(error => {
            console.error('❌ Manual connection check failed:', error);
        });
        
    } else {
        console.error('❌ checkOllamaConnection method not found');
    }
    
    // 6. Monitor status changes
    let lastStatus = statusText ? statusText.textContent : '';
    setInterval(() => {
        const currentStatus = statusText ? statusText.textContent : '';
        if (currentStatus !== lastStatus) {
            console.log('📈 Status changed:', {
                from: lastStatus,
                to: currentStatus,
                time: new Date().toLocaleTimeString()
            });
            lastStatus = currentStatus;
        }
    }, 1000);
    
}, 2000); // Wait 2 seconds for everything to initialize

console.log('🔍 Chat debug simplified script loaded');