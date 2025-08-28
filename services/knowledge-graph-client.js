/**
 * Knowledge Graph Client Service
 * Handles communication with the knowledge graph API and LLM integration
 */

class KnowledgeGraphClient {
    constructor(baseURL = 'http://localhost:3001') {
        this.baseURL = baseURL;
        this.apiClient = null;
        
        // Initialize API client if available
        if (typeof getAPIClient !== 'undefined') {
            this.apiClient = getAPIClient();
        }
        
        this.systemPrompt = `You are a specialized knowledge graph assistant. Provide terse, factual responses based exclusively on the provided knowledge graph data.

RESPONSE RULES:
- Maximum 2-3 sentences per query
- Facts only - no speculation or external knowledge
- If information is not in the graph, respond: "Not available in knowledge graph"
- Use bullet points for multiple facts
- Answer exactly what was asked

FORMAT:
For entities: [Name] - [Type]\n• [Key properties]\n• [Key relationships]
For relationships: • [Entity1] [relationship] [Entity2]
For properties: [Entity]: [Property values]`;
    }
    
    /**
     * Query the knowledge graph with natural language
     */
    async queryKnowledgeGraph(userQuery, options = {}) {
        try {
            const { 
                include_relationships = true, 
                limit = 20,
                use_semantic_search = false,
                semantic_threshold = 0.7 
            } = options;
            
            console.log('🔍 Querying knowledge graph:', userQuery);
            
            // Determine search method
            const endpoint = use_semantic_search ? '/api/v1/kg/search/semantic' : '/api/v1/kg/query';
            
            const requestBody = {
                query_text: userQuery,
                include_relationships,
                limit
            };
            
            if (use_semantic_search) {
                requestBody.threshold = semantic_threshold;
            }
            
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                throw new Error(`Knowledge graph query failed: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('📊 Knowledge graph results:', data);
            
            return {
                success: true,
                query: userQuery,
                total_results: data.total_results || data.entities?.length || 0,
                entities: data.entities || [],
                search_type: use_semantic_search ? 'semantic' : 'text',
                raw_data: data
            };
            
        } catch (error) {
            console.error('❌ Knowledge graph query error:', error);
            return {
                success: false,
                error: error.message,
                query: userQuery,
                entities: []
            };
        }
    }
    
    /**
     * Process knowledge graph results with LLM for natural language response
     */
    async processWithLLM(kgResults, userQuery) {
        try {
            if (!kgResults.success || kgResults.entities.length === 0) {
                return {
                    success: false,
                    response: "Not available in knowledge graph.",
                    source: 'kg-fallback'
                };
            }
            
            // Format knowledge graph data for LLM context
            const kgContext = this.formatKGDataForLLM(kgResults.entities);
            
            const messages = [
                {
                    role: "system",
                    content: this.systemPrompt
                },
                {
                    role: "user", 
                    content: `Knowledge Graph Data:\n${kgContext}\n\nUser Query: ${userQuery}\n\nProvide a terse response based only on the knowledge graph data above.`
                }
            ];
            
            console.log('🤖 Sending to LLM:', { query: userQuery, context_length: kgContext.length });
            
            // Use existing chat system if available, otherwise make direct API call
            let llmResponse;
            if (this.apiClient && typeof window !== 'undefined' && window.chatInterface) {
                // Use existing chat interface with special KG mode
                llmResponse = await this.processWithExistingChat(messages, userQuery);
            } else {
                // Direct API call (fallback)
                llmResponse = await this.processWithDirectAPI(messages);
            }
            
            return {
                success: true,
                response: llmResponse,
                source: 'kg-llm',
                kg_data: kgResults,
                entities_found: kgResults.entities.length
            };
            
        } catch (error) {
            console.error('❌ LLM processing error:', error);
            return {
                success: false,
                response: `Error processing knowledge graph query: ${error.message}`,
                source: 'kg-error'
            };
        }
    }
    
    /**
     * Format knowledge graph entities for LLM context
     */
    formatKGDataForLLM(entities) {
        return entities.map(entity => {
            let formatted = `ENTITY: ${entity.name} (${entity.entity_type})\n`;
            
            if (entity.description) {
                formatted += `Description: ${entity.description}\n`;
            }
            
            if (entity.properties && Object.keys(entity.properties).length > 0) {
                formatted += `Properties:\n`;
                Object.entries(entity.properties).forEach(([key, value]) => {
                    if (Array.isArray(value)) {
                        formatted += `  ${key}: ${value.join(', ')}\n`;
                    } else {
                        formatted += `  ${key}: ${value}\n`;
                    }
                });
            }
            
            if (entity.relationships && entity.relationships.length > 0) {
                formatted += `Relationships:\n`;
                entity.relationships.forEach(rel => {
                    const direction = rel.direction === 'outgoing' ? '→' : '←';
                    formatted += `  ${direction} ${rel.type}: ${rel.related_entity} (${rel.related_type})\n`;
                });
            }
            
            return formatted;
        }).join('\n---\n');
    }
    
    /**
     * Process with existing chat interface (preferred method)
     */
    async processWithExistingChat(messages, userQuery) {
        return new Promise((resolve, reject) => {
            try {
                // Create a temporary message handler for KG queries
                const originalHandler = window.chatInterface.handleMessage;
                let responseReceived = false;
                
                window.chatInterface.handleMessage = function(response) {
                    if (!responseReceived) {
                        responseReceived = true;
                        // Restore original handler
                        window.chatInterface.handleMessage = originalHandler;
                        resolve(response.content || response);
                    }
                };
                
                // Send the formatted query through existing chat system
                const kgQuery = messages[1].content;
                window.chatInterface.sendMessage(kgQuery, { 
                    isKnowledgeGraphQuery: true,
                    systemPrompt: this.systemPrompt 
                });
                
                // Timeout after 10 seconds
                setTimeout(() => {
                    if (!responseReceived) {
                        window.chatInterface.handleMessage = originalHandler;
                        reject(new Error('LLM response timeout'));
                    }
                }, 10000);
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * Direct API call to chat service (fallback method)
     */
    async processWithDirectAPI(messages) {
        const response = await fetch(`${this.baseURL}/api/v1/chat/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: messages,
                temperature: 0.1, // Low temperature for factual responses
                max_tokens: 150   // Limit response length
            })
        });
        
        if (!response.ok) {
            throw new Error(`Chat API error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.message || data.content || 'No response from LLM';
    }
    
    /**
     * Get all entity types
     */
    async getEntityTypes() {
        try {
            const response = await fetch(`${this.baseURL}/api/v1/kg/entity-types`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching entity types:', error);
            return [];
        }
    }
    
    /**
     * Get all relationship types
     */
    async getRelationshipTypes() {
        try {
            const response = await fetch(`${this.baseURL}/api/v1/kg/relationship-types`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching relationship types:', error);
            return [];
        }
    }
    
    /**
     * Combined query method - searches KG and processes with LLM
     */
    async askKnowledgeGraph(userQuery, options = {}) {
        console.log('🧠 Processing KG query:', userQuery);
        
        // Step 1: Query the knowledge graph
        const kgResults = await this.queryKnowledgeGraph(userQuery, options);
        
        // Step 2: Process results with LLM
        const llmResults = await this.processWithLLM(kgResults, userQuery);
        
        return {
            user_query: userQuery,
            kg_results: kgResults,
            llm_response: llmResults,
            success: llmResults.success
        };
    }
    
    /**
     * Test the knowledge graph with sample queries
     */
    async runTests() {
        const testQueries = [
            "Who is Alice Johnson?",
            "What company does Bob Smith work for?",
            "Who works for TechCorp Industries?",
            "What skills does Alice Johnson have?", 
            "What documents has Bob Smith authored?",
            "Who manages Alice Johnson?",
            "What assets are located in San Francisco?"
        ];
        
        console.log('🧪 Running Knowledge Graph Tests...');
        const results = [];
        
        for (const query of testQueries) {
            console.log(`\n📋 Testing: "${query}"`);
            const result = await this.askKnowledgeGraph(query);
            results.push({
                query,
                success: result.success,
                response: result.llm_response.response,
                entities_found: result.kg_results.total_results
            });
            
            console.log(`✅ Response: ${result.llm_response.response}`);
            console.log(`📊 Entities found: ${result.kg_results.total_results}`);
        }
        
        return results;
    }
}

// Create singleton instance
let kgClientInstance = null;

export function getKnowledgeGraphClient() {
    if (!kgClientInstance) {
        kgClientInstance = new KnowledgeGraphClient();
    }
    return kgClientInstance;
}

export { KnowledgeGraphClient };

// Make available globally
if (typeof window !== 'undefined') {
    window.KnowledgeGraphClient = KnowledgeGraphClient;
    window.getKnowledgeGraphClient = getKnowledgeGraphClient;
    window.kgClient = getKnowledgeGraphClient();
}