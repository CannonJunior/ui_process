-- Initial Database Schema for UI Process Application
-- Implements the PostgreSQL + pgvector architecture from docs/postgresql-integration-plan.md

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ===== CORE ENTITY TABLES =====

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

-- ===== RELATIONSHIP TRACKING TABLES =====

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

-- ===== VECTOR SEARCH & RAG TABLES =====

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

-- ===== INDEXES AND PERFORMANCE OPTIMIZATION =====

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

-- ===== SEED DATA =====

-- Create default organization for development
INSERT INTO organizations (name, slug) VALUES 
    ('UI Process Development', 'ui-process-dev');

-- Create default development user
INSERT INTO users (organization_id, email, name, role) 
SELECT id, 'dev@uiprocess.local', 'Development User', 'admin'
FROM organizations WHERE slug = 'ui-process-dev';

-- Create default tag categories based on existing frontend configuration
DO $$ 
DECLARE 
    org_id UUID;
    stage_cat_id UUID;
    urgency_cat_id UUID;
    sharepoint_cat_id UUID;
    crm_cat_id UUID;
    confluence_cat_id UUID;
BEGIN
    SELECT id INTO org_id FROM organizations WHERE slug = 'ui-process-dev';
    
    -- Stage category
    INSERT INTO tag_categories (organization_id, name, label) 
    VALUES (org_id, 'stage', 'Stage') RETURNING id INTO stage_cat_id;
    
    INSERT INTO tag_options (category_id, name, label) VALUES
        (stage_cat_id, 'planning', 'Planning'),
        (stage_cat_id, 'in_progress', 'In Progress'),
        (stage_cat_id, 'review', 'Review'),
        (stage_cat_id, 'completed', 'Completed');
    
    -- Urgency category
    INSERT INTO tag_categories (organization_id, name, label) 
    VALUES (org_id, 'urgency', 'Urgency') RETURNING id INTO urgency_cat_id;
    
    INSERT INTO tag_options (category_id, name, label) VALUES
        (urgency_cat_id, 'low', 'Low'),
        (urgency_cat_id, 'medium', 'Medium'),
        (urgency_cat_id, 'high', 'High'),
        (urgency_cat_id, 'critical', 'Critical');
    
    -- SharePoint category
    INSERT INTO tag_categories (organization_id, name, label) 
    VALUES (org_id, 'sharepoint', 'SharePoint') RETURNING id INTO sharepoint_cat_id;
    
    INSERT INTO tag_options (category_id, name, label) VALUES
        (sharepoint_cat_id, 'document', 'Document'),
        (sharepoint_cat_id, 'list', 'List'),
        (sharepoint_cat_id, 'library', 'Library');
    
    -- CRM category
    INSERT INTO tag_categories (organization_id, name, label) 
    VALUES (org_id, 'crm', 'CRM') RETURNING id INTO crm_cat_id;
    
    INSERT INTO tag_options (category_id, name, label) VALUES
        (crm_cat_id, 'lead', 'Lead'),
        (crm_cat_id, 'opportunity', 'Opportunity'),
        (crm_cat_id, 'account', 'Account'),
        (crm_cat_id, 'contact', 'Contact');
    
    -- Confluence category
    INSERT INTO tag_categories (organization_id, name, label) 
    VALUES (org_id, 'confluence', 'Confluence') RETURNING id INTO confluence_cat_id;
    
    INSERT INTO tag_options (category_id, name, label) VALUES
        (confluence_cat_id, 'page', 'Page'),
        (confluence_cat_id, 'space', 'Space'),
        (confluence_cat_id, 'template', 'Template'),
        (confluence_cat_id, 'blog', 'Blog');
END $$;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nodes_updated_at BEFORE UPDATE ON nodes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_task_tags_updated_at BEFORE UPDATE ON task_tags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_entity_relationships_updated_at BEFORE UPDATE ON entity_relationships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_document_chunks_updated_at BEFORE UPDATE ON document_chunks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chat_conversations_updated_at BEFORE UPDATE ON chat_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'Database schema initialized successfully!' as status;