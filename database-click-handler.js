/**
 * Simple Database Click Handler
 * Direct implementation to ensure click functionality works
 */

console.log('🔗 Database click handler script loading...');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM loaded - setting up database click handler');
    
    // Multiple attempts to ensure it gets set up
    let attempts = 0;
    const maxAttempts = 10;
    
    function setupClickHandler() {
        attempts++;
        console.log(`🔄 Setup attempt ${attempts}/${maxAttempts}`);
        
        const dataHealthIndicator = document.getElementById('dataHealthIndicator');
        
        if (dataHealthIndicator) {
            console.log('✅ dataHealthIndicator found!');
            
            // Clear any existing handlers by cloning the element
            const parent = dataHealthIndicator.parentNode;
            const newElement = dataHealthIndicator.cloneNode(true);
            parent.replaceChild(newElement, dataHealthIndicator);
            
            // Set up the click handler on the new element
            newElement.style.cursor = 'pointer';
            newElement.style.border = '2px solid #007bff';
            
            // Start health monitoring for database
            startDatabaseHealthMonitoring(newElement);
            
            const clickHandler = async function(event) {
                console.log('🖱️ CLICK DETECTED ON DATABASE INDICATOR!');
                event.preventDefault();
                event.stopPropagation();
                
                try {
                    await showDatabaseModal();
                } catch (error) {
                    console.error('❌ Error showing database modal:', error);
                }
            };
            
            // Add click handler with multiple methods for maximum compatibility
            newElement.addEventListener('click', clickHandler, true);
            newElement.onclick = clickHandler;
            
            // Add hover effects
            newElement.addEventListener('mouseenter', () => {
                newElement.style.opacity = '0.8';
                console.log('🐭 Mouse enter detected');
            });
            
            newElement.addEventListener('mouseleave', () => {
                newElement.style.opacity = '1';
                console.log('🐭 Mouse leave detected');
            });
            
            console.log('✅ Database click handler setup complete');
            console.log('✅ Element has onclick:', newElement.onclick ? 'YES' : 'NO');
            
        } else {
            console.warn(`⚠️ dataHealthIndicator not found (attempt ${attempts})`);
            
            if (attempts < maxAttempts) {
                setTimeout(setupClickHandler, 500);
            } else {
                console.error('❌ Failed to find dataHealthIndicator after maximum attempts');
            }
        }
    }
    
    // Start setup attempts
    setupClickHandler();
});

function startDatabaseHealthMonitoring(element) {
    console.log('💓 Starting database health monitoring');
    
    async function checkDatabaseHealth() {
        try {
            const response = await fetch('http://localhost:3001/api/v1/db/connection');
            const isOnline = response.ok;
            
            updateDatabaseHealthIndicator(element, isOnline, response.status);
            
            if (isOnline) {
                const data = await response.json();
                console.log('💚 Database is online:', data.status);
            } else {
                console.log('💔 Database is offline, status:', response.status);
            }
            
        } catch (error) {
            console.log('💔 Database check failed:', error.message);
            updateDatabaseHealthIndicator(element, false, 'error');
        }
    }
    
    // Check immediately
    checkDatabaseHealth();
    
    // Check at configured interval (default 10 seconds)
    const dataHealthInterval = window.AppConfig?.healthCheck?.dataHealthInterval || 10000;
    setInterval(checkDatabaseHealth, dataHealthInterval);
}

function updateDatabaseHealthIndicator(element, isOnline, status) {
    const healthDot = element.querySelector('.health-dot');
    const healthStatus = element.querySelector('.health-status');
    
    console.log('🔄 Updating database health indicator:', { isOnline, status, element, healthDot });
    
    if (healthDot) {
        // Remove all existing classes
        healthDot.classList.remove('online', 'offline', 'connecting');
        
        // Add the correct class
        if (isOnline) {
            healthDot.classList.add('online');
            //healthDot.style.backgroundColor = '#10b981'; // Force green color
        } else {
            healthDot.classList.add('offline');
            healthDot.style.backgroundColor = '#ef4444'; // Force red color
        }
        
        console.log(`✅ Database health updated: ${isOnline ? 'ONLINE' : 'OFFLINE'} (${status})`);
        console.log('✅ Health dot classes:', healthDot.className);
        console.log('✅ Health dot style:', healthDot.style.backgroundColor);
    } else {
        console.error('❌ Health dot not found in database indicator');
    }
    
    if (healthStatus) {
        healthStatus.textContent = 'Data';
    }
    
    // Update title with status
    element.title = isOnline ? `Database Connection Status: Online (${status})` : `Database Connection Status: Offline (${status})`;
    
    // Force a visual update
    element.style.display = 'none';
    element.offsetHeight; // Trigger reflow
    element.style.display = '';
}

