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
    
    // Default response for unhandled queries
    console.log(`⚠️  Mock database: Unhandled query: ${textLower.substring(0, 100)}...`);
    return { rows: [], rowCount: 0 };
}

// Helper function to extract parameter values
function extractParamValue(text, params, index) {
    return params[index] !== undefined ? params[index] : null;
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