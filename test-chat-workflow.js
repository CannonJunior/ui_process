/**
 * Test script to debug workflow command processing in chat interface
 */

console.log('🔍 Testing Chat Workflow Command Processing...');

// Wait for the application to load
window.addEventListener('load', async () => {
    console.log('Application loaded, starting test...');
    
    // Wait a bit more for all components to initialize
    setTimeout(async () => {
        try {
            // Test the MCP client directly first
            console.log('1. Testing MCP Client directly...');
            if (window.MCPClient) {
                const mcpClient = new MCPClient();
                const parseResult = await mcpClient.parseWorkflowCommand('/node-create process "Test Node"');
                console.log('MCP Client parse result:', parseResult);
                
                if (parseResult.is_workflow_command) {
                    console.log('✅ MCP Client can parse workflow commands');
                } else {
                    console.log('❌ MCP Client failed to parse workflow command');
                    return;
                }
            } else {
                console.log('❌ MCPClient not available');
                return;
            }
            
            // Test the chat interface
            console.log('2. Testing Chat Interface...');
            if (window.chatInterface) {
                console.log('Chat interface found, checking MCP initialization...');
                console.log('MCP initialized:', window.chatInterface.mcpInitialized);
                console.log('MCP client available:', !!window.chatInterface.mcpClient);
                
                // Test sending a workflow command through the chat interface
                console.log('3. Simulating workflow command input...');
                
                // Simulate typing in the chat input
                const chatInput = document.getElementById('chatInput');
                if (chatInput) {
                    chatInput.value = '/node-create process "Test Node"';
                    
                    // Trigger the send message function
                    if (window.chatInterface.sendMessage) {
                        console.log('Sending message through chat interface...');
                        await window.chatInterface.sendMessage();
                    } else {
                        console.log('❌ sendMessage method not available');
                    }
                } else {
                    console.log('❌ Chat input element not found');
                }
            } else {
                console.log('❌ Chat interface not available');
            }
            
        } catch (error) {
            console.error('Test error:', error);
        }
    }, 3000); // Wait 3 seconds for everything to initialize
});