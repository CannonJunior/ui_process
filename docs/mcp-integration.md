# MCP Note-Taking Integration

This document describes the Model Context Protocol (MCP) based note-taking integration for the Process Flow Designer application.

## Overview

The MCP integration adds intelligent note-taking capabilities to the chat interface, allowing users to:

- Create and manage notes via chat commands
- Organize notes with Opportunities (higher-level organizational objects)
- Automatically associate notes with tasks and workflows
- Search and retrieve notes with semantic analysis
- Leverage CLI note-taking tools (nb) through a secure bridge

## Architecture

### Components

1. **MCP Servers** (Python)
   - `note-taking-server.py` - Core note-taking functionality
   - `chat-command-server.py` - Command parsing and routing

2. **MCP Bridge** (Node.js)
   - `services/mcp-bridge.js` - Secure bridge between browser and Python servers
   - `mcp-service.js` - Express service for HTTP API

3. **Chat Interface Integration**
   - Enhanced `chat-interface.js` with command detection
   - New CSS styling for command responses

### Data Flow

```
Browser Chat Interface
       ↓ HTTP API
Node.js MCP Service
       ↓ Python subprocess
Python MCP Servers
       ↓ CLI commands
nb note-taking system
```

## Setup

### Prerequisites

- Node.js 16+
- Python 3.8+ with virtual environment
- Git (for nb version control)

### Installation

1. **Install Node.js dependencies:**
   ```bash
   npm run setup-mcp
   ```

2. **Set up Python environment:**
   ```bash
   # Activate your virtual environment
   source venv_linux/bin/activate
   
   # Install Python dependencies (if any)
   pip install asyncio
   ```

3. **Install nb (note-taking CLI):**
   ```bash
   npm run install-nb
   # Or manually:
   curl -L https://raw.github.com/xwmx/nb/master/nb --create-dirs -o ~/.local/bin/nb
   chmod +x ~/.local/bin/nb
   ```

4. **Initialize nb:**
   ```bash
   nb init
   ```

### Running the Services

1. **Start the main application:**
   ```bash
   npm start
   ```

2. **Start the MCP service (in separate terminal):**
   ```bash
   npm run mcp
   ```

3. **For development with auto-restart:**
   ```bash
   npm run mcp:dev
   ```

## Usage

### Available Commands

#### Note Commands
- `/note-create "content"` - Create a new note
- `/note-search "query"` - Search notes by content
- `/note-list [filters]` - List notes with optional filters
- `/note-tag <note_id> <tags>` - Add tags to a note
- `/note-link <note_id> <target_id>` - Link note to opportunity/task

#### Opportunity Commands
- `/opp-create "title - description"` - Create a new opportunity
- `/opp-list [filters]` - List opportunities
- `/opp-search "query"` - Search opportunities
- `/opp-link <opp_id> <target_id>` - Link opportunity to task/workflow

#### Task Commands
- `/task-note <task_id> "content"` - Create note for specific task
- `/task-link <task_id> <note_id>` - Link task to note

#### Analysis Commands
- `/analyze "text"` - Analyze text for potential associations
- `/suggest [context]` - Get suggestions for current context

#### Help Commands
- `/help [command]` - Show help information
- `/commands` - List all available commands
- `/status` - Show system status

### Examples

#### Creating Notes
```
/note-create "Meeting with client about website redesign. They want modern, mobile-first design with dark mode option."
```

#### Creating Opportunities
```
/opp-create "Website Redesign Project - Complete overhaul with new branding and user experience improvements"
```

#### Searching
```
/note-search "website redesign"
/opp-search "branding"
```

#### Filtering Lists
```
/note-list tag:meeting,project limit:10
/opp-list tag:web
```

### Automatic Features

#### Smart Associations
The system automatically analyzes note content to suggest:
- Related opportunities based on keyword similarity
- Appropriate tags based on content patterns
- Connections to existing tasks and workflows

#### Context Awareness
The chat interface provides contextual command suggestions based on:
- Current conversation content
- Application state (selected nodes, tasks)
- Recent activity patterns