// Database modal function
async function showDatabaseModal() {
    console.log('📊 showDatabaseModal() called');
    
    try {
        // Get database information
        console.log('📡 Fetching database info...');
        
        const [connectionResponse, tablesResponse] = await Promise.all([
            fetch('http://localhost:3001/api/v1/db/connection').catch(e => {
                console.error('Connection fetch failed:', e);
                return null;
            }),
            fetch('http://localhost:3001/api/v1/db/tables').catch(e => {
                console.error('Tables fetch failed:', e);
                return null;
            })
        ]);
        
        console.log('📡 Responses received:', {
            connection: connectionResponse ? connectionResponse.status : 'FAILED',
            tables: tablesResponse ? tablesResponse.status : 'FAILED'
        });
        
        let connectionData = null;
        let tablesData = null;
        
        if (connectionResponse && connectionResponse.ok) {
            connectionData = await connectionResponse.json();
        }
        
        if (tablesResponse && tablesResponse.ok) {
            tablesData = await tablesResponse.json();
        }
        
        // Create modal
        createDatabaseModal(connectionData, tablesData);
        
    } catch (error) {
        console.error('❌ Error in showDatabaseModal:', error);
        
        // Show error modal
        createDatabaseModal(null, null, error.message);
    }
}

function createDatabaseModal(connectionData, tablesData, errorMessage = null) {
    console.log('🎭 Creating database modal...');
    
    // Remove existing modal
    const existingModal = document.getElementById('databaseDetailsModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'databaseDetailsModal';
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
    
    let modalHTML = '<h2>🗄️ PostgreSQL Database Details</h2>';
    
    if (errorMessage) {
        modalHTML += `
            <div style="color: #dc2626; padding: 15px; background: #fef2f2; border-radius: 5px; margin: 15px 0;">
                <h3>❌ Error</h3>
                <p>${errorMessage}</p>
            </div>
        `;
    } else {
        // Connection information
        if (connectionData && connectionData.connection) {
            const conn = connectionData.connection;
            modalHTML += `
                <div style="margin: 20px 0;">
                    <h3>🔌 Connection Information</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Host:</td><td style="padding: 8px; border: 1px solid #ddd;">${conn.host}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Port:</td><td style="padding: 8px; border: 1px solid #ddd;">${conn.port}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Database:</td><td style="padding: 8px; border: 1px solid #ddd;">${conn.database}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Username:</td><td style="padding: 8px; border: 1px solid #ddd;">${conn.username}</td></tr>
                        <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">URL:</td><td style="padding: 8px; border: 1px solid #ddd;">${conn.url}</td></tr>
                    </table>
                </div>
            `;
        }
        
        // Tables information
        if (tablesData && tablesData.tables) {
            modalHTML += `
                <div style="margin: 20px 0;">
                    <h3>📋 Available Tables (${tablesData.count})</h3>
                    <div style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 10px;">
            `;
            
            tablesData.tables.forEach(table => {
                modalHTML += `<div style="padding: 5px; border-bottom: 1px solid #eee;">• ${table.table_name}</div>`;
            });
            
            modalHTML += '</div></div>';
        }
    }
    
    modalHTML += `
        <div style="margin-top: 25px; text-align: center;">
            <button onclick="document.getElementById('databaseDetailsModal').remove()" 
                    style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                Close
            </button>
        </div>
    `;
    
    content.innerHTML = modalHTML;
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    console.log('✅ Database modal created and displayed');
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

console.log('✅ Database click handler script loaded');
