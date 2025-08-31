# CLAUDE.md Memoization Rules

## 🚨 CRITICAL MEMOIZATION REQUIREMENTS

### Rule 1: New Directory Creation
**WHENEVER a new directory/folder is created, a CLAUDE.md file MUST be created in that directory.**

### Rule 2: Required Content in Every Directory CLAUDE.md
Every subdirectory CLAUDE.md MUST contain:

```markdown
# [Directory Name] CLAUDE.md

## 🚨 CRITICAL: Root CLAUDE.md Instructions Must Be Followed

**This directory inherits ALL instructions from the root CLAUDE.md file at `/home/junior/src/ui_process/CLAUDE.md`.**

### 🌐 Port Management - CRITICAL
- **ALWAYS run the web application on port 8000 ONLY.** Never change this port without explicit user permission.
- **[Any directory-specific port information]**
- **If you need to run another service on a different port, ASK the user first.**

### 🔄 [Directory]-Specific Instructions
- [Directory-specific instructions here]

### 📋 Remember
- Read root CLAUDE.md for complete project instructions
- Maintain port 8000 for web application at ALL times
- Follow all coding conventions from root CLAUDE.md
```

### Rule 3: Critical Instructions to Include
Every subdirectory CLAUDE.md MUST emphasize:
- **Port 8000 requirement for web application**
- **Reference to root CLAUDE.md for complete instructions**
- **Directory-specific context while maintaining root rules**

### Rule 4: Enforcement
- **NO exceptions** - every directory gets a CLAUDE.md
- **Port 8000 is non-negotiable** and must be in every file
- **Root CLAUDE.md reference is mandatory** in every subdirectory

### Current Directories with CLAUDE.md:
- ✅ `/home/junior/src/ui_process/` (root)
- ✅ `/home/junior/src/ui_process/api/`
- ✅ `/home/junior/src/ui_process/services/`
- ✅ `/home/junior/src/ui_process/mcp-servers/`
- ✅ `/home/junior/src/ui_process/features/`
- ✅ `/home/junior/src/ui_process/tests/`

### Action Required for Future Development:
1. When creating ANY new directory, immediately create CLAUDE.md
2. Copy the template above and customize for the directory purpose
3. Always include the port 8000 requirement
4. Always reference the root CLAUDE.md file

## 🎯 Purpose
This ensures that critical project requirements (especially port 8000) are never forgotten or violated, regardless of which directory is being worked on.