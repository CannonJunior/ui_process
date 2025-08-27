/**
 * Workflow Ingestion Service
 * Processes workflow objects and creates embeddings for vector search within the current session
 */

import { getSearchService } from './search-service.js';
import { getAPIClient } from './api-client.js';

class WorkflowIngestionService {
    constructor() {
        this.searchService = null;
        this.apiClient = null;
        this.documentProcessor = null;
        
        // In-memory store for current session data
        this.sessionData = {
            workflows: new Map(),
            nodes: new Map(),
            tasks: new Map(),
            opportunities: new Map(),
            embeddings: new Map() // Cache embeddings for objects
        };
        
        // Track ingestion status
        this.isInitialized = false;
        this.ingestionQueue = [];
        this.isProcessing = false;
        
        console.log('🔄 Workflow Ingestion Service initialized');
    }
    
    /**
     * Initialize the ingestion service
     */
    async initialize() {
        try {
            console.log('🔄 Initializing workflow ingestion service...');
            
            // Get search services
            this.searchService = getSearchService();
            this.apiClient = getAPIClient();
            
            // Import document processor (fallback if not available)
            try {
                const { DocumentProcessor } = await import('../api/src/services/document-processor.js');
                this.documentProcessor = new DocumentProcessor();
            } catch (error) {
                console.warn('Document processor not available, using fallback');
                this.documentProcessor = {
                    processDocument: async (text) => ({ chunks: [text], metadata: {} })
                };
            }
            
            // Test services
            await this.searchService.getStatus();
            
            this.isInitialized = true;
            console.log('✅ Workflow ingestion service initialized');
            
            // Process any queued ingestions
            await this.processQueue();
            
        } catch (error) {
            console.warn('⚠️ Workflow ingestion service initialization failed:', error);
            // Create fallback behavior
            this.isInitialized = false;
        }
    }
    
    /**
     * Ingest a complete workflow with all its objects
     */
    async ingestWorkflow(workflowData, options = {}) {
        console.log('📥 Ingesting workflow:', workflowData.metadata?.name || 'Unnamed Workflow');
        
        if (!this.isInitialized) {
            console.log('⏳ Queuing workflow for ingestion...');
            this.ingestionQueue.push({ type: 'workflow', data: workflowData, options });
            return;
        }
        
        try {
            const workflowId = workflowData.metadata?.id || `workflow_${Date.now()}`;
            
            // Store workflow metadata
            const workflowObject = {
                id: workflowId,
                name: workflowData.metadata?.name || 'Unnamed Workflow',
                description: workflowData.metadata?.description || '',
                version: workflowData.version || '1.0',
                nodeCount: workflowData.nodes?.length || 0,
                taskCount: workflowData.nodes?.filter(n => n.type === 'task').length || 0,
                created: workflowData.metadata?.created || new Date().toISOString(),
                type: 'workflow'
            };
            
            this.sessionData.workflows.set(workflowId, workflowObject);
            
            // Ingest all nodes
            if (workflowData.nodes) {
                for (const nodeData of workflowData.nodes) {
                    await this.ingestNode(nodeData, workflowId);
                }
            }
            
            // Ingest opportunities if present
            if (workflowData.opportunities) {
                for (const oppData of workflowData.opportunities) {
                    await this.ingestOpportunity(oppData, workflowId);
                }
            }
            
            // Generate workflow-level embedding
            await this.generateWorkflowEmbedding(workflowObject);
            
            console.log(`✅ Workflow ingested: ${workflowObject.nodeCount} nodes, ${workflowObject.taskCount} tasks`);
            
        } catch (error) {
            console.error('❌ Workflow ingestion failed:', error);
        }
    }
    
