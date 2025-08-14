# ProcessFlowDesigner API Reference

Complete method signature and interface documentation for ProcessFlowDesigner class.

**Generated:** Phase 1 Foundation Preparation  
**Version:** Pre-refactoring documentation  
**Status:** STABLE - These interfaces must be preserved during refactoring

---

## Constructor and Initialization

### Core Initialization
```javascript
constructor()
// Initializes ProcessFlowDesigner instance with default state and DOM references
// - Sets up arrays: nodes[], flowlines[], taskNodes[]
// - Initializes state: nodeCounter=0, selectedNode=null, isMatrixMode=false
// - Creates DOM element references for all UI components

init()
// Primary initialization method called by constructor
// - Calls initializeDropdowns(), setupEventListeners()
// - Creates SVG definitions and default start node

initializeDropdowns()
// Populates all dropdown elements with configuration data
// - nodeTypeDropdown ← AppConfig.nodeTypes
// - flowlineTypeDropdown ← AppConfig.flowlineTypes
// - tagCategoryDropdown ← AppConfig.tagSystem.categories

setupEventListeners()
// Attaches all event listeners for UI interactions
// - Canvas clicks, mouse events, drag/drop handlers
// - Modal controls, context menus, keyboard shortcuts

createSVGDefs()
// Creates SVG marker definitions for flowline arrowheads
// - Defines arrow markers for different flowline types

createDefaultStartNode()
// Creates initial terminal node as workflow starting point
// - Type: 'terminal', positioned at default coordinates
```

---

## Node Management

### Node CRUD Operations
```javascript
createNode(type: string, x?: number, y?: number) -> HTMLElement
// Creates new workflow node of specified type
// - type: 'process' | 'decision' | 'terminal'
// - x, y: optional position (defaults to mouse position)
// - Returns: created DOM element
// - Side effects: increments nodeCounter, adds to nodes[]

deleteNode() -> void
// Deletes currently selected node
// - Removes from DOM and nodes[] array
// - Cleans up associated flowlines and tasks
// - Updates UI to reflect deletion

renameNode() -> void
// Enables inline editing of selected node's text
// - Creates temporary input field
// - Handles save/cancel interactions
// - Updates node display text
```

### Node Interaction Handlers
```javascript
handleDoubleClick(e: Event, node: HTMLElement) -> void
// Handles double-click events on nodes
// - Triggers rename mode for editable nodes
// - Prevents event propagation

handleMouseDown(e: MouseEvent, node: HTMLElement) -> void
// Initiates drag operation or flowline creation
// - Sets up drag state and offset calculations
// - Handles flowline source selection

handleMouseMove(e: MouseEvent) -> void
// Handles node dragging during mouse movement
// - Updates node position based on drag offset
// - Triggers flowline updates for connected nodes

handleMouseUp(e: MouseEvent) -> void
// Completes drag operation
// - Finalizes node position
// - Resets drag state
```

---

## Task Management System

### Task Creation and Management
```javascript
createTaskNode(taskName: string) -> HTMLElement
// Creates new task node with specified name
// - Creates task container with slots and controls
// - Positions using assignTaskSlot()
// - Returns: created task DOM element

showTaskModal() -> void
// Displays task creation modal dialog
// - Clears previous input values
// - Focuses on task name input field

hideTaskModal() -> void
// Hides task creation modal
// - Resets modal state and input fields

createTaskFromModal() -> void
// Creates task from modal input values
// - Validates task name input
// - Calls createTaskNode() with validated data
// - Hides modal after creation
```

### Task Positioning and Layout
```javascript
positionNextActionSlot(taskContainer: HTMLElement, nextActionSlot: HTMLElement) -> void
// Positions the next-action slot within task container
// - Calculates optimal position based on task content
// - Ensures proper visual alignment

updateNextActionSlotPosition(taskNode: HTMLElement) -> void
// Updates next-action slot position after task changes
// - Recalculates position based on current task height
// - Maintains consistent layout

assignTaskSlot(taskNode: HTMLElement) -> void
// Assigns task to appropriate slot in workflow
// - Determines optimal position based on workflow state
// - Handles slot availability and conflicts

getTasksForNode(nodeId: string) -> HTMLElement[]
// Returns all tasks associated with specified node
// - Filters taskNodes[] by node association
// - Returns array of matching task elements

positionTaskInSlot(taskNode: HTMLElement) -> void
// Positions task in its assigned slot
// - Calculates precise coordinates
// - Updates DOM position styles
```

