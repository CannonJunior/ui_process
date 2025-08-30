# PostgreSQL Database Commands

The chat interface supports direct PostgreSQL queries using `/sql` and `/db-query` commands. This allows you to interact with the database directly from the chat interface.

## Command Format

```bash
/sql "<your SQL query here>"
/db-query "<your SQL query here>"
```

Both commands work identically - use whichever feels more natural.

## Safety Features

- **Safe Mode**: By default, only SELECT queries are allowed
- **Rate Limiting**: Maximum 10 queries per 15 minutes per IP
- **Dangerous Operation Blocking**: System-level operations are blocked
- **Query Validation**: Basic validation prevents harmful operations

## Copy & Paste Examples

### 📊 Data Querying Examples

#### Basic Data Retrieval
```bash
# View all tables in the database
/sql "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"

# Check what data is available
/db-query "SELECT COUNT(*) as total_records FROM workflows"

# View recent workflows
/sql "SELECT id, name, created_at FROM workflows ORDER BY created_at DESC LIMIT 5"
```

#### Exploring Database Structure
```bash
# List all columns in a table
/sql "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'workflows'"

# View table relationships
/db-query "SELECT constraint_name, table_name, column_name, foreign_table_name, foreign_column_name FROM information_schema.key_column_usage WHERE table_schema = 'public'"

# Check database version and status
/sql "SELECT version(), current_database(), current_user"
```

#### Task and Workflow Analysis
```bash
# Count tasks by status
/sql "SELECT status, COUNT(*) as count FROM tasks GROUP BY status ORDER BY count DESC"

# Find workflows with the most tasks
/db-query "SELECT w.name, COUNT(t.id) as task_count FROM workflows w LEFT JOIN tasks t ON w.id = t.workflow_id GROUP BY w.id, w.name ORDER BY task_count DESC LIMIT 10"

# Recent activity summary
/sql "SELECT 'workflows' as type, COUNT(*) as count FROM workflows WHERE created_at > NOW() - INTERVAL '7 days' UNION ALL SELECT 'tasks' as type, COUNT(*) as count FROM tasks WHERE created_at > NOW() - INTERVAL '7 days'"
```

#### Opportunities and Business Data
```bash
# View recent opportunities
/sql "SELECT title, description, status, created_at FROM opportunities ORDER BY created_at DESC LIMIT 5"

# Opportunities by priority/status
/db-query "SELECT status, priority, COUNT(*) as count FROM opportunities GROUP BY status, priority ORDER BY status, priority"

# Search opportunities by keyword
/sql "SELECT id, title, description FROM opportunities WHERE title ILIKE '%innovation%' OR description ILIKE '%innovation%'"
```

### 📝 Data Insertion Examples

#### Adding Sample Data
```bash
# Insert a new workflow (Note: This requires safe_mode: false in production)
/sql "INSERT INTO workflows (id, name, description, data, created_at) VALUES (gen_random_uuid(), 'Test Workflow', 'A test workflow created from chat', '{}', NOW())"

# Insert a sample opportunity
/db-query "INSERT INTO opportunities (id, title, description, status, priority, estimated_value, created_at) VALUES (gen_random_uuid(), 'Chat Integration Enhancement', 'Improve database integration in chat interface', 'active', 'high', 15000.00, NOW())"

# Add a task to an existing workflow
/sql "INSERT INTO tasks (id, title, description, status, priority, workflow_id, created_at) VALUES (gen_random_uuid(), 'Database Testing', 'Test database queries from chat', 'not_started', 'medium', (SELECT id FROM workflows LIMIT 1), NOW())"
```

#### Creating Test Data
```bash
# Create a sample knowledge base entry
/db-query "INSERT INTO knowledge_nodes (id, title, content, node_type, metadata, created_at) VALUES (gen_random_uuid(), 'Database Commands Guide', 'How to use database commands in the chat interface', 'documentation', '{\"tags\": [\"database\", \"chat\", \"commands\"]}', NOW())"

# Add a relationship between entities
/sql "INSERT INTO relationships (id, source_id, target_id, relationship_type, created_at) VALUES (gen_random_uuid(), (SELECT id FROM workflows LIMIT 1), (SELECT id FROM opportunities LIMIT 1), 'supports', NOW())"
```

### 🔍 Advanced Query Examples

