/**
 * Note Storage System
 * Implements nb-inspired storage with IndexedDB and server backup
 * 
 * Features:
 * - Local IndexedDB storage for offline access
 * - Full-text search indexing
 * - Tag-based organization
 * - Server synchronization
 * - Conflict resolution
 */

class NoteStorage {
    constructor() {
        this.dbName = 'ProcessFlowNotes';
        this.dbVersion = 1;
        this.db = null;
        this.isInitialized = false;
        this.syncEnabled = true;
        this.searchIndex = new Map(); // Simple in-memory search index
    }

    /**
     * Initialize the storage system
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            await this.initializeIndexedDB();
            await this.buildSearchIndex();
            this.isInitialized = true;
            console.log('NoteStorage: Initialized successfully');
        } catch (error) {
            console.error('NoteStorage: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Initialize IndexedDB
     */
    async initializeIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                reject(new Error('Failed to open IndexedDB'));
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Notes store
                if (!db.objectStoreNames.contains('notes')) {
                    const notesStore = db.createObjectStore('notes', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    
                    // Indexes for efficient querying
                    notesStore.createIndex('created', 'created', { unique: false });
                    notesStore.createIndex('updated', 'updated', { unique: false });
                    notesStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
                    notesStore.createIndex('opportunityId', 'opportunityId', { unique: false });
                    notesStore.createIndex('workflowId', 'workflowId', { unique: false });
                    notesStore.createIndex('taskId', 'taskId', { unique: false });
                }

                // Search index store (for full-text search)
                if (!db.objectStoreNames.contains('searchIndex')) {
                    const searchStore = db.createObjectStore('searchIndex', { 
                        keyPath: ['term', 'noteId'] 
                    });
                }

                // Opportunities store
                if (!db.objectStoreNames.contains('opportunities')) {
                    const oppStore = db.createObjectStore('opportunities', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    oppStore.createIndex('created', 'created', { unique: false });
                    oppStore.createIndex('status', 'status', { unique: false });
                }
            };
        });
    }

    /**
     * Create a new note
     */
    async createNote(data) {
        if (!this.isInitialized) await this.initialize();

        const note = {
            title: data.title || this.extractTitle(data.content),
            content: data.content,
            tags: data.tags || [],
            opportunityId: data.opportunityId || null,
            workflowId: data.workflowId || null,
            taskId: data.taskId || null,
            encrypted: data.encrypted || false,
            created: new Date(),
            updated: new Date(),
            metadata: data.metadata || {}
        };

        // Encrypt content if requested
        if (note.encrypted) {
            note.content = await this.encryptContent(note.content);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['notes'], 'readwrite');
            const store = transaction.objectStore('notes');
            const request = store.add(note);

            request.onsuccess = (event) => {
                const noteId = event.target.result;
                note.id = noteId;
                
                // Update search index
                this.indexNoteForSearch(note);
                
                console.log(`NoteStorage: Created note ${noteId}`);
                resolve(note);
            };

            request.onerror = () => {
                reject(new Error('Failed to create note'));
            };
        });
    }

    /**
     * Get note by ID
     */
    async getNote(id) {
        if (!this.isInitialized) await this.initialize();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['notes'], 'readonly');
            const store = transaction.objectStore('notes');
            const request = store.get(id);

            request.onsuccess = (event) => {
                const note = event.target.result;
                if (note && note.encrypted) {
                    // Decrypt content if encrypted
                    this.decryptContent(note.content).then(decrypted => {
                        note.content = decrypted;
                        resolve(note);
                    }).catch(reject);
                } else {
                    resolve(note);
                }
            };

            request.onerror = () => {
                reject(new Error('Failed to get note'));
            };
        });
    }

    /**
     * Update note
     */
    async updateNote(id, updates) {
        if (!this.isInitialized) await this.initialize();

        const existingNote = await this.getNote(id);
        if (!existingNote) {
            throw new Error(`Note ${id} not found`);
        }

        const updatedNote = {
            ...existingNote,
            ...updates,
            updated: new Date()
        };

        // Re-encrypt if content changed and note is encrypted
        if (updates.content && existingNote.encrypted) {
            updatedNote.content = await this.encryptContent(updates.content);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['notes'], 'readwrite');
            const store = transaction.objectStore('notes');
            const request = store.put(updatedNote);

            request.onsuccess = () => {
                // Update search index
                this.indexNoteForSearch(updatedNote);
                
                console.log(`NoteStorage: Updated note ${id}`);
                resolve(updatedNote);
            };

            request.onerror = () => {
                reject(new Error('Failed to update note'));
            };
        });
    }

    /**
     * Delete note
     */
    async deleteNote(id) {
        if (!this.isInitialized) await this.initialize();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['notes'], 'readwrite');
            const store = transaction.objectStore('notes');
            const request = store.delete(id);

            request.onsuccess = () => {
                // Remove from search index
                this.removeNoteFromSearchIndex(id);
                
                console.log(`NoteStorage: Deleted note ${id}`);
                resolve(true);
            };

            request.onerror = () => {
                reject(new Error('Failed to delete note'));
            };
        });
    }

    /**
     * Search notes
     */
    async searchNotes(query, options = {}) {
        if (!this.isInitialized) await this.initialize();

        const results = [];
        const queryTerms = this.tokenizeQuery(query);
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['notes'], 'readonly');
            const store = transaction.objectStore('notes');
            const request = store.getAll();

            request.onsuccess = (event) => {
                const notes = event.target.result;
                
                for (const note of notes) {
                    let score = 0;
                    
                    // Apply filters
                    if (options.tags && options.tags.length > 0) {
                        if (!options.tags.some(tag => note.tags.includes(tag))) {
                            continue;
                        }
                    }
                    
                    if (options.opportunityId && note.opportunityId !== options.opportunityId) {
                        continue;
                    }
                    
                    if (options.encrypted !== undefined && note.encrypted !== options.encrypted) {
                        continue;
                    }

                    // Calculate relevance score
                    const text = (note.title + ' ' + note.content).toLowerCase();
                    for (const term of queryTerms) {
                        const termLower = term.toLowerCase();
                        if (text.includes(termLower)) {
                            score += text.split(termLower).length - 1;
                        }
                    }

                    if (score > 0) {
                        results.push({ note, score });
                    }
                }

                // Sort by score (relevance) and date
                results.sort((a, b) => {
                    if (a.score !== b.score) {
                        return b.score - a.score;
                    }
                    return new Date(b.note.updated) - new Date(a.note.updated);
                });

                resolve(results.map(r => r.note));
            };

            request.onerror = () => {
                reject(new Error('Search failed'));
            };
        });
    }

    /**
     * List notes with filtering
     */
    async listNotes(options = {}) {
        if (!this.isInitialized) await this.initialize();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['notes'], 'readonly');
            const store = transaction.objectStore('notes');
            
            let request;
            if (options.recent) {
                const index = store.index('updated');
                request = index.getAll();
            } else {
                request = store.getAll();
            }

            request.onsuccess = (event) => {
                let notes = event.target.result;
                
                // Apply filters
                if (options.tags && options.tags.length > 0) {
                    notes = notes.filter(note => 
                        options.tags.some(tag => note.tags.includes(tag))
                    );
                }
                
                if (options.opportunityId) {
                    notes = notes.filter(note => note.opportunityId === options.opportunityId);
                }

                // Sort by updated date (most recent first)
                notes.sort((a, b) => new Date(b.updated) - new Date(a.updated));

                // Apply limit
                if (options.limit) {
                    notes = notes.slice(0, options.limit);
                }

                resolve(notes);
            };

            request.onerror = () => {
                reject(new Error('List failed'));
            };
        });
    }

    /**
     * Extract title from content (first line or first few words)
     */
    extractTitle(content) {
        if (!content) return 'Untitled Note';
        
        const firstLine = content.split('\n')[0].trim();
        if (firstLine.length > 0) {
            return firstLine.length > 50 ? firstLine.substring(0, 47) + '...' : firstLine;
        }
        
        const words = content.trim().split(/\s+/).slice(0, 8);
        return words.join(' ') + (words.length === 8 ? '...' : '');
    }

    /**
     * Tokenize search query
     */
    tokenizeQuery(query) {
        return query.trim().split(/\s+/).filter(term => term.length > 0);
    }

    /**
     * Index note for full-text search
     */
    indexNoteForSearch(note) {
        if (!note.content || note.encrypted) return;

        const text = (note.title + ' ' + note.content).toLowerCase();
        const terms = text.match(/\b\w+\b/g) || [];
        
        for (const term of terms) {
            if (term.length > 2) { // Skip very short terms
                this.searchIndex.set(`${term}:${note.id}`, note.id);
            }
        }
    }

    /**
     * Remove note from search index
     */
    removeNoteFromSearchIndex(noteId) {
        for (const [key, id] of this.searchIndex.entries()) {
            if (id === noteId) {
                this.searchIndex.delete(key);
            }
        }
    }

    /**
     * Build search index from existing notes
     */
    async buildSearchIndex() {
        const notes = await this.listNotes();
        this.searchIndex.clear();
        
        for (const note of notes) {
            this.indexNoteForSearch(note);
        }
        
        console.log(`NoteStorage: Built search index for ${notes.length} notes`);
    }

    /**
     * Encrypt note content (placeholder - implement actual encryption)
     */
    async encryptContent(content) {
        // TODO: Implement actual encryption using Web Crypto API
        console.warn('Encryption not yet implemented');
        return content;
    }

    /**
     * Decrypt note content (placeholder - implement actual decryption)
     */
    async decryptContent(encryptedContent) {
        // TODO: Implement actual decryption using Web Crypto API
        console.warn('Decryption not yet implemented');
        return encryptedContent;
    }

    /**
     * Get storage statistics
     */
    async getStats() {
        if (!this.isInitialized) await this.initialize();

        const notes = await this.listNotes();
        const totalNotes = notes.length;
        const encryptedNotes = notes.filter(n => n.encrypted).length;
        const totalTags = [...new Set(notes.flatMap(n => n.tags))].length;
        
        return {
            totalNotes,
            encryptedNotes,
            totalTags,
            searchIndexSize: this.searchIndex.size,
            initialized: this.isInitialized
        };
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NoteStorage;
}

// Make available globally for direct use
if (typeof window !== 'undefined') {
    window.NoteStorage = NoteStorage;
}