/**
 * Simple API Health Handler
 * Direct implementation to ensure API health indicator and click functionality works
 */

console.log('🔗 API health handler script loading...');

// Global debug function - available immediately
window.testDatabaseConnection = async () => {
    console.log('🔬 Manual database connection test...');
    try {
        const response = await fetch('http://localhost:3002/api/v1/db/connection', {
            method: 'GET',
            mode: 'cors',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        console.log('✅ Manual test response:', {
            status: response.status,
            ok: response.ok,
            url: response.url,
            type: response.type,
            headers: Object.fromEntries(response.headers.entries())
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Manual test data:', data);
            console.log('✅ Status field:', data.status);
            console.log('✅ Connection info:', data.connection);
            return data;
        } else {
            console.error('❌ Manual test failed:', response.status);
            return null;
        }
    } catch (error) {
        console.error('❌ Manual test error:', error);
        console.error('❌ Error type:', error.constructor.name);
        console.error('❌ Error message:', error.message);
        return null;
    }
};

console.log('🔧 testDatabaseConnection() function loaded and ready!');

// IMMEDIATE CHECK - Don't wait for DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', immediateHealthCheck);
} else {
    // DOM already loaded
    immediateHealthCheck();
}

async function immediateHealthCheck() {
    console.log('🚀 IMMEDIATE HEALTH CHECK STARTING');
    
    // Try to find and update indicators immediately
    const apiIndicator = document.getElementById('apiHealthIndicator');
    const dataIndicator = document.getElementById('dataHealthIndicator');
    
    console.log('🔍 Found indicators:', { api: !!apiIndicator, data: !!dataIndicator });
    
    if (apiIndicator) {
        console.log('🎯 Forcing API indicator update...');
        await forceUpdateIndicator(apiIndicator, 'http://localhost:3001/health');
    }
    
    if (dataIndicator) {
        console.log('🎯 Forcing Data indicator update...');
        await forceUpdateIndicator(dataIndicator, 'http://localhost:3002/api/v1/db/connection');
    }
}

async function forceUpdateIndicator(element, url) {
    try {
        const response = await fetch(url);
        const isOnline = response.ok;
        
        console.log(`🔧 FORCE UPDATE: ${url} -> ${response.status} (${isOnline ? 'ONLINE' : 'OFFLINE'})`);
        
        const healthDot = element.querySelector('.health-dot');
        if (healthDot) {
            healthDot.classList.remove('online', 'offline', 'connecting');
            if (isOnline) {
                healthDot.classList.add('online');
                healthDot.style.setProperty('color', '#28a745', 'important');
                console.log('🟢 FORCED DOT TO GREEN');
            } else {
                healthDot.classList.add('offline');  
                healthDot.style.setProperty('color', '#dc3545', 'important');
                console.log('🔴 FORCED DOT TO RED');
            }
        } else {
            console.error('❌ NO HEALTH DOT FOUND IN INDICATOR');
        }
    } catch (error) {
        console.error('❌ FORCE UPDATE FAILED:', error);
    }
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM loaded - setting up health handlers');
    
    // Multiple attempts to ensure it gets set up
    let attempts = 0;
    const maxAttempts = 10;
    
    function setupHealthIndicators() {
        attempts++;
        console.log(`🔄 Health setup attempt ${attempts}/${maxAttempts}`);
        
        const apiHealthIndicator = document.getElementById('apiHealthIndicator');
        const dataHealthIndicator = document.getElementById('dataHealthIndicator');
        
        let foundAny = false;
        
        if (apiHealthIndicator) {
            console.log('✅ apiHealthIndicator found!');
            
            // Set up click handler
            setupApiClickHandler(apiHealthIndicator);
            
            // Start health monitoring
            startApiHealthMonitoring(apiHealthIndicator);
            foundAny = true;
            
            console.log('✅ API health handler setup complete');
        } else {
            console.warn(`⚠️ apiHealthIndicator not found (attempt ${attempts})`);
        }
        
        if (dataHealthIndicator) {
            console.log('✅ dataHealthIndicator found!');
            
            // Set up click handler only - health monitoring handled by health-manager.js
            setupDataClickHandler(dataHealthIndicator);
            foundAny = true;
            
            console.log('✅ Data health click handler setup complete (monitoring handled by health-manager.js)');
        } else {
            console.warn(`⚠️ dataHealthIndicator not found (attempt ${attempts})`);
        }
        
        if (foundAny) {
            console.log('✅ Health handlers setup complete');
        } else if (attempts < maxAttempts) {
            setTimeout(setupHealthIndicators, 500);
        } else {
            console.error('❌ Failed to find health indicators after maximum attempts');
        }
    }
    
    // Start setup attempts
    setupHealthIndicators();
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
                // console.log('💚 API is online:', data.status);
            } else {
                // console.log('💔 API is offline, status:', response.status);
            }
            
        } catch (error) {
            console.log('💔 API check failed:', error.message);
            updateApiHealthIndicator(element, false, 'error');
        }
    }
    
    // Check immediately
    checkApiHealth();
    
    // Check at configured interval (default 10 seconds)
    const apiHealthInterval = window.AppConfig?.healthCheck?.apiHealthInterval || 10000;
    setInterval(checkApiHealth, apiHealthInterval);
    
    // Also check when page becomes visible (user switches tabs)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            console.log('👁️ Page became visible - checking API health');
            checkApiHealth();
        }
    });
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
            healthDot.style.setProperty('color', '#28a745', 'important'); // Force green color with !important
        } else {
            healthDot.classList.add('offline');
            healthDot.style.setProperty('color', '#dc3545', 'important'); // Force red color with !important
        }
        
        console.log(`✅ API health updated: ${isOnline ? 'ONLINE' : 'OFFLINE'} (${status})`);
        console.log('✅ Health dot classes:', healthDot.className);
        console.log('✅ Health dot style:', healthDot.style.color);
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

