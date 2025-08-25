# PostgreSQL + pgvector Integration Architecture Plan

## Executive Summary

This document outlines the comprehensive plan for integrating PostgreSQL with pgvector to support advanced workflow data management, relationship tracking, and RAG-enabled chat interface functionality.

## Current State Analysis

### Existing Data Structures
1. **Nodes**: Process, Decision, Terminal types with positioning and metadata
2. **Tasks**: Linked to nodes with tags, status, priority, and opportunity relationships
3. **Opportunities**: Business opportunities with metadata and task linkages
4. **Tags**: Complex tagging system with categories, options, dates, and custom fields
5. **Flowlines**: Connection data between nodes
6. **Workflows**: Complete workflow save/load functionality

### Current Data Storage
- **Frontend Storage**: JavaScript objects in memory, localStorage for persistence
- **File Export**: JSON workflow files
- **No Backend**: Currently no server-side data persistence or querying

## Proposed Architecture

### 1. Database Schema Design

#### Core Entity Tables

```sql
-- Organizations/Workspaces for multi-tenancy
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users and authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflows as top-level containers
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(20) DEFAULT '1.0.0',
    created_by UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}',
    embedding VECTOR(1536), -- OpenAI embeddings dimension
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Opportunities (business opportunities)
CREATE TABLE opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    tags TEXT[] DEFAULT '{}',
    value DECIMAL(15,2),
    priority VARCHAR(20) DEFAULT 'medium',
    deadline DATE,
    contact_person VARCHAR(255),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    source VARCHAR(50) DEFAULT 'manual', -- manual, mcp, import
    embedding VECTOR(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Nodes (process, decision, terminal)
CREATE TABLE nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('process', 'decision', 'terminal')),
    text TEXT NOT NULL,
    position_x REAL NOT NULL,
    position_y REAL NOT NULL,
    style JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    embedding VECTOR(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks linked to nodes
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
    anchored_to UUID REFERENCES nodes(id) ON DELETE CASCADE,
    previous_anchor UUID REFERENCES nodes(id) ON DELETE SET NULL,
    text TEXT NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'not_started',
    priority VARCHAR(20) DEFAULT 'medium',
    due_date DATE,
    estimated_hours DECIMAL(5,2),
    assigned_to VARCHAR(255),
    position_x REAL NOT NULL,
    position_y REAL NOT NULL,
    slot_number INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    embedding VECTOR(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tag categories and options (configuration)
CREATE TABLE tag_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    label VARCHAR(255) NOT NULL,
    disabled BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE tag_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES tag_categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    label VARCHAR(255) NOT NULL,
    disabled BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task tags (many-to-many with rich attributes)
CREATE TABLE task_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    option VARCHAR(100) NOT NULL,
    tag_date DATE,
    description TEXT,
    link_url TEXT,
    completed BOOLEAN DEFAULT FALSE,
    is_in_next_action BOOLEAN DEFAULT FALSE,
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Flowlines (connections between nodes)
CREATE TABLE flowlines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    source_node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    target_node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    type VARCHAR(20) DEFAULT 'straight',
    path_data TEXT,
    style JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Relationship Tracking Tables

```sql
-- Generic relationship tracking for future extensibility
CREATE TABLE entity_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_entity_type VARCHAR(50) NOT NULL,
    source_entity_id UUID NOT NULL,
    target_entity_type VARCHAR(50) NOT NULL,
    target_entity_id UUID NOT NULL,
    relationship_type VARCHAR(50) NOT NULL,
    strength DECIMAL(3,2) DEFAULT 1.0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(source_entity_type, source_entity_id, target_entity_type, target_entity_id, relationship_type)
);

-- Audit trail for all changes
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    user_id UUID REFERENCES users(id),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL, -- CREATE, UPDATE, DELETE
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Vector Search & RAG Tables

```sql
-- Document chunks for RAG
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    source_entity_type VARCHAR(50) NOT NULL,
    source_entity_id UUID NOT NULL,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}',
    embedding VECTOR(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat conversations for context
CREATE TABLE chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    workflow_id UUID REFERENCES workflows(id),
    title VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual chat messages
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    embedding VECTOR(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Indexes and Performance Optimization

```sql
-- Primary performance indexes
CREATE INDEX idx_workflows_org_id ON workflows(organization_id);
CREATE INDEX idx_opportunities_workflow_id ON opportunities(workflow_id);
CREATE INDEX idx_nodes_workflow_id ON nodes(workflow_id);
CREATE INDEX idx_tasks_workflow_id ON tasks(workflow_id);
CREATE INDEX idx_tasks_opportunity_id ON tasks(opportunity_id);
CREATE INDEX idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX idx_flowlines_workflow_id ON flowlines(workflow_id);

