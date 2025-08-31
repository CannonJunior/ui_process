/**
 * Simple API Health Handler
 * Direct implementation to ensure API health indicator and click functionality works
 */

console.log('🔗 API health handler script loading...');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM loaded - setting up API health handler');
    
    // Multiple attempts to ensure it gets set up
    let attempts = 0;
    const maxAttempts = 10;
    
    function setupApiHealth() {
        attempts++;
        console.log(`🔄 API setup attempt ${attempts}/${maxAttempts}`);
        
        const apiHealthIndicator = document.getElementById('apiHealthIndicator');
        
        if (apiHealthIndicator) {
            console.log('✅ apiHealthIndicator found!');
            
            // Set up click handler
            setupApiClickHandler(apiHealthIndicator);
            
            // Start health monitoring
            startApiHealthMonitoring(apiHealthIndicator);
            
            console.log('✅ API health handler setup complete');
            
        } else {
            console.warn(`⚠️ apiHealthIndicator not found (attempt ${attempts})`);
            
            if (attempts < maxAttempts) {
                setTimeout(setupApiHealth, 500);
            } else {
                console.error('❌ Failed to find apiHealthIndicator after maximum attempts');
            }
        }
    }
    
    // Start setup attempts
    setupApiHealth();
});

function setupApiClickHandler(element) {
    console.log('🎯 Setting up API click handler');
    
    // Clear any existing handlers by cloning the element
    const parent = element.parentNode;
    const newElement = element.cloneNode(true);
    parent.replaceChild(newElement, element);
    
    // Set up the click handler on the new element
    newElement.style.cursor = 'pointer';
    
    const clickHandler = async function(event) {
        console.log('🖱️ CLICK DETECTED ON API INDICATOR!');
        event.preventDefault();
        event.stopPropagation();
        
        try {
            await showApiModal();
        } catch (error) {
            console.error('❌ Error showing API modal:', error);
        }
    };
    
    // Add click handler with multiple methods for maximum compatibility
    newElement.addEventListener('click', clickHandler, true);
    newElement.onclick = clickHandler;
    
    // Add hover effects
    newElement.addEventListener('mouseenter', () => {
        newElement.style.opacity = '0.8';
        console.log('🐭 API mouse enter detected');
    });
    
    newElement.addEventListener('mouseleave', () => {
        newElement.style.opacity = '1';
        console.log('🐭 API mouse leave detected');
    });
    
    console.log('✅ API click handler attached');
}

function startApiHealthMonitoring(element) {
    console.log('💓 Starting API health monitoring');
    
    async function checkApiHealth() {
        try {
            const response = await fetch('http://localhost:3001/health');
            const isOnline = response.ok;
            
            updateApiHealthIndicator(element, isOnline, response.status);
            
            if (isOnline) {
                const data = await response.json();
                console.log('💚 API is online:', data.status);
            } else {
                console.log('💔 API is offline, status:', response.status);
            }
            
        } catch (error) {
            console.log('💔 API check failed:', error.message);
            updateApiHealthIndicator(element, false, 'error');
        }
    }
    
    // Check immediately
    checkApiHealth();
    
    // Check every 30 seconds
    setInterval(checkApiHealth, 30000);
}

function updateApiHealthIndicator(element, isOnline, status) {
    const healthDot = element.querySelector('.health-dot');
    const healthStatus = element.querySelector('.health-status');
    
    console.log('🔄 Updating API health indicator:', { isOnline, status, element, healthDot });
    
    if (healthDot) {
        // Remove all existing classes
        healthDot.classList.remove('online', 'offline', 'connecting');
        
        // Add the correct class
        if (isOnline) {
            healthDot.classList.add('online');
            healthDot.style.backgroundColor = '#10b981'; // Force green color
        } else {
            healthDot.classList.add('offline');
            healthDot.style.backgroundColor = '#ef4444'; // Force red color
        }
        
        console.log(`✅ API health updated: ${isOnline ? 'ONLINE' : 'OFFLINE'} (${status})`);
        console.log('✅ Health dot classes:', healthDot.className);
        console.log('✅ Health dot style:', healthDot.style.backgroundColor);
    } else {
        console.error('❌ Health dot not found in API indicator');
    }
    
    if (healthStatus) {
        healthStatus.textContent = 'API';
    }
    
    // Update title with status
    element.title = isOnline ? `API Connection Status: Online (${status})` : `API Connection Status: Offline (${status})`;
    
    // Force a visual update
    element.style.display = 'none';
    element.offsetHeight; // Trigger reflow
    element.style.display = '';
}