### Task Layout Utilities
```javascript
getTaskContainerTotalHeight(taskContainer: HTMLElement) -> number
// Calculates total height of task container including all content
// - Includes task slots, controls, and padding
// - Used for layout calculations

repositionTasksAfterHeightChange(changedTaskNode: HTMLElement) -> void
// Repositions tasks after one task's height changes
// - Prevents overlap and maintains visual order
// - Updates dependent task positions

repositionAllTasksForNode(nodeId: string) -> void
// Repositions all tasks associated with specific node
// - Used after node movement or major layout changes
// - Ensures consistent task positioning

compactTaskSlots(nodeId: string) -> void
// Removes gaps in task slot assignments
// - Optimizes task positioning for better layout
// - Maintains task order and associations

moveAnchoredTaskNodes(anchorNodeId: string, deltaX: number, deltaY: number) -> void
// Moves all tasks anchored to specified node
// - Maintains relative positioning during node movement
// - Updates task positions by delta values
```

---

## Task Workflow Operations

### Task Advancement
```javascript
deleteTaskNode() -> void
// Deletes currently selected task node
// - Removes from DOM and taskNodes[] array
// - Cleans up associations and references

advanceTask() -> void
// Advances task to next workflow step
// - Shows advancement modal with next-step options
// - Handles task progression logic

reverseTask() -> void
// Moves task back to previous workflow step
// - Validates reverse movement availability
// - Updates task position and state

showAdvanceTaskModal(outboundFlowlines: HTMLElement[]) -> void
// Shows modal for task advancement options
// - Populates with available next steps
// - Enables user selection of advancement path

hideAdvanceTaskModal() -> void
// Hides task advancement modal
// - Resets modal state and selections

moveTaskToNode(taskNode: HTMLElement, targetNode: HTMLElement) -> void
// Moves task from current position to target node
// - Updates task associations and positioning
// - Handles workflow state transitions
```

---

## Tag System

### Tag Management
```javascript
showTagModal() -> void
// Displays tag editing modal for selected task
// - Populates with current task tags
// - Enables tag addition and modification

hideTagModal() -> void
// Hides tag editing modal
// - Saves pending changes if applicable
// - Resets modal state

handleTagCategoryChange(e: Event) -> void
// Handles tag category selection changes
// - Updates available tag options based on category
// - Refreshes tag option dropdown

displayCurrentTags() -> void
// Updates display of current tags in tag modal
// - Shows all tags associated with selected task
// - Provides interface for tag modification

addTagToTask() -> void
// Adds new tag to currently selected task
// - Validates tag input and selection
// - Updates task tag collection and display

removeTag(index: number) -> void
// Removes tag at specified index from current task
// - Updates tag collection and display
// - Triggers repositioning if in matrix mode

saveTaskTags() -> void
// Saves current tag modifications to task
// - Commits tag changes to task data
// - Triggers matrix repositioning if applicable
// - Updates task visual representation
```

### Tag Data Access
```javascript
getTaskTags(taskNode: HTMLElement) -> Array<Object>
// Retrieves all tags associated with specified task
// - Returns array of tag objects with category, option, and metadata
// - Used for tag analysis and display

setTaskTags(taskNode: HTMLElement, tags: Array<Object>) -> void
// Sets tags for specified task
// - Replaces existing tags with provided array
// - Updates task data attributes and display

updateTaskTagsDisplay(taskNode: HTMLElement) -> void
// Updates visual display of tags on task node
// - Renders tag indicators and colors
// - Maintains consistent visual representation

analyzeTaskUrgencyImportance(tags: Array<Object>) -> Object
// Analyzes tags to determine task urgency and importance
// - Returns object with urgency/importance scores
// - Used for Eisenhower Matrix positioning
```

