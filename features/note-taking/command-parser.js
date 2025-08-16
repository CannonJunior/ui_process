/**
 * Command Parser for Note-Taking System
 * Implements nb-inspired command structure for web interface
 * 
 * Supported commands:
 * /note add "content" #tag1 #tag2
 * /note search query
 * /note list [--tags tag] [--recent] [--opportunity id]
 * /note show id
 * /note edit id
 * /note delete id
 * /note link task:id
 * /note tag id #newtag
 */

class NoteCommandParser {
    constructor() {
        this.commands = new Map([
            ['add', this.parseAddCommand.bind(this)],
            ['create', this.parseAddCommand.bind(this)], // Alias
            ['search', this.parseSearchCommand.bind(this)],
            ['find', this.parseSearchCommand.bind(this)], // Alias
            ['list', this.parseListCommand.bind(this)],
            ['ls', this.parseListCommand.bind(this)], // Alias
            ['show', this.parseShowCommand.bind(this)],
            ['view', this.parseShowCommand.bind(this)], // Alias
            ['edit', this.parseEditCommand.bind(this)],
            ['update', this.parseEditCommand.bind(this)], // Alias
            ['delete', this.parseDeleteCommand.bind(this)],
            ['remove', this.parseDeleteCommand.bind(this)], // Alias
            ['rm', this.parseDeleteCommand.bind(this)], // Alias
            ['link', this.parseLinkCommand.bind(this)],
            ['tag', this.parseTagCommand.bind(this)],
            ['help', this.parseHelpCommand.bind(this)]
        ]);
    }

    /**
     * Check if input is a note command
     * @param {string} input - User input
     * @returns {boolean} True if input is a note command
     */
    isNoteCommand(input) {
        const trimmed = input.trim();
        return trimmed.startsWith('/note ') || 
               trimmed.startsWith('/nb ') || 
               trimmed === '/note' || 
               trimmed === '/nb';
    }

    /**
     * Parse note command input
     * @param {string} input - User input
     * @returns {Object} Parsed command object
     */
    parseCommand(input) {
        const trimmed = input.trim();
        
        // Handle help case
        if (trimmed === '/note' || trimmed === '/nb') {
            return {
                type: 'note',
                command: 'help',
                success: true,
                data: {}
            };
        }

        // Extract command and arguments
        const match = trimmed.match(/^\/(?:note|nb)\s+(.+)$/);
        if (!match) {
            return this.createError('Invalid command format. Use /note help for usage.');
        }

        const commandLine = match[1];
        const parts = this.tokenize(commandLine);
        
        if (parts.length === 0) {
            return this.createError('No command specified. Use /note help for usage.');
        }

        const command = parts[0].toLowerCase();
        const args = parts.slice(1);

        if (!this.commands.has(command)) {
            return this.createError(`Unknown command: ${command}. Use /note help for available commands.`);
        }

        try {
            const result = this.commands.get(command)(args);
            return {
                type: 'note',
                command: command,
                success: true,
                data: result
            };
        } catch (error) {
            return this.createError(`Error parsing ${command} command: ${error.message}`);
        }
    }

    /**
     * Tokenize command line, respecting quotes
     * @param {string} commandLine - Command line to tokenize
     * @returns {Array} Array of tokens
     */
    tokenize(commandLine) {
        const tokens = [];
        let current = '';
        let inQuotes = false;
        let quoteChar = null;

        for (let i = 0; i < commandLine.length; i++) {
            const char = commandLine[i];
            
            if ((char === '"' || char === "'") && !inQuotes) {
                inQuotes = true;
                quoteChar = char;
            } else if (char === quoteChar && inQuotes) {
                inQuotes = false;
                quoteChar = null;
            } else if (char === ' ' && !inQuotes) {
                if (current) {
                    tokens.push(current);
                    current = '';
                }
            } else {
                current += char;
            }
        }

        if (current) {
            tokens.push(current);
        }

        return tokens;
    }

