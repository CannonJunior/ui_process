# Workflow Chat Commands Reference

This document provides a comprehensive reference for all chat commands available in the Process Flow Designer. Commands allow you to create, modify, and manage workflow elements through natural language chat interface.

## 📋 Quick Reference

Type `/help` in chat to see available commands, or `/help <command>` for specific command details.

---

## 🔨 Node Management Commands

Create and manage workflow nodes (process, decision, terminal types).

### `/node-create <type> ["name"] [x,y]`
Create a new node in the workflow.

**Parameters:**
- `<type>` - Node type: `process`, `decision`, `terminal`
- `["name"]` - Optional: Node name in quotes
- `[x,y]` - Optional: Position coordinates

**Examples:**
```
/node-create process
/node-create process "Data Processing"
/node-create decision "Quality Check?" 100,200
/node-create terminal "End Process" 300,400
```

### `/node-delete <identifier>`
Delete a node from the workflow.

**Parameters:**
- `<identifier>` - Node name (in quotes) or node ID

**Examples:**
```
/node-delete "Data Processing"
/node-delete node_123
```

### `/node-rename <old> <new>`
Rename an existing node.

**Parameters:**
- `<old>` - Current node name in quotes
- `<new>` - New node name in quotes

**Examples:**
```
/node-rename "Old Name" "New Name"
/node-rename "Process 1" "Data Validation"
```

### `/node-move <node> <x,y>`
Move a node to specific coordinates.

**Parameters:**
- `<node>` - Node name in quotes or node ID
- `<x,y>` - Target coordinates

**Examples:**
```
/node-move "Data Processing" 150,300
/node-move node_123 200,100
```

### `/node-type <node> <type>`
Change the type of an existing node.

**Parameters:**
- `<node>` - Node name in quotes or node ID
- `<type>` - New node type: `process`, `decision`, `terminal`

**Examples:**
```
/node-type "Quality Check" decision
/node-type node_123 terminal
```

### `/node-list [filter]`
List all nodes in the workflow.

**Parameters:**
- `[filter]` - Optional: Filter by type or name pattern

**Examples:**
```
/node-list
/node-list process
/node-list "Data*"
```

---

## ✅ Task Management Commands

Create and manage tasks associated with workflow nodes.

### `/task-create "name" [node] [priority]`
Create a new task, optionally attached to a node.

**Parameters:**
- `"name"` - Task name in quotes
- `[node]` - Optional: Target node name in quotes
- `[priority]` - Optional: Priority level (`high`, `medium`, `low`)

**Examples:**
```
/task-create "Review documentation"
/task-create "Validate data" "Data Processing"
/task-create "Critical fix" "Bug Check" high
```

### `/task-delete <identifier>`
Delete a task from the workflow.

**Parameters:**
- `<identifier>` - Task name in quotes or task ID

**Examples:**
```
/task-delete "Review documentation"
/task-delete task_456
```

### `/task-move <task> <target-node>`
Move a task to a different node.

**Parameters:**
- `<task>` - Task name in quotes or task ID
- `<target-node>` - Target node name in quotes

**Examples:**
```
/task-move "Review documentation" "Quality Check"
/task-move task_456 "Final Review"
```

### `/task-advance <task> <target-node>`
Advance a task through the workflow to the next node.

**Parameters:**
- `<task>` - Task name in quotes or task ID
- `<target-node>` - Next node in workflow process

**Examples:**
```
/task-advance "Data validation" "Quality Check"
/task-advance task_456 "Final Processing"
```

### `/task-priority <task> <priority>`
Set the priority level of a task.

**Parameters:**
- `<task>` - Task name in quotes or task ID
- `<priority>` - Priority level: `high`, `medium`, `low`

**Examples:**
```
/task-priority "Critical fix" high
/task-priority "Documentation" low
```

### `/task-list [filter]`
List all tasks in the workflow.

**Parameters:**
- `[filter]` - Optional: Filter by priority, node, or name pattern

**Examples:**
```
/task-list
/task-list high
/task-list "Review*"
```

---

## 🔗 Flowline Commands

Create and manage connections between workflow nodes.

### `/connect <source> <target> [type]`
Create a flowline connection between two nodes.

**Parameters:**
- `<source>` - Source node name in quotes
- `<target>` - Target node name in quotes  
- `[type]` - Optional: Flowline type (`normal`, `conditional`, `error`)

**Examples:**
```
/connect "Start" "Data Processing"
/connect "Quality Check" "Error Handler" error
/connect "Decision Point" "Path A" conditional
```

### `/disconnect <source> <target>`
Remove a flowline connection between nodes.

**Parameters:**
- `<source>` - Source node name in quotes
- `<target>` - Target node name in quotes

**Examples:**
```
/disconnect "Start" "Old Process"
/disconnect "Quality Check" "Error Handler"
```

### `/flowline-type <source> <target> <type>`
Change the type of an existing flowline.

