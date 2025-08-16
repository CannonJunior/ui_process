# Note-Taking System - nb-inspired Web Implementation

## Overview

This implementation provides a comprehensive note-taking system integrated into the existing workflow application. Inspired by the `nb` command-line tool, it offers powerful note management capabilities through a familiar command-line interface within the web browser.

## Features

### ✅ Phase 1 Complete - Core Functionality

- **Command-Line Interface**: Full nb-inspired command syntax in chat interface
- **Local Storage**: IndexedDB-based storage with offline capability
- **Context Awareness**: Automatic tagging based on current workflow state
- **Full-Text Search**: Fast search across note content and tags
- **Rich Organization**: Tags, categories, and hierarchical relationships
- **Seamless Integration**: Works within existing chat interface

### 🔄 Future Phases

- **LLM Integration**: Automatic content analysis and tag suggestions
- **Server Synchronization**: Multi-device sync with conflict resolution
- **Advanced Search**: Semantic similarity and vector search
- **Knowledge Graph**: Automatic relationship discovery

## Architecture

```
Note-Taking System
├── Command Parser (command-parser.js)
│   ├── Syntax validation
│   ├── Tokenization with quote support
│   └── Command routing
├── Storage Layer (note-storage.js)
│   ├── IndexedDB management
│   ├── Search indexing
│   └── Data persistence
├── Note Manager (note-manager.js)
│   ├── Business logic
│   ├── Context integration
│   └── Response formatting
└── Chat Integration (chat-interface.js)
    ├── Command detection
    ├── Context awareness
    └── UI feedback
```

## Command Reference

### Basic Commands

| Command | Description | Example |
|---------|-------------|---------|
| `add` | Create a new note | `/note add "Meeting notes" #meeting #client` |
| `search` | Search notes by content | `/note search "requirements" --tags project` |
| `list` | List notes with filters | `/note list --recent --limit 10` |
| `show` | Display specific note | `/note show 5` |
| `edit` | Update note content | `/note edit 3 "Updated content" #new-tag` |
| `delete` | Remove a note | `/note delete 7` |
| `link` | Link note to workflow item | `/note link 5 task:123` |
| `tag` | Add tags to existing note | `/note tag 8 #urgent #review` |
| `help` | Show help information | `/note help` or `/note help search` |

### Command Syntax

#### Creating Notes
```bash
/note add "Content goes here" #tag1 #tag2
/nb create "Quick note" #todo
```

#### Searching
```bash
/note search "search query"
/note search "client meeting" --tags project,urgent
/note find performance --recent
```

#### Listing and Filtering
```bash
/note list                           # Recent notes
/note list --tags meeting,client     # Filter by tags
/note list --opportunity 5           # Notes for specific opportunity
/note list --recent --limit 20       # 20 most recent notes
```

#### Linking and Organization
```bash
/note link 42 task:123              # Link note to task
/note link 15 workflow:456          # Link note to workflow
/note link 8 opportunity:789        # Link note to opportunity
```

## Storage Schema

### Note Object Structure

```javascript
{
  id: 1,                          // Auto-generated ID
  title: "Extracted from content", // Auto-generated or manual
  content: "Note content here",    // Main note text
  tags: ["meeting", "client"],     // Array of tags
  opportunityId: 5,               // Link to opportunity
  workflowId: 12,                 // Link to workflow
  taskId: 123,                    // Link to task
  encrypted: false,               // Encryption flag
  created: "2024-01-15T10:30:00Z", // Creation timestamp
  updated: "2024-01-15T11:45:00Z", // Last update timestamp
  metadata: {}                    // Additional data
}
```

### Database Indexes

- **Content Search**: Full-text search index
- **Tags**: Multi-entry GIN index for tag arrays
- **Associations**: Indexes on opportunity/workflow/task IDs
- **Temporal**: Indexes on created/updated timestamps

## Context Integration

### Automatic Tagging

The system automatically adds contextual tags based on current state:

| Context | Auto-Generated Tags | Example |
|---------|-------------------|---------|
| Current Task | `task-{id}`, `workflow-{id}` | `#task-123`, `#workflow-45` |
| Current Opportunity | `opp-{id}`, `{opportunity-name}` | `#opp-1`, `#customer-portal` |
| Time-based | `{year}-{month}` | `#2024-01` |

### Workflow Integration

```javascript
// When user selects a task node
context = {
  task: { id: 123, name: "Implement login", anchoredTo: "45" },
  workflow: { id: 45, name: "Authentication Flow", type: "process" }
}

// Note created: /note add "Implementation details"
// Automatically tagged: #task-123 #workflow-45 #authentication-flow #2024-01
```

## API Reference

### NoteCommandParser

```javascript
const parser = new NoteCommandParser();

// Check if input is a note command
parser.isNoteCommand('/note add "test"'); // true

// Parse command
const result = parser.parseCommand('/note add "content" #tag');
// Returns: { type: 'note', command: 'add', success: true, data: {...} }
```

### NoteStorage

