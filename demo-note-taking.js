/**
 * Note-Taking System Demonstration Script
 * Run this in browser console to test the note-taking functionality
 */

// Test data and functions for demonstration
async function demonstrateNoteTaking() {
    console.log('🚀 Starting Note-Taking System Demonstration...');
    
    try {
        // Initialize components (these should be available from the HTML)
        const parser = new NoteCommandParser();
        const storage = new NoteStorage();
        const manager = new NoteManager();
        
        console.log('✅ Components initialized successfully');
        
        // Test 1: Command Parsing
        console.log('\n📝 Testing Command Parsing...');
        const testCommands = [
            '/note add "Test note with multiple tags" #demo #testing #phase1',
            '/note search "test" --tags demo',
            '/note list --recent --limit 5',
            '/note help add'
        ];
        
        testCommands.forEach(cmd => {
            const result = parser.parseCommand(cmd);
            console.log(`Command: ${cmd}`);
            console.log('Parsed:', result);
        });
        
        // Test 2: Storage Operations
        console.log('\n💾 Testing Storage Operations...');
        await storage.initialize();
        
        // Create test notes
        const testNotes = [
            {
                content: 'First demo note about project planning',
                tags: ['demo', 'planning', 'project']
            },
            {
                content: 'Meeting notes from client discussion about requirements',
                tags: ['demo', 'meeting', 'client', 'requirements']
            },
            {
                content: 'Technical research on API integration patterns',
                tags: ['demo', 'research', 'api', 'technical']
            }
        ];
        
        const createdNotes = [];
        for (const noteData of testNotes) {
            const note = await storage.createNote(noteData);
            createdNotes.push(note);
            console.log(`Created note ${note.id}: "${note.title}"`);
        }
        
        // Test 3: Search Functionality
        console.log('\n🔍 Testing Search Functionality...');
        const searchResults = await storage.searchNotes('demo');
        console.log(`Found ${searchResults.length} notes containing "demo"`);
        
        const taggedResults = await storage.searchNotes('meeting', { tags: ['client'] });
        console.log(`Found ${taggedResults.length} notes with "meeting" and tag "client"`);
        
        // Test 4: Note Manager Integration
        console.log('\n🎯 Testing Note Manager Integration...');
        const managerCommands = [
            '/note add "Manager test note" #manager-test',
            '/note search demo',
            '/note list --tags demo'
        ];
        
        for (const cmd of managerCommands) {
            const response = await manager.processCommand(cmd);
            console.log(`Command: ${cmd}`);
            console.log('Response:', response);
        }
        
        // Test 5: Storage Statistics
        console.log('\n📊 Storage Statistics...');
        const stats = await storage.getStats();
        console.log('Stats:', stats);
        
        console.log('\n🎉 All tests completed successfully!');
        console.log('\nTo test in the chat interface:');
        console.log('1. Open the chat sidebar (💬 Chat button)');
        console.log('2. Try: /note help');
        console.log('3. Try: /note add "My first note" #test');
        console.log('4. Try: /note list');
        
        return {
            success: true,
            notesCreated: createdNotes.length,
            searchResults: searchResults.length,
            stats: stats
        };
        
    } catch (error) {
        console.error('❌ Demonstration failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Auto-run demonstration if classes are available
function checkAndRunDemo() {
    if (typeof NoteCommandParser !== 'undefined' && 
        typeof NoteStorage !== 'undefined' && 
        typeof NoteManager !== 'undefined') {
        
        console.log('🎯 Note-Taking classes detected! Running demonstration...');
        demonstrateNoteTaking().then(result => {
            if (result.success) {
                console.log('✅ Demonstration completed successfully!');
                console.log('Result:', result);
            } else {
                console.log('❌ Demonstration failed:', result.error);
            }
        });
    } else {
        console.log('⏳ Note-Taking classes not yet loaded. Run manually with: demonstrateNoteTaking()');
    }
}

// Run check after a short delay to ensure all scripts are loaded
setTimeout(checkAndRunDemo, 1000);

// Make demonstration function available globally
window.demonstrateNoteTaking = demonstrateNoteTaking;

// Provide helper functions for manual testing
window.noteTestHelpers = {
    // Quick command test
    testCommand: (cmd) => {
        if (typeof NoteCommandParser !== 'undefined') {
            const parser = new NoteCommandParser();
            return parser.parseCommand(cmd);
        }
        return 'NoteCommandParser not available';
    },
    
    // Quick note creation
    createTestNote: async (content, tags = []) => {
        if (typeof NoteStorage !== 'undefined') {
            const storage = new NoteStorage();
            await storage.initialize();
            return await storage.createNote({ content, tags });
        }
        return 'NoteStorage not available';
    },
    
    // Quick search
    searchNotes: async (query) => {
        if (typeof NoteStorage !== 'undefined') {
            const storage = new NoteStorage();
            await storage.initialize();
            return await storage.searchNotes(query);
        }
        return 'NoteStorage not available';
    },
    
    // Chat integration test
    testChatIntegration: () => {
        if (window.chatInterface && window.chatInterface.noteManager) {
            console.log('✅ Chat interface has note manager');
            return window.chatInterface.noteManager.getStats();
        } else {
            console.log('❌ Chat interface or note manager not available');
            return null;
        }
    }
};

console.log('📝 Note-Taking Demo Script Loaded');
console.log('Available functions:');
console.log('- demonstrateNoteTaking() - Full demonstration');
console.log('- noteTestHelpers.testCommand(cmd) - Test command parsing');
console.log('- noteTestHelpers.createTestNote(content, tags) - Create test note');
console.log('- noteTestHelpers.searchNotes(query) - Search notes');
console.log('- noteTestHelpers.testChatIntegration() - Test chat integration');