-- Vector similarity search indexes (HNSW for best performance)
CREATE INDEX idx_workflows_embedding ON workflows USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_opportunities_embedding ON opportunities USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_nodes_embedding ON nodes USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_tasks_embedding ON tasks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_document_chunks_embedding ON document_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_chat_messages_embedding ON chat_messages USING hnsw (embedding vector_cosine_ops);

-- Relationship tracking indexes
CREATE INDEX idx_entity_relationships_source ON entity_relationships(source_entity_type, source_entity_id);
CREATE INDEX idx_entity_relationships_target ON entity_relationships(target_entity_type, target_entity_id);
CREATE INDEX idx_entity_relationships_type ON entity_relationships(relationship_type);

-- Full-text search indexes
CREATE INDEX idx_workflows_text ON workflows USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX idx_opportunities_text ON opportunities USING gin(to_tsvector('english', title || ' ' || description));
CREATE INDEX idx_nodes_text ON nodes USING gin(to_tsvector('english', text));
CREATE INDEX idx_tasks_text ON tasks USING gin(to_tsvector('english', text || ' ' || COALESCE(description, '')));
```

### 3. API Layer Architecture

#### Backend Technology Stack
- **Framework**: Node.js with Express.js or Python with FastAPI
- **ORM**: Prisma (Node.js) or SQLAlchemy (Python)
- **Authentication**: JWT tokens with refresh token rotation
- **Rate Limiting**: Redis-based rate limiting
- **Caching**: Redis for query caching and session management
- **Vector Operations**: Direct PostgreSQL queries with pgvector

#### API Endpoints Structure

```typescript
// RESTful API Design
interface APIStructure {
  // Authentication
  '/auth/login': 'POST',
  '/auth/refresh': 'POST', 
  '/auth/logout': 'POST',

  // Organizations
  '/orgs': 'GET | POST',
  '/orgs/:id': 'GET | PUT | DELETE',

  // Workflows
  '/workflows': 'GET | POST',
  '/workflows/:id': 'GET | PUT | DELETE',
  '/workflows/:id/nodes': 'GET | POST',
  '/workflows/:id/tasks': 'GET | POST',
  '/workflows/:id/opportunities': 'GET | POST',
  '/workflows/:id/export': 'GET',
  '/workflows/import': 'POST',

  // Vector Search & RAG
  '/search/semantic': 'POST',
  '/search/hybrid': 'POST', // Combine vector + full-text
  '/chat/:conversationId/messages': 'GET | POST',
  '/chat/conversations': 'GET | POST',

  // Relationships
  '/relationships': 'GET | POST',
  '/relationships/graph': 'GET', // Graph data for visualization
  
  // Real-time updates
  '/ws': 'WebSocket connection for live updates'
}
```

### 4. RAG Implementation Strategy

#### Document Processing Pipeline
1. **Content Extraction**: Extract text from workflow entities (nodes, tasks, opportunities)
2. **Chunking Strategy**: 
   - Semantic chunking based on entity boundaries
   - Maximum 512 tokens per chunk with 50-token overlap
   - Preserve entity relationships in chunk metadata
3. **Embedding Generation**: OpenAI text-embedding-ada-002 or local Sentence-BERT
4. **Storage**: Store in document_chunks table with source entity references

#### Query Processing
1. **Intent Classification**: Determine if query is about specific workflow, task, or general
2. **Vector Search**: Use pgvector cosine similarity search
3. **Hybrid Search**: Combine vector similarity with PostgreSQL full-text search
4. **Context Assembly**: Retrieve relevant chunks and build context for LLM
5. **Response Generation**: Generate contextual response with source citations

#### Chat Interface Enhancements
```typescript
interface ChatFeatures {
  semanticSearch: {
    query: string;
    entityTypes: Array<'workflow' | 'task' | 'opportunity' | 'node'>;
    workflowId?: string;
    similarityThreshold: number;
  };
  
  contextualChat: {
    preserveWorkflowContext: boolean;
    includeVisualElements: boolean;
    suggestActions: boolean;
  };
  