    /**
     * Ingest a node object
     */
    async ingestNode(nodeData, workflowId) {
        try {
            const nodeObject = {
                id: nodeData.id,
                workflowId: workflowId,
                type: nodeData.type || 'process',
                text: nodeData.text || '',
                position: { x: nodeData.x, y: nodeData.y },
                style: nodeData.style || {},
                metadata: nodeData.metadata || {},
                entityType: nodeData.type === 'task' ? 'task' : 'node',
                title: nodeData.text || `${nodeData.type} node`,
                description: this.extractNodeDescription(nodeData)
            };
            
            // Store in appropriate collection
            if (nodeData.type === 'task') {
                this.sessionData.tasks.set(nodeData.id, nodeObject);
            } else {
                this.sessionData.nodes.set(nodeData.id, nodeObject);
            }
            
            // Generate embedding
            await this.generateEntityEmbedding(nodeObject);
            
        } catch (error) {
            console.error(`❌ Node ingestion failed for ${nodeData.id}:`, error);
        }
    }
    
    /**
     * Ingest an opportunity object
     */
    async ingestOpportunity(oppData, workflowId = null) {
        try {
            const opportunityObject = {
                id: oppData.id,
                workflowId: workflowId,
                title: oppData.title || '',
                description: oppData.description || '',
                status: oppData.status || 'active',
                priority: oppData.priority || 'medium',
                tags: oppData.tags || [],
                value: oppData.value,
                deadline: oppData.deadline,
                contact_person: oppData.contactPerson || oppData.contact_person,
                notes: oppData.notes || '',
                type: 'opportunity',
                entityType: 'opportunity'
            };
            
            this.sessionData.opportunities.set(oppData.id, opportunityObject);
            
            // Generate embedding
            await this.generateEntityEmbedding(opportunityObject);
            
        } catch (error) {
            console.error(`❌ Opportunity ingestion failed for ${oppData.id}:`, error);
        }
    }
    
    /**
     * Update an existing object (for real-time updates)
     */
    async updateObject(id, newData, objectType) {
        console.log(`🔄 Updating ${objectType}: ${id}`);
        
        try {
            let collection;
            switch (objectType) {
                case 'workflow':
                    collection = this.sessionData.workflows;
                    break;
                case 'node':
                    collection = this.sessionData.nodes;
                    break;
                case 'task':
                    collection = this.sessionData.tasks;
                    break;
                case 'opportunity':
                    collection = this.sessionData.opportunities;
                    break;
                default:
                    throw new Error(`Unknown object type: ${objectType}`);
            }
            
            const existingObject = collection.get(id);
            if (existingObject) {
                // Update object data
                const updatedObject = { ...existingObject, ...newData, entityType: objectType };
                collection.set(id, updatedObject);
                
                // Regenerate embedding
                await this.generateEntityEmbedding(updatedObject);
                
                console.log(`✅ ${objectType} updated: ${id}`);
            } else {
                console.warn(`⚠️ Object not found for update: ${objectType} ${id}`);
            }
            
        } catch (error) {
            console.error(`❌ Object update failed: ${objectType} ${id}:`, error);
        }
    }
    
    /**
     * Remove an object from the session data
     */
    removeObject(id, objectType) {
        console.log(`🗑️ Removing ${objectType}: ${id}`);
        
        let collection;
        switch (objectType) {
            case 'workflow':
                collection = this.sessionData.workflows;
                break;
            case 'node':
                collection = this.sessionData.nodes;
                break;
            case 'task':
                collection = this.sessionData.tasks;
                break;
            case 'opportunity':
                collection = this.sessionData.opportunities;
                break;
            default:
                console.warn(`Unknown object type for removal: ${objectType}`);
                return;
        }
        
        collection.delete(id);
        this.sessionData.embeddings.delete(id);
        
        console.log(`✅ ${objectType} removed: ${id}`);
    }
    