**Parameters:**
- `<source>` - Source node name in quotes
- `<target>` - Target node name in quotes
- `<type>` - New flowline type: `normal`, `conditional`, `error`

**Examples:**
```
/flowline-type "Decision" "Path A" conditional
/flowline-type "Process" "Error" error
```

### `/disconnect all`
Remove all flowline connections in the workflow.

**Examples:**
```
/disconnect all
```

### `/flowline-list`
List all flowline connections in the workflow.

**Examples:**
```
/flowline-list
```

---

## 🏷️ Tag Management Commands

Add, modify, and manage tags on workflow elements.

### `/tag-add <target> <key:value>`
Add a tag to a workflow element.

**Parameters:**
- `<target>` - Element name in quotes (node or task)
- `<key:value>` - Tag in format `key:value`

**Examples:**
```
/tag-add "Data Processing" urgency:high
/tag-add "Review task" importance:critical
/tag-add "Quality Check" stage:testing
```

### `/tag-remove <target> <key>`
Remove a tag from a workflow element.

**Parameters:**
- `<target>` - Element name in quotes
- `<key>` - Tag key to remove

**Examples:**
```
/tag-remove "Data Processing" urgency
/tag-remove "Review task" importance
```

### `/tag-update <target> <key> <new-value>`
Update the value of an existing tag.

**Parameters:**
- `<target>` - Element name in quotes
- `<key>` - Tag key to update
- `<new-value>` - New tag value

**Examples:**
```
/tag-update "Data Processing" urgency medium
/tag-update "Review task" stage completed
```

### `/tag-list [target]`
List tags on elements.

**Parameters:**
- `[target]` - Optional: Specific element name in quotes (lists all if omitted)

**Examples:**
```
/tag-list
/tag-list "Data Processing"
```

### `/tag-search <key:value>`
Find all elements with a specific tag.

**Parameters:**
- `<key:value>` - Tag to search for

**Examples:**
```
/tag-search urgency:high
/tag-search stage:testing
```

---

## 💾 Workflow Management Commands

Save, load, and manage entire workflows.

### `/workflow-save [filename]`
Save the current workflow to a file.

**Parameters:**
- `[filename]` - Optional: Custom filename (auto-generated if omitted)

**Examples:**
```
/workflow-save
/workflow-save "my-process-v2"
/workflow-save "data-pipeline-workflow"
```

### `/workflow-load <filename>`
Load a workflow from a file.

**Parameters:**
- `<filename>` - Workflow filename to load

**Examples:**
```
/workflow-load "my-process-v2"
/workflow-load "backup-workflow"
```

### `/workflow-clear [confirm]`
Clear all elements from the current workflow.

**Parameters:**
- `[confirm]` - Optional: Type `yes` or `confirm` to proceed

**Examples:**
```
/workflow-clear
/workflow-clear yes
```

### `/workflow-export [format]`
Export workflow in different formats.

**Parameters:**
- `[format]` - Optional: Export format (`json`, `pdf`, `png`)

**Examples:**
```
/workflow-export
/workflow-export json
/workflow-export pdf
```

### `/workflow-status`
Show current workflow status and statistics.

**Examples:**
```
/workflow-status
```

### `/workflow-stats`
Show detailed workflow statistics and metrics.

**Examples:**
```
/workflow-stats
```

---

## 📊 Eisenhower Matrix Commands

Control the Eisenhower Matrix view for task prioritization.

### `/matrix-enter`
Enter Eisenhower Matrix mode for task visualization.

**Examples:**
```
/matrix-enter
```

### `/matrix-exit`
Exit Eisenhower Matrix mode and return to normal view.

**Examples:**
```
/matrix-exit
```

### `/matrix-move <task> <quadrant>`
Move a task to a specific matrix quadrant.

**Parameters:**
- `<task>` - Task name in quotes or task ID
- `<quadrant>` - Target quadrant: `urgent-important`, `urgent-not-important`, `not-urgent-important`, `not-urgent-not-important`

**Examples:**
```
/matrix-move "Critical bug fix" urgent-important
/matrix-move "Documentation update" not-urgent-not-important
```

### `/matrix-show [quadrant]`
Show information about matrix quadrants.

**Parameters:**
- `[quadrant]` - Optional: Specific quadrant to show (shows all if omitted)

**Examples:**
```
/matrix-show
/matrix-show urgent-important
```

---

## 👁️ View & Navigation Commands

Control the view and navigate through the workflow.

### `/view-center [target]`
Center the view on a specific element or fit all content.

**Parameters:**
- `[target]` - Optional: Element name in quotes (centers on all if omitted)

**Examples:**
```
/view-center
/view-center "Data Processing"
```

### `/view-zoom <level>`
Set the zoom level of the workflow view.

**Parameters:**
- `<level>` - Zoom level: number (0.5-3.0) or keyword (`in`, `out`, `fit`)