---

## Eisenhower Matrix System

### Matrix Toggle and Management
```javascript
toggleEisenhowerMatrix() -> void
// Toggles Eisenhower Matrix display mode
// - Shows/hides matrix overlay
// - Switches between normal and matrix positioning
// - Stores/restores original task positions

positionAllTasksInMatrix() -> void
// Positions all tasks in Eisenhower Matrix layout
// - Analyzes each task's urgency/importance tags
// - Calculates matrix quadrant positions
// - Animates tasks to new positions

positionSingleTaskInMatrix(taskNode: HTMLElement) -> void
// Positions single task in matrix based on its tags
// - Analyzes task tags for urgency/importance
// - Calculates appropriate quadrant position
// - Updates task position with animation

restoreOriginalPositions() -> void
// Restores all tasks to original pre-matrix positions
// - Uses stored originalNodePositions map
// - Animates tasks back to workflow positions

calculateTaskSlotPosition(taskNode: HTMLElement) -> Object
// Calculates optimal position for task in matrix
// - Analyzes urgency/importance scores
// - Returns {x, y} coordinates for matrix placement
// - Handles quadrant-specific positioning logic
```

---

## Event Handling System

### Mouse and Interaction Events
```javascript
handleContextMenu(e: Event, node: HTMLElement) -> void
// Handles right-click context menu display
// - Shows appropriate context menu for node type
// - Positions menu at cursor location
// - Prevents default browser context menu

hideContextMenu() -> void
// Hides all visible context menus
// - Cleans up menu state and event listeners
// - Resets context menu selections

handleContextMenuAction(action: string) -> void
// Processes context menu action selections
// - Routes action to appropriate handler method
// - Handles node-specific operations

handleTaskContextMenuAction(action: string) -> void
// Processes task-specific context menu actions
// - Handles task operations like advance, delete, edit
// - Maintains task workflow integrity
```

### Drag and Drop System
```javascript
handleTagDragStart(e: DragEvent) -> void
// Initiates tag drag operation
// - Sets up drag data and visual feedback
// - Prepares for tag slot assignment

handleTagDragEnd(e: DragEvent) -> void
// Completes tag drag operation
// - Finalizes tag placement
// - Updates task state if successful drop

handleSlotDragOver(e: DragEvent) -> void
// Handles drag-over events for tag slots
// - Provides visual feedback for valid drop zones
// - Prevents default to enable dropping

handleSlotDrop(e: DragEvent) -> void
// Handles tag drop on task slots
// - Validates drop operation
// - Updates task tags and positioning
```

---

## Flowline Management

### Flowline Creation and Management
```javascript
startFlowlineCreation() -> void
// Initiates flowline creation mode
// - Sets flowlineCreationMode flag
// - Updates UI to indicate creation mode
// - Waits for source and target selection

exitFlowlineCreationMode() -> void
// Exits flowline creation mode
// - Resets creation state and UI
// - Clears selection indicators

createFlowline(sourceNode: HTMLElement, targetNode: HTMLElement) -> void
// Creates flowline between specified nodes
// - Validates connection possibility
// - Creates SVG flowline element
// - Adds to flowlines[] array

updateFlowlines() -> void
// Updates all flowline positions and paths
// - Recalculates paths based on current node positions
// - Updates SVG path elements
// - Maintains visual connections

createFlowlineBetweenNodes(sourceNode: HTMLElement, targetNode: HTMLElement, flowlineType?: string) -> void
// Creates specific type of flowline between nodes
// - Uses specified flowline type (default: 'straight')
// - Handles different flowline visual styles
// - Updates flowline registry
```

---

## Workflow Persistence

