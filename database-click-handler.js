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
            const response = await fetch('http://localhost:3002/api/v1/db/connection');
            const isOnline = response.ok;
            
            updateDatabaseHealthIndicator(element, isOnline, response.status);
            
            if (isOnline) {
                const data = await response.json();
                // console.log('💚 Database is online:', data.status);
            } else {
                // console.log('💔 Database is offline, status:', response.status);
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
            fetch('http://localhost:3002/api/v1/db/connection').catch(e => {
                console.error('Connection fetch failed:', e);
                return null;
            }),
            fetch('http://localhost:3002/api/v1/db/tables').catch(e => {
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
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <h3>📋 Available Tables (${tablesData.count})</h3>
                        <div>
                            <label style="margin-right: 15px; cursor: pointer;">
                                <input type="checkbox" id="selectAllTables" onchange="toggleAllTables()" style="margin-right: 5px;">
                                Select All
                            </label>
                            <button id="clearTablesBtn" onclick="clearSelectedTables()" 
                                    style="padding: 5px 15px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer;">
                                Clear Selected
                            </button>
                        </div>
                    </div>
                    <div style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; padding: 10px;" id="tablesContainer">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #f5f5f5;">
                                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left; width: 30px;"></th>
                                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Table Name</th>
                                    <th style="padding: 8px; border: 1px solid #ddd; text-align: right; width: 80px;">Row Count</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            tablesData.tables.forEach((table, index) => {
                modalHTML += `
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
                            <input type="checkbox" class="table-checkbox" 
                                   data-table-name="${table.table_name}" 
                                   data-table-schema="${table.table_schema}"
                                   onchange="updateSelectAllState()">
                        </td>
                        <td style="padding: 8px; border: 1px solid #ddd;">
                            ${table.table_schema}.${table.table_name}
                        </td>
                        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">
                            <span id="count-${table.table_schema}-${table.table_name}">${table.row_count || 0}</span>
                        </td>
                    </tr>
                `;
            });
            
            modalHTML += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
    }
    
    modalHTML += `
        <div style="margin-top: 25px; text-align: center;">
            <button onclick="document.getElementById('databaseDetailsModal').remove()" 
                    style="padding: 10px 20px; color: white; border: none; border-radius: 5px; cursor: pointer;">
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

// JavaScript functions for table management
function toggleAllTables() {
    const selectAllCheckbox = document.getElementById('selectAllTables');
    const tableCheckboxes = document.querySelectorAll('.table-checkbox');
    
    tableCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    
    console.log(`📋 ${selectAllCheckbox.checked ? 'Selected' : 'Deselected'} all ${tableCheckboxes.length} tables`);
}

function updateSelectAllState() {
    const selectAllCheckbox = document.getElementById('selectAllTables');
    const tableCheckboxes = document.querySelectorAll('.table-checkbox');
    const checkedCount = document.querySelectorAll('.table-checkbox:checked').length;
    
    if (checkedCount === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else if (checkedCount === tableCheckboxes.length) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
    }
}

async function clearSelectedTables() {
    const selectedCheckboxes = document.querySelectorAll('.table-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        alert('Please select at least one table to clear.');
        return;
    }
    
    const tableNames = Array.from(selectedCheckboxes).map(cb => cb.dataset.tableName).join(', ');
    
    if (!confirm(`Are you sure you want to clear all data from ${selectedCheckboxes.length} selected table(s)?\n\nTables: ${tableNames}\n\nThis action cannot be undone.`)) {
        return;
    }
    
    console.log(`🗑️ Clearing ${selectedCheckboxes.length} selected tables`);
    
    // Prepare table data
    const tablesToClear = Array.from(selectedCheckboxes).map(checkbox => ({
        table_name: checkbox.dataset.tableName,
        table_schema: checkbox.dataset.tableSchema
    }));
    
    try {
        // Show loading state
        const clearBtn = document.getElementById('clearTablesBtn');
        clearBtn.disabled = true;
        clearBtn.textContent = 'Clearing...';
        clearBtn.style.background = '#9ca3af';
        
        const response = await fetch('http://localhost:3002/api/v1/db/clear-tables', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tables: tablesToClear })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            console.log('✅ Tables cleared successfully:', result);
            
            // Update row counts in the UI
            result.results.forEach(tableResult => {
                if (tableResult.status === 'success') {
                    const countElement = document.getElementById(`count-${tableResult.schema}-${tableResult.table}`);
                    if (countElement) {
                        countElement.textContent = '0';
                    }
                }
            });
            
            // Uncheck all checkboxes
            selectedCheckboxes.forEach(checkbox => checkbox.checked = false);
            updateSelectAllState();
            
            alert(`Successfully cleared ${result.successCount} table(s). ${result.errorCount > 0 ? `Failed to clear ${result.errorCount} table(s).` : ''}`);
            
        } else {
            throw new Error(result.message || 'Failed to clear tables');
        }
        
    } catch (error) {
        console.error('❌ Error clearing tables:', error);
        alert(`Error clearing tables: ${error.message}`);
    } finally {
        // Reset button state
        const clearBtn = document.getElementById('clearTablesBtn');
        clearBtn.disabled = false;
        clearBtn.textContent = 'Clear Selected';
        clearBtn.style.background = '#dc2626';
    }
}

// Make functions globally available
window.toggleAllTables = toggleAllTables;
window.updateSelectAllState = updateSelectAllState;
window.clearSelectedTables = clearSelectedTables;

console.log('✅ Database click handler script loaded');
