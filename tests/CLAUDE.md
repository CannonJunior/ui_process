# Tests Directory CLAUDE.md

## 🚨 CRITICAL: Root CLAUDE.md Instructions Must Be Followed

**This directory inherits ALL instructions from the root CLAUDE.md file at `/home/junior/src/ui_process/CLAUDE.md`.**

### 🌐 Port Management - CRITICAL
- **ALWAYS run the web application on port 8000 ONLY.** Never change this port without explicit user permission.
- **Tests must assume web application runs on port 8000**
- **API server runs on port 3001** - tests should connect to this for API testing
- **If you need to run another service on a different port, ASK the user first.**

### 🔄 Tests-Specific Instructions
- This directory contains Pytest unit tests and integration tests
- Always use venv_linux when running tests
- Tests should verify the port 8000 web application functionality
- Create tests for both happy path and edge cases as per root CLAUDE.md

### 📋 Remember
- Read root CLAUDE.md for complete project instructions
- Maintain port 8000 for web application at ALL times
- Follow all testing conventions from root CLAUDE.md