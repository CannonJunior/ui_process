/**
 * MCP Bridge Service - Node.js service for communicating with Python MCP servers
 * Handles command parsing, security validation, and response formatting
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const EventEmitter = require('events');

class MCPBridge extends EventEmitter {
    constructor() {
        super();
        this.mcpServers = new Map();
        this.pythonEnv = process.env.PYTHON_ENV || 'system';
        this.mcpServersPath = path.join(__dirname, '..', 'mcp-servers');
        this.isInitialized = false;
        
        // Security whitelist for CLI commands
        this.allowedCommands = new Set([
            'nb', '~/.local/bin/nb', 'git', 'ls', 'cat', 'head', 'tail', 'grep', 'find', 'wc'
        ]);
        
        // Rate limiting
        this.commandCounts = new Map();
        this.rateLimitWindow = 60000; // 1 minute
        this.maxCommandsPerWindow = 50;
    }

    async initialize() {
        if (this.isInitialized) return true;

        try {
            // Validate Python environment
            await this.validatePythonEnvironment();
            
            // Start MCP servers
            await this.startMCPServers();
            
            // Initialize nb environment
            await this.initializeNbEnvironment();
            
            this.isInitialized = true;
            this.emit('initialized');
            console.log('MCP Bridge initialized successfully');
            return true;
            
        } catch (error) {
            console.error('Failed to initialize MCP Bridge:', error);
            this.emit('error', error);
            return false;
        }
    }

    async validatePythonEnvironment() {
        return new Promise((resolve, reject) => {
            let pythonCmd;
            
            if (this.pythonEnv === 'system') {
                pythonCmd = 'python3';
            } else {
                pythonCmd = path.join(process.cwd(), this.pythonEnv, 'bin', 'python3');
            }
            
            exec(`${pythonCmd} --version`, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(`Python environment not found: ${error.message}`));
                } else {
                    console.log(`Python environment validated: ${stdout.trim()}`);
                    resolve(true);
                }
            });
        });
    }

    async startMCPServers() {
        const servers = [
            { name: 'note-taking', file: 'note-taking-server.py' },
            { name: 'chat-command', file: 'chat-command-server.py' },
            { name: 'workflow-command', file: 'workflow-command-server.py' }
        ];

        for (const server of servers) {
            try {
                await this.startMCPServer(server.name, server.file);
            } catch (error) {
                console.error(`Failed to start ${server.name} server:`, error);
                throw error;
            }
        }
    }

    async startMCPServer(name, filename) {
        const serverPath = path.join(this.mcpServersPath, filename);
        let pythonCmd;
        
        if (this.pythonEnv === 'system') {
            pythonCmd = 'python3';
        } else {
            pythonCmd = path.join(process.cwd(), this.pythonEnv, 'bin', 'python3');
        }
        
        // Check if server file exists
        try {
            await fs.access(serverPath);
        } catch (error) {
            throw new Error(`MCP server file not found: ${serverPath}`);
        }

        // For now, we'll store server paths for on-demand execution
        // In a full MCP implementation, these would be persistent server processes
        this.mcpServers.set(name, {
            path: serverPath,
            pythonCmd,
            lastUsed: Date.now()
        });

        console.log(`MCP server registered: ${name}`);
    }

    async initializeNbEnvironment() {
        try {
            // Check if nb is installed (try both system PATH and local install)
            let nbCommand = 'nb';
            try {
                await this.executeCommand('nb --version', { timeout: 5000 });
            } catch (error) {
                // Try the local installation path
                nbCommand = '~/.local/bin/nb';
                await this.executeCommand(`${nbCommand} --version`, { timeout: 5000 });
            }
            
            console.log(`nb installation verified at: ${nbCommand}`);
            
            // Initialize nb if needed
            const nbStatus = await this.executeCommand(`${nbCommand} status`, { timeout: 5000 });
            if (nbStatus.includes('not initialized')) {
                await this.executeCommand(`${nbCommand} init`, { timeout: 10000 });
                console.log('nb initialized');
            }
            
        } catch (error) {
            console.warn('nb not available or initialization failed:', error.message);
            console.warn('Please ensure nb is installed and accessible');
            // Don't throw - nb can be installed later
        }
    }

    async parseMessage(message) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            const result = await this.callMCPTool('chat-command', 'parse_chat_input', {
                input_text: message
            });

            return result;
        } catch (error) {
            console.error('Error parsing message:', error);
            return {
                is_command: false,
                type: 'error',
                error: error.message,
                should_process_with_llm: true
            };
        }
    }

    async executeNoteCommand(commandData) {
        if (!commandData.is_command) {
            throw new Error('Not a valid command');
        }

        const { action, parameters } = commandData;

        switch (action) {
            case 'create_note':
                return await this.callMCPTool('note-taking', 'create_note', parameters);
            
            case 'search_notes':
                return await this.callMCPTool('note-taking', 'search_notes', parameters);
            
            case 'create_opportunity':
                return await this.callMCPTool('note-taking', 'create_opportunity', parameters);
            
            case 'associate_note_with_opportunity':
                return await this.callMCPTool('note-taking', 'associate_note_with_opportunity', parameters);
            
            case 'list_opportunities':
                return await this.callMCPTool('note-taking', 'list_opportunities', parameters);
            
            case 'analyze_text':
                return await this.callMCPTool('note-taking', 'analyze_text_for_associations', parameters);
            
            case 'show_help':
                return await this.callMCPTool('chat-command', 'generate_command_help', parameters);
            
            case 'list_commands':
                return await this.callMCPTool('chat-command', 'generate_command_help', {});
            
            default:
                throw new Error(`Unknown action: ${action}`);
        }
    }

    async executeWorkflowCommand(commandData) {
        if (!commandData.is_workflow_command) {
            throw new Error('Not a valid workflow command');
        }

        const { action, parameters } = commandData;

        try {
            // First, validate the command through the workflow command server
            const validation = await this.callMCPTool('workflow-command', 'validate_workflow_command', { command_data: commandData });
        
            if (!validation.valid) {
                return {
                    status: 'error',
                    errors: validation.errors,
                    warnings: validation.warnings,
                    suggestions: validation.suggestions
                };
            }

            // Command is valid, return the parsed command for execution by the browser
            return {
                status: 'ready_for_execution',
                command_data: commandData,
                validation: validation
            };
        } catch (error) {
            console.error('Error validating workflow command:', error);
            return {
                status: 'error',
                error: error.message
            };
        }
    }

    async parseWorkflowCommand(message) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            const result = await this.callMCPTool('workflow-command', 'parse_workflow_command', {
                input_text: message
            });

            return result;
        } catch (error) {
            console.error('Error parsing workflow command:', error);
            return {
                is_workflow_command: false,
                type: 'error',
                error: error.message,
                should_process_with_llm: true
            };
        }
    }

    async generateWorkflowHelp(command = null) {
        try {
            return await this.callMCPTool('workflow-command', 'generate_workflow_help', 
                command ? { command } : {}
            );
        } catch (error) {
            console.error('Error generating workflow help:', error);
            return {
                type: 'error',
                error: error.message
            };
        }
    }

    async callMCPTool(serverName, toolName, parameters = {}) {
        const server = this.mcpServers.get(serverName);
        if (!server) {
            throw new Error(`MCP server not found: ${serverName}`);
        }

        // Rate limiting check
        if (!this.checkRateLimit(serverName)) {
            throw new Error('Rate limit exceeded. Please try again later.');
        }

        return new Promise((resolve, reject) => {
            // Create a temporary script to call the MCP tool
            const scriptContent = `
import asyncio
import json
import sys
import os
sys.path.append('${this.mcpServersPath}')

# Import the server module
import importlib.util
spec = importlib.util.spec_from_file_location("server_module", "${path.join(this.mcpServersPath, serverName + '-server.py')}")
server_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server_module)

${this.getServerClassName(serverName)} = server_module.${this.getServerClassName(serverName)}

async def main():
    server = ${this.getServerClassName(serverName)}()
    try:
        # Prepare parameters from JSON string
        params_json = '${JSON.stringify(parameters).replace(/'/g, "\\'")}'
        params = json.loads(params_json)
        
        # Filter out null values to avoid issues
        filtered_params = {k: v for k, v in params.items() if v is not None}
        
        result = await server.${toolName}(**filtered_params)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    asyncio.run(main())
`;

            const pythonCmd = server.pythonCmd === 'python3' ? 'python3' : server.pythonCmd;
            const child = spawn(pythonCmd, ['-c', scriptContent], {
                stdio: ['pipe', 'pipe', 'pipe'],
                timeout: 30000,
                encoding: 'utf8'
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('close', (code) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(stdout.trim());
                        resolve(result);
                    } catch (parseError) {
                        reject(new Error(`Failed to parse MCP response: ${parseError.message}`));
                    }
                } else {
                    reject(new Error(`MCP tool failed: ${stderr}`));
                }
            });

            child.on('error', (error) => {
                reject(new Error(`Failed to execute MCP tool: ${error.message}`));
            });

            // Update last used timestamp
            server.lastUsed = Date.now();
        });
    }

    getServerClassName(serverName) {
        // Convert kebab-case to PascalCase
        return serverName
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join('') + 'Server';
    }

    async executeCommand(command, options = {}) {
        // Security validation
        const commandParts = command.split(' ');
        const baseCommand = commandParts[0];
        
        if (!this.allowedCommands.has(baseCommand)) {
            throw new Error(`Command not allowed: ${baseCommand}`);
        }

        // Additional security checks
        if (command.includes('..') || command.includes('~') || command.includes('$')) {
            throw new Error('Potentially unsafe command detected');
        }

        return new Promise((resolve, reject) => {
            const timeout = options.timeout || 30000;
            
            exec(command, { 
                timeout,
                maxBuffer: 1024 * 1024 // 1MB buffer
            }, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(`Command failed: ${error.message}`));
                } else {
                    resolve(stdout);
                }
            });
        });
    }

    checkRateLimit(identifier) {
        const now = Date.now();
        const windowStart = now - this.rateLimitWindow;
        
        if (!this.commandCounts.has(identifier)) {
            this.commandCounts.set(identifier, []);
        }
        
        const counts = this.commandCounts.get(identifier);
        
        // Remove old entries
        const recentCounts = counts.filter(timestamp => timestamp > windowStart);
        this.commandCounts.set(identifier, recentCounts);
        
        // Check if under limit
        if (recentCounts.length >= this.maxCommandsPerWindow) {
            return false;
        }
        
        // Add current request
        recentCounts.push(now);
        return true;
    }

    async validateCommandSafety(command, parameters) {
        // Additional validation for specific commands
        const validations = {
            create_note: (params) => {
                if (!params.content || params.content.length > 50000) {
                    throw new Error('Invalid note content length');
                }
            },
            
            search_notes: (params) => {
                if (params.query && params.query.length > 1000) {
                    throw new Error('Search query too long');
                }
            },
            
            create_opportunity: (params) => {
                if (!params.title || params.title.length > 200) {
                    throw new Error('Invalid opportunity title');
                }
            }
        };

        if (validations[command]) {
            validations[command](parameters);
        }
    }

    async getCommandSuggestions(partialInput) {
        try {
            return await this.callMCPTool('chat-command', 'suggest_command_completion', {
                partial_input: partialInput
            });
        } catch (error) {
            console.error('Error getting command suggestions:', error);
            return { suggestions: [] };
        }
    }

    async analyzeContextForCommands(text, conversationHistory = []) {
        try {
            return await this.callMCPTool('chat-command', 'extract_context_from_input', {
                input_text: text,
                conversation_history: conversationHistory
            });
        } catch (error) {
            console.error('Error analyzing context:', error);
            return { entities: [], intent: 'unknown' };
        }
    }

    getStatus() {
        return {
            initialized: this.isInitialized,
            servers: Array.from(this.mcpServers.keys()),
            serverStates: Object.fromEntries(
                Array.from(this.mcpServers.entries()).map(([name, server]) => [
                    name, 
                    { 
                        lastUsed: server.lastUsed,
                        available: true 
                    }
                ])
            )
        };
    }

    async shutdown() {
        // In a full implementation, this would gracefully shut down MCP server processes
        this.mcpServers.clear();
        this.isInitialized = false;
        this.emit('shutdown');
        console.log('MCP Bridge shut down');
    }
}

module.exports = MCPBridge;