    /**
     * Parse add command: /note add "content" #tag1 #tag2
     */
    parseAddCommand(args) {
        if (args.length === 0) {
            throw new Error('Content is required. Usage: /note add "content" #tag1 #tag2');
        }

        let content = '';
        const tags = [];
        let contentFound = false;

        for (const arg of args) {
            if (arg.startsWith('#')) {
                tags.push(arg.substring(1));
            } else if (!contentFound) {
                content = arg;
                contentFound = true;
            } else {
                // Multiple non-tag arguments, concatenate as content
                content += ' ' + arg;
            }
        }

        if (!content.trim()) {
            throw new Error('Content cannot be empty');
        }

        return {
            content: content.trim(),
            tags: [...new Set(tags)], // Remove duplicates
            encrypted: false, // TODO: Support --encrypt flag
            template: null // TODO: Support --template flag
        };
    }

    /**
     * Parse search command: /note search query [--tags tag1,tag2]
     */
    parseSearchCommand(args) {
        if (args.length === 0) {
            throw new Error('Search query is required. Usage: /note search query [--tags tag1,tag2]');
        }

        const result = {
            query: '',
            tags: [],
            options: {}
        };

        let i = 0;
        while (i < args.length) {
            const arg = args[i];
            
            if (arg === '--tags' && i + 1 < args.length) {
                result.tags = args[i + 1].split(',').map(t => t.trim());
                i += 2;
            } else if (arg === '--encrypted') {
                result.options.encrypted = true;
                i++;
            } else if (arg === '--recent') {
                result.options.recent = true;
                i++;
            } else {
                result.query += (result.query ? ' ' : '') + arg;
                i++;
            }
        }

        if (!result.query.trim()) {
            throw new Error('Search query cannot be empty');
        }

        return result;
    }

    /**
     * Parse list command: /note list [--tags tag] [--recent] [--opportunity id]
     */
    parseListCommand(args) {
        const result = {
            tags: [],
            recent: false,
            opportunityId: null,
            limit: 20
        };

        let i = 0;
        while (i < args.length) {
            const arg = args[i];
            
            if (arg === '--tags' && i + 1 < args.length) {
                result.tags = args[i + 1].split(',').map(t => t.trim());
                i += 2;
            } else if (arg === '--recent') {
                result.recent = true;
                i++;
            } else if (arg === '--opportunity' && i + 1 < args.length) {
                result.opportunityId = parseInt(args[i + 1]);
                i += 2;
            } else if (arg === '--limit' && i + 1 < args.length) {
                result.limit = parseInt(args[i + 1]) || 20;
                i += 2;
            } else {
                throw new Error(`Unknown option: ${arg}`);
            }
        }

        return result;
    }

    /**
     * Parse show command: /note show id
     */
    parseShowCommand(args) {
        if (args.length !== 1) {
            throw new Error('Note ID is required. Usage: /note show <id>');
        }

        const id = parseInt(args[0]);
        if (isNaN(id)) {
            throw new Error('Note ID must be a number');
        }

        return { id };
    }

    /**
     * Parse edit command: /note edit id ["new content"] [#tag1 #tag2]
     */
    parseEditCommand(args) {
        if (args.length === 0) {
            throw new Error('Note ID is required. Usage: /note edit <id> ["new content"] [#tag1 #tag2]');
        }

        const id = parseInt(args[0]);
        if (isNaN(id)) {
            throw new Error('Note ID must be a number');
        }

        const result = { id };
        
        if (args.length > 1) {
            let content = '';
            const tags = [];

            for (let i = 1; i < args.length; i++) {
                const arg = args[i];
                if (arg.startsWith('#')) {
                    tags.push(arg.substring(1));
                } else {
                    content += (content ? ' ' : '') + arg;
                }
            }

            if (content) result.content = content.trim();
            if (tags.length > 0) result.tags = [...new Set(tags)];
        }

        return result;
    }

    /**
     * Parse delete command: /note delete id
     */
    parseDeleteCommand(args) {
        if (args.length !== 1) {
            throw new Error('Note ID is required. Usage: /note delete <id>');
        }

        const id = parseInt(args[0]);
        if (isNaN(id)) {
            throw new Error('Note ID must be a number');
        }

        return { id };
    }

