/**
 * Mock Knowledge Graph Test
 * Simulates the knowledge graph API responses for testing LLM integration
 * without requiring PostgreSQL setup
 */

// Mock knowledge graph data matching our schema
const mockKnowledgeGraphData = {
    entities: [
        {
            id: '550e8400-e29b-41d4-a716-446655440001',
            name: 'Alice Johnson',
            description: 'Senior Software Engineer specializing in AI systems',
            entity_type: 'person',
            properties: {
                title: 'Senior Software Engineer',
                department: 'AI Research',
                email: 'alice.johnson@company.com',
                skills: ['Python', 'Machine Learning', 'PostgreSQL', 'Vector Databases'],
                location: 'San Francisco, CA',
                security_clearance: 'Secret'
            },
            relationships: [
                {
                    type: 'works_for',
                    direction: 'outgoing',
                    related_entity: 'TechCorp Industries',
                    related_type: 'company',
                    properties: { start_date: '2022-03-15', employment_type: 'Full-time' }
                },
                {
                    type: 'managed_by',
                    direction: 'incoming',
                    related_entity: 'Bob Smith',
                    related_type: 'person',
                    properties: { since: '2023-06-01' }
                },
                {
                    type: 'authored_by',
                    direction: 'incoming',
                    related_entity: 'AI System Architecture Specification',
                    related_type: 'document',
                    properties: { primary_author: true }
                }
            ]
        },
        {
            id: '550e8400-e29b-41d4-a716-446655440002',
            name: 'Bob Smith',
            description: 'Project Manager for Defense Systems',
            entity_type: 'person',
            properties: {
                title: 'Project Manager',
                department: 'Defense Systems',
                email: 'bob.smith@company.com',
                skills: ['Project Management', 'Systems Engineering', 'Risk Assessment'],
                location: 'Washington, DC',
                security_clearance: 'Top Secret'
            },
            relationships: [
                {
                    type: 'works_for',
                    direction: 'outgoing',
                    related_entity: 'TechCorp Industries',
                    related_type: 'company',
                    properties: { start_date: '2021-08-01', employment_type: 'Full-time' }
                },
                {
                    type: 'manages',
                    direction: 'outgoing',
                    related_entity: 'Alice Johnson',
                    related_type: 'person',
                    properties: { since: '2023-06-01' }
                }
            ]
        },
        {
            id: '550e8400-e29b-41d4-a716-446655440004',
            name: 'TechCorp Industries',
            description: 'Leading technology company specializing in AI and defense systems',
            entity_type: 'company',
            properties: {
                industry: 'Technology',
                size: '5000-10000 employees',
                location: 'San Francisco, CA',
                website: 'https://techcorp.com',
                description: 'Develops cutting-edge AI solutions for commercial and defense applications'
            },
            relationships: [
                {
                    type: 'employs',
                    direction: 'incoming',
                    related_entity: 'Alice Johnson',
                    related_type: 'person'
                },
                {
                    type: 'employs',
                    direction: 'incoming',
                    related_entity: 'Bob Smith',
                    related_type: 'person'
                }
            ]
        }
    ]
};

// Mock API responses based on query patterns
class MockKnowledgeGraphAPI {
    constructor() {
        this.data = mockKnowledgeGraphData;
        this.systemPrompt = `You are a specialized knowledge graph assistant. Provide terse, factual responses based exclusively on the provided knowledge graph data.

RESPONSE RULES:
- Maximum 2-3 sentences per query
- Facts only - no speculation or external knowledge  
- If information is not in the graph, respond: "Not available in knowledge graph"
- Use bullet points for multiple facts
- Answer exactly what was asked

FORMAT:
For entities: [Name] - [Type]
• [Key properties]
For relationships: • [Entity1] [relationship] [Entity2]
For properties: [Entity]: [Property values]`;
    }

    // Mock the /api/v1/kg/query endpoint
    async query(queryText) {
        console.log('🔍 Mock KG Query:', queryText);
        
        const queryLower = queryText.toLowerCase();
        let matchedEntities = [];
        
        // Simple pattern matching for demo
        if (queryLower.includes('alice johnson') || queryLower.includes('alice')) {
            matchedEntities = this.data.entities.filter(e => e.name === 'Alice Johnson');
        } else if (queryLower.includes('bob smith') || queryLower.includes('bob')) {
            matchedEntities = this.data.entities.filter(e => e.name === 'Bob Smith');
        } else if (queryLower.includes('techcorp') || queryLower.includes('company')) {
            if (queryLower.includes('works for') || queryLower.includes('work for')) {
                // Find all people who work for TechCorp
                matchedEntities = this.data.entities.filter(e => 
                    e.entity_type === 'person' && 
                    e.relationships.some(r => r.type === 'works_for' && r.related_entity === 'TechCorp Industries')
                );
            } else {
                matchedEntities = this.data.entities.filter(e => e.name === 'TechCorp Industries');
            }
        } else if (queryLower.includes('skills')) {
            matchedEntities = this.data.entities.filter(e => 
                e.properties.skills && (queryLower.includes(e.name.toLowerCase()) || queryLower.includes('alice'))
            );
        } else if (queryLower.includes('manages') || queryLower.includes('manager')) {
            // Find management relationships
            matchedEntities = this.data.entities.filter(e => 
                e.relationships.some(r => r.type === 'manages' || r.type === 'managed_by')
            );
        } else {
            // Fallback: search in names and descriptions
            matchedEntities = this.data.entities.filter(e => 
                e.name.toLowerCase().includes(queryLower) || 
                e.description.toLowerCase().includes(queryLower)
            );
        }
        
        return {
            success: true,
            query: queryText,
            total_results: matchedEntities.length,
            entities: matchedEntities,
            search_type: 'mock'
        };
    }

