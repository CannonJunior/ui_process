/**
 * Embedding Generation Service
 * Handles text embedding generation for vector search capabilities
 */

import OpenAI from 'openai';
import crypto from 'crypto';

// Configuration for embedding models
const EMBEDDING_CONFIG = {
    // OpenAI embeddings (most accurate, requires API key)
    openai: {
        model: 'text-embedding-3-small',
        dimensions: 1536,
        maxTokens: 8191
    },
    // Mock embeddings for development (deterministic)
    mock: {
        model: 'mock-embedding',
        dimensions: 1536,
        maxTokens: 8191
    }
};

class EmbeddingService {
    constructor(provider = 'mock') {
        this.provider = provider;
        this.config = EMBEDDING_CONFIG[provider];
        
        if (!this.config) {
            throw new Error(`Unsupported embedding provider: ${provider}`);
        }
        
        // Initialize OpenAI client if needed
        if (provider === 'openai') {
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) {
                console.warn('⚠️  OpenAI API key not found, falling back to mock embeddings');
                this.provider = 'mock';
                this.config = EMBEDDING_CONFIG.mock;
            } else {
                this.openai = new OpenAI({ apiKey });
            }
        }
        
        console.log(`🧠 Embedding service initialized with ${this.provider} provider`);
        console.log(`   Model: ${this.config.model}`);
        console.log(`   Dimensions: ${this.config.dimensions}`);
    }
    
    /**
     * Generate embedding for a single text
     */
    async generateEmbedding(text) {
        if (!text || typeof text !== 'string') {
            throw new Error('Text must be a non-empty string');
        }
        
        // Truncate text if too long
        const truncatedText = this.truncateText(text);
        
        if (this.provider === 'openai') {
            return await this.generateOpenAIEmbedding(truncatedText);
        } else {
            return await this.generateMockEmbedding(truncatedText);
        }
    }
    
    /**
     * Generate embeddings for multiple texts (batch processing)
     */
    async generateEmbeddings(texts) {
        if (!Array.isArray(texts)) {
            throw new Error('Texts must be an array');
        }
        
        // Process in batches to avoid rate limits
        const batchSize = 100;
        const results = [];
        
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(text => this.generateEmbedding(text))
            );
            results.push(...batchResults);
            
            // Add delay between batches to respect rate limits
            if (i + batchSize < texts.length) {
                await this.delay(100);
            }
        }
        
        return results;
    }
    
    /**
     * Generate embedding using OpenAI API
     */
    async generateOpenAIEmbedding(text) {
        try {
            const response = await this.openai.embeddings.create({
                model: this.config.model,
                input: text,
                encoding_format: 'float'
            });
            
            return response.data[0].embedding;
        } catch (error) {
            console.error('OpenAI embedding generation failed:', error.message);
            
            // Fallback to mock embedding
            console.log('🔄 Falling back to mock embedding generation');
            return await this.generateMockEmbedding(text);
        }
    }
    
    /**
     * Generate deterministic mock embedding for development
     */
    async generateMockEmbedding(text) {
        // Create deterministic embedding based on text hash
        const hash = crypto.createHash('sha256').update(text).digest('hex');
        const embedding = [];
        
        // Generate deterministic vector from hash
        for (let i = 0; i < this.config.dimensions; i++) {
            const hashSlice = hash.slice(i % 32, (i % 32) + 8);
            const value = (parseInt(hashSlice, 16) / 0xFFFFFFFF) - 0.5;
            embedding.push(value);
        }
        
        // Normalize vector (unit length)
        const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        return embedding.map(val => val / magnitude);
    }
    
    /**
     * Calculate cosine similarity between two embeddings
     */
    cosineSimilarity(embedding1, embedding2) {
        if (!embedding1 || !embedding2 || embedding1.length !== embedding2.length) {
            throw new Error('Invalid embeddings for similarity calculation');
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
     * Find most similar embeddings from a list
     */
    findMostSimilar(queryEmbedding, candidateEmbeddings, limit = 10) {
        const similarities = candidateEmbeddings.map((candidate, index) => ({
            index,
            embedding: candidate.embedding || candidate,
            data: candidate.data || candidate,
            similarity: this.cosineSimilarity(queryEmbedding, candidate.embedding || candidate)
        }));
        
        // Sort by similarity (descending) and return top results
        return similarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
    }
    
    /**
     * Extract embeddings from entity objects
     */
    async generateEntityEmbedding(entity, entityType) {
        let text = '';
        
        switch (entityType) {
            case 'workflow':
                text = `${entity.name} ${entity.description || ''}`.trim();
                break;
                
            case 'opportunity':
                text = `${entity.title} ${entity.description || ''} ${(entity.tags || []).join(' ')}`.trim();
                break;
                
            case 'node':
                text = `${entity.text || ''} ${entity.type || ''}`.trim();
                break;
                
            case 'task':
                text = `${entity.text || ''} ${entity.description || ''} ${entity.status || ''} ${entity.priority || ''}`.trim();
                break;
                
            case 'message':
                text = entity.content || entity.text || '';
                break;
                
            default:
                text = JSON.stringify(entity);
        }
        
        if (!text.trim()) {
            throw new Error(`Cannot generate embedding: no text content found for ${entityType}`);
        }
        
        return await this.generateEmbedding(text);
    }
    
    /**
     * Truncate text to model's token limit
     */
    truncateText(text) {
        // Rough estimation: 1 token ≈ 4 characters for English text
        const estimatedTokens = text.length / 4;
        const maxChars = this.config.maxTokens * 4;
        
        if (estimatedTokens > this.config.maxTokens) {
            console.warn(`⚠️  Text truncated from ${text.length} to ${maxChars} characters`);
            return text.slice(0, maxChars);
        }
        
        return text;
    }
    
    /**
     * Utility function for delays
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Get embedding configuration
     */
    getConfig() {
        return {
            provider: this.provider,
            model: this.config.model,
            dimensions: this.config.dimensions,
            maxTokens: this.config.maxTokens
        };
    }
    
    /**
     * Test embedding generation
     */
    async testEmbedding() {
        try {
            const testText = 'This is a test for embedding generation';
            const embedding = await this.generateEmbedding(testText);
            
            console.log('✅ Embedding generation test passed');
            console.log(`   Text: "${testText}"`);
            console.log(`   Embedding length: ${embedding.length}`);
            console.log(`   First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
            
            return true;
        } catch (error) {
            console.error('❌ Embedding generation test failed:', error.message);
            return false;
        }
    }
}

// Singleton instance
let embeddingService = null;

/**
 * Get embedding service instance
 */
export function getEmbeddingService(provider = 'mock') {
    if (!embeddingService) {
        embeddingService = new EmbeddingService(provider);
    }
    return embeddingService;
}

/**
 * Initialize embedding service with provider detection
 */
export async function initializeEmbeddingService() {
    // Try OpenAI if API key is available
    const provider = process.env.OPENAI_API_KEY ? 'openai' : 'mock';
    
    const service = getEmbeddingService(provider);
    
    // Test the service
    const testPassed = await service.testEmbedding();
    if (!testPassed) {
        throw new Error('Embedding service initialization failed');
    }
    
    return service;
}

export { EmbeddingService };
export default EmbeddingService;