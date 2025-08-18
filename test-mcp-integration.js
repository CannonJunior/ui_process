/**
 * MCP Integration Test Script
 * Tests the end-to-end functionality of the note-taking system
 */

class MCPIntegrationTest {
    constructor() {
        this.results = [];
        this.mcpClient = null;
    }

    async runTests() {
        console.log('🧪 Starting MCP Integration Tests...\n');
        
        try {
            // Test 1: MCP Client Connection
            await this.testMCPClientConnection();
            
            // Test 2: Service Health Check
            await this.testServiceHealthCheck();
            
            // Test 3: Command Parsing
            await this.testCommandParsing();
            
            // Test 4: Note Commands (if service is available)
            await this.testNoteCommands();
            
            // Test 5: Error Handling
            await this.testErrorHandling();
            
            // Test 6: Browser Integration
            await this.testBrowserIntegration();
            
        } catch (error) {
            console.error('Test suite failed:', error);
        }
        
        this.displayResults();
    }

    async testMCPClientConnection() {
        const testName = 'MCP Client Connection';
        console.log(`Testing: ${testName}`);
        
        try {
            this.mcpClient = new MCPClient();
            this.recordResult(testName, true, 'MCP Client instantiated successfully');
        } catch (error) {
            this.recordResult(testName, false, `Failed to create MCP Client: ${error.message}`);
        }
    }

    async testServiceHealthCheck() {
        const testName = 'Service Health Check';
        console.log(`Testing: ${testName}`);
        
        if (!this.mcpClient) {
            this.recordResult(testName, false, 'MCP Client not available');
            return;
        }

        try {
            const health = await this.mcpClient.healthCheck();
            
            if (health.service_available) {
                this.recordResult(testName, true, 'MCP Service is available and healthy');
            } else {
                this.recordResult(testName, false, `Service unavailable: ${health.error}`);
            }
        } catch (error) {
            this.recordResult(testName, false, `Health check failed: ${error.message}`);
        }
    }

    async testCommandParsing() {
        const testName = 'Command Parsing';
        console.log(`Testing: ${testName}`);
        
        if (!this.mcpClient) {
            this.recordResult(testName, false, 'MCP Client not available');
            return;
        }

        const testCommands = [
            { input: '/help', expected: 'command' },
            { input: '/note-create "test note"', expected: 'command' },
            { input: 'regular text', expected: 'text' },
            { input: '/unknown-command', expected: 'command' }
        ];

        let passed = 0;
        let total = testCommands.length;

        for (const test of testCommands) {
            try {
                const result = await this.mcpClient.parseMessage(test.input);
                
                if (test.expected === 'command' && result.is_command) {
                    passed++;
                    console.log(`  ✅ "${test.input}" correctly identified as command`);
                } else if (test.expected === 'text' && !result.is_command) {
                    passed++;
                    console.log(`  ✅ "${test.input}" correctly identified as text`);
                } else {
                    console.log(`  ❌ "${test.input}" incorrectly parsed`);
                }
            } catch (error) {
                console.log(`  ❌ "${test.input}" failed to parse: ${error.message}`);
            }
        }

        this.recordResult(testName, passed === total, `${passed}/${total} parsing tests passed`);
    }

    async testNoteCommands() {
        const testName = 'Note Commands';
        console.log(`Testing: ${testName}`);
        
        if (!this.mcpClient) {
            this.recordResult(testName, false, 'MCP Client not available');
            return;
        }

        try {
            // Test help command
            const helpResult = await this.mcpClient.parseMessage('/help');
            
            if (helpResult.is_command) {
                const commandResult = await this.mcpClient.executeNoteCommand(helpResult);
                
                if (commandResult.status !== 'error') {
                    this.recordResult(testName, true, 'Help command executed successfully');
                } else {
                    this.recordResult(testName, false, `Command execution failed: ${commandResult.error}`);
                }
            } else {
                this.recordResult(testName, false, 'Help command not recognized');
            }
        } catch (error) {
            this.recordResult(testName, false, `Note command test failed: ${error.message}`);
        }
    }

    async testErrorHandling() {
        const testName = 'Error Handling';
        console.log(`Testing: ${testName}`);
        
        if (!this.mcpClient) {
            this.recordResult(testName, false, 'MCP Client not available');
            return;
        }

        try {
            // Test with invalid command data
            const result = await this.mcpClient.executeNoteCommand({
                is_command: true,
                action: 'invalid_action',
                parameters: {}
            });

            // Should handle error gracefully
            if (result.status === 'error') {
                this.recordResult(testName, true, 'Error handling works correctly');
            } else {
                this.recordResult(testName, false, 'Should have returned error for invalid action');
            }
        } catch (error) {
            this.recordResult(testName, true, 'Error correctly caught and handled');
        }
    }

    async testBrowserIntegration() {
        const testName = 'Browser Integration';
        console.log(`Testing: ${testName}`);
        
        try {
            // Check if ChatInterface exists
            if (typeof ChatInterface !== 'undefined') {
                this.recordResult(testName, true, 'ChatInterface class is available');
            } else {
                this.recordResult(testName, false, 'ChatInterface class not found');
            }
            
            // Check if MCP client is properly loaded
            if (typeof MCPClient !== 'undefined') {
                console.log('  ✅ MCPClient class is available');
            } else {
                console.log('  ❌ MCPClient class not found');
            }
            
        } catch (error) {
            this.recordResult(testName, false, `Browser integration test failed: ${error.message}`);
        }
    }

    recordResult(testName, passed, message) {
        this.results.push({
            test: testName,
            passed,
            message
        });
        
        const status = passed ? '✅ PASS' : '❌ FAIL';
        console.log(`  ${status}: ${message}\n`);
    }

    displayResults() {
        console.log('\n📊 Test Results Summary:');
        console.log('========================');
        
        const passed = this.results.filter(r => r.passed).length;
        const total = this.results.length;
        
        this.results.forEach(result => {
            const status = result.passed ? '✅' : '❌';
            console.log(`${status} ${result.test}: ${result.message}`);
        });
        
        console.log(`\n📈 Overall: ${passed}/${total} tests passed`);
        
        if (passed === total) {
            console.log('🎉 All tests passed! MCP integration is working correctly.');
        } else {
            console.log('⚠️  Some tests failed. Check the MCP service and configuration.');
        }
        
        // Display setup instructions if service is not available
        const serviceTest = this.results.find(r => r.test === 'Service Health Check');
        if (serviceTest && !serviceTest.passed) {
            console.log('\n🔧 Setup Instructions:');
            console.log('1. Install dependencies: npm run setup-mcp');
            console.log('2. Start MCP service: npm run mcp');
            console.log('3. Refresh the page and try again');
        }
    }
}

// Auto-run tests when script loads (for manual testing)
if (typeof window !== 'undefined') {
    // Browser environment
    console.log('MCP Integration Test Script Loaded');
    console.log('Run tests with: new MCPIntegrationTest().runTests()');
    
    // Expose test class globally
    window.MCPIntegrationTest = MCPIntegrationTest;
    
    // Auto-run after a delay to allow other scripts to load
    setTimeout(() => {
        if (window.location.search.includes('test=mcp')) {
            new MCPIntegrationTest().runTests();
        }
    }, 2000);
} else {
    // Node.js environment
    module.exports = MCPIntegrationTest;
}