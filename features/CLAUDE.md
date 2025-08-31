# Features Directory CLAUDE.md

## 🚨 CRITICAL: Root CLAUDE.md Instructions Must Be Followed

**This directory inherits ALL instructions from the root CLAUDE.md file at `/home/junior/src/ui_process/CLAUDE.md`.**

### 🌐 Port Management - CRITICAL
- **ALWAYS run the web application on port 8000 ONLY.** Never change this port without explicit user permission.
- **All features must work with the web application running on port 8000**
- **API server runs on port 3001** - features connect to this for data
- **If you need to run another service on a different port, ASK the user first.**

### 🔄 Features-Specific Instructions
- This directory contains modular feature implementations
- Each feature should be self-contained with its own controller/manager
- Features must integrate cleanly with the main application on port 8000
- Follow the established module pattern for new features

### 📋 Remember
- Read root CLAUDE.md for complete project instructions
- Maintain port 8000 for web application at ALL times
- Follow all coding conventions from root CLAUDE.md