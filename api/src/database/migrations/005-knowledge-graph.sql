-- Knowledge Graph Schema Migration
-- Requires pgvector extension

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Entity Types lookup table
CREATE TABLE IF NOT EXISTS entity_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    schema_definition JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Core entities table
CREATE TABLE IF NOT EXISTS kg_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type_id INTEGER REFERENCES entity_types(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    properties JSONB DEFAULT '{}',
    
    -- Vector embedding for semantic search
    embedding vector(1536), -- OpenAI ada-002 dimension
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    
    -- Full-text search
    search_vector tsvector GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
    ) STORED
);

-- Relationship types lookup table  
CREATE TABLE IF NOT EXISTS relationship_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_directional BOOLEAN DEFAULT true,
    inverse_name VARCHAR(100), -- For bidirectional relationships
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Relationships between entities
CREATE TABLE IF NOT EXISTS kg_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    relationship_type_id INTEGER REFERENCES relationship_types(id),
    source_entity_id UUID REFERENCES kg_entities(id) ON DELETE CASCADE,
    target_entity_id UUID REFERENCES kg_entities(id) ON DELETE CASCADE,
    properties JSONB DEFAULT '{}',
    strength FLOAT DEFAULT 1.0, -- Relationship strength/confidence
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    
    -- Prevent self-references and duplicates
    CONSTRAINT no_self_reference CHECK (source_entity_id != target_entity_id),
    CONSTRAINT unique_relationship UNIQUE (relationship_type_id, source_entity_id, target_entity_id)
);

-- Links between KG entities and existing process flow data
CREATE TABLE IF NOT EXISTS kg_process_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kg_entity_id UUID REFERENCES kg_entities(id) ON DELETE CASCADE,
    linked_type VARCHAR(50) NOT NULL, -- 'workflow', 'node', 'task', 'opportunity'
    linked_id VARCHAR(100) NOT NULL,
    link_properties JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT unique_process_link UNIQUE (kg_entity_id, linked_type, linked_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_kg_entities_type ON kg_entities(entity_type_id);
CREATE INDEX IF NOT EXISTS idx_kg_entities_name ON kg_entities USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_kg_entities_search ON kg_entities USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_kg_entities_embedding ON kg_entities USING ivfflat (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_kg_relationships_source ON kg_relationships(source_entity_id);
CREATE INDEX IF NOT EXISTS idx_kg_relationships_target ON kg_relationships(target_entity_id);
CREATE INDEX IF NOT EXISTS idx_kg_relationships_type ON kg_relationships(relationship_type_id);

CREATE INDEX IF NOT EXISTS idx_kg_process_links_entity ON kg_process_links(kg_entity_id);
CREATE INDEX IF NOT EXISTS idx_kg_process_links_type_id ON kg_process_links(linked_type, linked_id);

-- Insert default entity types
INSERT INTO entity_types (name, description, schema_definition) VALUES 
('person', 'Individual people', '{
    "required": ["name"],
    "properties": {
        "name": {"type": "string"},
        "title": {"type": "string"},
        "department": {"type": "string"}, 
        "email": {"type": "string"},
        "phone": {"type": "string"},
        "skills": {"type": "array"},
        "location": {"type": "string"}
    }
}'),
('company', 'Organizations and companies', '{
    "required": ["name"],
    "properties": {
        "name": {"type": "string"},
        "industry": {"type": "string"},
        "size": {"type": "string"},
        "location": {"type": "string"},
        "website": {"type": "string"},
        "description": {"type": "string"}
    }
}'),
('document', 'Documents and files', '{
    "required": ["name"],
    "properties": {
        "name": {"type": "string"},
        "type": {"type": "string"},
        "author": {"type": "string"},
        "created_date": {"type": "string"},
        "classification": {"type": "string"},
        "format": {"type": "string"}
    }
}'),
('asset', 'Physical assets and systems', '{
    "required": ["name"],
    "properties": {
        "name": {"type": "string"},
        "type": {"type": "string"},
        "serial_number": {"type": "string"},
        "manufacturer": {"type": "string"},
        "model": {"type": "string"},
        "status": {"type": "string"},
        "location": {"type": "string"}
    }
}')
ON CONFLICT (name) DO NOTHING;

-- Insert default relationship types
INSERT INTO relationship_types (name, description, is_directional, inverse_name) VALUES
('works_for', 'Employment relationship', true, 'employs'),
('manages', 'Management relationship', true, 'managed_by'),
('located_at', 'Physical location', true, 'houses'),
('authored_by', 'Document authorship', true, 'author_of'),
('owns', 'Ownership relationship', true, 'owned_by'),
('collaborates_with', 'Collaboration relationship', false, 'collaborates_with'),
('part_of', 'Hierarchical relationship', true, 'contains'),
('uses', 'Usage relationship', true, 'used_by'),
('related_to', 'General relationship', false, 'related_to')
ON CONFLICT (name) DO NOTHING;

-- Update trigger for kg_entities
CREATE OR REPLACE FUNCTION update_kg_entity_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_kg_entity_updated_at
    BEFORE UPDATE ON kg_entities
    FOR EACH ROW
    EXECUTE FUNCTION update_kg_entity_updated_at();