    /**
     * Search through session data using vector search
     */
    async searchSessionData(query, options = {}) {
        if (!this.isInitialized) {
            console.warn('🔍 Ingestion service not initialized, returning empty results');
            return { results: [], total: 0, searchType: 'session_disabled' };
        }
        
        try {
            console.log(`🔍 Searching session data: "${query}"`);
            
            const {
                limit = 10,
                entityTypes = ['workflow', 'node', 'task', 'opportunity'],
                threshold = 0.7
            } = options;
            
            // Generate query embedding
            const queryEmbedding = await this.searchService.generateEmbedding(query);
            
            // Collect all objects to search
            const allObjects = [];
            
            if (entityTypes.includes('workflow')) {
                this.sessionData.workflows.forEach(obj => allObjects.push(obj));
            }
            if (entityTypes.includes('node')) {
                this.sessionData.nodes.forEach(obj => allObjects.push(obj));
            }
            if (entityTypes.includes('task')) {
                this.sessionData.tasks.forEach(obj => allObjects.push(obj));
            }
            if (entityTypes.includes('opportunity')) {
                this.sessionData.opportunities.forEach(obj => allObjects.push(obj));
            }
            
            // Calculate similarities
            const results = [];
            
            for (const obj of allObjects) {
                const embedding = this.sessionData.embeddings.get(obj.id);
                if (!embedding) continue;
                
                const similarity = this.cosineSimilarity(queryEmbedding.embedding, embedding);
                
                if (similarity >= threshold) {
                    results.push({
                        ...obj,
                        similarity,
                        searchType: 'session_vector'
                    });
                }
            }
            
            // Sort by similarity and limit results
            results.sort((a, b) => b.similarity - a.similarity);
            const limitedResults = results.slice(0, limit);
            
            console.log(`✅ Session search complete: ${limitedResults.length}/${results.length} results`);
            
            return {
                results: limitedResults,
                total: results.length,
                query,
                searchType: 'session_vector',
                sessionStats: this.getSessionStats()
            };
            
        } catch (error) {
            console.error('❌ Session search failed:', error);
            return { results: [], total: 0, searchType: 'session_error', error: error.message };
        }
    }
    
    /**
     * Generate embedding for workflow-level object
     */
    async generateWorkflowEmbedding(workflowObject) {
        try {
            const text = `Workflow: ${workflowObject.name}\n` +
                        `Description: ${workflowObject.description}\n` +
                        `Version: ${workflowObject.version}\n` +
                        `Contains: ${workflowObject.nodeCount} nodes, ${workflowObject.taskCount} tasks`;
                        
            const result = await this.searchService.generateEmbedding(text, 'workflow');
            this.sessionData.embeddings.set(workflowObject.id, result.embedding);
            
        } catch (error) {
            console.error(`❌ Failed to generate workflow embedding:`, error);
        }
    }
    
    /**
     * Generate embedding for any entity
     */
    async generateEntityEmbedding(entityObject) {
        try {
            const text = this.extractEntityText(entityObject);
            const result = await this.searchService.generateEmbedding(text, entityObject.entityType);
            this.sessionData.embeddings.set(entityObject.id, result.embedding);
            
        } catch (error) {
            console.error(`❌ Failed to generate embedding for ${entityObject.id}:`, error);
        }
    }
    
    /**
     * Extract searchable text from entity
     */
    extractEntityText(entity) {
        switch (entity.entityType || entity.type) {
            case 'workflow':
                return `${entity.name} ${entity.description} Version: ${entity.version}`;
                
            case 'node':
                return `Node: ${entity.text} Type: ${entity.type} ${entity.description || ''}`;
                
            case 'task':
                return `Task: ${entity.text} ${entity.description || ''} Status: ${entity.status || 'pending'} Priority: ${entity.priority || 'medium'}`;
                
            case 'opportunity':
                return `Opportunity: ${entity.title} ${entity.description} Status: ${entity.status} Priority: ${entity.priority} Tags: ${(entity.tags || []).join(' ')} Notes: ${entity.notes || ''}`;
                
            default:
                return `${entity.title || entity.name || entity.text || 'Unknown'} ${entity.description || ''}`;
        }
    }
    
