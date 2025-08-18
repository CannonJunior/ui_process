/**
 * Test script for workflow commands end-to-end functionality
 */

console.log('🧪 Testing Workflow Commands System...\n');

// Test 1: Basic command parsing
async function testWorkflowCommandParsing() {
    console.log('📝 Test 1: Workflow Command Parsing');
    
    if (!window.MCPClient) {
        console.error('❌ MCPClient not available');
        return false;
    }
    
    const mcpClient = new MCPClient();
    
    const testCommands = [
        '/node-create process "Test Node"',
        '/task-create "Test Task" "Test Node"',
        '/connect "Test Node" "Other Node" sequence',
        '/workflow-status',
        '/matrix-enter',
        '/invalid-command'
    ];
    
    let passed = 0;
    let total = testCommands.length;
    
    for (const command of testCommands) {
        try {
            console.log(`  Testing: ${command}`);
            const result = await mcpClient.parseWorkflowCommand(command);
            
            if (command.startsWith('/invalid')) {
                // Expect this to be false or unknown
                if (!result.is_workflow_command || result.type === 'unknown_workflow_command') {
                    console.log('    ✅ Unknown command correctly identified');
                    passed++;
                } else {
                    console.log('    ❌ Unknown command not handled properly');
                }
            } else {
                if (result.is_workflow_command && result.command_type) {
                    console.log(`    ✅ Parsed as ${result.command_type}`);
                    passed++;
                } else {
                    console.log('    ❌ Failed to parse workflow command');
                    console.log('    Result:', result);
                }
            }
        } catch (error) {
            console.log(`    ❌ Error: ${error.message}`);
        }
    }
    
    console.log(`📊 Parsing test: ${passed}/${total} passed\n`);
    return passed === total;
}

// Test 2: WorkflowBridge availability
async function testWorkflowBridge() {
    console.log('🔗 Test 2: WorkflowBridge Integration');
    
    if (!window.workflowBridge) {
        console.error('❌ WorkflowBridge not available globally');
        return false;
    }
    
    const context = window.workflowBridge.getApplicationContext();
    if (context && context.initialized) {
        console.log('✅ WorkflowBridge is initialized');
        console.log(`   Nodes: ${context.nodeCount}, Tasks: ${context.taskCount}`);
        return true;
    } else {
        console.log('❌ WorkflowBridge not properly initialized');
        return false;
    }
}

// Test 3: End-to-end command execution
async function testCommandExecution() {
    console.log('⚡ Test 3: Command Execution');
    
    if (!window.MCPClient || !window.workflowBridge) {
        console.error('❌ Required components not available');
        return false;
    }
    
    const mcpClient = new MCPClient();
    
    try {
        // Test workflow status command (safe, non-destructive)
        console.log('  Testing /workflow-status command...');
        
        const parseResult = await mcpClient.parseWorkflowCommand('/workflow-status');
        if (!parseResult.is_workflow_command) {
            console.log('❌ Command parsing failed');
            return false;
        }
        
        const validationResult = await mcpClient.executeWorkflowCommand(parseResult);
        if (validationResult.status !== 'ready_for_execution') {
            console.log('❌ Command validation failed:', validationResult);
            return false;
        }
        
        const executionResult = await window.workflowBridge.executeCommand(validationResult.command_data);
        if (executionResult.status === 'success') {
            console.log('✅ Command executed successfully');
            console.log(`   Result: ${executionResult.message}`);
            return true;
        } else {
            console.log('❌ Command execution failed:', executionResult);
            return false;
        }
    } catch (error) {
        console.log(`❌ Error during execution: ${error.message}`);
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting Workflow Commands Integration Tests\n');
    
    const results = {
        parsing: await testWorkflowCommandParsing(),
        bridge: await testWorkflowBridge(),
        execution: await testCommandExecution()
    };
    
    const passed = Object.values(results).filter(Boolean).length;
    const total = Object.keys(results).length;
    
    console.log('📋 Test Summary:');
    console.log(`   Parsing: ${results.parsing ? '✅' : '❌'}`);
    console.log(`   Bridge: ${results.bridge ? '✅' : '❌'}`);
    console.log(`   Execution: ${results.execution ? '✅' : '❌'}`);
    console.log(`\n🎯 Overall: ${passed}/${total} tests passed`);
    
    if (passed === total) {
        console.log('🎉 All tests passed! Workflow commands system is working correctly.');
    } else {
        console.log('⚠️  Some tests failed. Check the details above.');
    }
    
    return passed === total;
}

// Auto-run tests when script loads
if (typeof window !== 'undefined') {
    // Wait for all components to load
    window.addEventListener('load', () => {
        setTimeout(runAllTests, 2000);
    });
} else {
    console.log('⚠️  This script should be run in a browser environment');
}