**Examples:**
```
/view-zoom 1.5
/view-zoom in
/view-zoom fit
```

### `/view-fit`
Fit all workflow content in the current view.

**Examples:**
```
/view-fit
```

### `/select <target>`
Select a specific workflow element.

**Parameters:**
- `<target>` - Element name in quotes or element ID

**Examples:**
```
/select "Data Processing"
/select task_456
```

### `/select-all [type]`
Select all elements of a specific type.

**Parameters:**
- `[type]` - Optional: Element type (`nodes`, `tasks`, `flowlines`)

**Examples:**
```
/select-all
/select-all nodes
/select-all tasks
```

### `/select-none`
Clear all current selections.

**Examples:**
```
/select-none
```

---

## 🔍 Search & Navigation Commands

Find and navigate to workflow elements.

### `/find "search-term"`
Search for elements by name or content.

**Parameters:**
- `"search-term"` - Search term in quotes

**Examples:**
```
/find "data"
/find "processing"
```

### `/goto "element-name"`
Navigate directly to a specific element.

**Parameters:**
- `"element-name"` - Element name in quotes

**Examples:**
```
/goto "Data Processing"
/goto "Quality Check"
```

### `/next [type]`
Navigate to the next element of a type.

**Parameters:**
- `[type]` - Optional: Element type to navigate through

**Examples:**
```
/next
/next node
/next task
```

### `/previous [type]`
Navigate to the previous element of a type.

**Parameters:**
- `[type]` - Optional: Element type to navigate through

**Examples:**
```
/previous
/previous node
/previous task
```

---

## ⚡ Batch Operations Commands

Perform operations on multiple elements at once.

### `/batch-create <type> <count>`
Create multiple elements at once.

**Parameters:**
- `<type>` - Element type to create (`nodes`, `tasks`)
- `<count>` - Number of elements to create

**Examples:**
```
/batch-create nodes 5
/batch-create tasks 3
```

### `/batch-connect "source-pattern" "target-pattern"`
Create multiple flowline connections based on patterns.

**Parameters:**
- `"source-pattern"` - Source node name pattern
- `"target-pattern"` - Target node name pattern

**Examples:**
```
/batch-connect "Process*" "Check*"
/batch-connect "Step*" "Next*"
```

### `/batch-tag "element-pattern" <key:value>`
Add tags to multiple elements matching a pattern.

**Parameters:**
- `"element-pattern"` - Element name pattern
- `<key:value>` - Tag to add

**Examples:**
```
/batch-tag "Process*" stage:development
/batch-tag "*Check*" importance:critical
```

---

## ❓ Help & Information Commands

Get help and information about the system.

### `/help [command]`
Show help information for commands.

**Parameters:**
- `[command]` - Optional: Specific command to get help for

**Examples:**
```
/help
/help node-create
/help workflow-save
```

### `/commands [category]`
List available commands by category.

**Parameters:**
- `[category]` - Optional: Command category (`node`, `task`, `workflow`, etc.)

**Examples:**
```
/commands
/commands node
/commands workflow
```

### `/status`
Show system status and active features.

**Examples:**
```
/status
```

---

## 💡 Usage Tips

### **Command Shortcuts**
- Use quotes around names with spaces: `"My Process Node"`
- Element IDs can substitute for names: `node_123` instead of `"Process 1"`
- Commands are case-insensitive: `/NODE-CREATE` works like `/node-create`

### **Pattern Matching**
- Use `*` for wildcards: `"Process*"` matches "Process A", "Process B", etc.
- Use `?` for single character: `"Step?"` matches "Step1", "Step2", etc.

### **Common Workflows**
```
# Create a simple linear process
/node-create process "Start"
/node-create process "Middle" 
/node-create terminal "End"
/connect "Start" "Middle"
/connect "Middle" "End"

# Set up Eisenhower Matrix workflow
/task-create "Critical bug" "Start" high
/tag-add "Critical bug" urgency:urgent
/tag-add "Critical bug" importance:important
/matrix-enter
```

### **Error Recovery**
- Type `/help` if a command fails
- Use `/workflow-status` to check current state
- Use `/select-none` to clear problematic selections
- Use `/view-fit` to reset view if lost

### **Best Practices**
- Save frequently with `/workflow-save`
- Use descriptive names for nodes and tasks
- Tag elements for better organization
- Use `/workflow-status` to track progress

---

## 🔧 Command Status

### **✅ Implemented Commands**
- `/help` - Basic help system
- `/status` - System status
- Note-taking commands (`/note-*`, `/opp-*`)

### **🚧 In Development**
- All workflow commands listed above
- Batch operations
- Advanced search and filtering

### **📋 Planned Features**
- Command auto-completion
- Interactive command builder
- Workflow templates
- Advanced export options

---

For the most up-to-date command information, type `/help` in the chat interface or refer to the [MCP Integration Documentation](mcp-integration.md).