    /**
     * Extract description from node data
     */
    extractNodeDescription(nodeData) {
        let description = '';
        
        if (nodeData.metadata && nodeData.metadata.description) {
            description += nodeData.metadata.description;
        }
        
        if (nodeData.tags && nodeData.tags.length > 0) {
            const tagTexts = nodeData.tags.map(tag => {
                if (typeof tag === 'string') return tag;
                if (tag.option) return tag.option;
                if (tag.description) return tag.description;
                return '';
            }).filter(Boolean);
            
            if (tagTexts.length > 0) {
                description += ` Tags: ${tagTexts.join(', ')}`;
            }
        }
        
        return description;
    }
    
    /**
     * Process queued ingestions
     */
    async processQueue() {
        if (this.isProcessing || this.ingestionQueue.length === 0) return;
        
        this.isProcessing = true;
        console.log(`🔄 Processing ${this.ingestionQueue.length} queued ingestions...`);
        
        while (this.ingestionQueue.length > 0) {
            const item = this.ingestionQueue.shift();
            
            try {
                switch (item.type) {
                    case 'workflow':
                        await this.ingestWorkflow(item.data, item.options);
                        break;
                    case 'node':
                        await this.ingestNode(item.data, item.options?.workflowId);
                        break;
                    case 'opportunity':
                        await this.ingestOpportunity(item.data, item.options?.workflowId);
                        break;
                }
            } catch (error) {
                console.error(`❌ Queued ingestion failed:`, error);
            }
        }
        
        this.isProcessing = false;
        console.log('✅ Queue processing complete');
    }
    
    /**
     * Calculate cosine similarity between embeddings
     */
    cosineSimilarity(embedding1, embedding2) {
        if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
            return 0;
        }
        
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;
        
        for (let i = 0; i < embedding1.length; i++) {
            dotProduct += embedding1[i] * embedding2[i];
            norm1 += embedding1[i] * embedding1[i];
            norm2 += embedding2[i] * embedding2[i];
        }
        
        const magnitude1 = Math.sqrt(norm1);
        const magnitude2 = Math.sqrt(norm2);
        
        if (magnitude1 === 0 || magnitude2 === 0) {
            return 0;
        }
        
        return dotProduct / (magnitude1 * magnitude2);
    }
    
    /**
     * Get current session statistics
     */
    getSessionStats() {
        return {
            workflows: this.sessionData.workflows.size,
            nodes: this.sessionData.nodes.size,
            tasks: this.sessionData.tasks.size,
            opportunities: this.sessionData.opportunities.size,
            embeddings: this.sessionData.embeddings.size,
            totalObjects: this.sessionData.workflows.size + 
                         this.sessionData.nodes.size + 
                         this.sessionData.tasks.size + 
                         this.sessionData.opportunities.size
        };
    }
    
    /**
     * Clear all session data
     */
    clearSession() {
        console.log('🗑️ Clearing all session data');
        
        this.sessionData.workflows.clear();
        this.sessionData.nodes.clear();
        this.sessionData.tasks.clear();
        this.sessionData.opportunities.clear();
        this.sessionData.embeddings.clear();
        
        console.log('✅ Session data cleared');
    }
    
    /**
     * Get all session data for debugging
     */
    getSessionData() {
        return {
            stats: this.getSessionStats(),
            workflows: Array.from(this.sessionData.workflows.values()),
            nodes: Array.from(this.sessionData.nodes.values()),
            tasks: Array.from(this.sessionData.tasks.values()),
            opportunities: Array.from(this.sessionData.opportunities.values())
        };
    }
}

// Create singleton instance
let workflowIngestionService = null;

export function getWorkflowIngestionService() {
    if (!workflowIngestionService) {
        workflowIngestionService = new WorkflowIngestionService();
    }
    return workflowIngestionService;
}

export { WorkflowIngestionService };

// Make available globally
if (typeof window !== 'undefined') {
    window.WorkflowIngestionService = WorkflowIngestionService;
    window.getWorkflowIngestionService = getWorkflowIngestionService;
}