  actionableResults: {
    createTask: boolean;
    updateNode: boolean;
    linkOpportunity: boolean;
    generateWorkflow: boolean;
  };
}
```

### 5. Migration Strategy

#### Phase 1: Backend Infrastructure (Week 1-2)
1. Set up PostgreSQL with pgvector extension
2. Implement database schema and migrations
3. Create basic API endpoints for CRUD operations
4. Implement authentication and authorization

#### Phase 2: Data Synchronization (Week 3)
1. Create data export/import utilities
2. Build sync service between frontend localStorage and PostgreSQL
3. Implement real-time WebSocket updates
4. Add conflict resolution for concurrent edits

#### Phase 3: Vector Search Implementation (Week 4)
1. Implement embedding generation service
2. Create document chunking and processing pipeline
3. Build vector search API endpoints
4. Add hybrid search capabilities

#### Phase 4: RAG Integration (Week 5-6)
1. Enhance chat interface with RAG capabilities
2. Implement context-aware response generation
3. Add source citation and reference linking
4. Create actionable suggestions from chat responses

#### Phase 5: Advanced Features (Week 7-8)
1. Implement relationship graph visualization
2. Add advanced analytics and insights
3. Create workflow templates based on patterns
4. Implement collaborative features

### 6. Data Relationship Patterns

#### Relationship Types
```typescript
enum RelationshipType {
  // Direct relationships
  ANCHORED_TO = 'anchored_to',        // Task -> Node
  LINKED_TO = 'linked_to',            // Task -> Opportunity
  FLOWS_TO = 'flows_to',              // Node -> Node
  CONTAINS = 'contains',              // Workflow -> Node/Task
  
  // Semantic relationships (discovered)
  SIMILAR_TO = 'similar_to',          // Any entity with high embedding similarity
  RELATED_BY_TAG = 'related_by_tag',  // Entities sharing tag categories
  SEQUENTIAL = 'sequential',          // Tasks in sequence
  DEPENDENT_ON = 'dependent_on',      // Task dependencies
  
  // Temporal relationships
  PRECEDES = 'precedes',              // Temporal ordering
  CONCURRENT_WITH = 'concurrent_with', // Parallel activities
}
```

#### Automatic Relationship Discovery
1. **Embedding Similarity**: Discover semantically related entities
2. **Tag Pattern Analysis**: Find entities with similar tagging patterns
3. **Temporal Analysis**: Identify workflow sequences and dependencies
4. **User Behavior**: Learn relationships from user interactions

### 7. Performance Considerations

#### Query Optimization
- Use materialized views for complex relationship queries
- Implement query result caching with Redis
- Use connection pooling and prepared statements
- Monitor query performance with pg_stat_statements

#### Scaling Strategy
- Read replicas for query distribution
- Partitioning large tables by organization_id
- Consider sharding for very large deployments
- Use CDN for static assets and file exports

### 8. Security & Compliance

#### Data Protection
- Row-level security (RLS) for multi-tenancy
- Encrypted connections (TLS 1.3)
- Sensitive data encryption at rest
- Regular security audits and vulnerability scanning

#### Access Control
- Role-based access control (RBAC)
- API rate limiting and abuse prevention
- Audit logging for all data modifications
- GDPR compliance for data deletion and export

## Implementation Timeline

**Total Estimated Duration**: 8 weeks
**Resource Requirements**: 2-3 full-stack developers, 1 DevOps engineer
**Key Milestones**: 
- Week 2: Basic API functional
- Week 4: Vector search operational
- Week 6: RAG chat interface deployed
- Week 8: Full production deployment

## Success Metrics

1. **Performance**: Sub-200ms API response times, <1s vector search
2. **Accuracy**: >85% relevant results for semantic queries
3. **User Experience**: Seamless sync between frontend and backend
4. **Scalability**: Support for 1000+ concurrent users per organization
5. **Reliability**: 99.9% uptime with proper monitoring and alerting

## Risk Mitigation

1. **Data Migration**: Comprehensive testing with production data copies
2. **Performance**: Load testing and optimization before deployment
3. **User Adoption**: Gradual rollout with feature flags
4. **Backup Strategy**: Point-in-time recovery and daily backups
5. **Monitoring**: Comprehensive observability with alerts

This architecture provides a robust foundation for advanced workflow management with AI-powered insights, semantic search capabilities, and collaborative features while maintaining the simplicity and user experience of the current frontend application.