    // Mock LLM processing - simplified rule-based responses
    async processWithLLM(kgResults, userQuery) {
        if (!kgResults.success || kgResults.entities.length === 0) {
            return {
                success: false,
                response: "Not available in knowledge graph.",
                source: 'mock-fallback'
            };
        }

        const queryLower = userQuery.toLowerCase();
        let response = '';

        // Generate responses based on query patterns
        if (queryLower.includes('who is alice')) {
            const alice = kgResults.entities.find(e => e.name === 'Alice Johnson');
            if (alice) {
                response = `Alice Johnson - Person\n• ${alice.properties.title}, ${alice.properties.department}\n• Skills: ${alice.properties.skills.join(', ')}\n• Works for TechCorp Industries`;
            }
        } else if (queryLower.includes('who is bob')) {
            const bob = kgResults.entities.find(e => e.name === 'Bob Smith');
            if (bob) {
                response = `Bob Smith - Person\n• ${bob.properties.title}, ${bob.properties.department}\n• Location: ${bob.properties.location}\n• Works for TechCorp Industries`;
            }
        } else if (queryLower.includes('what company') && queryLower.includes('work')) {
            const person = kgResults.entities.find(e => e.entity_type === 'person');
            if (person) {
                const workRelation = person.relationships.find(r => r.type === 'works_for');
                response = `${person.name} works for ${workRelation?.related_entity || 'Unknown company'}.`;
            }
        } else if (queryLower.includes('who works for techcorp')) {
            const employees = kgResults.entities.filter(e => e.entity_type === 'person');
            if (employees.length > 0) {
                const names = employees.map(e => e.name).join(', ');
                response = `TechCorp Industries employees:\n• ${names.replace(', ', '\n• ')}`;
            }
        } else if (queryLower.includes('skills')) {
            const person = kgResults.entities.find(e => e.properties.skills);
            if (person) {
                response = `${person.name}: ${person.properties.skills.join(', ')}`;
            }
        } else if (queryLower.includes('who manages')) {
            const person = kgResults.entities.find(e => 
                e.relationships.some(r => r.type === 'managed_by')
            );
            if (person) {
                const manager = person.relationships.find(r => r.type === 'managed_by');
                response = `• ${manager.related_entity} manages ${person.name}`;
            }
        } else {
            // Generic entity response
            const entity = kgResults.entities[0];
            response = `${entity.name} - ${entity.entity_type}\n• ${entity.description}`;
        }

        return {
            success: true,
            response: response || "Not available in knowledge graph.",
            source: 'mock-llm',
            entities_found: kgResults.entities.length
        };
    }

    // Combined query method
    async askKnowledgeGraph(userQuery) {
        const kgResults = await this.query(userQuery);
        const llmResults = await this.processWithLLM(kgResults, userQuery);
        
        return {
            user_query: userQuery,
            kg_results: kgResults,
            llm_response: llmResults,
            success: llmResults.success
        };
    }

    // Test suite
    async runTests() {
        const testQueries = [
            "Who is Alice Johnson?",
            "What company does Bob Smith work for?",
            "Who works for TechCorp Industries?",
            "What skills does Alice Johnson have?",
            "Who manages Alice Johnson?",
            "What is TechCorp Industries?",
            "Where is Bob Smith located?"
        ];

        console.log('🧪 Running Mock Knowledge Graph Tests...');
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

// Test the mock system
async function runMockKnowledgeGraphTest() {
    console.log('🧠 Testing Mock Knowledge Graph System...');
    
    const mockKG = new MockKnowledgeGraphAPI();
    
    // Run test suite
    const results = await mockKG.runTests();
    
    console.log('\n📊 Test Results Summary:');
    let passedTests = 0;
    results.forEach((result, index) => {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        console.log(`${index + 1}. ${status} - ${result.query}`);
        console.log(`   Response: ${result.response}`);
        console.log(`   Entities: ${result.entities_found}\n`);
        
        if (result.success) passedTests++;
    });
    
    console.log(`🎯 Final Score: ${passedTests}/${results.length} tests passed`);
    
    return {
        total_tests: results.length,
        passed_tests: passedTests,
        success_rate: (passedTests / results.length * 100).toFixed(1),
        results
    };
}

// Make available globally
if (typeof window !== 'undefined') {
    window.MockKnowledgeGraphAPI = MockKnowledgeGraphAPI;
    window.runMockKnowledgeGraphTest = runMockKnowledgeGraphTest;
}

// Run test if called directly
if (typeof require !== 'undefined' && require.main === module) {
    runMockKnowledgeGraphTest();
}

export { MockKnowledgeGraphAPI, runMockKnowledgeGraphTest };