## Configuration

### Environment Variables

- `MCP_PORT` - Port for MCP service (default: 3001)
- `PYTHON_ENV` - Python virtual environment path (default: venv_linux)

### Data Storage

- **Notes**: Stored in `~/.workflow-notes/notebooks/` via nb
- **Associations**: SQLite database at `~/.workflow-notes/index.db`
- **Opportunities**: Database table with metadata

### Security

- Command validation and sanitization
- Whitelist of allowed CLI commands
- Rate limiting (50 commands per minute)
- Input length restrictions
- Path traversal protection

## Development

### Adding New Commands

1. **Define command pattern** in `chat-command-server.py`:
   ```python
   'new-command': r'^/new[-_]?command\\s+(.+)$'
   ```

2. **Add command handler** in `note-taking-server.py`:
   ```python
   @mcp.tool(name="handle_new_command")
   async def handle_new_command(self, param: str):
       # Implementation
       pass
   ```

3. **Update bridge routing** in `mcp-bridge.js`:
   ```javascript
   case 'handle_new_command':
       return await this.callMCPTool('note-taking', 'handle_new_command', parameters);
   ```

4. **Add response formatting** in `chat-interface.js`:
   ```javascript
   case 'handle_new_command':
       // Format response for display
       break;
   ```

### Testing

```bash
# Test MCP servers directly
python mcp-servers/note-taking-server.py test
python mcp-servers/chat-command-server.py test

# Test Node.js service
npm run mcp:test

# Integration testing through HTTP API
curl -X POST http://localhost:3001/api/mcp/parse-message \\
  -H "Content-Type: application/json" \\
  -d '{"message": "/help"}'
```

### Debugging

1. **Enable debug logging:**
   ```bash
   NODE_ENV=development npm run mcp:dev
   ```

2. **Check MCP service status:**
   ```bash
   curl http://localhost:3001/api/mcp/status
   ```

3. **Monitor Python server logs:**
   - Stdout/stderr from Python subprocess calls
   - SQLite database queries
   - CLI command execution

## Troubleshooting

### Common Issues

1. **"nb not found"**
   - Ensure nb is installed: `npm run install-nb`
   - Check PATH includes `~/.local/bin`

2. **"Python environment not found"**
   - Verify virtual environment: `ls venv_linux/bin/python3`
   - Set correct path: `PYTHON_ENV=your_venv npm run mcp`

3. **"MCP server failed to start"**
   - Check Python imports: `python -c "import asyncio, json"`
   - Verify server files exist: `ls mcp-servers/`

4. **"Rate limit exceeded"**
   - Wait 1 minute for rate limit reset
   - Reduce command frequency

5. **"Command not recognized"**
   - Use `/help` to see available commands
   - Check command syntax with `/help <command>`

### Performance Tips

- Limit note content to <10k characters
- Use specific search terms for better results
- Create opportunities for better organization
- Regularly clean up unused associations

## Future Enhancements

### Planned Features

1. **Enhanced LLM Integration**
   - Automatic note summarization
   - Intelligent tag generation
   - Content-based clustering

2. **Advanced Search**
   - Semantic similarity search
   - Full-text indexing
   - Date/time filtering

3. **Workflow Integration**
   - Automatic task-note associations
   - Workflow-based note organization
   - Progress tracking

4. **Export/Import**
   - Multiple format support (Markdown, JSON, CSV)
   - Backup/restore functionality
   - Integration with external tools

### Roadmap

- **Phase 1**: Core CLI integration ✅
- **Phase 2**: Enhanced associations and search
- **Phase 3**: LLM-powered analysis
- **Phase 4**: Advanced workflow integration
- **Phase 5**: Export/import capabilities

## Contributing

When contributing to the MCP integration:

1. Follow existing code patterns
2. Add proper error handling
3. Include security validations
4. Update documentation
5. Test with various inputs
6. Consider rate limiting impact

## Support

For issues or questions:

1. Check this documentation
2. Review troubleshooting section
3. Test with `/help` commands
4. Check console logs
5. Verify service status