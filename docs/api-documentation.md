# Process Flow Designer - API Documentation

**Version:** 1.1 (Pre-Refactor Documentation)  
**Generated:** Week 1 Foundation Preparation  
**Purpose:** Complete interface documentation for safe refactoring  

## Overview

This document provides comprehensive documentation of all public methods, properties, and interfaces in the ProcessFlowDesigner class. This documentation is critical for maintaining API compatibility during the modular refactoring process.

## Table of Contents

1. [Constructor and Initialization](#constructor-and-initialization)
2. [Core Node Management](#core-node-management)
3. [Task Management](#task-management)
4. [Tag System](#tag-system)
5. [Eisenhower Matrix](#eisenhower-matrix)
6. [Event Handling](#event-handling)
7. [UI Management](#ui-management)
8. [Drag and Drop](#drag-and-drop)
9. [Workflow Serialization](#workflow-serialization)
10. [Utility Methods](#utility-methods)

---

## Constructor and Initialization

### `constructor()`
**Purpose:** Initializes the ProcessFlowDesigner instance with all necessary properties and DOM references.

**Properties Set:**
- `nodes: Array` - Collection of all flow nodes
- `nodeCounter: number` - Incremental counter for node IDs
- `flowlines: Array` - Collection of flowline connections
- `selectedNode: Element|null` - Currently selected node
- `dragData: Object` - Drag operation state
- `taskNodes: Array` - Collection of task-specific nodes
- `isMatrixMode: boolean` - Eisenhower Matrix mode state
- `originalNodePositions: Map` - Node positions before matrix mode

**DOM References:** All required element references for operation

**Usage:**
```javascript
const app = new ProcessFlowDesigner();
```

### `init()`
**Purpose:** Primary initialization method called by constructor.

**Flow:**
1. `initializeDropdowns()` - Configure dropdown elements
2. `setupEventListeners()` - Attach all event handlers
3. `createSVGDefs()` - Initialize SVG definitions
4. `createDefaultStartNode()` - Create initial start node

**Side Effects:** Fully configured application ready for use

---

## Core Node Management

### `createNode(type, x?, y?)`
**Purpose:** Creates a new flow node of specified type.

**Parameters:**
- `type: string` - Node type ('process', 'decision', 'terminal')
- `x: number` (optional) - X coordinate for positioning
- `y: number` (optional) - Y coordinate for positioning

**Returns:** `Element` - The created node element

**Side Effects:**
- Increments `nodeCounter`
- Adds node to `nodes` array
- Appends node to canvas
- Sets up node event listeners

**Usage:**
```javascript
const processNode = app.createNode('process', 100, 200);
const decisionNode = app.createNode('decision'); // Auto-positioned
```

### `deleteNode()`
**Purpose:** Removes the currently selected node.

**Preconditions:** `selectedNode` must not be null

**Side Effects:**
- Removes node from DOM
- Removes from `nodes` array
- Cleans up associated flowlines
- Updates flowline connections

### `renameNode()`
**Purpose:** Enables inline editing of node text.

**Flow:**
1. Replaces node text with input field
2. Focuses input for immediate editing
3. Handles Enter key for confirmation
4. Restores original text on Escape/blur

**Side Effects:** Temporarily modifies DOM structure for editing

---

## Task Management

### `createTaskNode(taskName)`
**Purpose:** Creates a specialized task node with enhanced functionality.

**Parameters:**
- `taskName: string` - Display name for the task

**Returns:** `Element` - The created task node element

**Features:**
- Creates task container with banner
- Initializes empty tag collection
- Creates next-action slot
- Sets up task-specific event handlers
- Assigns unique slot number

**Side Effects:**
- Adds to both `nodes` and `taskNodes` arrays
- Creates corresponding DOM structures

**Usage:**
```javascript
const task = app.createTaskNode('Review Documentation');
```

### `showTaskModal()`
**Purpose:** Displays modal for creating new tasks.

**Side Effects:**
- Shows task modal (`display: block`)
- Clears task name input
- Focuses input field

### `hideTaskModal()`
**Purpose:** Hides the task creation modal.

**Side Effects:**
- Hides task modal (`display: none`)

### `createTaskFromModal()`
**Purpose:** Creates task from modal input and opens tag modal.

**Flow:**
1. Validates task name input
2. Creates task node if valid
3. Hides task modal
4. Opens tag modal for new task

**Side Effects:**
- Creates new task node
- Sets `selectedTaskForTags`
- Opens tag modal

---

## Tag System

### `getTaskTags(taskNode)`
**Purpose:** Retrieves tag array from task node.

**Parameters:**
- `taskNode: Element` - Task node element

**Returns:** `Array` - Array of tag objects

**Format:** Each tag object contains:
```javascript
{
    category: string,
    option: string,
    date?: string,
    description?: string,
    link?: string,
    completed?: boolean
}
```

### `setTaskTags(taskNode, tags)`
**Purpose:** Updates task node with new tag collection.

**Parameters:**
- `taskNode: Element` - Task node to update
- `tags: Array` - Array of tag objects

**Side Effects:**
- Updates `data-tags` attribute
- Triggers tag display refresh

### `showTagModal()`
**Purpose:** Opens tag management modal for selected task.

**Preconditions:** 
- `selectedTaskForTags` must be set
- Task must be of type 'task'

**Side Effects:**
- Shows tag modal
- Resets form fields
- Populates current tags display

### `hideTagModal()`
**Purpose:** Closes tag management modal.

**Side Effects:**
- Hides tag modal
- Clears `selectedTaskForTags`

### `saveTaskTags()`
**Purpose:** Saves current tag state and closes modal.

**Flow:**
1. Validates tag selection
2. Updates task tags
3. Repositions task if in matrix mode
4. Closes tag modal

**Side Effects:**
- Updates task node tags
- May trigger matrix repositioning
- Closes tag modal

### `analyzeTaskUrgencyImportance(tags)`
**Purpose:** Analyzes tags to determine urgency and importance.

**Parameters:**
- `tags: Array` - Tag collection to analyze

**Returns:** `Object` - Analysis result:
```javascript
{
    isUrgent: boolean,
    isImportant: boolean
}
```

**Logic:**
- Urgency: `{ category: 'urgency', option: 'urgent' }`
- Importance: `{ category: 'importance', option: 'important' }`

---

## Eisenhower Matrix

### `toggleEisenhowerMatrix()`
**Purpose:** Switches between normal and matrix view modes.

**Flow:**
1. Toggle `isMatrixMode` state
2. Store/restore node positions
3. Show/hide matrix overlay
4. Update button text
5. Position tasks in quadrants (if entering)

**Side Effects:**
- Modifies `isMatrixMode`
- Updates `originalNodePositions` map
- Repositions all task nodes
- Updates UI elements

### `positionAllTasksInMatrix()`
**Purpose:** Positions all tasks in appropriate matrix quadrants.

**Flow:**
1. Store current positions in `originalNodePositions`
2. Analyze each task's urgency/importance
3. Position in corresponding quadrant
4. Apply D3.js transitions for smooth movement

### `positionSingleTaskInMatrix(taskNode)`
**Purpose:** Positions individual task in matrix based on tags.

**Parameters:**
- `taskNode: Element` - Task to position

**Flow:**
1. Analyze task tags
2. Determine quadrant
3. Calculate position within quadrant
4. Apply transition animation

### `restoreOriginalPositions()`
**Purpose:** Restores nodes to pre-matrix positions.

**Side Effects:**
- Reads from `originalNodePositions` map
- Applies D3.js transitions
- Clears position map

---

## Event Handling

### `setupEventListeners()`
**Purpose:** Configures all application event handlers.

**Categories:**
- Dropdown change events
- Canvas interaction events
- Keyboard events
- Modal events
- Drag and drop events
- Context menu events

### `handleMouseDown(e, node)`
**Purpose:** Initiates drag operation or context menu.

**Parameters:**
- `e: MouseEvent` - Mouse event object
- `node: Element` - Target node element

**Behavior:**
- Left click: Start drag operation
- Right click: Show context menu

### `handleMouseMove(e)`
**Purpose:** Updates node position during drag operation.

**Parameters:**
- `e: MouseEvent` - Mouse event object

**Conditions:** Only active when `dragData.isDragging` is true

### `handleMouseUp(e)`
**Purpose:** Completes drag operation.

**Side Effects:**
- Ends drag state
- Removes drag styling
- Updates flowlines if needed

### `handleContextMenu(e, node)`
**Purpose:** Shows appropriate context menu for node type.

**Parameters:**
- `e: Event` - Context menu event
- `node: Element` - Target node

**Behavior:**
- Task nodes: Show task context menu
- Other nodes: Show standard context menu

---

## UI Management

### Modal Management

#### `showAdvanceTaskModal()`
**Purpose:** Shows task advancement modal.

#### `hideAdvanceTaskModal()`
**Purpose:** Hides task advancement modal.

### Context Menu Management

#### `showContextMenu(x, y)`
**Purpose:** Displays context menu at specified coordinates.

**Parameters:**
- `x: number` - X coordinate
- `y: number` - Y coordinate

#### `showTaskContextMenu(x, y)`
**Purpose:** Displays task-specific context menu.

#### `hideContextMenu()`
**Purpose:** Hides all context menus.

#### `hideTagContextMenus()`
**Purpose:** Hides tag-related context menus.

### Dropdown Management

#### `handleTagCategoryChange(e)`
**Purpose:** Updates tag option dropdown based on category selection.

**Parameters:**
- `e: Event` - Change event from category dropdown

**Side Effects:**
- Populates option dropdown
- Enables/disables option selection

---

## Drag and Drop

### Drag State Management
The drag system uses the `dragData` object:
```javascript
{
    isDragging: boolean,
    node: Element,
    offset: { x: number, y: number }
}
```

### `startDrag(node, offset)`
**Purpose:** Initializes drag operation for node.

**Parameters:**
- `node: Element` - Node to drag
- `offset: Object` - Mouse offset from node origin

### `updateDragPosition(x, y)`
**Purpose:** Updates node position during drag.

**Parameters:**
- `x: number` - New X coordinate
- `y: number` - New Y coordinate

### `endDrag()`
**Purpose:** Completes drag operation and cleanup.

---

## Workflow Serialization

### `clearWorkflow()`
**Purpose:** Removes all nodes and resets application state.

**Side Effects:**
- Clears `nodes` array
- Clears `taskNodes` array
- Resets `nodeCounter`
- Removes all DOM nodes
- Creates new default start node

### Serialization Format
Workflow data structure:
```javascript
{
    version: "1.1",
    timestamp: string,
    nodeCounter: number,
    nodes: Array<{
        id: string,
        type: string,
        text: string,
        tags?: Array,
        left?: number,
        top?: number,
        containerPosition?: {
            left: number,
            top: number
        }
    }>
}
```

---

## Utility Methods

### `calculateTaskSlotPosition(taskNode)`
**Purpose:** Calculates default position for task slots.

**Parameters:**
- `taskNode: Element` - Task node for positioning

**Returns:** `Object` - Position coordinates:
```javascript
{
    x: number,
    y: number
}
```

### Position Calculation Logic
- Checks for anchored parent node
- Falls back to default coordinates if no anchor
- Accounts for slot offset and spacing

---

## Critical API Contracts

### Event System Contracts
1. **Node Selection:** `selectedNode` property always reflects current selection
2. **Modal State:** Only one modal visible at a time
3. **Drag State:** `dragData.isDragging` accurately reflects drag state

### Data Integrity Contracts
1. **Node Arrays:** `nodes` contains all nodes, `taskNodes` contains only tasks
2. **ID Uniqueness:** Each node has unique `dataset.id`
3. **Tag Format:** Tags always follow standardized object structure

### UI State Contracts
1. **Matrix Mode:** `isMatrixMode` accurately reflects current view
2. **Position Storage:** Original positions preserved during matrix mode
3. **Context Menus:** Only appropriate menu shown for node type

---

## Breaking Change Guidelines

During refactoring, the following must be preserved:

### Public API Surface
- All public method signatures
- Property names and types
- Event handling contracts
- Modal behavior patterns

### State Management
- Node array consistency
- Selection state management
- Matrix mode behavior
- Tag system contracts

### Integration Points
- DOM element expectations
- Event listener attachments
- CSS class dependencies
- Data attribute usage

---

## Testing Verification

Each documented method should be verified through the test suite:

- **Core Functionality Tests:** Node creation, deletion, positioning
- **UI Component Tests:** Modal behavior, context menus, form handling
- **Integration Tests:** Complete workflows, state transitions

---

*This documentation serves as the API contract for the modular refactoring process. Any changes to these interfaces must be carefully planned and tested to ensure compatibility.*