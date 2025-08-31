# MCP Servers Directory CLAUDE.md

## 🚨 CRITICAL: Root CLAUDE.md Instructions Must Be Followed

**This directory inherits ALL instructions from the root CLAUDE.md file at `/home/junior/src/ui_process/CLAUDE.md`.**

### 🌐 Port Management - CRITICAL
- **ALWAYS run the web application on port 8000 ONLY.** Never change this port without explicit user permission.
- **MCP service runs on port 3002** - these Python servers communicate through this port
- **API server runs on port 3001** - for database operations
- **If you need to run another service on a different port, ASK the user first.**

### 🔄 MCP Servers-Specific Instructions
- This directory contains Python MCP servers for chat command processing
- `chat-command-server.py` handles /help and general commands
- `workflow-command-server.py` handles workflow-specific commands
- `note-taking-server.py` handles note operations
- Use venv_linux when executing Python commands

### 📋 Remember
- Read root CLAUDE.md for complete project instructions
- Maintain port 8000 for web application at ALL times
- Follow all coding conventions from root CLAUDE.md