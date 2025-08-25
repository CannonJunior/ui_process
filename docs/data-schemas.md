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
  description?: string;            // Optional detailed description
  anchoredTo: string;              // ID of anchored node
  previousAnchor?: string;         // Previous anchor for task movement
  slot: number;                    // Slot position relative to anchor
  tags: TaskTag[];                 // Array of associated tags
  opportunityId?: string;          // Optional linked opportunity ID
  priority?: 'low' | 'medium' | 'high'; // Optional priority level
  dueDate?: string;                // Optional due date (ISO string)
  status?: 'not_started' | 'in_progress' | 'completed' | 'on_hold'; // Task status
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
    estimatedHours?: number;
    assignedTo?: string;
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
  version: string;                 // Version number
  created_at: string;              // Creation timestamp
  updated_at: string;              // Last update timestamp
  nodes: Node[];                   // All nodes in workflow
  tasks: Task[];                   // All tasks in workflow
  flowlines: Flowline[];           // All flowlines in workflow
  opportunities?: Opportunity[];   // Associated opportunities
  metadata?: {
    description?: string;
    author?: string;
    [key: string]: any;
  };
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
- **Workflow Files**: Complete workflow with all associated objects