# Data Schemas Documentation

This document defines the data schemas for all major objects in the Process Flow Designer application.

## Opportunity Schema

```typescript
interface Opportunity {
  opportunity_id: string;           // Unique identifier (auto-generated)
  title: string;                   // Opportunity title (required)
  description: string;             // Detailed description (required)
  status: 'active' | 'planning' | 'negotiation' | 'completed' | 'cancelled'; // Current status (required)
  tags: string[];                  // Array of tag strings (optional, default: [])
  created_at: string;              // ISO timestamp (auto-generated)
  updated_at?: string;             // ISO timestamp (auto-updated)
  metadata: {                      // Additional custom fields
    value?: number;                // Monetary value
    priority?: 'low' | 'medium' | 'high';
    deadline?: string;             // ISO date string
    contact_person?: string;
    notes?: string;
    [key: string]: any;            // Extensible for custom fields
  };
}
```

## Node Schema

```typescript
interface Node {
  id: string;                      // Unique identifier
  type: 'process' | 'decision' | 'terminal'; // Node type
  text: string;                    // Display text
  position: {
    left: number;                  // X coordinate
    top: number;                   // Y coordinate
  };
  style?: {                        // Visual styling
    backgroundColor?: string;
    borderColor?: string;
    boxShadow?: string;
  };
  metadata?: {
    [key: string]: any;            // Custom properties
  };
}
```

## Task Schema

```typescript
interface Task {
  id: string;                      // Unique identifier
  type: 'task';                    // Always 'task'
  text: string;                    // Task name/description
  description?: string;            // Optional detailed description (NEW)
  anchoredTo: string;              // ID of anchored node
  previousAnchor?: string;         // Previous anchor for task movement
  slot: number;                    // Slot position relative to anchor
  tags: TaskTag[];                 // Array of associated tags
  
  // New opportunity linking fields
  opportunityId?: string;          // Optional linked opportunity ID
  
  // Enhanced task management fields (NEW)
  priority?: 'low' | 'medium' | 'high'; // Task priority level
  dueDate?: string;                // Optional due date (ISO string)
  status?: 'not_started' | 'in_progress' | 'completed' | 'on_hold'; // Task status
  estimatedHours?: number;         // Estimated work hours
  assignedTo?: string;             // Person assigned to task
  lastModified?: string;           // Last modification timestamp (ISO string)
  
  position: {
    left: number;                  // X coordinate
    top: number;                   // Y coordinate
    slot?: {                       // Next action slot position
      x: number;
      y: number;
    };
  };
  containerPosition?: {            // Task container position
    left: number;
    top: number;
  };
  metadata?: {                     // Additional custom properties
    [key: string]: any;
  };
}
```

## Task Tag Schema

```typescript
interface TaskTag {
  category: string;                // Tag category (stage, urgency, etc.)
  option: string;                  // Selected option for category
  date?: string;                   // Optional date (ISO string)
  description?: string;            // Optional description
  link?: string;                   // Optional URL link
  completed: boolean;              // Completion status
  isInNextAction?: boolean;        // Whether tag is in next-action slot
  customFields?: {                 // Category-specific fields
    sharePointName?: string;       // For SharePoint category
    crmOpportunityId?: string;     // For CRM category
    confluenceName?: string;       // For Confluence category
    confluenceAuthor?: string;     // For Confluence category
  };
}
```

## Flowline Schema

```typescript
interface Flowline {
  id: string;                      // Unique identifier
  type: 'straight' | 'perpendicular'; // Line style
  source: string;                  // Source node ID
  target: string;                  // Target node ID
  path?: string;                   // SVG path data
  style?: {                        // Visual styling
    stroke?: string;
    strokeWidth?: number;
    strokeDasharray?: string;
  };
  metadata?: {
    [key: string]: any;            // Custom properties
  };
}
```

## Workflow Schema

