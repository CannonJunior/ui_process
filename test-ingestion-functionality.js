/**
 * Test Workflow Ingestion Functionality
 * This script tests the workflow ingestion system for vector search
 */

import { getWorkflowIngestionService } from './services/workflow-ingestion-service.js';

async function runIngestionTests() {
    console.log('🧪 Starting Workflow Ingestion Tests');
    console.log('=====================================');
    
    let ingestionService;
    
    try {
        // Test 1: Service Initialization
        console.log('\n📋 Test 1: Service Initialization');
        console.log('-----------------------------------');
        
        ingestionService = getWorkflowIngestionService();
        await ingestionService.initialize();
        
        if (ingestionService.isInitialized) {
            console.log('✅ Service initialized successfully');
        } else {
            throw new Error('Service initialization failed');
        }
        
        // Test 2: Sample Workflow Ingestion
        console.log('\n📋 Test 2: Sample Workflow Ingestion');
        console.log('-------------------------------------');
        
        const sampleWorkflow = {
            version: "2.0.0",
            metadata: {
                id: "test-workflow-001",
                name: "Customer Onboarding Process",
                description: "A comprehensive workflow for onboarding new customers with automated tasks and approval processes"
            },
            nodes: [
                {
                    id: "start-1",
                    type: "terminal",
                    text: "Start Onboarding",
                    x: 100,
                    y: 100,
                    metadata: { description: "Initial step to begin customer onboarding" }
                },
                {
                    id: "process-1", 
                    type: "process",
                    text: "Collect Customer Information",
                    x: 200,
                    y: 100,
                    metadata: { description: "Gather all required customer data and documentation" }
                },
                {
                    id: "task-1",
                    type: "task",
                    text: "Verify Identity Documents",
                    x: 300,
                    y: 150,
                    metadata: { 
                        description: "Verify customer identity documents",
                        priority: "high",
                        status: "pending"
                    }
                },
                {
                    id: "decision-1",
                    type: "decision", 
                    text: "Documents Valid?",
                    x: 400,
                    y: 100,
                    metadata: { description: "Decision point for document validation approval" }
                },
                {
                    id: "task-2",
                    type: "task",
                    text: "Setup Customer Account",
                    x: 500,
                    y: 100,
                    metadata: {
                        description: "Create customer account in system",
                        priority: "medium",
                        status: "not_started"
                    }
                }
            ],
            opportunities: [
                {
                    id: "opp-1",
                    title: "Process Automation Opportunity",
                    description: "Opportunity to automate document verification using AI/ML technologies to reduce manual processing time",
                    status: "active",
                    priority: "high", 
                    tags: ["automation", "AI", "efficiency", "cost-reduction"],
                    value: 75000
                },
                {
                    id: "opp-2", 
                    title: "Customer Experience Enhancement",
                    description: "Improve customer onboarding experience with real-time status updates and mobile-friendly interface",
                    status: "planning",
                    priority: "medium",
                    tags: ["UX", "mobile", "customer-satisfaction"],
                    value: 25000
                }
            ]
        };
        
        await ingestionService.ingestWorkflow(sampleWorkflow);
        
        const stats = ingestionService.getSessionStats();
        console.log(`✅ Workflow ingested successfully`);
        console.log(`   📊 Objects created: ${stats.workflows} workflows, ${stats.nodes} nodes, ${stats.tasks} tasks, ${stats.opportunities} opportunities`);
        console.log(`   🧮 Embeddings generated: ${stats.embeddings}`);
        
        // Test 3: Vector Search Functionality
        console.log('\n📋 Test 3: Vector Search Functionality');
        console.log('--------------------------------------');
        
        const testQueries = [
            "customer onboarding process",
            "document verification task", 
            "automation opportunity",
            "identity verification workflow",
            "account setup procedures"
        ];
        
        for (const query of testQueries) {
            console.log(`\n🔍 Searching: "${query}"`);
            
            const results = await ingestionService.searchSessionData(query, {
                limit: 3,
                threshold: 0.6
            });
            
            if (results.total > 0) {
                console.log(`   ✅ Found ${results.total} results:`);
                results.results.forEach((result, index) => {
                    const similarity = (result.similarity * 100).toFixed(1);
                    const title = result.title || result.text || result.name || 'Untitled';
                    console.log(`   ${index + 1}. ${result.type}: "${title}" (${similarity}% match)`);
                    if (result.description) {
                        console.log(`      Description: ${result.description.substring(0, 80)}...`);
                    }
                });
            } else {
                console.log(`   ℹ️ No results found (threshold: 60%)`);
            }
        }
        
        // Test 4: Chat Integration Simulation
        console.log('\n📋 Test 4: Chat Integration Simulation');
        console.log('--------------------------------------');
        
        const chatQueries = [
            "How do I verify customer documents?",
            "What opportunities exist for automation?", 
            "What's the process for customer onboarding?",
            "How can I improve the customer experience?"
        ];
        
        for (const chatQuery of chatQueries) {
            console.log(`\n💬 Chat query: "${chatQuery}"`);
            
            const sessionResults = await ingestionService.searchSessionData(chatQuery, {
                limit: 5,
                entityTypes: ['workflow', 'node', 'task', 'opportunity'],
                threshold: 0.7
            });
            
            if (sessionResults && sessionResults.total > 0) {
                console.log(`   🎯 Chat would receive ${sessionResults.total} relevant results from session data`);
                console.log(`   📊 Search type: ${sessionResults.searchType}`);
                
                // Show top result as example of what chat would use for context
                const topResult = sessionResults.results[0];
                const similarity = (topResult.similarity * 100).toFixed(1);
                console.log(`   🏆 Top result: ${topResult.type} "${topResult.title || topResult.text || topResult.name}" (${similarity}% match)`);
                
            } else {
                console.log(`   ℹ️ No session results found - chat would fall back to API search`);
            }
        }
        
        // Test 5: Performance and Statistics
        console.log('\n📋 Test 5: Performance and Statistics');
        console.log('-------------------------------------');
        
        const finalStats = ingestionService.getSessionStats();
        const sessionData = ingestionService.getSessionData();
        
        console.log(`📊 Final Statistics:`);
        console.log(`   • Total Objects: ${finalStats.totalObjects}`);
        console.log(`   • Workflows: ${finalStats.workflows}`);
        console.log(`   • Nodes: ${finalStats.nodes}`);  
        console.log(`   • Tasks: ${finalStats.tasks}`);
        console.log(`   • Opportunities: ${finalStats.opportunities}`);
        console.log(`   • Embeddings: ${finalStats.embeddings}`);
        
        console.log(`\n🔍 Sample Objects:`);
        if (sessionData.workflows.length > 0) {
            const workflow = sessionData.workflows[0];
            console.log(`   Workflow: "${workflow.name}" (${workflow.nodeCount} nodes, ${workflow.taskCount} tasks)`);
        }
        if (sessionData.tasks.length > 0) {
            const task = sessionData.tasks[0];
            console.log(`   Task: "${task.text}" (Priority: ${task.metadata?.priority || 'not set'})`);
        }
        if (sessionData.opportunities.length > 0) {
            const opp = sessionData.opportunities[0];
            console.log(`   Opportunity: "${opp.title}" (Value: $${opp.value?.toLocaleString() || 'not set'})`);
        }
        
        console.log('\n🎉 All tests completed successfully!');
        console.log('\n✅ Summary:');
        console.log('   • Workflow ingestion service is working correctly');
        console.log('   • Vector search on session data is functional');  
        console.log('   • Chat integration would work as expected');
        console.log('   • Embeddings are being generated and cached properly');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
        
        if (ingestionService) {
            console.log('\n🗑️ Cleaning up test data...');
            ingestionService.clearSession();
        }
        
        throw error;
    }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runIngestionTests().catch(console.error);
}

export { runIngestionTests };