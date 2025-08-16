-- Opportunities Database Schema
-- Extends the existing workflow/task system with higher-level business organization

-- Create Opportunities table
CREATE TABLE IF NOT EXISTS opportunities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
    priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5), -- 1=highest, 5=lowest
    start_date DATE,
    target_date DATE,
    completion_date DATE,
    business_value TEXT,
    success_criteria TEXT,
    stakeholders TEXT[], -- Array of stakeholder names/emails
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_priority ON opportunities(priority);
CREATE INDEX IF NOT EXISTS idx_opportunities_dates ON opportunities(start_date, target_date);
CREATE INDEX IF NOT EXISTS idx_opportunities_tags ON opportunities USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_opportunities_stakeholders ON opportunities USING GIN(stakeholders);
CREATE INDEX IF NOT EXISTS idx_opportunities_created ON opportunities(created_at);

-- Create Notes table (enhanced from basic note storage)
CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    content TEXT NOT NULL,
    note_type VARCHAR(50) DEFAULT 'general' CHECK (note_type IN ('general', 'meeting', 'research', 'decision', 'action', 'reference')),
    
    -- Association fields
    opportunity_id INTEGER REFERENCES opportunities(id) ON DELETE SET NULL,
    workflow_id INTEGER REFERENCES workflows(id) ON DELETE SET NULL, -- Assuming workflows table exists
    task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL, -- Assuming tasks table exists
    
    -- Organization
    tags TEXT[] DEFAULT '{}',
    categories TEXT[] DEFAULT '{}', -- For hierarchical organization
    
    -- Security and metadata
    encrypted BOOLEAN DEFAULT FALSE,
    access_level VARCHAR(20) DEFAULT 'private' CHECK (access_level IN ('private', 'team', 'public')),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    accessed_at TIMESTAMP DEFAULT NOW(),
    
    -- User tracking
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    
    -- Additional metadata
    metadata JSONB DEFAULT '{}',
    
    -- Search and indexing
    search_vector tsvector,
    
    CONSTRAINT note_associations_check CHECK (
        opportunity_id IS NOT NULL OR 
        workflow_id IS NOT NULL OR 
        task_id IS NOT NULL OR 
        note_type = 'general'
    )
);

-- Create indexes for efficient note querying
CREATE INDEX IF NOT EXISTS idx_notes_opportunity ON notes(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_notes_workflow ON notes(workflow_id);
CREATE INDEX IF NOT EXISTS idx_notes_task ON notes(task_id);
CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(note_type);
CREATE INDEX IF NOT EXISTS idx_notes_tags ON notes USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_notes_categories ON notes USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_notes_created ON notes(created_at);
CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at);
CREATE INDEX IF NOT EXISTS idx_notes_search ON notes USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_notes_access ON notes(access_level);

-- Create opportunity_workflows junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS opportunity_workflows (
    id SERIAL PRIMARY KEY,
    opportunity_id INTEGER NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    workflow_id INTEGER NOT NULL, -- References workflows table
    relationship_type VARCHAR(50) DEFAULT 'contains' CHECK (relationship_type IN ('contains', 'supports', 'depends_on', 'blocks')),
    priority INTEGER DEFAULT 3,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(opportunity_id, workflow_id)
);

CREATE INDEX IF NOT EXISTS idx_opp_workflows_opp ON opportunity_workflows(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opp_workflows_workflow ON opportunity_workflows(workflow_id);

-- Create opportunity_links table for relationships between opportunities
CREATE TABLE IF NOT EXISTS opportunity_links (
    id SERIAL PRIMARY KEY,
    source_opportunity_id INTEGER NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    target_opportunity_id INTEGER NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    link_type VARCHAR(50) NOT NULL CHECK (link_type IN ('depends_on', 'blocks', 'relates_to', 'parent_of', 'child_of')),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(source_opportunity_id, target_opportunity_id, link_type),
    CONSTRAINT no_self_reference CHECK (source_opportunity_id != target_opportunity_id)
);

CREATE INDEX IF NOT EXISTS idx_opp_links_source ON opportunity_links(source_opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opp_links_target ON opportunity_links(target_opportunity_id);

-- Create note_links table for associations between notes
CREATE TABLE IF NOT EXISTS note_links (
    id SERIAL PRIMARY KEY,
    source_note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    target_note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    link_type VARCHAR(50) DEFAULT 'references' CHECK (link_type IN ('references', 'continues', 'summarizes', 'contradicts', 'supports')),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(source_note_id, target_note_id, link_type),
    CONSTRAINT no_note_self_reference CHECK (source_note_id != target_note_id)
);

CREATE INDEX IF NOT EXISTS idx_note_links_source ON note_links(source_note_id);
CREATE INDEX IF NOT EXISTS idx_note_links_target ON note_links(target_note_id);

-- Create search_index table for advanced full-text search
CREATE TABLE IF NOT EXISTS search_index (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('opportunity', 'note', 'workflow', 'task')),
    entity_id INTEGER NOT NULL,
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('title', 'content', 'description', 'tags', 'metadata')),
    indexed_content TEXT NOT NULL,
    search_vector tsvector,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_entity ON search_index(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_search_content_type ON search_index(content_type);
CREATE INDEX IF NOT EXISTS idx_search_vector ON search_index USING GIN(search_vector);

-- Create triggers for automatic search vector updates
CREATE OR REPLACE FUNCTION update_search_vector() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content, ''));
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notes_search_vector_update
    BEFORE INSERT OR UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- Create function to update search index
