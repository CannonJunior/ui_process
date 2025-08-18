# Workflow Commands Design Specification

## Overview
This document defines the complete command system for controlling the Process Flow Designer application through natural language chat commands.

## Command Categories

### 1. Node Management Commands

#### Create Nodes
```bash
/node-create <type> [name] [x,y]
/create-node <type> [name] [position]
/add-node <type> [name]

# Examples
/node-create process "User Registration"
/node-create decision "Age Check" 200,300
/add-node terminal "Process Complete"
```

#### Delete Nodes
```bash
/node-delete <node-id|name>
/delete-node <identifier>
/remove-node <identifier>

# Examples
/node-delete "User Registration"
/delete-node node-123
/remove-node current  # deletes currently selected
```

#### Modify Nodes
```bash
/node-rename <old-name> <new-name>
/node-move <node-id> <x,y>
/node-type <node-id> <new-type>

# Examples
/node-rename "User Registration" "User Signup"
/node-move "Age Check" 400,200
/node-type node-123 terminal
```

### 2. Task Management Commands

#### Create Tasks
```bash
/task-create <name> [node-id] [priority]
/add-task <name> [to-node]
/create-task <name>

# Examples
/task-create "Validate email format" "User Registration"
/add-task "Send welcome email"
/task-create "Check database" high-priority
```

#### Manage Tasks
```bash
/task-delete <task-name|id>
/task-move <task-id> <target-node>
/task-advance <task-id> <to-node>
/task-priority <task-id> <priority>

# Examples
/task-delete "Validate email"
/task-move task-456 "Email Processing"
/task-advance current-task "Completed"
```

### 3. Flowline Management Commands

#### Create Flowlines
```bash
/flowline-create <source-node> <target-node> [type]
/connect <source> <target> [type]
/flow <from> <to> [sequence|conditional|error]

# Examples
/flowline-create "User Registration" "Email Validation"
/connect "Age Check" "Adult Process" conditional
/flow start-node "User Registration" sequence
```

#### Manage Flowlines
```bash
/flowline-delete <source> <target>
/disconnect <source> <target>
/flowline-type <source> <target> <new-type>

# Examples
/flowline-delete "Registration" "Validation"
/disconnect all  # removes all flowlines
/flowline-type "Age Check" "Adult Process" error
```

### 4. Tag Management Commands

#### Create and Manage Tags
```bash
/tag-create <name> [category] [properties]
/tag-add <tag-name> <task-id>
/tag-remove <tag-name> <task-id>
/tag-list [filter]

# Examples
/tag-create "urgent" priority color:red
/tag-add "urgent" "Email Validation"
/tag-remove "urgent" task-123
/tag-list priority
```

### 5. Workflow Management Commands

#### Save/Load Operations
```bash
/workflow-save [filename]
/workflow-load <filename|url>
/workflow-export [format]
/workflow-import <source>

# Examples
/workflow-save "user-registration-flow"
/workflow-load "backup-20241117.json"
/workflow-export png
```

#### Workflow State
```bash
/workflow-clear [confirm]
/workflow-reset
/workflow-status
/workflow-stats

# Examples
/workflow-clear yes
/workflow-status  # shows nodes, tasks, flowlines count
/workflow-stats   # detailed statistics
```

### 6. Matrix and View Commands

#### Eisenhower Matrix
```bash
/matrix-enter
/matrix-exit
/matrix-move <task-id> <quadrant>
/matrix-show [quadrant]

# Examples
/matrix-enter
/matrix-move "Email Validation" urgent-important
/matrix-show important-not-urgent
```

#### View Operations
```bash
/view-zoom <level|in|out|fit>
/view-center [node-id]
/view-focus <element-id>

# Examples
/view-zoom fit
/view-center "User Registration"
/view-focus current-selection
```

### 7. Selection and Navigation

#### Selection Commands
```bash
/select <node-id|task-id|name>
/select-all [type]
/select-none
/select-by <criteria>

# Examples
/select "User Registration"
/select-all tasks
/select-by type:decision
```

#### Navigation Commands
```bash
/goto <node-name>
/find <element-name>
/next [type]
/previous [type]

# Examples
/goto "User Registration"
/find "Email"
/next node
```

### 8. Batch and Advanced Operations

#### Batch Operations
```bash
/batch-create nodes <list>
/batch-connect <source-list> <target-list>
/batch-tag <tag-name> <element-list>

# Examples
/batch-create nodes process:"Step 1",decision:"Check",terminal:"End"
/batch-connect "Step 1,Step 2" "Step 3"
```

#### Template Operations
```bash
/template-save <name> [elements]
/template-apply <name> [position]
/template-list

# Examples
/template-save "approval-process" current-selection
/template-apply "approval-process" 500,200
```

## Implementation Architecture

### 1. Workflow Command MCP Server
- **File**: `mcp-servers/workflow-command-server.py`
- **Purpose**: Parse and validate workflow commands
- **Capabilities**: Command parsing, parameter validation, help generation

### 2. Browser API Bridge
- **File**: `services/workflow-bridge.js`
- **Purpose**: Expose ProcessFlowDesigner methods to MCP
- **Capabilities**: API bridging, state management, error handling

### 3. Command Execution Flow
```
Chat Input → MCP Command Parser → Workflow Bridge → ProcessFlowDesigner API → Visual Update
```

### 4. Error Handling
- **Validation**: Command syntax and parameter validation
- **Execution**: Graceful handling of API errors
- **Feedback**: Clear success/error messages to user

### 5. Context Awareness
- **Current Selection**: Commands can work with currently selected elements
- **Application State**: Access to current nodes, tasks, flowlines
- **Smart Defaults**: Intelligent parameter inference

## Response Formatting

### Success Responses
```json
{
  "status": "success",
  "action": "node-create",
  "result": {
    "node_id": "node-123",
    "name": "User Registration",
    "type": "process",
    "position": {"x": 200, "y": 300}
  },
  "message": "✅ Created process node 'User Registration'"
}
```

### Error Responses
```json
{
  "status": "error",
  "action": "node-create",
  "error": "Node name already exists",
  "suggestion": "Try: /node-create process \"User Registration 2\""
}
```

### Information Responses
```json
{
  "status": "info",
  "action": "workflow-status",
  "data": {
    "nodes": 5,
    "tasks": 12,
    "flowlines": 7,
    "tags": 3
  },
  "message": "📊 Workflow contains 5 nodes, 12 tasks, 7 flowlines, 3 tags"
}
```

## Security and Validation

### Command Validation
- **Syntax**: Proper command format and parameters
- **Permissions**: Access control for destructive operations
- **Confirmation**: Required confirmations for dangerous operations

### State Validation
- **Element Existence**: Verify elements exist before operations
- **Relationship Validation**: Check valid connections and relationships
- **Constraint Checking**: Enforce application business rules

## Future Enhancements

### AI-Powered Features
- **Natural Language**: "Create a user registration process with email validation"
- **Smart Suggestions**: Contextual command recommendations
- **Auto-completion**: Intelligent parameter completion

### Integration Features
- **Export Integration**: Direct integration with external tools
- **Version Control**: Git-like versioning for workflows
- **Collaboration**: Multi-user workflow editing

### Advanced Operations
- **Undo/Redo**: Command-level undo functionality
- **Macros**: Record and replay command sequences
- **Scripting**: Batch command execution from files