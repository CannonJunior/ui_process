/**
 * Document Processing and Chunking Service
 * Handles text chunking and processing for vector search and RAG
 */

import { getEmbeddingService } from './embeddings.js';

// Chunking configuration
const CHUNK_CONFIG = {
    // Standard chunking for most content
    standard: {
        maxChunkSize: 1000,        // Maximum characters per chunk
        overlap: 200,              // Overlap between chunks
        minChunkSize: 100,         // Minimum viable chunk size
        separators: ['\n\n', '\n', '. ', '! ', '? ', '; ', ', ', ' ']
    },
    
    // Semantic chunking for structured content
    semantic: {
        maxChunkSize: 1500,
        overlap: 300,
        minChunkSize: 200,
        separators: ['\n\n', '\n', '. ', '! ', '? ']
    },
    
    // Small chunks for precise matching
    precise: {
        maxChunkSize: 500,
        overlap: 100,
        minChunkSize: 50,
        separators: ['\n\n', '\n', '. ', '! ', '? ', '; ', ', ']
    }
};

class DocumentProcessor {
    constructor(embeddingService = null) {
        this.embeddingService = embeddingService || getEmbeddingService();
        console.log('📄 Document processor initialized');
    }
    
    /**
     * Process a document into searchable chunks
     */
    async processDocument(content, metadata = {}) {
        if (!content || typeof content !== 'string') {
            throw new Error('Content must be a non-empty string');
        }
        
        const {
            entityType = 'document',
            entityId = null,
            organizationId = null,
            chunkStrategy = 'standard',
            includeEmbeddings = true
        } = metadata;
        
        console.log(`📄 Processing document: ${entityType}/${entityId}`);
        console.log(`   Content length: ${content.length} characters`);
        console.log(`   Chunking strategy: ${chunkStrategy}`);
        
        // Clean and normalize content
        const cleanContent = this.cleanText(content);
        
        // Create chunks
        const textChunks = this.createChunks(cleanContent, chunkStrategy);
        console.log(`   Generated ${textChunks.length} chunks`);
        
        // Generate embeddings if requested
        const chunks = [];
        for (let i = 0; i < textChunks.length; i++) {
            const chunk = {
                id: this.generateChunkId(entityType, entityId, i),
                organizationId,
                sourceEntityType: entityType,
                sourceEntityId: entityId,
                chunkText: textChunks[i],
                chunkIndex: i,
                metadata: {
                    ...metadata,
                    chunkLength: textChunks[i].length,
                    processingStrategy: chunkStrategy,
                    processedAt: new Date().toISOString()
                }
            };
            
            if (includeEmbeddings) {
                try {
                    chunk.embedding = await this.embeddingService.generateEmbedding(textChunks[i]);
                } catch (error) {
                    console.warn(`⚠️  Failed to generate embedding for chunk ${i}: ${error.message}`);
                    chunk.embedding = null;
                }
            }
            
            chunks.push(chunk);
        }
        
        console.log(`✅ Document processing complete: ${chunks.length} chunks created`);
        return chunks;
    }
    
    /**
     * Process multiple entities in batch
     */
    async processEntities(entities, entityType) {
        const allChunks = [];
        
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];
            console.log(`📄 Processing entity ${i + 1}/${entities.length}: ${entity.id}`);
            
