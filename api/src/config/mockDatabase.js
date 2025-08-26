/**
 * Mock Database Implementation
 * In-memory data storage for development without PostgreSQL
 */

import { v4 as uuidv4 } from 'uuid';

// In-memory data stores
const data = {
    organizations: [],
    users: [],
    workflows: [],
    opportunities: [],
    nodes: [],
    tasks: [],
    flowlines: [],
    taskTags: [],
    entityRelationships: []
};

// Initialize with default data
function initializeMockData() {
    // Create default organization with fixed ID for development
    const orgId = 'dev-org-id';
    data.organizations.push({
        id: orgId,
        name: 'UI Process Development',
        slug: 'ui-process-dev',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    });

    // Create default user with fixed ID for development
    const userId = 'dev-user-id';
    data.users.push({
        id: userId,
        organization_id: orgId,
        email: 'dev@uiprocess.local',
        name: 'Development User',
        role: 'admin',
        password: '$2a$12$placeholder', // Placeholder hash
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    });

    console.log('📊 Mock database initialized with default data');
}

// Mock query function
export async function query(text, params = []) {
    // Simulate database delay
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const textLower = text.toLowerCase().trim();
    
    // Handle common queries
    if (textLower.includes('select version()')) {
        return {
            rows: [{
                version: 'Mock PostgreSQL 15.0 (Mock pgvector)',
                current_database: 'ui_process_dev'
            }]
        };
    }
    
    if (textLower.includes('select vector_dims')) {
        return { rows: [{ vector_dims: 3 }] };
    }
    
    if (textLower.includes('from workflows')) {
        if (textLower.includes('count(*)')) {
            return { rows: [{ count: data.workflows.length.toString() }] };
        }
        return { rows: data.workflows };
    }
    
    if (textLower.includes('from opportunities')) {
        // Handle opportunities with filters
        let filteredOpportunities = [...data.opportunities];
        
        // Simple filtering for query parameters
        if (textLower.includes('where') && textLower.includes('description')) {
            const descriptionFilter = extractQueryFilter(text, 'description');
            if (descriptionFilter) {
                filteredOpportunities = filteredOpportunities.filter(opp => 
                    opp.description && opp.description.toLowerCase().includes(descriptionFilter.toLowerCase())
                );
            }
        }
        
        // Return with mock workflow names
        const enrichedOpportunities = filteredOpportunities.map(opp => ({
            ...opp,
            workflow_name: data.workflows.find(w => w.id === opp.workflow_id)?.name || 'Unknown Workflow',
            linked_task_count: 0 // Mock count
        }));
        
        return { rows: enrichedOpportunities };
    }
    
    if (textLower.includes('from nodes')) {
        return { rows: data.nodes };
    }
    
    if (textLower.includes('from tasks')) {
        return { rows: data.tasks };
    }
    
    if (textLower.includes('from users') && textLower.includes('where email')) {
        const email = extractParamValue(text, params, 0);
        const user = data.users.find(u => u.email === email);
        return { rows: user ? [user] : [] };
    }
    
    if (textLower.includes('from users') && textLower.includes('where id')) {
        const userId = extractParamValue(text, params, 0);
        const user = data.users.find(u => u.id === userId);
        return { rows: user ? [user] : [] };
    }
    
    if (textLower.includes('from organizations') && textLower.includes('where slug')) {
        const slug = extractParamValue(text, params, 0);
        const org = data.organizations.find(o => o.slug === slug);
        return { rows: org ? [org] : [] };
    }
    
    if (textLower.includes('insert into workflows')) {
        const workflow = {
            id: uuidv4(),
            organization_id: extractParamValue(text, params, 0),
            name: extractParamValue(text, params, 1),
            description: extractParamValue(text, params, 2),
            version: extractParamValue(text, params, 3) || '1.0.0',
            created_by: extractParamValue(text, params, 4),
            metadata: JSON.parse(extractParamValue(text, params, 5) || '{}'),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        data.workflows.push(workflow);
        return { rows: [workflow] };
    }
    
    if (textLower.includes('insert into opportunities')) {
        const opportunity = {
            id: uuidv4(),
            organization_id: extractParamValue(text, params, 0),
            workflow_id: extractParamValue(text, params, 1),
            title: extractParamValue(text, params, 2),
            description: extractParamValue(text, params, 3),
            status: extractParamValue(text, params, 4) || 'active',
            tags: extractParamValue(text, params, 5) || [],
            value: extractParamValue(text, params, 6),
            priority: extractParamValue(text, params, 7) || 'medium',
            deadline: extractParamValue(text, params, 8),
            contact_person: extractParamValue(text, params, 9),
            notes: extractParamValue(text, params, 10),
            source: extractParamValue(text, params, 11) || 'manual',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        data.opportunities.push(opportunity);
        return { rows: [opportunity] };
    }
    
    if (textLower.includes('insert into nodes')) {
        const node = {
            id: uuidv4(),
            workflow_id: extractParamValue(text, params, 0),
            type: extractParamValue(text, params, 1),
            text: extractParamValue(text, params, 2),
            position_x: parseFloat(extractParamValue(text, params, 3)) || 0,
            position_y: parseFloat(extractParamValue(text, params, 4)) || 0,
            style: JSON.parse(extractParamValue(text, params, 5) || '{}'),
            metadata: JSON.parse(extractParamValue(text, params, 6) || '{}'),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        data.nodes.push(node);
        return { rows: [node] };
    }
    
    if (textLower.includes('insert into tasks')) {
        const task = {
            id: uuidv4(),
            workflow_id: extractParamValue(text, params, 0),
            anchored_to: extractParamValue(text, params, 1),
            opportunity_id: extractParamValue(text, params, 2),
            text: extractParamValue(text, params, 3),
            description: extractParamValue(text, params, 4),
            status: extractParamValue(text, params, 5) || 'not_started',
            priority: extractParamValue(text, params, 6) || 'medium',
            due_date: extractParamValue(text, params, 7),
            estimated_hours: parseFloat(extractParamValue(text, params, 8)),
            assigned_to: extractParamValue(text, params, 9),
            position_x: parseFloat(extractParamValue(text, params, 10)) || 0,
            position_y: parseFloat(extractParamValue(text, params, 11)) || 0,
            slot: parseInt(extractParamValue(text, params, 12)) || 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        data.tasks.push(task);
        return { rows: [task] };
    }
    
    // Default response for unhandled queries
    console.log(`⚠️  Mock database: Unhandled query: ${textLower.substring(0, 100)}...`);
    return { rows: [], rowCount: 0 };
}

// Helper function to extract parameter values
function extractParamValue(text, params, index) {
    return params[index] !== undefined ? params[index] : null;
}

// Helper function to extract query filters from URL parameters
function extractQueryFilter(text, field) {
    const regex = new RegExp(`${field}\\s*=\\s*([^&\\s]+)`, 'i');
    const match = text.match(regex);
    return match ? decodeURIComponent(match[1]) : null;
}

// Mock transaction function
export async function transaction(callback) {
    // For mock implementation, just execute the callback
    // In real implementation, this would handle rollback on error
    const mockClient = { query };
    return await callback(mockClient);
}

// Mock connection functions
export async function testConnection() {
    console.log('✅ Mock database connected successfully');
    console.log('   Version: Mock PostgreSQL 15.0');
    console.log('   Database: ui_process_dev (mock)');
    console.log('✅ pgvector extension is available (mock)');
    return true;
}

export async function getClient() {
    return { query, release: () => {} };
}

export async function closePool() {
    console.log('✅ Mock database connection pool closed');
}

// Vector operations (mock)
export const vectorOps = {
    createVector: (array) => `[${array.join(',')}]`,
    cosineSimilarity: async (vector1, vector2) => 0.8, // Mock similarity
    findSimilar: async (tableName, vectorColumn, queryVector, limit = 10) => []
};

// Initialize mock data
initializeMockData();

export default { query, transaction, testConnection, getClient, closePool, vectorOps };