### Save and Load Operations
```javascript
saveWorkflow() -> void
// Serializes and saves current workflow state
// - Exports nodes, tasks, flowlines, and configuration
// - Creates downloadable JSON file
// - Preserves all workflow data and relationships

loadWorkflow(event: Event) -> void
// Loads workflow from uploaded JSON file
// - Parses and validates workflow data
// - Recreates nodes, tasks, and flowlines
// - Restores complete workflow state

clearWorkflow() -> void
// Clears all workflow data
// - Removes all nodes except start node
// - Clears tasks and flowlines
// - Resets application to initial state

deserializeWorkflow(workflow: Object) -> void
// Recreates workflow from serialized data
// - Processes workflow object structure
// - Recreates all components with proper relationships
// - Handles data validation and error recovery

createNodeFromData(nodeData: Object) -> HTMLElement
// Creates node from serialized node data
// - Recreates node with original properties
// - Restores position, type, and configuration
// - Returns created DOM element
```

---

## UI Management

### Modal Management
```javascript
showContextMenu(x: number, y: number) -> void
// Shows context menu at specified coordinates
// - Positions menu at provided x, y location
// - Handles menu content based on context

showTaskContextMenu(x: number, y: number) -> void
// Shows task-specific context menu
// - Provides task-related action options
// - Positions relative to task location

hideTagContextMenus() -> void
// Hides all tag-related context menus
// - Cleans up tag editing interfaces
// - Resets tag interaction state
```

---

## Configuration and State

### Application Properties
```javascript
// Core Arrays
nodes: HTMLElement[]           // All workflow nodes
taskNodes: HTMLElement[]       // All task nodes
flowlines: HTMLElement[]       // All flowline connections

// State Management
nodeCounter: number            // Counter for unique node IDs
selectedNode: HTMLElement      // Currently selected node
selectedTaskForTags: HTMLElement // Task being edited for tags
selectedTaskForAdvance: HTMLElement // Task being advanced

// UI State
isMatrixMode: boolean         // Eisenhower Matrix display mode
flowlineCreationMode: boolean // Flowline creation state
sourceNodeForFlowline: HTMLElement // Source for new flowline

// Drag and Drop
dragData: Object              // Current drag operation data
draggedTag: Object           // Tag being dragged
successfulDrop: boolean      // Last drop operation result

// Matrix Positioning
originalNodePositions: Map    // Stored positions before matrix mode

// DOM References
canvas: HTMLElement          // Main canvas container
contextMenu: HTMLElement     // Node context menu
taskContextMenu: HTMLElement // Task context menu
taskModal: HTMLElement       // Task creation modal
tagModal: HTMLElement        // Tag editing modal
eisenhowerToggle: HTMLElement // Matrix toggle button
eisenhowerMatrix: HTMLElement // Matrix overlay
// ... (additional DOM element references)
```

---

## Critical Interface Contracts

### MUST PRESERVE During Refactoring
These method signatures and behaviors MUST be preserved to ensure compatibility:

1. **Constructor Interface**: Default constructor with no parameters
2. **Node Management**: createNode(), deleteNode(), renameNode() signatures
3. **Task System**: createTaskNode(), task positioning methods
4. **Matrix Operations**: toggleEisenhowerMatrix(), positioning methods
5. **Event Handlers**: All mouse and keyboard event signatures
6. **Save/Load**: Workflow serialization format compatibility

### Deprecation Schedule
Methods marked for eventual removal (post-refactoring):
- None identified during Phase 1 analysis

### Extension Points
Areas designed for future enhancement:
- Tag system: Additional tag types and categories
- Flowline types: New connection styles and behaviors
- Export formats: Additional file format support
- Matrix modes: Alternative task organization schemes

---

**CRITICAL NOTES FOR REFACTORING:**
- All public methods must maintain exact signatures
- Event handlers must preserve parameter types and behavior
- DOM manipulation methods must maintain element structure
- State management must preserve data relationships
- Matrix positioning must maintain coordinate calculations

*This documentation serves as the contract for the refactoring process. Any changes to these interfaces must be documented and approved.*

---

*Generated during Phase 1 Foundation Preparation*  
*Last Updated: Pre-refactoring baseline*