// Data health indicator functions
function setupDataClickHandler(element) {
    console.log('🎯 Setting up Data click handler');
    
    // Clear any existing handlers by cloning the element
    const parent = element.parentNode;
    const newElement = element.cloneNode(true);
    parent.replaceChild(newElement, element);
    
    // Set up the click handler on the new element
    newElement.style.cursor = 'pointer';
    
    const clickHandler = async function(event) {
        console.log('🖱️ CLICK DETECTED ON DATA INDICATOR!');
        event.preventDefault();
        event.stopPropagation();
        
        try {
            await showDatabaseModal();
        } catch (error) {
            console.error('❌ Error showing Database modal:', error);
        }
    };
    
    // Add click handler with multiple methods for maximum compatibility
    newElement.addEventListener('click', clickHandler, true);
    newElement.onclick = clickHandler;
    
    // Add hover effects
    newElement.addEventListener('mouseenter', () => {
        newElement.style.opacity = '0.8';
        console.log('🐭 Data mouse enter detected');
    });
    
    newElement.addEventListener('mouseleave', () => {
        newElement.style.opacity = '1';
        console.log('🐭 Data mouse leave detected');
    });
    
    console.log('✅ Data click handler attached');
}

function startDataHealthMonitoring(element) {
    console.log('💓 Starting Data health monitoring');
    
    async function checkDataHealth() {
        try {
            // Check both connection and tables like the modal does
            const connectionResponse = await fetch('http://localhost:3002/api/v1/db/connection', {
                method: 'GET',
                mode: 'cors',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const tablesResponse = await fetch('http://localhost:3002/api/v1/db/tables', {
                method: 'GET',
                mode: 'cors', 
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            console.log('🔍 Database health check responses:', { 
                connection: connectionResponse.ok ? 'OK' : 'FAILED',
                tables: tablesResponse.ok ? 'OK' : 'FAILED'
            });
            
            let isOnline = false;
            let actualStatus = 'unknown';
            
            // If connection API works, PostgreSQL is working - force green
            if (connectionResponse.ok) {
                isOnline = true;
                actualStatus = 'connected';
                console.log('✅ Database connection API successful - forcing green dot');
            } else {
                isOnline = false;
                actualStatus = 'api_failed';
                console.log('❌ Database connection API failed - red dot');
            }
            
            updateDataHealthIndicator(element, isOnline, actualStatus);
            
        } catch (error) {
            console.error('💔 Database check failed:', error);
            console.error('💔 Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            
            // Check if it's a CORS error
            if (error.message.includes('CORS') || error.message.includes('blocked')) {
                console.error('🚫 CORS error detected - browser blocked the request');
                updateDataHealthIndicator(element, false, 'cors_blocked');
            } else {
                updateDataHealthIndicator(element, false, 'fetch_error');
            }
        }
    }
    
    // Check immediately
    checkDataHealth();
    
    // Check at configured interval (default 10 seconds)
    const dataHealthInterval = window.AppConfig?.healthCheck?.dataHealthInterval || 10000;
    setInterval(checkDataHealth, dataHealthInterval);
    
    // Add a global test function for debugging - make it available immediately
    if (!window.testDatabaseConnection) {
        window.testDatabaseConnection = async () => {
        console.log('🔬 Manual database connection test...');
        try {
            const response = await fetch('http://localhost:3002/api/v1/db/connection', {
                method: 'GET',
                mode: 'cors',
                credentials: 'include'
            });
            
            console.log('✅ Manual test response:', {
                status: response.status,
                ok: response.ok,
                headers: Object.fromEntries(response.headers.entries())
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Manual test data:', data);
                return data;
            } else {
                console.error('❌ Manual test failed:', response.status);
                return null;
            }
        } catch (error) {
            console.error('❌ Manual test error:', error);
            return null;
        }
        };
    }
    
    // Also check when page becomes visible
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            console.log('👁️ Page became visible - checking Data health');
            checkDataHealth();
        }
    });
}

function updateDataHealthIndicator(element, isOnline, status) {
    const healthDot = element.querySelector('.health-dot');
    const healthStatus = element.querySelector('.health-status');
    
    console.log('🔄 Updating Data health indicator:', { isOnline, status, element, healthDot });
    
    // Match the colors used in the Database Connection Details modal
    const statusColor = isOnline ? '#10b981' : '#ef4444';
    const statusText = isOnline ? 'Connected' : 'Disconnected';
    const dotSymbol = isOnline ? '🟢' : '🔴';
    
    if (healthDot) {
        // Remove all existing classes
        healthDot.classList.remove('online', 'offline', 'connecting');
        
        // Add the correct class and update both color and symbol to match modal
        if (isOnline) {
            healthDot.classList.add('online');
            healthDot.style.setProperty('color', statusColor, 'important'); // Use same green as modal
            healthDot.textContent = dotSymbol; // Green circle emoji
        } else {
            healthDot.classList.add('offline');
            healthDot.style.setProperty('color', statusColor, 'important'); // Use same red as modal
            healthDot.textContent = dotSymbol; // Red circle emoji
        }
        
        console.log(`✅ Data health updated: ${isOnline ? 'ONLINE' : 'OFFLINE'} (${status})`);
        console.log('✅ Health dot classes:', healthDot.className);
        console.log('✅ Health dot style:', healthDot.style.color);
        console.log('✅ Health dot symbol:', healthDot.textContent);
    } else {
        console.error('❌ Health dot not found in Data indicator');
    }
    
    if (healthStatus) {
        // Update text to match modal status and apply same color
        healthStatus.textContent = statusText;
        healthStatus.style.setProperty('color', statusColor, 'important');
        console.log(`✅ Health status text updated: "${statusText}" with color: ${statusColor}`);
    }
    
    // Update title with status
    element.title = isOnline ? `PostgreSQL Database: Connected (${status})` : `PostgreSQL Database: Disconnected (${status})`;
    
    // Remove any background color to prevent orange background
    element.style.setProperty('background-color', 'transparent', 'important');
    element.style.setProperty('background', 'transparent', 'important');
    
    // Force a visual update
    element.style.display = 'none';
    element.offsetHeight; // Trigger reflow
    element.style.display = '';
}

// Data modal function
async function showDataModal() {
    console.log('📊 showDataModal() called');
    
    try {
        // Get database information
        console.log('📡 Fetching database info...');
        
        const connectionResponse = await fetch('http://localhost:3002/api/v1/db/connection');
        const connectionData = connectionResponse.ok ? await connectionResponse.json() : null;
        
        // Get database schema info
        const schemaResponse = await fetch('http://localhost:3002/api/v1/db/schema').catch(() => null);
        const schemaData = schemaResponse && schemaResponse.ok ? await schemaResponse.json() : null;
        
        // Get table info
        const tablesResponse = await fetch('http://localhost:3002/api/v1/db/tables').catch(() => null);
        const tablesData = tablesResponse && tablesResponse.ok ? await tablesResponse.json() : null;
        
        console.log('📡 Database responses received:', {
            connection: connectionResponse.status,
            schema: schemaResponse ? schemaResponse.status : 'FAILED',
            tables: tablesResponse ? tablesResponse.status : 'FAILED'
        });
        
        // Create modal
        createDataModal(connectionData, schemaData, tablesData, connectionResponse.status);
        
    } catch (error) {
        console.error('❌ Error in showDataModal:', error);
        createDataModal(null, null, null, 'error', error.message);
    }
}

function createDataModal(connectionData, schemaData, tablesData, status, errorMessage = null) {
    console.log('🎭 Creating Data modal...');
    
    // Remove existing modal
    const existingModal = document.getElementById('dataDetailsModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'dataDetailsModal';
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
    
    let modalHTML = '<h2>🗄️ Database Connection Details</h2>';
    
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
        const statusText = isOnline ? '🟢 Connected' : '🔴 Disconnected';
        
        modalHTML += `
            <div style="margin: 20px 0;">
                <h3>📊 Database Status</h3>
                <div style="padding: 15px; background: ${isOnline ? '#f0f9ff' : '#fef2f2'}; border-radius: 5px;">
                    <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span></p>
                    <p><strong>Response Code:</strong> ${status}</p>
                    <p><strong>Database Type:</strong> PostgreSQL with pgvector</p>
                </div>
            </div>
        `;
        
        // Connection data information
        if (connectionData && connectionData.connection) {
            const conn = connectionData.connection;
            modalHTML += `
                <div style="margin: 20px 0;">
                    <h3>🔗 Connection Info</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Database:</td><td style="padding: 8px; border: 1px solid #ddd;">${conn.database || 'ui_process_dev'}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Version:</td><td style="padding: 8px; border: 1px solid #ddd;">${conn.version || 'PostgreSQL 15.14'}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Host:</td><td style="padding: 8px; border: 1px solid #ddd;">${conn.host || 'localhost'}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Port:</td><td style="padding: 8px; border: 1px solid #ddd;">${conn.port || '5432'}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">pgvector:</td><td style="padding: 8px; border: 1px solid #ddd;">${conn.extensions?.includes('vector') ? '✅ Available' : '❌ Not Available'}</td></tr>
                    </table>
                </div>
            `;
        }
        
        // Tables information
        if (tablesData && tablesData.tables) {
            modalHTML += `
                <div style="margin: 20px 0;">
                    <h3>📋 Database Tables</h3>
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; font-family: monospace;">
            `;
            
            tablesData.tables.forEach(table => {
                modalHTML += `<div>• ${table.table_name} (${table.row_count || 0} rows)</div>`;
            });
            
            modalHTML += '</div></div>';
        }
        
        // Available operations
        modalHTML += `
            <div style="margin: 20px 0;">
                <h3>⚙️ Available Operations</h3>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; font-family: monospace;">
                    <div>• GET /api/v1/db/connection - Connection status</div>
                    <div>• GET /api/v1/db/schema - Database schema</div>
                    <div>• GET /api/v1/db/tables - List all tables</div>
                    <div>• POST /api/v1/db/query - Execute SQL queries</div>
                    <div>• GET /api/v1/workflows - Workflow storage</div>
                    <div>• GET /api/v1/search/semantic - Vector search</div>
                </div>
            </div>
        `;
    }
    
    modalHTML += `
        <div style="margin-top: 25px; text-align: center;">
            <button onclick="document.getElementById('dataDetailsModal').remove()" 
                    style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                Close
            </button>
        </div>
    `;
    
    content.innerHTML = modalHTML;
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    console.log('✅ Data modal created and displayed');
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Global function to manually test health indicators
window.testHealthIndicators = async function() {
    console.log('🧪 MANUAL HEALTH TEST TRIGGERED');
    await immediateHealthCheck();
};

console.log('✅ API and Data health handler script loaded');
console.log('💡 Run window.testHealthIndicators() in console to manually test health indicators');