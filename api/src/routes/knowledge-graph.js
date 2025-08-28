/**
 * Knowledge Graph API Routes
 * Handles CRUD operations for knowledge graph entities and relationships
 */

import express from 'express';
import { query } from '../config/database.js';
import OpenAI from 'openai';

const router = express.Router();

// Initialize OpenAI client for embeddings (if API key is available)
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
}) : null;

// Helper function to generate embeddings
async function generateEmbedding(text) {
    if (!openai) {
        console.warn('OpenAI API key not configured, skipping embedding generation');
        return null;
    }
    
    try {
        const response = await openai.embeddings.create({
            model: "text-embedding-ada-002",
            input: text
        });
        return response.data[0].embedding;
    } catch (error) {
        console.error('Error generating embedding:', error);
        return null;
    }
}

// Get all entity types
router.get('/entity-types', async (req, res) => {
    try {
        const result = await query(`
            SELECT id, name, description, schema_definition
            FROM entity_types
            ORDER BY name
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching entity types:', error);
        res.status(500).json({ error: 'Failed to fetch entity types' });
    }
});

// Get all relationship types
router.get('/relationship-types', async (req, res) => {
    try {
        const result = await query(`
            SELECT id, name, description, is_directional, inverse_name
            FROM relationship_types
            ORDER BY name
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching relationship types:', error);
        res.status(500).json({ error: 'Failed to fetch relationship types' });
    }
});

// Get all entities with optional filtering
router.get('/entities', async (req, res) => {
    try {
        const { entity_type, search, limit = 50, offset = 0 } = req.query;
        
        let queryText = `
            SELECT 
                e.id,
                e.name,
                e.description,
                e.properties,
                e.created_at,
                e.updated_at,
                et.name as entity_type,
                et.description as entity_type_description
            FROM kg_entities e
            JOIN entity_types et ON e.entity_type_id = et.id
        `;
        
        const params = [];
        const conditions = [];
        
        if (entity_type) {
            conditions.push(`et.name = $${params.length + 1}`);
            params.push(entity_type);
        }
        
        if (search) {
            conditions.push(`e.search_vector @@ plainto_tsquery('english', $${params.length + 1})`);
            params.push(search);
        }
        
        if (conditions.length > 0) {
            queryText += ' WHERE ' + conditions.join(' AND ');
        }
        
        queryText += `
            ORDER BY e.name
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `;
        params.push(limit, offset);
        
        const result = await query(queryText, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching entities:', error);
        res.status(500).json({ error: 'Failed to fetch entities' });
    }
});

// Get entity by ID with relationships
router.get('/entities/:id', async (req, res) => {
    try {
        const entityId = req.params.id;
        
        // Get entity details
        const entityResult = await query(`
            SELECT 
                e.id,
                e.name,
                e.description,
                e.properties,
                e.created_at,
                e.updated_at,
                et.name as entity_type,
                et.description as entity_type_description,
                et.schema_definition
            FROM kg_entities e
            JOIN entity_types et ON e.entity_type_id = et.id
            WHERE e.id = $1
        `, [entityId]);
        
        if (entityResult.rows.length === 0) {
            return res.status(404).json({ error: 'Entity not found' });
        }
        
        const entity = entityResult.rows[0];
        
        // Get relationships (both incoming and outgoing)
        const relationshipsResult = await query(`
            SELECT 
                r.id as relationship_id,
                rt.name as relationship_type,
                rt.description as relationship_description,
                rt.is_directional,
                r.properties as relationship_properties,
                r.strength,
                'outgoing' as direction,
                target.id as related_entity_id,
                target.name as related_entity_name,
                target_et.name as related_entity_type
            FROM kg_relationships r
            JOIN relationship_types rt ON r.relationship_type_id = rt.id
            JOIN kg_entities target ON r.target_entity_id = target.id
            JOIN entity_types target_et ON target.entity_type_id = target_et.id
            WHERE r.source_entity_id = $1
            
            UNION ALL
            
            SELECT 
                r.id as relationship_id,
                rt.name as relationship_type,
                rt.description as relationship_description,
                rt.is_directional,
                r.properties as relationship_properties,
                r.strength,
                'incoming' as direction,
                source.id as related_entity_id,
                source.name as related_entity_name,
                source_et.name as related_entity_type
            FROM kg_relationships r
            JOIN relationship_types rt ON r.relationship_type_id = rt.id
            JOIN kg_entities source ON r.source_entity_id = source.id
            JOIN entity_types source_et ON source.entity_type_id = source_et.id
            WHERE r.target_entity_id = $1
        `, [entityId]);
        
        // Get process links
        const linksResult = await query(`
            SELECT linked_type, linked_id, link_properties
            FROM kg_process_links
            WHERE kg_entity_id = $1
        `, [entityId]);
        
        entity.relationships = relationshipsResult.rows;
        entity.process_links = linksResult.rows;
        
        res.json(entity);
    } catch (error) {
        console.error('Error fetching entity:', error);
        res.status(500).json({ error: 'Failed to fetch entity' });
    }
});

// Create new entity
router.post('/entities', async (req, res) => {
    try {
        const { entity_type_id, name, description, properties } = req.body;
        
        if (!entity_type_id || !name) {
            return res.status(400).json({ error: 'entity_type_id and name are required' });
        }
        
        // Generate embedding for the entity
        const embeddingText = `${name} ${description || ''} ${JSON.stringify(properties || {})}`;
        const embedding = await generateEmbedding(embeddingText);
        
        const result = await query(`
            INSERT INTO kg_entities (entity_type_id, name, description, properties, embedding, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, name, description, properties, created_at
        `, [entity_type_id, name, description, properties || {}, embedding, req.user?.email || 'system']);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating entity:', error);
        res.status(500).json({ error: 'Failed to create entity' });
    }
});

// Create relationship between entities
router.post('/relationships', async (req, res) => {
    try {
        const { relationship_type_id, source_entity_id, target_entity_id, properties, strength = 1.0 } = req.body;
        
        if (!relationship_type_id || !source_entity_id || !target_entity_id) {
            return res.status(400).json({ 
                error: 'relationship_type_id, source_entity_id, and target_entity_id are required' 
            });
        }
        
        const result = await query(`
            INSERT INTO kg_relationships (relationship_type_id, source_entity_id, target_entity_id, properties, strength, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, relationship_type_id, source_entity_id, target_entity_id, properties, strength, created_at
        `, [relationship_type_id, source_entity_id, target_entity_id, properties || {}, strength, req.user?.email || 'system']);
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating relationship:', error);
        if (error.constraint === 'unique_relationship') {
            res.status(400).json({ error: 'Relationship already exists between these entities' });
        } else {
            res.status(500).json({ error: 'Failed to create relationship' });
        }
    }
});

// Query knowledge graph for LLM
router.post('/query', async (req, res) => {
    try {
        const { query_text, include_relationships = true, limit = 20 } = req.body;
        
        if (!query_text) {
            return res.status(400).json({ error: 'query_text is required' });
        }
        
        // Full-text search across entities
        const searchResult = await query(`
            SELECT 
                e.id,
                e.name,
                e.description,
                e.properties,
                et.name as entity_type,
                ts_rank(e.search_vector, plainto_tsquery('english', $1)) as relevance_score
            FROM kg_entities e
            JOIN entity_types et ON e.entity_type_id = et.id
            WHERE e.search_vector @@ plainto_tsquery('english', $1)
            ORDER BY relevance_score DESC, e.name
            LIMIT $2
        `, [query_text, limit]);
        
        let results = searchResult.rows;
        
        // If relationships are requested, fetch them for each entity
        if (include_relationships && results.length > 0) {
            const entityIds = results.map(r => r.id);
            
            const relationshipsResult = await query(`
                SELECT 
                    r.source_entity_id,
                    r.target_entity_id,
                    rt.name as relationship_type,
                    r.properties,
                    source.name as source_name,
                    target.name as target_name,
                    source_et.name as source_type,
                    target_et.name as target_type
                FROM kg_relationships r
                JOIN relationship_types rt ON r.relationship_type_id = rt.id
                JOIN kg_entities source ON r.source_entity_id = source.id
                JOIN kg_entities target ON r.target_entity_id = target.id
                JOIN entity_types source_et ON source.entity_type_id = source_et.id
                JOIN entity_types target_et ON target.entity_type_id = target_et.id
                WHERE r.source_entity_id = ANY($1) OR r.target_entity_id = ANY($1)
            `, [entityIds]);
            
            // Group relationships by entity
            const relationshipsByEntity = {};
            relationshipsResult.rows.forEach(rel => {
                if (!relationshipsByEntity[rel.source_entity_id]) {
                    relationshipsByEntity[rel.source_entity_id] = [];
                }
                if (!relationshipsByEntity[rel.target_entity_id]) {
                    relationshipsByEntity[rel.target_entity_id] = [];
                }
                
                relationshipsByEntity[rel.source_entity_id].push({
                    type: rel.relationship_type,
                    direction: 'outgoing',
                    related_entity: rel.target_name,
                    related_type: rel.target_type,
                    properties: rel.properties
                });
                
                relationshipsByEntity[rel.target_entity_id].push({
                    type: rel.relationship_type,
                    direction: 'incoming',
                    related_entity: rel.source_name,
                    related_type: rel.source_type,
                    properties: rel.properties
                });
            });
            
            // Add relationships to results
            results.forEach(entity => {
                entity.relationships = relationshipsByEntity[entity.id] || [];
            });
        }
        
        res.json({
            query: query_text,
            total_results: results.length,
            entities: results
        });
        
    } catch (error) {
        console.error('Error querying knowledge graph:', error);
        res.status(500).json({ error: 'Failed to query knowledge graph' });
    }
});

// Vector similarity search (if embeddings are available)
router.post('/search/semantic', async (req, res) => {
    try {
        const { query_text, limit = 10, threshold = 0.7 } = req.body;
        
        if (!query_text) {
            return res.status(400).json({ error: 'query_text is required' });
        }
        
        if (!openai) {
            return res.status(501).json({ error: 'Semantic search not available - OpenAI API key not configured' });
        }
        
        // Generate embedding for query
        const queryEmbedding = await generateEmbedding(query_text);
        if (!queryEmbedding) {
            return res.status(500).json({ error: 'Failed to generate query embedding' });
        }
        
        const result = await query(`
            SELECT 
                e.id,
                e.name,
                e.description,
                e.properties,
                et.name as entity_type,
                (1 - (e.embedding <=> $1::vector)) as similarity_score
            FROM kg_entities e
            JOIN entity_types et ON e.entity_type_id = et.id
            WHERE e.embedding IS NOT NULL
            AND (1 - (e.embedding <=> $1::vector)) > $2
            ORDER BY similarity_score DESC
            LIMIT $3
        `, [JSON.stringify(queryEmbedding), threshold, limit]);
        
        res.json({
            query: query_text,
            threshold: threshold,
            total_results: result.rows.length,
            entities: result.rows
        });
        
    } catch (error) {
        console.error('Error in semantic search:', error);
        res.status(500).json({ error: 'Failed to perform semantic search' });
    }
});

export default router;