#### Complex Analytics
```bash
# Monthly workflow creation trend
/sql "SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as workflows_created FROM workflows WHERE created_at > NOW() - INTERVAL '6 months' GROUP BY month ORDER BY month"

# Task completion rate by workflow
/db-query "SELECT w.name as workflow_name, COUNT(t.id) as total_tasks, COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks, ROUND(COUNT(CASE WHEN t.status = 'completed' THEN 1 END) * 100.0 / COUNT(t.id), 2) as completion_rate FROM workflows w LEFT JOIN tasks t ON w.id = t.workflow_id GROUP BY w.id, w.name HAVING COUNT(t.id) > 0 ORDER BY completion_rate DESC"

# Find connected opportunities and workflows
/sql "SELECT o.title as opportunity, w.name as workflow, r.relationship_type FROM opportunities o JOIN relationships r ON o.id = r.source_id JOIN workflows w ON w.id = r.target_id ORDER BY o.created_at DESC"
```

#### Data Cleanup and Maintenance
```bash
# Find duplicate opportunities by title
/sql "SELECT title, COUNT(*) as duplicates FROM opportunities GROUP BY title HAVING COUNT(*) > 1"

# Identify orphaned tasks (tasks without workflows)
/db-query "SELECT t.id, t.title FROM tasks t LEFT JOIN workflows w ON t.workflow_id = w.id WHERE w.id IS NULL"

# Check for empty or null descriptions
/sql "SELECT 'workflows' as table_name, COUNT(*) as empty_descriptions FROM workflows WHERE description IS NULL OR description = '' UNION ALL SELECT 'opportunities' as table_name, COUNT(*) as empty_descriptions FROM opportunities WHERE description IS NULL OR description = ''"
```

### 📈 Reporting Examples

#### Performance Metrics
```bash
# Database size and table statistics
/sql "SELECT schemaname, tablename, attname, n_distinct, correlation FROM pg_stats WHERE schemaname = 'public' ORDER BY tablename, attname"

# Most active tables by row count
/db-query "SELECT schemaname, tablename, n_tup_ins as inserts, n_tup_upd as updates, n_tup_del as deletes FROM pg_stat_user_tables ORDER BY (n_tup_ins + n_tup_upd + n_tup_del) DESC"
```

#### Business Intelligence
```bash
# Opportunity value by status
/sql "SELECT status, COUNT(*) as count, AVG(estimated_value) as avg_value, SUM(estimated_value) as total_value FROM opportunities WHERE estimated_value IS NOT NULL GROUP BY status ORDER BY total_value DESC"

# Workflow complexity analysis (by task count)
/db-query "SELECT CASE WHEN task_count = 0 THEN 'Empty' WHEN task_count <= 3 THEN 'Simple' WHEN task_count <= 10 THEN 'Medium' ELSE 'Complex' END as complexity, COUNT(*) as workflow_count FROM (SELECT w.id, COUNT(t.id) as task_count FROM workflows w LEFT JOIN tasks t ON w.id = t.workflow_id GROUP BY w.id) as workflow_stats GROUP BY complexity ORDER BY workflow_count DESC"
```

### 🛡️ Security Notes

1. **Read-Only Operations**: For safety, use SELECT queries when exploring data
2. **Safe Mode**: INSERT/UPDATE/DELETE operations require safe_mode: false
3. **Data Validation**: Always validate data before insertion
4. **Backup First**: Consider backing up important data before modifications

### 🚀 Getting Started

1. **Start Simple**: Begin with basic SELECT queries to explore your data
2. **Use LIMIT**: Always use LIMIT clause when exploring large tables
3. **Check Schema**: Use information_schema queries to understand table structure
4. **Test Safely**: Use SELECT queries to preview before making changes

### 📚 Useful PostgreSQL Functions

```bash
# Current timestamp
/sql "SELECT NOW(), CURRENT_DATE, CURRENT_TIME"

# String operations
/db-query "SELECT UPPER('hello'), LOWER('WORLD'), LENGTH('PostgreSQL')"

# JSON operations (if you have JSON columns)
/sql "SELECT data->'metadata'->>'author' as author FROM workflows WHERE data ? 'metadata'"

# UUID generation
/db-query "SELECT gen_random_uuid() as new_id"
```

## Error Handling

If you encounter errors:
- Check your SQL syntax
- Ensure table and column names are correct
- Verify you have necessary permissions
- Use `/help sql` for more examples
- Check the database logs for detailed error information

## Rate Limits

- **10 queries per 15 minutes** per IP address
- Rate limits reset automatically
- Use queries efficiently to stay within limits
- Complex reports may require multiple optimized queries

For more information about the database schema, use:
```bash
/sql "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
```