```javascript
const storage = new NoteStorage();
await storage.initialize();

// Create note
const note = await storage.createNote({
  content: "Note content",
  tags: ["tag1", "tag2"]
});

// Search notes
const results = await storage.searchNotes("query", {
  tags: ["project"],
  limit: 10
});

// Get statistics
const stats = await storage.getStats();
```

### NoteManager

```javascript
const manager = new NoteManager(mainApp);
await manager.initialize();

// Set context
manager.setContext({
  opportunity: { id: 1, name: "Project Alpha" },
  task: { id: 123, name: "Implementation" }
});

// Process command
const response = await manager.processCommand('/note add "test"');
```

## Installation & Setup

### 1. Include Scripts

Add to your HTML in order:

```html
<!-- Note-Taking System -->
<script src="features/note-taking/command-parser.js"></script>
<script src="features/note-taking/note-storage.js"></script>
<script src="features/note-taking/note-manager.js"></script>
```

### 2. Initialize in Chat Interface

```javascript
// In your chat interface initialization
async initializeNoteManager() {
  const mainApp = window.app || window.processFlowApp;
  this.noteManager = new NoteManager(mainApp);
  await this.noteManager.initialize();
}

// In message processing
if (this.noteManager && this.noteManager.isNoteCommand(message)) {
  await this.handleNoteCommand(message);
  return;
}
```

### 3. Add CSS Styling

Include the note-specific CSS classes for proper visual feedback.

## Testing

### Browser Console Testing

```javascript
// Test command parsing
noteTestHelpers.testCommand('/note add "test" #demo');

// Create test note
await noteTestHelpers.createTestNote("Test content", ["demo"]);

// Search notes
await noteTestHelpers.searchNotes("test");

// Test chat integration
noteTestHelpers.testChatIntegration();
```

### Integration Testing

1. Load the application
2. Open chat interface
3. Try commands:
   - `/note help`
   - `/note add "First note" #test`
   - `/note search test`
   - `/note list`

## Configuration

### Storage Configuration

```javascript
// Customize database settings
const storage = new NoteStorage();
storage.dbName = 'CustomNotesDB';     // Default: 'ProcessFlowNotes'
storage.dbVersion = 2;                // Default: 1
storage.syncEnabled = false;          // Default: true
```

### Parser Configuration

```javascript
// Add custom commands
const parser = new NoteCommandParser();
parser.commands.set('archive', customArchiveHandler);
```

## Best Practices

### Note Organization

1. **Use Consistent Tags**: Establish tag naming conventions
2. **Descriptive Content**: Write clear, searchable content
3. **Regular Cleanup**: Periodically review and organize notes
4. **Link Relationships**: Connect related notes and workflows

### Performance Optimization

1. **Index Management**: Keep search indexes updated
2. **Storage Limits**: Monitor IndexedDB usage
3. **Search Efficiency**: Use specific tags for better filtering
4. **Bulk Operations**: Batch multiple operations when possible

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Commands not recognized | Scripts not loaded | Check script order in HTML |
| Storage errors | IndexedDB not supported | Check browser compatibility |
| Context not working | Main app not available | Verify `window.app` exists |
| Search not working | Index not built | Rebuild search index |

### Debug Tools

```javascript
// Check system status
await noteManager.getStats();

// Validate storage
const validation = noteStorage.validateElements();

// Check chat integration
window.chatInterface.noteManager !== null;
```

## Database Schema (PostgreSQL)

For server-side implementation, see `opportunities-schema.sql` for complete database schema including:

- **opportunities**: Business initiatives with metadata
- **notes**: Rich note content with full-text search
- **opportunity_workflows**: Relationship mappings
- **note_links**: Inter-note relationships
- **search_index**: Advanced search capabilities

## Security Considerations

### Client-Side Security

- Input validation on all commands
- XSS prevention in note content rendering
- Sanitization of user-generated content

### Future Server Integration

- Authentication and authorization
- Rate limiting on note operations
- Encryption for sensitive content
- Audit logging for compliance

## Performance Metrics

### Target Metrics

- **Command Response**: < 100ms for local operations
- **Search Performance**: < 200ms for typical queries
- **Storage Efficiency**: < 10MB for 1000 notes
- **Index Update**: < 50ms per note

### Monitoring

```javascript
// Performance monitoring
const start = performance.now();
await noteManager.processCommand(command);
const duration = performance.now() - start;
console.log(`Command took ${duration}ms`);
```

## Future Enhancements

### Phase 2: Advanced Features
- LLM-powered content analysis
- Automatic tag suggestions
- Semantic similarity search
- Server synchronization

### Phase 3: Intelligence Layer
- Pattern recognition
- Workflow optimization suggestions
- Knowledge graph generation
- Predictive associations

## Contributing

When extending the note-taking system:

1. Follow existing patterns and naming conventions
2. Add comprehensive error handling
3. Include unit tests for new functionality
4. Update this documentation
5. Consider backward compatibility

## License

This note-taking system is part of the larger workflow application project.