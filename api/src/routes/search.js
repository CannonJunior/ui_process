/**
 * Search Routes
 * Vector and text search functionality with Phase 3 enhancements
 */

import express from 'express';
import Joi from 'joi';
import { query, vectorOps } from '../config/database.js';
import { searchRateLimiterMiddleware } from '../middleware/rateLimiter.js';
import { ValidationError } from '../middleware/errorHandler.js';
import { getEmbeddingService } from '../services/embeddings.js';
import DocumentProcessor from '../services/document-processor.js';

const router = express.Router();

const searchSchema = Joi.object({
    query: Joi.string().min(1).required(),
    entityTypes: Joi.array().items(Joi.string().valid('workflow', 'node', 'task', 'opportunity')).optional(),
    workflowId: Joi.string().uuid().optional(),
    limit: Joi.number().min(1).max(50).default(10),
    includeRelated: Joi.boolean().default(false) // For RAG - include related entities
});

// POST /api/v1/search/text
router.post('/text', searchRateLimiterMiddleware, async (req, res, next) => {
    try {
        const { error, value } = searchSchema.validate(req.body);
        if (error) {
            throw new ValidationError(error.details[0].message);
        }

        const { query: searchQuery, entityTypes, workflowId, limit } = value;
        const organizationId = req.user.organization_id;
        const searchTerm = `%${searchQuery}%`;

        const results = [];

        // Search workflows
        if (!entityTypes || entityTypes.includes('workflow')) {
            const workflowResults = await query(`
                SELECT 'workflow' as type, id, name as title, description, 
                       ts_rank(to_tsvector('english', name || ' ' || COALESCE(description, '')), 
                               plainto_tsquery('english', $2)) as rank
                FROM workflows 
                WHERE organization_id = $1 
                  AND (name ILIKE $2 OR description ILIKE $2)
                ORDER BY rank DESC
                LIMIT $3
            `, [organizationId, searchTerm, Math.ceil(limit / (entityTypes?.length || 6))]);
            
            results.push(...workflowResults.rows);
        }

        // Search opportunities
        if (!entityTypes || entityTypes.includes('opportunity')) {
            const opportunityResults = await query(`
                SELECT 'opportunity' as type, id, title, description, status, priority,
                       contact_person, notes, value, deadline,
                       ts_rank(to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || COALESCE(notes, '')), 
                               plainto_tsquery('english', $2)) as rank
                FROM opportunities 
                WHERE organization_id = $1 
                  AND (title ILIKE $2 OR description ILIKE $2 OR notes ILIKE $2)
                ORDER BY rank DESC
                LIMIT $3
            `, [organizationId, searchTerm, Math.ceil(limit / (entityTypes?.length || 6))]);
            
            results.push(...opportunityResults.rows);
        }

        // Search tasks
        if (!entityTypes || entityTypes.includes('task')) {
            let taskQuery = `
                SELECT 'task' as type, t.id, t.text as title, t.description, t.status, t.priority,
                       t.due_date, t.assigned_to, o.title as opportunity_title, o.id as opportunity_id,
                       w.name as workflow_name, w.id as workflow_id
                FROM tasks t
                LEFT JOIN opportunities o ON t.opportunity_id = o.id
                LEFT JOIN workflows w ON t.workflow_id = w.id
                WHERE (w.organization_id = $1 OR o.organization_id = $1)
                  AND (t.text ILIKE $2 OR t.description ILIKE $2)
            `;
            let taskParams = [organizationId, searchTerm];
            
            if (workflowId) {
                taskQuery += ` AND w.id = $3`;
                taskParams.push(workflowId);
            }
            
            taskQuery += ` LIMIT $${taskParams.length + 1}`;
            taskParams.push(Math.ceil(limit / (entityTypes?.length || 6)));
            
            const taskResults = await query(taskQuery, taskParams);
            results.push(...taskResults.rows);
        }

        // Search nodes
        if (!entityTypes || entityTypes.includes('node')) {
            let nodeQuery = `
                SELECT 'node' as type, n.id, n.text as title, n.type as description,
                       w.name as workflow_name, w.id as workflow_id
                FROM nodes n
                JOIN workflows w ON n.workflow_id = w.id
                WHERE w.organization_id = $1 AND n.text ILIKE $2
            `;
            let nodeParams = [organizationId, searchTerm];
            
            if (workflowId) {
                nodeQuery += ` AND w.id = $3`;
                nodeParams.push(workflowId);
            }
            
            nodeQuery += ` LIMIT $${nodeParams.length + 1}`;
            nodeParams.push(Math.ceil(limit / (entityTypes?.length || 4)));
            
            const nodeResults = await query(nodeQuery, nodeParams);
            results.push(...nodeResults.rows);
        }

        res.json({
            results: results.slice(0, limit),
            total: results.length,
            query: searchQuery
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/search/rag - RAG-optimized search for chat context
router.post('/rag', searchRateLimiterMiddleware, async (req, res, next) => {
    try {
        const { error, value } = searchSchema.validate(req.body);
        if (error) {
            throw new ValidationError(error.details[0].message);
        }

        const { query: searchQuery, entityTypes, workflowId, limit, includeRelated } = value;
        const organizationId = req.user.organization_id;
        const searchTerm = `%${searchQuery}%`;

        console.log(`🧠 RAG search for: "${searchQuery}"`);

        const contextResults = [];

        // Search opportunities with full context
        if (!entityTypes || entityTypes.includes('opportunity')) {
            const opportunityResults = await query(`
                SELECT 'opportunity' as type, 
                       o.id, o.title, o.description, o.status, o.priority,
                       o.contact_person, o.notes, o.value, o.deadline,
                       array_agg(DISTINCT t.text) FILTER (WHERE t.text IS NOT NULL) as related_tasks,
                       array_agg(DISTINCT t.status) FILTER (WHERE t.status IS NOT NULL) as task_statuses,
                       COUNT(DISTINCT t.id) as task_count
                FROM opportunities o
                LEFT JOIN tasks t ON t.opportunity_id = o.id
                WHERE o.organization_id = $1 
                  AND (o.title ILIKE $2 OR o.description ILIKE $2 OR o.notes ILIKE $2)
                GROUP BY o.id, o.title, o.description, o.status, o.priority, o.contact_person, o.notes, o.value, o.deadline
                ORDER BY o.updated_at DESC
                LIMIT $3
            `, [organizationId, searchTerm, Math.ceil(limit / 2)]);
            
            contextResults.push(...opportunityResults.rows);
        }

        // Search tasks with opportunity context
        if (!entityTypes || entityTypes.includes('task')) {
            const taskResults = await query(`
                SELECT 'task' as type,
                       t.id, t.text as title, t.description, t.status, t.priority,
                       t.due_date, t.assigned_to,
                       o.title as opportunity_title, o.description as opportunity_description,
                       o.status as opportunity_status, o.value as opportunity_value,
                       w.name as workflow_name
                FROM tasks t
                LEFT JOIN opportunities o ON t.opportunity_id = o.id
                LEFT JOIN workflows w ON t.workflow_id = w.id
                WHERE (w.organization_id = $1 OR o.organization_id = $1)
                  AND (t.text ILIKE $2 OR t.description ILIKE $2)
                ORDER BY t.updated_at DESC
                LIMIT $3
            `, [organizationId, searchTerm, Math.ceil(limit / 2)]);
            
            contextResults.push(...taskResults.rows);
        }

        // Format for RAG context
        const ragContext = contextResults.map(item => {
            if (item.type === 'opportunity') {
                return {
                    type: item.type,
                    title: item.title,
                    description: item.description,
                    status: item.status,
                    priority: item.priority,
                    value: item.value,
                    contact_person: item.contact_person,
                    notes: item.notes,
                    task_count: item.task_count,
                    related_tasks: item.related_tasks || [],
                    context: `Opportunity "${item.title}" is ${item.status} with ${item.priority} priority. ${item.description || ''} ${item.notes ? 'Notes: ' + item.notes : ''}`.trim()
                };
            } else if (item.type === 'task') {
                return {
                    type: item.type,
                    title: item.title,
                    description: item.description,
                    status: item.status,
                    priority: item.priority,
                    assigned_to: item.assigned_to,
                    due_date: item.due_date,
                    opportunity_title: item.opportunity_title,
                    opportunity_description: item.opportunity_description,
                    context: `Task "${item.title}" is ${item.status}${item.opportunity_title ? ` and relates to opportunity "${item.opportunity_title}"` : ''}. ${item.description || ''} ${item.opportunity_description ? 'Opportunity context: ' + item.opportunity_description : ''}`.trim()
                };
            }
            return item;
        });

        console.log(`✅ RAG search complete: ${ragContext.length} context items`);

        res.json({
            results: contextResults,
            ragContext: ragContext,
            total: contextResults.length,
            query: searchQuery,
            searchType: 'rag'
        });
    } catch (error) {
        next(error);
    }
});

// Services initialization
let embeddingService = null;
let documentProcessor = null;

async function initializeServices() {
    if (!embeddingService) {
        embeddingService = getEmbeddingService();
        await embeddingService.testEmbedding();
    }
    
    if (!documentProcessor) {
        documentProcessor = new DocumentProcessor(embeddingService);
        await documentProcessor.testProcessing();
    }
}

// POST /api/v1/search/semantic - Semantic vector search
router.post('/semantic', searchRateLimiterMiddleware, async (req, res, next) => {
    try {
        await initializeServices();
        
        const { error, value } = searchSchema.validate(req.body);
        if (error) {
            throw new ValidationError(error.details[0].message);
        }

        const { query: searchQuery, entityTypes, workflowId, limit } = value;
        const organizationId = req.user.organization_id;
        
        console.log(`🔍 Semantic search: "${searchQuery}"`);
        
        // Generate query embedding
        const queryEmbedding = await embeddingService.generateEmbedding(searchQuery);
        
        // Mock semantic search results for development (opportunities removed)
        const mockResults = [
            {
                type: 'workflow',
                id: 'mock_wf_001',
                title: `Workflow containing "${searchQuery}" concepts`,
                description: 'Mock result showing semantic matching for workflow content',
                similarity: 0.78,
                searchType: 'semantic'
            }
        ];
        
        // Filter by entity types if specified
        let filteredResults = mockResults;
        if (entityTypes && entityTypes.length > 0) {
            filteredResults = mockResults.filter(result => entityTypes.includes(result.type));
        }
        
        console.log(`✅ Semantic search complete: ${filteredResults.length} results`);
        
        res.json({
            results: filteredResults.slice(0, limit),
            total: filteredResults.length,
            query: searchQuery,
            searchType: 'semantic',
            embeddingDimensions: queryEmbedding.length
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/v1/search/generate-embedding - Generate embedding for text
router.post('/generate-embedding', async (req, res, next) => {
    try {
        await initializeServices();
        
        const embeddingSchema = Joi.object({
            text: Joi.string().required().min(1).max(8000),
            entityType: Joi.string().valid('workflow', 'opportunity', 'node', 'task', 'message').default('text')
        });
        
        const { error, value } = embeddingSchema.validate(req.body);
        if (error) {
            throw new ValidationError(error.details[0].message);
        }
        
        const { text, entityType } = value;
        
        console.log(`🧠 Generating embedding for ${entityType}: ${text.substring(0, 100)}...`);
        
        const embedding = await embeddingService.generateEmbedding(text);
        const config = embeddingService.getConfig();
        
        res.json({
            embedding,
            dimensions: embedding.length,
            model: config.model,
            provider: config.provider,
            entityType,
            textLength: text.length,
            generatedAt: new Date().toISOString()
        });
        
    } catch (error) {
        next(error);
    }
});

// GET /api/v1/search/status - Get search service status
router.get('/status', async (req, res, next) => {
    try {
        await initializeServices();
        
        const embeddingConfig = embeddingService.getConfig();
        
        res.json({
            status: 'operational',
            textSearch: 'available',
            semanticSearch: 'available',
            embeddingService: {
                provider: embeddingConfig.provider,
                model: embeddingConfig.model,
                dimensions: embeddingConfig.dimensions,
                maxTokens: embeddingConfig.maxTokens
            },
            documentProcessor: {
                chunkingStrategies: ['standard', 'semantic', 'precise'],
                supportedEntityTypes: ['workflow', 'opportunity', 'node', 'task', 'message']
            },
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        next(error);
    }
});

export default router;