// API modal function
async function showApiModal() {
    console.log('📊 showApiModal() called');
    
    try {
        // Get API information
        console.log('📡 Fetching API info...');
        
        const response = await fetch('http://localhost:3001/health');
        const apiData = response.ok ? await response.json() : null;
        
        // Get additional API info
        const endpointsResponse = await fetch('http://localhost:3001/api/v1').catch(() => null);
        const endpointsData = endpointsResponse && endpointsResponse.ok ? await endpointsResponse.json() : null;
        
        console.log('📡 API responses received:', {
            health: response.status,
            endpoints: endpointsResponse ? endpointsResponse.status : 'FAILED'
        });
        
        // Create modal
        createApiModal(apiData, endpointsData, response.status);
        
    } catch (error) {
        console.error('❌ Error in showApiModal:', error);
        createApiModal(null, null, 'error', error.message);
    }
}

function createApiModal(healthData, endpointsData, status, errorMessage = null) {
    console.log('🎭 Creating API modal...');
    
    // Remove existing modal
    const existingModal = document.getElementById('apiDetailsModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'apiDetailsModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 8px;
        max-width: 700px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;
    
    let modalHTML = '<h2>🌐 API Connection Details</h2>';
    
    if (errorMessage) {
        modalHTML += `
            <div style="color: #dc2626; padding: 15px; background: #fef2f2; border-radius: 5px; margin: 15px 0;">
                <h3>❌ Error</h3>
                <p>${errorMessage}</p>
            </div>
        `;
    } else {
        const isOnline = status === 200 || status === 'ok';
        const statusColor = isOnline ? '#10b981' : '#ef4444';
        const statusText = isOnline ? '🟢 Online' : '🔴 Offline';
        
        modalHTML += `
            <div style="margin: 20px 0;">
                <h3>📊 API Status</h3>
                <div style="padding: 15px; background: ${isOnline ? '#f0f9ff' : '#fef2f2'}; border-radius: 5px;">
                    <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span></p>
                    <p><strong>Response Code:</strong> ${status}</p>
                    <p><strong>Base URL:</strong> http://localhost:3001</p>
                </div>
            </div>
        `;
        
        // Health data information
        if (healthData) {
            modalHTML += `
                <div style="margin: 20px 0;">
                    <h3>🏥 Health Check Data</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Status:</td><td style="padding: 8px; border: 1px solid #ddd;">${healthData.status}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Version:</td><td style="padding: 8px; border: 1px solid #ddd;">${healthData.version || 'N/A'}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Environment:</td><td style="padding: 8px; border: 1px solid #ddd;">${healthData.environment || 'N/A'}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Database:</td><td style="padding: 8px; border: 1px solid #ddd;">${healthData.database || 'N/A'}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Timestamp:</td><td style="padding: 8px; border: 1px solid #ddd;">${healthData.timestamp || 'N/A'}</td></tr>
                    </table>
                </div>
            `;
        }
        
        // Available endpoints
        modalHTML += `
            <div style="margin: 20px 0;">
                <h3>🔗 Available Endpoints</h3>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; font-family: monospace;">
                    <div>• GET /health - Health check endpoint</div>
                    <div>• GET /api/v1 - API documentation</div>
                    <div>• POST /api/v1/db/query - Execute database queries</div>
                    <div>• GET /api/v1/db/connection - Database connection info</div>
                    <div>• GET /api/v1/db/tables - List database tables</div>
                    <div>• GET /api/v1/db/schema - Database schema info</div>
                    <div>• GET /api/v1/workflows - Workflow operations</div>
                    <div>• GET /api/v1/opportunities - Opportunity management</div>
                    <div>• GET /api/v1/search/semantic - Semantic search</div>
                </div>
            </div>
        `;
    }
    
    modalHTML += `
        <div style="margin-top: 25px; text-align: center;">
            <button onclick="document.getElementById('apiDetailsModal').remove()" 
                    style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                Close
            </button>
        </div>
    `;
    
    content.innerHTML = modalHTML;
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    console.log('✅ API modal created and displayed');
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

console.log('✅ API health handler script loaded');