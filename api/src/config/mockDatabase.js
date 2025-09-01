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
    entityRelationships: [],
    documentChunks: [],
    chatConversations: [],
    chatMessages: []
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
    
    // Handle database connection info query
    if (textLower.includes('current_database') && textLower.includes('current_user')) {
        return {
            rows: [{
                database_name: 'ui_process_dev',
                username: 'ui_process_user',
                server_host: '127.0.0.1',
                server_port: 5432,
                version: 'PostgreSQL 15.0 (Mock) on x86_64-pc-linux-gnu, compiled by gcc (Ubuntu 9.4.0-1ubuntu1~20.04.2) 9.4.0, 64-bit'
            }]
        };
    }
    
    // Handle pgvector extension check
    if (textLower.includes('select') && textLower.includes('extname') && textLower.includes('pg_extension')) {
        return {
            rows: [{
                extname: 'vector',
                extversion: '0.5.1'
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
    
    if (textLower.includes('from document_chunks')) {
        // Handle vector similarity queries
        if (textLower.includes('<=>') || textLower.includes('vector')) {
            // Mock vector search results with realistic similarity scores
            const mockVectorResults = data.documentChunks.map(chunk => ({
                ...chunk,
                distance: Math.random() * 0.5, // Random distance 0-0.5
                similarity: 1 - (Math.random() * 0.5) // Random similarity 0.5-1.0
            }))
            // Sort by similarity (descending)
            .sort((a, b) => b.similarity - a.similarity);
            
            return { rows: mockVectorResults };
        }
        
        return { rows: data.documentChunks };
    }
    
    if (textLower.includes('from chat_conversations')) {
        return { rows: data.chatConversations };
    }
    
    if (textLower.includes('from chat_messages')) {
        return { rows: data.chatMessages };
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
    
    if (textLower.includes('insert into document_chunks')) {
        const chunk = {
            id: uuidv4(),
            organization_id: extractParamValue(text, params, 0),
            source_entity_type: extractParamValue(text, params, 1),
            source_entity_id: extractParamValue(text, params, 2),
            chunk_text: extractParamValue(text, params, 3),
            chunk_index: parseInt(extractParamValue(text, params, 4)) || 0,
            metadata: JSON.parse(extractParamValue(text, params, 5) || '{}'),
            embedding: JSON.parse(extractParamValue(text, params, 6) || '[]'),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        data.documentChunks.push(chunk);
        return { rows: [chunk] };
    }
    
    if (textLower.includes('insert into chat_conversations')) {
        const conversation = {
            id: uuidv4(),
            organization_id: extractParamValue(text, params, 0),
            user_id: extractParamValue(text, params, 1),
            workflow_id: extractParamValue(text, params, 2),
            title: extractParamValue(text, params, 3),
            metadata: JSON.parse(extractParamValue(text, params, 4) || '{}'),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        data.chatConversations.push(conversation);
        return { rows: [conversation] };
    }
    
    if (textLower.includes('insert into chat_messages')) {
        const message = {
            id: uuidv4(),
            conversation_id: extractParamValue(text, params, 0),
            role: extractParamValue(text, params, 1),
            content: extractParamValue(text, params, 2),
            metadata: JSON.parse(extractParamValue(text, params, 3) || '{}'),
            embedding: JSON.parse(extractParamValue(text, params, 4) || '[]'),
            created_at: new Date().toISOString()
        };
        data.chatMessages.push(message);
        return { rows: [message] };
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
    
    cosineSimilarity: async (vector1, vector2) => {
        // Mock cosine similarity calculation with some variance
        const baseSimilarity = 0.8;
        const variance = (Math.random() - 0.5) * 0.4; // ±0.2 variance
        return Math.max(0, Math.min(1, baseSimilarity + variance));
    },
    
    findSimilar: async (tableName, vectorColumn, queryVector, limit = 10) => {
        console.log(`🔍 Mock vector search in ${tableName} for ${vectorColumn}`);
        
        // Get relevant data based on table name
        let tableData = [];
        switch (tableName) {
            case 'document_chunks':
                tableData = data.documentChunks;
                break;
            case 'workflows':
                tableData = data.workflows;
                break;
            case 'opportunities':
                tableData = data.opportunities;
                break;
            case 'nodes':
                tableData = data.nodes;
                break;
            case 'tasks':
                tableData = data.tasks;
                break;
            default:
                return [];
        }
        
        // Generate mock similarity scores and sort by similarity
        const results = tableData
            .map(item => ({
                ...item,
                similarity: Math.random() * 0.4 + 0.6, // Random similarity 0.6-1.0
                distance: Math.random() * 0.4 // Random distance 0-0.4
            }))
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
            
        console.log(`✅ Mock vector search found ${results.length} results`);
        return results;
    },
    
    // Embedding generation mock
    generateEmbedding: async (text) => {
        console.log(`🧠 Mock embedding generation for: ${text.slice(0, 50)}...`);
        
        // Generate deterministic mock embedding
        const embedding = [];
        const hash = text.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        
        for (let i = 0; i < 1536; i++) {
            const value = Math.sin(hash * (i + 1)) * 0.5;
            embedding.push(value);
        }
        
        return embedding;
    },
    
    // Store document chunks with embeddings
    storeChunk: async (chunk) => {
        console.log(`📄 Storing document chunk: ${chunk.source_entity_type}/${chunk.source_entity_id}`);
        
        // Generate embedding if not provided
        if (!chunk.embedding) {
            chunk.embedding = await vectorOps.generateEmbedding(chunk.chunk_text);
        }
        
        // Add to mock database
        const chunkWithId = {
            id: uuidv4(),
            ...chunk,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        data.documentChunks.push(chunkWithId);
        return chunkWithId;
    },
    
    // Initialize with sample data
    initializeSampleData: () => {
        console.log('📊 Initializing sample vector data...');
        
        // Add some sample document chunks for testing (opportunities removed)
        const sampleChunks = [
            {
                organization_id: 'dev-org-id',
                source_entity_type: 'workflow',
                source_entity_id: 'sample-workflow-001',
                chunk_text: 'This is a sample workflow for processing tasks and managing project steps efficiently.',
                chunk_index: 0,
                metadata: { sample: true, type: 'workflow_description' }
            },
            {
                organization_id: 'dev-org-id',
                source_entity_type: 'task',
                source_entity_id: 'sample-task-001',
                chunk_text: 'Complete the implementation of the vector search functionality for the workflow management system.',
                chunk_index: 0,
                metadata: { sample: true, type: 'task_description' }
            }
        ];
        
        // Store sample chunks
        sampleChunks.forEach(chunk => {
            vectorOps.storeChunk(chunk);
        });
        
        console.log(`✅ Initialized ${sampleChunks.length} sample document chunks`);
    }
};

// Initialize mock data
initializeMockData();

// Initialize sample vector data for Phase 3
vectorOps.initializeSampleData();

export default { query, transaction, testConnection, getClient, closePool, vectorOps };