            try {
                const content = this.extractEntityText(entity, entityType);
                const chunks = await this.processDocument(content, {
                    entityType,
                    entityId: entity.id,
                    organizationId: entity.organization_id || entity.organizationId,
                    originalEntity: entity,
                    chunkStrategy: this.selectChunkingStrategy(entityType, content)
                });
                
                allChunks.push(...chunks);
            } catch (error) {
                console.error(`❌ Failed to process entity ${entity.id}:`, error.message);
            }
        }
        
        console.log(`✅ Batch processing complete: ${allChunks.length} total chunks`);
        return allChunks;
    }
    
    /**
     * Create text chunks using specified strategy
     */
    createChunks(text, strategy = 'standard') {
        const config = CHUNK_CONFIG[strategy];
        if (!config) {
            throw new Error(`Unknown chunking strategy: ${strategy}`);
        }
        
        const chunks = [];
        let start = 0;
        
        while (start < text.length) {
            // Find the end of this chunk
            let end = Math.min(start + config.maxChunkSize, text.length);
            
            // If we're not at the end of the text, try to break at a separator
            if (end < text.length) {
                let bestBreak = -1;
                
                // Try separators in order of preference
                for (const separator of config.separators) {
                    const lastIndex = text.lastIndexOf(separator, end);
                    if (lastIndex > start && lastIndex > bestBreak) {
                        bestBreak = lastIndex + separator.length;
                    }
                }
                
                // Use the best break point found, otherwise use max chunk size
                if (bestBreak > start) {
                    end = bestBreak;
                }
            }
            
            // Extract chunk
            const chunk = text.slice(start, end).trim();
            
            // Only add chunks that meet minimum size requirement
            if (chunk.length >= config.minChunkSize) {
                chunks.push(chunk);
            }
            
            // Move start position with overlap
            start = Math.max(start + 1, end - config.overlap);
        }
        
        return chunks.filter(chunk => chunk.length > 0);
    }
    
    /**
     * Extract searchable text from entity objects
     */
    extractEntityText(entity, entityType) {
        switch (entityType) {
            case 'workflow':
                return [
                    entity.name,
                    entity.description || '',
                    `Version: ${entity.version || 'unknown'}`,
                    JSON.stringify(entity.metadata || {})
                ].filter(Boolean).join('\n\n');
                
            case 'opportunity':
                return [
                    entity.title,
                    entity.description || '',
                    `Status: ${entity.status || 'unknown'}`,
                    `Priority: ${entity.priority || 'medium'}`,
                    `Tags: ${(entity.tags || []).join(', ')}`,
                    entity.notes || '',
                    `Contact: ${entity.contact_person || entity.contactPerson || 'none'}`
                ].filter(Boolean).join('\n\n');
                
            case 'node':
                return [
                    `Node Type: ${entity.type || 'unknown'}`,
                    entity.text || '',
                    `Position: (${entity.position_x || entity.positionX || 0}, ${entity.position_y || entity.positionY || 0})`,
                    JSON.stringify(entity.metadata || {})
                ].filter(Boolean).join('\n\n');
                
            case 'task':
                return [
                    entity.text || '',
                    entity.description || '',
                    `Status: ${entity.status || 'not_started'}`,
                    `Priority: ${entity.priority || 'medium'}`,
                    entity.assigned_to || entity.assignedTo ? `Assigned to: ${entity.assigned_to || entity.assignedTo}` : '',
                    entity.due_date || entity.dueDate ? `Due: ${entity.due_date || entity.dueDate}` : '',
                    entity.estimated_hours || entity.estimatedHours ? `Estimated: ${entity.estimated_hours || entity.estimatedHours} hours` : ''
                ].filter(Boolean).join('\n\n');
                
            case 'chat_message':
                return [
                    `Role: ${entity.role || 'user'}`,
                    entity.content || entity.text || ''
                ].filter(Boolean).join('\n\n');
                
            default:
                // Generic entity processing
                const textFields = ['name', 'title', 'text', 'content', 'description', 'notes'];
                const extractedText = textFields
                    .map(field => entity[field])
                    .filter(Boolean)
                    .join('\n\n');
                    
                return extractedText || JSON.stringify(entity);
        }
    }
    
    /**
     * Select appropriate chunking strategy based on content
     */
    selectChunkingStrategy(entityType, content) {
        const contentLength = content.length;
        
        // Use precise chunking for short content
        if (contentLength < 500) {
            return 'precise';
        }
        
        // Use semantic chunking for structured content
        if (entityType === 'workflow' || entityType === 'opportunity') {
            return 'semantic';
        }
        
        // Use standard chunking for most content
        return 'standard';
    }
    
    /**
     * Clean and normalize text content
     */
    cleanText(text) {
        return text
            // Normalize whitespace
            .replace(/\s+/g, ' ')
            // Remove excessive line breaks
            .replace(/\n{3,}/g, '\n\n')
            // Trim
            .trim();
    }
    
    /**
     * Generate unique chunk ID
     */
    generateChunkId(entityType, entityId, chunkIndex) {
        return `${entityType}_${entityId}_chunk_${chunkIndex}`;
    }
    
    /**
     * Search through processed chunks
     */
    async searchChunks(query, chunks, options = {}) {
        const {
            limit = 10,
            threshold = 0.7,
            includeContent = true,
            entityType = null
        } = options;
        
        console.log(`🔍 Searching ${chunks.length} chunks for: "${query.slice(0, 100)}..."`);
        
        // Generate query embedding
        const queryEmbedding = await this.embeddingService.generateEmbedding(query);
        
        // Calculate similarities
        const results = chunks
            .filter(chunk => {
                // Filter by entity type if specified
                if (entityType && chunk.sourceEntityType !== entityType) {
                    return false;
                }
                // Require valid embedding
                return chunk.embedding && Array.isArray(chunk.embedding);
            })
            .map(chunk => {
                const similarity = this.embeddingService.cosineSimilarity(
                    queryEmbedding,
                    chunk.embedding
                );
                
                return {
                    ...chunk,
                    similarity,
                    // Optionally exclude large content from results
                    chunkText: includeContent ? chunk.chunkText : chunk.chunkText.slice(0, 200) + '...'
                };
            })
            // Filter by similarity threshold
            .filter(result => result.similarity >= threshold)
            // Sort by similarity
            .sort((a, b) => b.similarity - a.similarity)
            // Limit results
            .slice(0, limit);
        
        console.log(`✅ Search complete: ${results.length} relevant chunks found`);
        return results;
    }
    
    /**
     * Update entity embeddings when content changes
     */
    async updateEntityEmbeddings(entity, entityType) {
        console.log(`🔄 Updating embeddings for ${entityType}: ${entity.id}`);
        
        try {
            const chunks = await this.processDocument(
                this.extractEntityText(entity, entityType),
                {
                    entityType,
                    entityId: entity.id,
                    organizationId: entity.organization_id || entity.organizationId,
                    chunkStrategy: this.selectChunkingStrategy(entityType, this.extractEntityText(entity, entityType))
                }
            );
            
            console.log(`✅ Updated ${chunks.length} chunks for ${entityType}: ${entity.id}`);
            return chunks;
        } catch (error) {
            console.error(`❌ Failed to update embeddings for ${entity.id}:`, error.message);
            throw error;
        }
    }
    
    /**
     * Get processing statistics
     */
    getProcessingStats(chunks) {
        const stats = {
            totalChunks: chunks.length,
            totalCharacters: chunks.reduce((sum, chunk) => sum + chunk.chunkText.length, 0),
            averageChunkSize: 0,
            entitiesProcessed: new Set(chunks.map(chunk => chunk.sourceEntityId)).size,
            entityTypes: {}
        };
        
        if (stats.totalChunks > 0) {
            stats.averageChunkSize = Math.round(stats.totalCharacters / stats.totalChunks);
            
            // Count by entity type
            chunks.forEach(chunk => {
                const type = chunk.sourceEntityType;
                stats.entityTypes[type] = (stats.entityTypes[type] || 0) + 1;
            });
        }
        
        return stats;
    }
    
    /**
     * Test document processing
     */
    async testProcessing() {
        try {
            const testContent = `
                This is a test document for processing and chunking.
                
                It contains multiple paragraphs with different types of content.
                Some paragraphs are longer and contain more detailed information
                about various topics that might be relevant for search and retrieval.
                
                Other paragraphs are shorter and more concise.
                
                The document processor should be able to handle this content
                and create appropriate chunks for vector search capabilities.
            `;
            
            const chunks = await this.processDocument(testContent, {
                entityType: 'test_document',
                entityId: 'test_001',
                organizationId: 'test_org'
            });
            
            console.log('✅ Document processing test passed');
            console.log(`   Input length: ${testContent.length} characters`);
            console.log(`   Chunks created: ${chunks.length}`);
            console.log(`   Average chunk size: ${Math.round(chunks.reduce((sum, chunk) => sum + chunk.chunkText.length, 0) / chunks.length)}`);
            
            return true;
        } catch (error) {
            console.error('❌ Document processing test failed:', error.message);
            return false;
        }
    }
}

// Export functions
export { DocumentProcessor, CHUNK_CONFIG };
export default DocumentProcessor;