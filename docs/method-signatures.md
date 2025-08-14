# Method Signatures Reference

Complete method signature reference for ProcessFlowDesigner class.

## Constructor and Initialization

```javascript
constructor()
init()
initializeDropdowns()
setupEventListeners()
createSVGDefs()
createDefaultStartNode()
```

## Node Management

```javascript
createNode(type, x?, y?)
deleteNode()
renameNode()
handleDoubleClick(e, node)
```

## Task Management  

```javascript
createTaskNode(taskName)
showTaskModal()
hideTaskModal()
createTaskFromModal()
positionNextActionSlot(taskContainer, nextActionSlot)
showAdvanceTaskModal()
hideAdvanceTaskModal()
```

## Tag System

```javascript
getTaskTags(taskNode)
setTaskTags(taskNode, tags)
showTagModal()
hideTagModal()
saveTaskTags()
analyzeTaskUrgencyImportance(tags)
handleTagCategoryChange(e)
```

## Eisenhower Matrix

```javascript
toggleEisenhowerMatrix()
positionAllTasksInMatrix()
positionSingleTaskInMatrix(taskNode)
restoreOriginalPositions()
calculateTaskSlotPosition(taskNode)
```

## Event Handling

```javascript
handleMouseDown(e, node)
handleMouseMove(e)
handleMouseUp(e)
handleContextMenu(e, node)
```

## UI Management

```javascript
showContextMenu(x, y)
showTaskContextMenu(x, y)
hideContextMenu()
hideTagContextMenus()
```

## Context Menu Actions

```javascript
handleContextMenuAction(action)
handleTaskContextMenuAction(action)
```

## Flowline Management

```javascript
startFlowlineCreation()
exitFlowlineCreationMode()
createFlowline(sourceNode, targetNode)
updateFlowlines()
```

## Workflow Operations

```javascript
clearWorkflow()
// Note: Save/load methods would be here if present
```

## Utility Methods

```javascript
calculateTaskSlotPosition(taskNode)
// Additional utility methods extracted during analysis
```

---

*Generated during Week 1 Foundation Preparation*