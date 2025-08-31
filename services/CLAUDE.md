# Services Directory CLAUDE.md

## 🚨 CRITICAL: Root CLAUDE.md Instructions Must Be Followed

**This directory inherits ALL instructions from the root CLAUDE.md file at `/home/junior/src/ui_process/CLAUDE.md`.**

### 🌐 Port Management - CRITICAL
- **ALWAYS run the web application on port 8000 ONLY.** Never change this port without explicit user permission.
- **API server runs on port 3001** - services connect to this port
- **MCP service runs on port 3002** - for chat command processing
- **If you need to run another service on a different port, ASK the user first.**

### 🔄 Services-Specific Instructions
- This directory contains frontend services that integrate with the API
- `api-integration.js` manages database health monitoring and modal displays
- `workflow-bridge.js` handles MCP command routing
- All services must respect the port 8000 web application requirement

### 📋 Remember
- Read root CLAUDE.md for complete project instructions
- Maintain port 8000 for web application at ALL times
- Follow all coding conventions from root CLAUDE.md