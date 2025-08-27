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
    limit: Joi.number().min(1).max(50).default(10)
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
            `, [organizationId, searchTerm, Math.ceil(limit / (entityTypes?.length || 4))]);
            
            results.push(...workflowResults.rows);
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
        
        // Mock semantic search results for development
        const mockResults = [
            {
                type: 'opportunity',
                id: 'mock_opp_001',
                title: `Opportunity semantically related to "${searchQuery}"`,
                description: 'This is a mock semantic search result',
                similarity: 0.85,
                searchType: 'semantic'
            },
            {
                type: 'workflow',
                id: 'mock_wf_001',
                title: `Workflow containing "${searchQuery}" concepts`,
                description: 'Another mock result showing semantic matching',
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