#!/usr/bin/env node

/**
 * MCP Service - Node.js application to run the MCP bridge service
 * This service acts as a bridge between the browser-based chat interface
 * and the Python MCP servers for note-taking functionality.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const MCPBridge = require('./services/mcp-bridge');

class MCPService {
    constructor() {
        this.app = express();
        this.port = process.env.MCP_PORT || 3002;
        this.mcpBridge = new MCPBridge();
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }
    
    preprocessCommandMessage(message) {
        if (!message || !message.startsWith('/')) {
            return message;
        }
        
        // Special handling for SQL/database commands to preserve SQL syntax
        const sqlCommands = ['/sql', '/db-query'];
        const isDbCommand = sqlCommands.some(cmd => message.toLowerCase().startsWith(cmd));
        
        if (isDbCommand) {
            console.log('📊 SQL command detected, applying SQL-specific preprocessing');
            
            // For SQL commands, we need to extract content from quotes but preserve the SQL syntax
            // Pattern: /sql "SELECT * FROM table" or /sql 'SELECT * FROM table'
            const sqlQuotePattern = /^(\/(?:sql|db-query)\s+)(['"])(.*?)\2(.*)$/i;
            const match = message.match(sqlQuotePattern);
            
            if (match) {
                const [, command, , sqlContent, remainder] = match;
                console.log('📊 Extracted SQL from quotes:', sqlContent);
                return `${command}${sqlContent}${remainder}`;
            }
            
            // If no quotes found, return as-is
            return message;
        }
        
        // Handle common quote patterns that cause JSON parsing issues
        // Convert quoted parameters to unquoted ones for better compatibility
        
        // Replace all quoted content with safe unquoted versions
        let processedMessage = message;
        
        // Keep processing until no more quoted content is found
        let hasQuotes = true;
        let iterations = 0;
        const maxIterations = 10; // Prevent infinite loops
        
        while (hasQuotes && iterations < maxIterations) {
            iterations++;
            const beforeProcessing = processedMessage;
            
            // Pattern for any "quoted content" in the message
            processedMessage = processedMessage.replace(/"([^"]+)"/g, (match, content) => {
                // Convert spaces and special characters to safe equivalents
                const safeContent = content
                    .replace(/\s+/g, '_')
                    .replace(/[^\w-_]/g, '')
                    .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
                
                // Ensure it's not empty
                return safeContent || 'unnamed';
            });
            
            // Check if we made any changes
            hasQuotes = beforeProcessing !== processedMessage && /"/.test(processedMessage);
        }
        
        return processedMessage;
    }

    setupMiddleware() {
        // Enable CORS for browser requests
        this.app.use(cors({
            origin: ['http://localhost:8000', 'http://127.0.0.1:8000', 'http://localhost:3000', 'http://127.0.0.1:3000', 'file://'],
            credentials: true,
            methods: ['GET', 'POST', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }));

        // Parse JSON bodies
        this.app.use(express.json({ limit: '10mb' }));
        
        // Logging middleware
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                mcp_initialized: this.mcpBridge.isInitialized
            });
        });

        // MCP Bridge status
        this.app.get('/api/mcp/status', (req, res) => {
            try {
                const status = this.mcpBridge.getStatus();
                res.json(status);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });

        // Parse chat message
        this.app.post('/api/mcp/parse-message', async (req, res) => {
            try {
                const { message } = req.body;
                if (!message) {
                    return res.status(400).json({ error: 'Message is required' });
                }

                // Preprocess the message to handle quoted parameters
                const processedMessage = this.preprocessCommandMessage(message);
                const result = await this.mcpBridge.parseMessage(processedMessage);
                res.json(result);
            } catch (error) {
                console.error('Error parsing message:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // Execute note command
        this.app.post('/api/mcp/execute-command', async (req, res) => {
            try {
                const { commandData } = req.body;
                if (!commandData) {
                    return res.status(400).json({ error: 'Command data is required' });
                }

                const result = await this.mcpBridge.executeNoteCommand(commandData);
                res.json(result);
            } catch (error) {
                console.error('Error executing command:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // Get command suggestions
        this.app.post('/api/mcp/suggest-commands', async (req, res) => {
            try {
                const { partialInput } = req.body;
                if (!partialInput) {
                    return res.status(400).json({ error: 'Partial input is required' });
                }

                const result = await this.mcpBridge.getCommandSuggestions(partialInput);
                res.json(result);
            } catch (error) {
                console.error('Error getting suggestions:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // Analyze context for commands
        this.app.post('/api/mcp/analyze-context', async (req, res) => {
            try {
                const { text, conversationHistory } = req.body;
                if (!text) {
                    return res.status(400).json({ error: 'Text is required' });
                }

                const result = await this.mcpBridge.analyzeContextForCommands(text, conversationHistory || []);
                res.json(result);
            } catch (error) {
                console.error('Error analyzing context:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // Initialize nb environment
        this.app.post('/api/mcp/init-nb', async (req, res) => {
            try {
                await this.mcpBridge.initializeNbEnvironment();
                res.json({ status: 'success', message: 'nb environment initialized' });
            } catch (error) {
                console.error('Error initializing nb:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // Execute safe CLI command
        this.app.post('/api/mcp/execute-cli', async (req, res) => {
            try {
                const { command, options } = req.body;
                if (!command) {
                    return res.status(400).json({ error: 'Command is required' });
                }

                const result = await this.mcpBridge.executeCommand(command, options || {});
                res.json({ status: 'success', output: result });
            } catch (error) {
                console.error('Error executing CLI command:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // Parse workflow command
        this.app.post('/api/mcp/parse-workflow-command', async (req, res) => {
            try {
                const { message } = req.body;
                if (!message) {
                    return res.status(400).json({ error: 'Message is required' });
                }

                // Preprocess the message to handle quoted parameters
                const processedMessage = this.preprocessCommandMessage(message);
                const result = await this.mcpBridge.parseWorkflowCommand(processedMessage);
                res.json(result);
            } catch (error) {
                console.error('Error parsing workflow command:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // Execute workflow command (validate and prepare for browser execution)
        this.app.post('/api/mcp/execute-workflow-command', async (req, res) => {
            try {
                const { commandData } = req.body;
                if (!commandData) {
                    return res.status(400).json({ error: 'Command data is required' });
                }

                const result = await this.mcpBridge.executeWorkflowCommand(commandData);
                res.json(result);
            } catch (error) {
                console.error('Error executing workflow command:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // Generate workflow help
        this.app.post('/api/mcp/workflow-help', async (req, res) => {
            try {
                const { command } = req.body;
                const result = await this.mcpBridge.generateWorkflowHelp(command);
                res.json(result);
            } catch (error) {
                console.error('Error generating workflow help:', error);
                res.status(500).json({ error: error.message });
            }
        });

        // Graceful shutdown endpoint
        this.app.post('/api/mcp/shutdown', async (req, res) => {
            try {
                await this.mcpBridge.shutdown();
                res.json({ status: 'shutdown initiated' });
                
                // Give time for response to send, then exit
                setTimeout(() => {
                    process.exit(0);
                }, 1000);
            } catch (error) {
                console.error('Error during shutdown:', error);
                res.status(500).json({ error: error.message });
            }
        });
    }

    setupErrorHandling() {
        // Handle 404s
        this.app.use((req, res) => {
            res.status(404).json({ error: 'Endpoint not found' });
        });

        // Global error handler
        this.app.use((error, req, res, next) => {
            console.error('Unhandled error:', error);
            res.status(500).json({ error: 'Internal server error' });
        });

        // Handle graceful shutdown
        process.on('SIGTERM', this.gracefulShutdown.bind(this));
        process.on('SIGINT', this.gracefulShutdown.bind(this));

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.error('Uncaught exception:', error);
            this.gracefulShutdown();
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('Unhandled rejection at:', promise, 'reason:', reason);
            this.gracefulShutdown();
        });
    }

    async start() {
        try {
            console.log('Initializing MCP Bridge...');
            const initialized = await this.mcpBridge.initialize();
            
            if (!initialized) {
                console.error('Failed to initialize MCP Bridge');
                process.exit(1);
            }

            this.server = this.app.listen(this.port, 'localhost', () => {
                console.log(`MCP Service running on http://localhost:${this.port}`);
                console.log(`Health check: http://localhost:${this.port}/health`);
                console.log(`MCP status: http://localhost:${this.port}/api/mcp/status`);
            });

            // Handle server errors
            this.server.on('error', (error) => {
                if (error.code === 'EADDRINUSE') {
                    console.error(`Port ${this.port} is already in use`);
                    process.exit(1);
                } else {
                    console.error('Server error:', error);
                }
            });

        } catch (error) {
            console.error('Failed to start MCP Service:', error);
            process.exit(1);
        }
    }

    async gracefulShutdown() {
        console.log('Initiating graceful shutdown...');
        
        try {
            // Close server
            if (this.server) {
                this.server.close();
            }

            // Shutdown MCP Bridge
            if (this.mcpBridge) {
                await this.mcpBridge.shutdown();
            }

            console.log('Graceful shutdown complete');
            process.exit(0);
        } catch (error) {
            console.error('Error during shutdown:', error);
            process.exit(1);
        }
    }
}

// CLI interface
if (require.main === module) {
    const service = new MCPService();
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
        case 'start':
        case undefined:
            service.start();
            break;
            
        case 'test':
            console.log('Testing MCP Service...');
            // Could add test routines here
            break;
            
        case 'help':
        case '--help':
        case '-h':
            console.log(`
MCP Service - Note-taking integration for Process Flow Designer

Usage: node mcp-service.js [command]

Commands:
  start         Start the MCP service (default)
  test          Run basic tests
  help          Show this help message

Environment Variables:
  MCP_PORT      Port to run the service on (default: 3002)
  PYTHON_ENV    Python virtual environment path (default: venv_linux)

Examples:
  node mcp-service.js start
  MCP_PORT=3002 node mcp-service.js start
            `);
            break;
            
        default:
            console.error(`Unknown command: ${command}`);
            console.error('Use "node mcp-service.js help" for usage information');
            process.exit(1);
    }
}

module.exports = MCPService;