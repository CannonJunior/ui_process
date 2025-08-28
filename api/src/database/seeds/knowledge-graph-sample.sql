-- Sample Knowledge Graph Data
-- Small test dataset for LLM querying

-- Sample Entities
INSERT INTO kg_entities (id, entity_type_id, name, description, properties) VALUES 
-- People
('550e8400-e29b-41d4-a716-446655440001', 1, 'Alice Johnson', 'Senior Software Engineer specializing in AI systems', '{
    "title": "Senior Software Engineer",
    "department": "AI Research",
    "email": "alice.johnson@company.com",
    "skills": ["Python", "Machine Learning", "PostgreSQL", "Vector Databases"],
    "location": "San Francisco, CA",
    "security_clearance": "Secret"
}'),
('550e8400-e29b-41d4-a716-446655440002', 1, 'Bob Smith', 'Project Manager for Defense Systems', '{
    "title": "Project Manager", 
    "department": "Defense Systems",
    "email": "bob.smith@company.com",
    "skills": ["Project Management", "Systems Engineering", "Risk Assessment"],
    "location": "Washington, DC",
    "security_clearance": "Top Secret"
}'),
('550e8400-e29b-41d4-a716-446655440003', 1, 'Carol Chen', 'Data Scientist working on vector search systems', '{
    "title": "Data Scientist",
    "department": "AI Research", 
    "email": "carol.chen@company.com",
    "skills": ["Data Science", "Vector Search", "Neural Networks", "Research"],
    "location": "Austin, TX"
}'),

-- Companies
('550e8400-e29b-41d4-a716-446655440004', 2, 'TechCorp Industries', 'Leading technology company specializing in AI and defense systems', '{
    "industry": "Technology",
    "size": "5000-10000 employees",
    "location": "San Francisco, CA",
    "website": "https://techcorp.com",
    "description": "Develops cutting-edge AI solutions for commercial and defense applications"
}'),
('550e8400-e29b-41d4-a716-446655440005', 2, 'DataFlow Systems', 'Specialized database and analytics company', '{
    "industry": "Data Analytics",
    "size": "500-1000 employees", 
    "location": "Austin, TX",
    "website": "https://dataflow.com",
    "description": "Provides enterprise data management and vector database solutions"
}'),

-- Documents  
('550e8400-e29b-41d4-a716-446655440006', 3, 'AI System Architecture Specification', 'Technical specification for the vector search AI system', '{
    "type": "Technical Specification",
    "author": "Alice Johnson",
    "created_date": "2024-01-15",
    "classification": "Confidential",
    "format": "PDF",
    "version": "2.1"
}'),
('550e8400-e29b-41d4-a716-446655440007', 3, 'Project Risk Assessment Report', 'Comprehensive risk analysis for defense systems project', '{
    "type": "Risk Assessment",
    "author": "Bob Smith", 
    "created_date": "2024-02-01",
    "classification": "Secret",
    "format": "Word Document",
    "version": "1.0"
}'),

-- Assets
('550e8400-e29b-41d4-a716-446655440008', 4, 'Vector Database Cluster Alpha', 'Production vector database cluster for AI applications', '{
    "type": "Database System",
    "serial_number": "VDB-001-ALPHA",
    "manufacturer": "TechCorp Industries",
    "model": "VectorDB Enterprise 5.0",
    "status": "Operational",
    "location": "Data Center San Francisco"
}'),
('550e8400-e29b-41d4-a716-446655440009', 4, 'AI Training Workstation Delta', 'High-performance workstation for machine learning model training', '{
    "type": "Computing System",
    "serial_number": "AWS-DELTA-004",
    "manufacturer": "Custom Build",
    "model": "ML Training Station v3",
    "status": "Operational", 
    "location": "AI Research Lab Austin"
}');

-- Sample Relationships
INSERT INTO kg_relationships (relationship_type_id, source_entity_id, target_entity_id, properties) VALUES
-- Employment relationships
(1, '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', '{"start_date": "2022-03-15", "employment_type": "Full-time"}'),
(1, '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', '{"start_date": "2021-08-01", "employment_type": "Full-time"}'),
(1, '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440005', '{"start_date": "2023-01-10", "employment_type": "Full-time"}'),

-- Management relationship
(2, '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '{"since": "2023-06-01"}'),

-- Document authorship
(4, '550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440001', '{"primary_author": true}'),
(4, '550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440002', '{"primary_author": true}'),

-- Asset ownership/usage
(5, '550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440004', '{"purchased_date": "2023-05-15"}'),
(8, '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440008', '{"access_level": "admin"}'),
(8, '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440009', '{"access_level": "user"}'),

-- Collaboration
(6, '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', '{"project": "Vector Search Research", "since": "2024-01-01"}'),

-- Business relationship
(9, '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440005', '{"type": "technology_partnership", "since": "2023-09-01"}');

-- Sample process links (linking KG entities to existing workflow data)
-- Note: These would link to actual workflow/node/task IDs in a real implementation
INSERT INTO kg_process_links (kg_entity_id, linked_type, linked_id, link_properties) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'task', 'task_001', '{"role": "assignee"}'),
('550e8400-e29b-41d4-a716-446655440002', 'opportunity', 'opp_001', '{"role": "sponsor"}'),
('550e8400-e29b-41d4-a716-446655440006', 'node', 'node_001', '{"type": "reference_document"}'),
('550e8400-e29b-41d4-a716-446655440008', 'workflow', 'wf_001', '{"role": "supporting_system"}');