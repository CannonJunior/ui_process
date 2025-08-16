/**
 * Note Manager
 * Main controller for the note-taking system
 * Integrates command parsing, storage, and context awareness
 */

class NoteManager {
    constructor(mainApp) {
        this.app = mainApp;
        this.parser = new NoteCommandParser();
        this.storage = new NoteStorage();
        this.isInitialized = false;
        
        // Context awareness
        this.currentOpportunity = null;
        this.currentWorkflow = null;
        this.currentTask = null;
    }

    /**
     * Initialize the note manager
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            await this.storage.initialize();
            this.isInitialized = true;
            console.log('NoteManager: Initialized successfully');
        } catch (error) {
            console.error('NoteManager: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Process note command from chat interface
     */
    async processCommand(input) {
        if (!this.isInitialized) await this.initialize();

        const parsed = this.parser.parseCommand(input);
        
        if (!parsed.success) {
            return this.createChatResponse('error', parsed.error);
        }

        try {
            switch (parsed.command) {
                case 'add':
                    return await this.handleAddCommand(parsed.data);
                case 'search':
                    return await this.handleSearchCommand(parsed.data);
                case 'list':
                    return await this.handleListCommand(parsed.data);
                case 'show':
                    return await this.handleShowCommand(parsed.data);
                case 'edit':
                    return await this.handleEditCommand(parsed.data);
                case 'delete':
                    return await this.handleDeleteCommand(parsed.data);
                case 'link':
                    return await this.handleLinkCommand(parsed.data);
                case 'tag':
                    return await this.handleTagCommand(parsed.data);
                case 'help':
                    return this.handleHelpCommand(parsed.data);
                default:
                    return this.createChatResponse('error', `Unknown command: ${parsed.command}`);
            }
        } catch (error) {
            console.error('NoteManager: Command processing failed:', error);
            return this.createChatResponse('error', `Command failed: ${error.message}`);
        }
    }

    /**
     * Handle add command
     */
    async handleAddCommand(data) {
        // Add context-aware tags
        const contextTags = this.generateContextTags();
        const allTags = [...new Set([...data.tags, ...contextTags])];

        const noteData = {
            content: data.content,
            tags: allTags,
            opportunityId: this.currentOpportunity?.id || null,
            workflowId: this.currentWorkflow?.id || null,
            taskId: this.currentTask?.id || null,
            encrypted: data.encrypted
        };

        const note = await this.storage.createNote(noteData);
        
        return this.createChatResponse('success', 
            `📝 Created note ${note.id}: "${note.title}"\n` +
            `Tags: ${note.tags.map(t => '#' + t).join(' ')}\n` +
            `${this.formatContext(note)}`
        );
    }

    /**
     * Handle search command
     */
    async handleSearchCommand(data) {
        const options = {
            tags: data.tags,
            ...data.options
        };

        const results = await this.storage.searchNotes(data.query, options);
        
        if (results.length === 0) {
            return this.createChatResponse('info', `🔍 No notes found for: "${data.query}"`);
        }

        const resultText = results.slice(0, 10).map((note, index) => {
            const preview = this.createNotePreview(note);
            return `${index + 1}. ${preview}`;
        }).join('\n');

        return this.createChatResponse('success', 
            `🔍 Found ${results.length} note(s) for: "${data.query}"\n\n${resultText}` +
            (results.length > 10 ? '\n\n... and more. Use /note list with filters for complete results.' : '')
        );
    }

    /**
     * Handle list command
     */
    async handleListCommand(data) {
        const notes = await this.storage.listNotes(data);
        
        if (notes.length === 0) {
            return this.createChatResponse('info', '📋 No notes found matching your criteria.');
        }

        const notesList = notes.map((note, index) => {
            const preview = this.createNotePreview(note);
            return `${index + 1}. ${preview}`;
        }).join('\n');

        const filterInfo = this.createFilterInfo(data);
        
        return this.createChatResponse('success', 
            `📋 Notes${filterInfo}:\n\n${notesList}`
        );
    }

    /**
     * Handle show command
     */
    async handleShowCommand(data) {
        const note = await this.storage.getNote(data.id);
        
        if (!note) {
            return this.createChatResponse('error', `Note ${data.id} not found.`);
        }

        const formattedNote = this.formatNoteDetails(note);
        return this.createChatResponse('success', formattedNote);
    }

    /**
     * Handle edit command
     */
    async handleEditCommand(data) {
        const existingNote = await this.storage.getNote(data.id);
        
        if (!existingNote) {
            return this.createChatResponse('error', `Note ${data.id} not found.`);
        }

        const updates = {};
        if (data.content) updates.content = data.content;
        if (data.tags) updates.tags = data.tags;

        const updatedNote = await this.storage.updateNote(data.id, updates);
        
        return this.createChatResponse('success', 
            `✏️ Updated note ${updatedNote.id}: "${updatedNote.title}"\n` +
            `${this.formatContext(updatedNote)}`
        );
    }

    /**
     * Handle delete command
     */
    async handleDeleteCommand(data) {
        const note = await this.storage.getNote(data.id);
        
        if (!note) {
            return this.createChatResponse('error', `Note ${data.id} not found.`);
        }

        await this.storage.deleteNote(data.id);
        
        return this.createChatResponse('success', 
            `🗑️ Deleted note ${data.id}: "${note.title}"`
        );
    }

