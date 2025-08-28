-- Sample Knowledge Graph Data - Simple Version
-- Small test dataset for LLM querying

-- Sample Entities
INSERT INTO kg_entities (id, entity_type_id, name, description, properties) VALUES 
-- People
('550e8400-e29b-41d4-a716-446655440001', 1, 'Alice Johnson', 'Senior Software Engineer specializing in AI systems', '{"title": "Senior Software Engineer", "department": "AI Research", "email": "alice.johnson@company.com", "skills": ["Python", "Machine Learning", "PostgreSQL", "Vector Databases"], "location": "San Francisco, CA", "security_clearance": "Secret"}'),
('550e8400-e29b-41d4-a716-446655440002', 1, 'Bob Smith', 'Project Manager for Defense Systems', '{"title": "Project Manager", "department": "Defense Systems", "email": "bob.smith@company.com", "skills": ["Project Management", "Systems Engineering", "Risk Assessment"], "location": "Washington, DC", "security_clearance": "Top Secret"}'),
('550e8400-e29b-41d4-a716-446655440003', 1, 'Carol Chen', 'Data Scientist working on vector search systems', '{"title": "Data Scientist", "department": "AI Research", "email": "carol.chen@company.com", "skills": ["Data Science", "Vector Search", "Neural Networks", "Research"], "location": "Austin, TX"}'),

-- Companies  
('550e8400-e29b-41d4-a716-446655440004', 2, 'TechCorp Industries', 'Leading technology company specializing in AI and defense systems', '{"industry": "Technology", "size": "5000-10000 employees", "location": "San Francisco, CA", "website": "https://techcorp.com", "description": "Develops cutting-edge AI solutions for commercial and defense applications"}'),
('550e8400-e29b-41d4-a716-446655440005', 2, 'DataFlow Systems', 'Data infrastructure and analytics company', '{"industry": "Data Analytics", "size": "500-1000 employees", "location": "Austin, TX", "website": "https://dataflow.com", "description": "Provides enterprise data platform solutions"}'),

-- Documents
('550e8400-e29b-41d4-a716-446655440006', 3, 'AI System Architecture Specification', 'Technical specification for AI system design', '{"type": "Technical Specification", "author": "Alice Johnson", "created_date": "2024-03-15", "classification": "Internal", "format": "PDF"}'),
('550e8400-e29b-41d4-a716-446655440007', 3, 'Defense System Risk Assessment', 'Risk analysis document for defense systems', '{"type": "Risk Assessment", "author": "Bob Smith", "created_date": "2024-02-20", "classification": "Confidential", "format": "Word"}'),

-- Assets
('550e8400-e29b-41d4-a716-446655440008', 4, 'Vector Database Cluster', 'High-performance vector database for AI workloads', '{"type": "Database System", "location": "San Francisco, CA", "status": "Operational", "specs": "96 cores, 512GB RAM, 10TB NVMe"}'),
('550e8400-e29b-41d4-a716-446655440009', 4, 'AI Development Workstation', 'High-end workstation for AI model development', '{"type": "Computer Hardware", "location": "Austin, TX", "status": "Active", "specs": "64 cores, 256GB RAM, 4x RTX 4090"}');

-- Sample Relationships
INSERT INTO kg_relationships (relationship_type_id, source_entity_id, target_entity_id, properties) VALUES
-- Employment relationships
(1, '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', '{"start_date": "2022-03-15", "employment_type": "Full-time"}'),
(1, '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', '{"start_date": "2021-08-01", "employment_type": "Full-time"}'), 
(1, '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440005', '{"start_date": "2023-01-15", "employment_type": "Full-time"}'),

-- Management relationships
(2, '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '{"since": "2023-06-01"}'),

-- Document authorship
(3, '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440006', '{"primary_author": true}'),
(3, '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440007', '{"primary_author": true}'),

-- Asset ownership/usage  
(4, '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440008', '{"ownership": "Company Owned"}'),
(4, '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440009', '{"ownership": "Company Owned"}'),

-- Collaboration 
(5, '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', '{"project": "AI Research Initiative", "since": "2023-09-01"}')