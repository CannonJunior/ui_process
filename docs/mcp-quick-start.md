# MCP Note-Taking Quick Start Guide

## Overview

The MCP (Model Context Protocol) integration adds intelligent note-taking capabilities to your Process Flow Designer chat interface. You can create notes, organize them with Opportunities, and automatically associate them with your workflow tasks.

## Quick Setup

### 1. Install Dependencies
```bash
npm run setup-mcp
```

### 2. Start the Services
```bash
# Terminal 1: Start main application
npm start

# Terminal 2: Start MCP service  
npm run mcp
```

### 3. Open the Application
Navigate to `http://localhost:3000` and open the chat interface.

## First Steps

### Test the Connection
1. Open chat interface (💬 Chat button)
2. You should see: "Note-taking system connected! Type /help to see available commands."
3. If offline, you'll see: "Note-taking system offline. To enable note commands, start the MCP service with: npm run mcp"

### Try Basic Commands
```
/help
/commands
/note-create "My first workflow note"
/opp-create "Website Project - Complete redesign"
/note-search "workflow"
```

## Common Commands

### Creating Notes
```bash
# Simple note
/note-create "Meeting notes from today's standup"

# Note with tags
/note-create "Discussed new feature requirements #meeting #features"

# Note linked to opportunity
/note-create "Initial wireframes completed" 
# (system will suggest linking to related opportunities)
```

### Creating Opportunities
```bash
# Basic opportunity
/opp-create "Mobile App Development"

# With description
/opp-create "Mobile App Development - iOS and Android native apps"
```

### Searching
```bash
# Search notes
/note-search "wireframes"

# Search opportunities  
/opp-search "mobile"

# List with filters
/note-list tag:meeting limit:5
/opp-list tag:development
```

## Troubleshooting

### "Note-taking system offline"
1. Check if MCP service is running: `npm run mcp`
2. Try manual reconnection: `/reconnect` in chat
3. Check console for error messages

### "Command not recognized"
1. Use `/help` to see available commands
2. Check command syntax: `/help <command>`
3. Ensure you're using forward slash prefix: `/`

### Service Won't Start
1. Check if port 3001 is available
2. Verify Python environment: `source venv_linux/bin/activate`
3. Install nb: `npm run install-nb`

## Testing

### Automated Tests
Load the page with `?test=mcp` to run automated tests:
```
http://localhost:3000?test=mcp
```

### Manual Testing
```javascript
// In browser console
new MCPIntegrationTest().runTests()
```

## Features

### Smart Associations
- Notes automatically suggest related opportunities
- Content analysis extracts relevant tags
- Context-aware command suggestions

### Search & Organization  
- Full-text search across all notes
- Tag-based filtering
- Opportunity hierarchy for project organization

### Integration
- Links with workflow tasks and nodes
- Chat interface integration
- Persistent storage with version control

## Next Steps

1. **Create your first opportunity**: `/opp-create "Your Project Name"`
2. **Add notes to it**: `/note-create "Your project notes"`
3. **Search and organize**: `/note-list` and `/opp-list`
4. **Explore help**: `/help note` for detailed command help

## Advanced Usage

### Batch Operations
Create multiple related items:
```bash
/opp-create "E-commerce Platform - Online store development"
/note-create "Requirements gathering session #ecommerce #requirements"
/note-create "Technical architecture decisions #ecommerce #architecture"  
/note-create "UI/UX design mockups #ecommerce #design"
```

### Association Patterns
The system learns from your usage:
- Similar keywords → suggests related opportunities
- Common tags → improves categorization  
- Usage patterns → better command suggestions

### Search Tips
- Use specific terms for better results
- Combine tags: `tag:meeting,urgent`
- Use quotes for exact phrases: `/note-search "exact phrase"`

## Support

- **Documentation**: `/help` command or `docs/mcp-integration.md`
- **Status Check**: `/status` command  
- **Reconnect**: `/reconnect` command
- **Test Suite**: `new MCPIntegrationTest().runTests()`

Happy note-taking! 📝