```typescript
interface Workflow {
  name: string;                    // Workflow name
  version: string;                 // Version number (updated for new features)
  created_at: string;              // Creation timestamp
  updated_at: string;              // Last update timestamp
  nodes: Node[];                   // All nodes in workflow
  tasks: Task[];                   // All tasks in workflow (with enhanced fields)
  flowlines: Flowline[];           // All flowlines in workflow
  opportunities: Opportunity[];    // Associated opportunities (NEW - now required)
  relationships?: {                // Relationship tracking data (NEW)
    data: RelationshipExport;
    version: string;
  };
  metadata?: {
    description?: string;
    author?: string;
    taskOpportunityLinks?: number; // Count of task-opportunity relationships
    totalRelationships?: number;   // Total relationship count
    exportedFeatures?: string[];   // List of features included in export
    [key: string]: any;
  };
}

interface RelationshipExport {
  relationships: Array<{
    key: string;
    sourceType: string;
    sourceId: string;
    targetType: string; 
    targetId: string;
    relationshipType: string;
    strength: number;
    metadata: any;
    created: string;
    updated: string;
  }>;
  stats: {
    totalRelationships: number;
    relationshipsByType: Record<string, number>;
    entitiesByType: Record<string, number>;
    lastUpdated: string;
  };
  exported: string;
  version: string;
}
```

## Configuration Schema

```typescript
interface AppConfig {
  nodeTypes: Array<{
    value: string;
    label: string;
    disabled?: boolean;
  }>;
  flowlineTypes: Array<{
    value: string;
    label: string;
  }>;
  tagSystem: {
    categories: Array<{
      value: string;
      label: string;
      disabled?: boolean;
    }>;
    options: {
      [categoryKey: string]: Array<{
        value: string;
        label: string;
        disabled?: boolean;
      }>;
    };
  };
  ui?: {
    [key: string]: any;
  };
}
```

## Usage Guidelines

### Adding New Fields
1. **Opportunities**: Add new fields to the `metadata` object for extensibility
2. **Nodes**: Use `metadata` for custom node properties
3. **Tasks**: Add new tag categories in the config, custom fields in `TaskTag.customFields`
4. **Flowlines**: Use `metadata` for custom line properties

### Validation
- All required fields must be present when creating objects
- IDs should be unique within their respective collections
- Timestamps should be ISO 8601 format
- Enum values (status, type, etc.) must match defined options

### Backwards Compatibility
- New optional fields can be added to `metadata` objects
- Required fields should not be removed or renamed
- Default values should be provided for new optional fields

### File Export Formats
- **JSON**: Complete object with all fields
- **CSV**: Flattened structure for opportunities and tasks
- **Workflow Files**: Complete workflow with all associated objects including opportunities and relationships

## Recent Schema Updates

### Version 2.0.0 Changes (Current Session)
1. **Task Schema Enhancements**:
   - Added `description`, `priority`, `dueDate`, `status`, `estimatedHours`, `assignedTo`, `lastModified` fields
   - Enhanced opportunity linking with `opportunityId` field
   - Moved metadata fields to top-level for better access

2. **Workflow Schema Enhancements**:
   - Made `opportunities` array required (was optional)
   - Added `relationships` object for relationship tracking data
   - Enhanced metadata with relationship statistics and feature tracking

3. **New Relationship Tracking**:
   - Added `RelationshipExport` interface for comprehensive relationship data
   - Supports 11 different relationship types (structural, semantic, temporal)
   - Includes statistics and metadata for relationship analysis

4. **Opportunity Integration**:
   - Full integration with task system via `opportunityId` linking
   - Support for manual opportunity creation with comprehensive metadata
   - Visual relationship tracking in both Workflow and Opportunity views

### Migration Notes
- Existing workflow files without opportunities will auto-migrate by creating empty opportunities array
- Task nodes without enhanced fields will use default values
- Relationship data is optional and will be generated if missing