    /**
     * Parse link command: /note link noteId task:taskId | /note link noteId workflow:workflowId
     */
    parseLinkCommand(args) {
        if (args.length !== 2) {
            throw new Error('Usage: /note link <noteId> <task:taskId|workflow:workflowId|opportunity:oppId>');
        }

        const noteId = parseInt(args[0]);
        if (isNaN(noteId)) {
            throw new Error('Note ID must be a number');
        }

        const linkTarget = args[1];
        const linkMatch = linkTarget.match(/^(task|workflow|opportunity):(\d+)$/);
        
        if (!linkMatch) {
            throw new Error('Link target must be in format: task:id, workflow:id, or opportunity:id');
        }

        return {
            noteId,
            linkType: linkMatch[1],
            linkId: parseInt(linkMatch[2])
        };
    }

    /**
     * Parse tag command: /note tag id #newtag1 #newtag2
     */
    parseTagCommand(args) {
        if (args.length < 2) {
            throw new Error('Usage: /note tag <id> #tag1 #tag2 ...');
        }

        const id = parseInt(args[0]);
        if (isNaN(id)) {
            throw new Error('Note ID must be a number');
        }

        const tags = [];
        for (let i = 1; i < args.length; i++) {
            const arg = args[i];
            if (arg.startsWith('#')) {
                tags.push(arg.substring(1));
            } else {
                throw new Error(`Invalid tag format: ${arg}. Tags must start with #`);
            }
        }

        if (tags.length === 0) {
            throw new Error('At least one tag is required');
        }

        return {
            id,
            tags: [...new Set(tags)]
        };
    }

    /**
     * Parse help command: /note help [command]
     */
    parseHelpCommand(args) {
        const command = args.length > 0 ? args[0] : null;
        return { command };
    }

    /**
     * Create error result
     */
    createError(message) {
        return {
            type: 'note',
            command: null,
            success: false,
            error: message
        };
    }

    /**
     * Get help text for commands
     */
    getHelpText(command = null) {
        if (command) {
            return this.getCommandHelp(command);
        }

        return `📝 Note-Taking Commands:

**Basic Commands:**
• \`/note add "content" #tag1 #tag2\` - Create a new note
• \`/note search query\` - Search notes by content
• \`/note list\` - List recent notes
• \`/note show <id>\` - Display a specific note

**Management:**
• \`/note edit <id> "new content"\` - Edit note content
• \`/note delete <id>\` - Delete a note
• \`/note tag <id> #newtag\` - Add tags to a note

**Linking:**
• \`/note link <noteId> task:<taskId>\` - Link note to task
• \`/note link <noteId> workflow:<workflowId>\` - Link note to workflow
• \`/note link <noteId> opportunity:<oppId>\` - Link note to opportunity

**Advanced:**
• \`/note list --tags project,meeting\` - Filter by tags
• \`/note list --recent\` - Show recent notes only
• \`/note search "query" --tags project\` - Search with tag filter

Type \`/note help <command>\` for detailed help on a specific command.`;
    }

    /**
     * Get help for specific command
     */
    getCommandHelp(command) {
        const help = {
            add: `**Add Note Command:**
\`/note add "content" #tag1 #tag2\`

Creates a new note with the specified content and tags.

**Examples:**
• \`/note add "Meeting notes from client call" #meeting #client\`
• \`/note add "Research findings on performance" #research #performance\``,

            search: `**Search Command:**
\`/note search query [--tags tag1,tag2] [--recent]\`

Search through note content and titles.

**Examples:**
• \`/note search "client meeting"\`
• \`/note search performance --tags research\`
• \`/note search todo --recent\``,

            list: `**List Command:**
\`/note list [--tags tag1,tag2] [--recent] [--opportunity id] [--limit n]\`

List notes with optional filtering.

**Examples:**
• \`/note list\` - Show recent notes
• \`/note list --tags meeting,client\` - Filter by tags
• \`/note list --opportunity 5\` - Notes for specific opportunity
• \`/note list --recent --limit 10\` - 10 most recent notes`,

            link: `**Link Command:**
\`/note link <noteId> <target>\`

Link a note to tasks, workflows, or opportunities.

**Targets:**
• \`task:123\` - Link to task with ID 123
• \`workflow:456\` - Link to workflow with ID 456
• \`opportunity:789\` - Link to opportunity with ID 789

**Example:**
\`/note link 42 task:123\` - Link note 42 to task 123`
        };

        return help[command] || `No help available for command: ${command}`;
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NoteCommandParser;
}

// Make available globally for direct use
if (typeof window !== 'undefined') {
    window.NoteCommandParser = NoteCommandParser;
}