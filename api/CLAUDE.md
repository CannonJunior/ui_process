# API Directory CLAUDE.md

## 🚨 CRITICAL: Root CLAUDE.md Instructions Must Be Followed

**This directory inherits ALL instructions from the root CLAUDE.md file at `/home/junior/src/ui_process/CLAUDE.md`.**

### 🌐 Port Management - CRITICAL
- **ALWAYS run the web application on port 8000 ONLY.** Never change this port without explicit user permission.
- **API server runs on port 3001** - this is separate from the web application port.
- **If you need to run another service on a different port, ASK the user first.**

### 🔄 API-Specific Instructions
- This directory contains the Express.js API server that handles database operations and backend services
- Always check that the API server is running on port 3001 before making requests
- Database routes are loaded from `/src/routes/database.js`
- Follow all security practices defined in the root CLAUDE.md

### 📋 Remember
- Read root CLAUDE.md for complete project instructions
- Maintain port 8000 for web application at ALL times
- Follow all coding conventions from root CLAUDE.md