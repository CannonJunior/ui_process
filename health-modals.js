/**
 * Health Status Modal Functions
 * Extracted from api-health-handler.js to retain modal functionality
 */

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

// Make functions globally available
window.showApiModal = showApiModal;
window.showDataModal = showDataModal;