    /**
     * Handle link command
     */
    async handleLinkCommand(data) {
        const note = await this.storage.getNote(data.noteId);
        
        if (!note) {
            return this.createChatResponse('error', `Note ${data.noteId} not found.`);
        }

        // Update note with link information
        const updates = {};
        if (data.linkType === 'task') {
            updates.taskId = data.linkId;
        } else if (data.linkType === 'workflow') {
            updates.workflowId = data.linkId;
        } else if (data.linkType === 'opportunity') {
            updates.opportunityId = data.linkId;
        }

        const updatedNote = await this.storage.updateNote(data.noteId, updates);
        
        return this.createChatResponse('success', 
            `🔗 Linked note ${data.noteId} to ${data.linkType} ${data.linkId}\n` +
            `Note: "${updatedNote.title}"`
        );
    }

    /**
     * Handle tag command
     */
    async handleTagCommand(data) {
        const note = await this.storage.getNote(data.id);
        
        if (!note) {
            return this.createChatResponse('error', `Note ${data.id} not found.`);
        }

        const currentTags = note.tags || [];
        const newTags = [...new Set([...currentTags, ...data.tags])];
        
        const updatedNote = await this.storage.updateNote(data.id, { tags: newTags });
        
        return this.createChatResponse('success', 
            `🏷️ Added tags to note ${data.id}: "${updatedNote.title}"\n` +
            `Tags: ${updatedNote.tags.map(t => '#' + t).join(' ')}`
        );
    }

    /**
     * Handle help command
     */
    handleHelpCommand(data) {
        const helpText = this.parser.getHelpText(data.command);
        return this.createChatResponse('info', helpText);
    }

    /**
     * Set current context for automatic tagging
     */
    setContext({ opportunity = null, workflow = null, task = null } = {}) {
        this.currentOpportunity = opportunity;
        this.currentWorkflow = workflow;
        this.currentTask = task;
        
        console.log('NoteManager: Context updated', {
            opportunity: opportunity?.id,
            workflow: workflow?.id,
            task: task?.id
        });
    }

    /**
     * Generate context-aware tags
     */
    generateContextTags() {
        const tags = [];
        
        if (this.currentOpportunity) {
            tags.push(`opp-${this.currentOpportunity.id}`);
            if (this.currentOpportunity.name) {
                const oppTag = this.currentOpportunity.name
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '');
                if (oppTag) tags.push(oppTag);
            }
        }
        
        if (this.currentWorkflow) {
            tags.push(`workflow-${this.currentWorkflow.id}`);
        }
        
        if (this.currentTask) {
            tags.push(`task-${this.currentTask.id}`);
        }

        // Add timestamp-based tags
        const now = new Date();
        tags.push(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
        
        return tags;
    }

    /**
     * Create note preview for listings
     */
    createNotePreview(note) {
        const content = note.content.length > 60 
            ? note.content.substring(0, 57) + '...' 
            : note.content;
        
        const tags = note.tags.length > 0 
            ? ' ' + note.tags.slice(0, 3).map(t => '#' + t).join(' ')
            : '';
        
        const date = new Date(note.updated).toLocaleDateString();
        
        return `**[${note.id}]** ${content}${tags} _(${date})_`;
    }

    /**
     * Format note details for display
     */
    formatNoteDetails(note) {
        const created = new Date(note.created).toLocaleString();
        const updated = new Date(note.updated).toLocaleString();
        
        let details = `📝 **Note ${note.id}: ${note.title}**\n\n`;
        details += `${note.content}\n\n`;
        details += `**Details:**\n`;
        details += `• Created: ${created}\n`;
        details += `• Updated: ${updated}\n`;
        
        if (note.tags.length > 0) {
            details += `• Tags: ${note.tags.map(t => '#' + t).join(' ')}\n`;
        }
        
        details += this.formatContext(note);
        
        return details;
    }

    /**
     * Format context information
     */
    formatContext(note) {
        const context = [];
        
        if (note.opportunityId) {
            context.push(`Opportunity: ${note.opportunityId}`);
        }
        if (note.workflowId) {
            context.push(`Workflow: ${note.workflowId}`);
        }
        if (note.taskId) {
            context.push(`Task: ${note.taskId}`);
        }
        
        return context.length > 0 ? `• Context: ${context.join(', ')}\n` : '';
    }

    /**
     * Create filter information for display
     */
    createFilterInfo(data) {
        const filters = [];
        
        if (data.tags.length > 0) {
            filters.push(`tags: ${data.tags.map(t => '#' + t).join(', ')}`);
        }
        if (data.opportunityId) {
            filters.push(`opportunity: ${data.opportunityId}`);
        }
        if (data.recent) {
            filters.push('recent');
        }
        
        return filters.length > 0 ? ` (${filters.join(', ')})` : '';
    }

    /**
     * Create chat response object
     */
    createChatResponse(type, message) {
        return {
            type: 'note-command',
            status: type,
            message: message,
            timestamp: new Date()
        };
    }

    /**
     * Check if input is a note command
     */
    isNoteCommand(input) {
        return this.parser.isNoteCommand(input);
    }

    /**
     * Get note statistics
     */
    async getStats() {
        if (!this.isInitialized) await this.initialize();
        return await this.storage.getStats();
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NoteManager;
}

// Make available globally for direct use
if (typeof window !== 'undefined') {
    window.NoteManager = NoteManager;
}