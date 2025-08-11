# Process Flow Designer Guide

## Overview
The Process Flow Designer is a web application for creating interactive process flow diagrams with comprehensive task management features.

## Core Features

### Node System
- **Process Nodes**: Rectangular nodes representing process steps
- **Decision Nodes**: Diamond-shaped nodes for decision points
- **Terminal Nodes**: Rounded rectangular nodes for start/end points
- **Drag & Drop**: All nodes are draggable with left-click and mouse movement

### Flowline System
- **Connection Types**: Straight lines and perpendicular (right-angled) lines
- **Creation**: Right-click → "Create Flowline" → double-click target node
- **Visual Feedback**: Source node glows blue during flowline creation mode

### Task Management
- **Add Task**: Use the "Add Task" button in toolbar to create tasks
- **Task Positioning**: Tasks automatically position below their anchor nodes
- **Task Advancement**: Tasks can progress along flowlines to connected nodes
- **Task Reversal**: Tasks can be moved back to their previous node location

### Tagging System
- **Five Categories**: Stage, BNB, BOE, Urgency, and Importance
- **Tag Management**: Right-click tasks to access "Manage Tags" option
- **Visual Display**: Tags appear with color-coded styling
- **Next Action**: Tags can be dragged to Next Action slots for workflow prioritization

## User Interactions

### Creating Workflows
1. Use dropdown to select node type (Process, Decision, Terminal)
2. Drag nodes to desired positions
3. Right-click → "Create Flowline" to connect nodes
4. Add tasks using "Add Task" button
5. Manage task tags for better organization

### Task Workflows
1. Tasks start anchored to the Start node
2. Use "Advance Task" to move tasks along flowlines
3. Choose destination when multiple paths available
4. Use "Reverse Task" to move back to previous node
5. Drag tags to Next Action slots for prioritization

## File Operations
- **Save Workflow**: Export current workflow as JSON file
- **Load Workflow**: Import previously saved workflow files
- **Data Preservation**: All visual properties and relationships are maintained

## Best Practices
- Start with a clear process structure before adding tasks
- Use meaningful names for nodes and tasks
- Utilize the tagging system for task organization
- Leverage Next Action slots for workflow prioritization
- Save your work regularly to preserve progress