CREATE OR REPLACE FUNCTION update_search_index_for_note() RETURNS TRIGGER AS $$
BEGIN
    -- Delete existing entries for this note
    DELETE FROM search_index WHERE entity_type = 'note' AND entity_id = NEW.id;
    
    -- Insert new entries
    INSERT INTO search_index (entity_type, entity_id, content_type, indexed_content, search_vector) VALUES
    ('note', NEW.id, 'title', COALESCE(NEW.title, ''), to_tsvector('english', COALESCE(NEW.title, ''))),
    ('note', NEW.id, 'content', NEW.content, to_tsvector('english', NEW.content)),
    ('note', NEW.id, 'tags', array_to_string(NEW.tags, ' '), to_tsvector('english', array_to_string(NEW.tags, ' ')));
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notes_search_index_update
    AFTER INSERT OR UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_search_index_for_note();

-- Create function to update opportunity search index
CREATE OR REPLACE FUNCTION update_search_index_for_opportunity() RETURNS TRIGGER AS $$
BEGIN
    -- Delete existing entries for this opportunity
    DELETE FROM search_index WHERE entity_type = 'opportunity' AND entity_id = NEW.id;
    
    -- Insert new entries
    INSERT INTO search_index (entity_type, entity_id, content_type, indexed_content, search_vector) VALUES
    ('opportunity', NEW.id, 'title', NEW.name, to_tsvector('english', NEW.name)),
    ('opportunity', NEW.id, 'description', COALESCE(NEW.description, ''), to_tsvector('english', COALESCE(NEW.description, ''))),
    ('opportunity', NEW.id, 'tags', array_to_string(NEW.tags, ' '), to_tsvector('english', array_to_string(NEW.tags, ' ')));
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER opportunities_search_index_update
    AFTER INSERT OR UPDATE ON opportunities
    FOR EACH ROW EXECUTE FUNCTION update_search_index_for_opportunity();

-- Create views for common queries

-- View for opportunity overview with statistics
CREATE OR REPLACE VIEW opportunity_overview AS
SELECT 
    o.*,
    COUNT(DISTINCT ow.workflow_id) as workflow_count,
    COUNT(DISTINCT n.id) as note_count,
    COUNT(DISTINCT n.id) FILTER (WHERE n.note_type = 'meeting') as meeting_notes_count,
    COUNT(DISTINCT n.id) FILTER (WHERE n.note_type = 'decision') as decision_notes_count,
    GREATEST(o.updated_at, MAX(n.updated_at)) as last_activity
FROM opportunities o
LEFT JOIN opportunity_workflows ow ON o.id = ow.opportunity_id
LEFT JOIN notes n ON o.id = n.opportunity_id
GROUP BY o.id;

-- View for note context (shows full relationship chain)
CREATE OR REPLACE VIEW note_context AS
SELECT 
    n.*,
    o.name as opportunity_name,
    o.status as opportunity_status,
    -- Workflow info would be added once workflow table structure is known
    CASE 
        WHEN n.opportunity_id IS NOT NULL THEN 'Opportunity: ' || o.name
        WHEN n.workflow_id IS NOT NULL THEN 'Workflow: ' || n.workflow_id::text
        WHEN n.task_id IS NOT NULL THEN 'Task: ' || n.task_id::text
        ELSE 'General'
    END as context_description
FROM notes n
LEFT JOIN opportunities o ON n.opportunity_id = o.id;

-- View for recent activity across opportunities
CREATE OR REPLACE VIEW recent_activity AS
SELECT 
    'opportunity' as activity_type,
    o.id as entity_id,
    o.name as title,
    o.updated_at as activity_time,
    o.status as status,
    'Opportunity updated' as activity_description
FROM opportunities o
UNION ALL
SELECT 
    'note' as activity_type,
    n.id as entity_id,
    COALESCE(n.title, LEFT(n.content, 50) || '...') as title,
    n.updated_at as activity_time,
    n.note_type as status,
    'Note ' || n.note_type || ' updated' as activity_description
FROM notes n
ORDER BY activity_time DESC;

-- Sample data for testing (commented out for production)
/*
INSERT INTO opportunities (name, description, status, priority, business_value, success_criteria, tags) VALUES
('Customer Portal Enhancement', 'Improve user experience and self-service capabilities', 'active', 2, 'Reduce support costs by 30%', 'User satisfaction > 4.5/5, Support tickets reduced by 30%', ARRAY['customer-experience', 'cost-reduction']),
('API Integration Platform', 'Build unified API gateway for third-party integrations', 'active', 1, 'Enable 5x faster partner onboarding', 'Partner onboarding time < 2 weeks, API uptime > 99.9%', ARRAY['integration', 'scalability']),
('Data Analytics Initiative', 'Implement real-time analytics dashboard', 'active', 3, 'Data-driven decision making', 'Dashboard adoption > 80%, Decision cycle time reduced by 50%', ARRAY['analytics', 'business-intelligence']);
*/