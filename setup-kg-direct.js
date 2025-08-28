/**
 * Direct Knowledge Graph Setup
 * Sets up PostgreSQL database with knowledge graph schema and sample data
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

// Database configuration - using the existing Docker PostgreSQL
const dbConfig = {
    host: 'localhost',
    port: 5432,
    database: 'postgres', // Use default postgres database
    user: 'postgres',
    password: 'password',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

console.log('🧠 Setting up Knowledge Graph Database...');
console.log(`🔧 Connecting to: postgresql://${dbConfig.user}:***@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

const pool = new Pool(dbConfig);

async function setupKnowledgeGraph() {
    try {
        // Test connection
        console.log('🔍 Testing database connection...');
        const client = await pool.connect();
        
        const result = await client.query('SELECT version(), current_database()');
        console.log('✅ Database connected successfully:');
        console.log(`   Version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
        console.log(`   Database: ${result.rows[0].current_database}`);
        
        // Test pgvector extension
        try {
            await client.query("CREATE EXTENSION IF NOT EXISTS vector");
            await client.query("SELECT vector_dims('[1,2,3]'::vector)");
            console.log('✅ pgvector extension is available');
        } catch (err) {
            console.warn('⚠️  pgvector extension error:', err.message);
        }
        
        // Create ui_process database if it doesn't exist
        try {
            await client.query('CREATE DATABASE ui_process');
            console.log('✅ Created ui_process database');
        } catch (err) {
            if (err.code === '42P04') {
                console.log('ℹ️  ui_process database already exists');
            } else {
                console.warn('⚠️  Database creation warning:', err.message);
            }
        }
        
        client.release();
        
        // Connect to ui_process database
        const uiProcessPool = new Pool({
            ...dbConfig,
            database: 'ui_process'
        });
        
        const uiClient = await uiProcessPool.connect();
        
        // Create extensions
        console.log('🔧 Setting up extensions...');
        await uiClient.query('CREATE EXTENSION IF NOT EXISTS vector');
        await uiClient.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
        
        // Run knowledge graph migration
        console.log('🧠 Creating knowledge graph schema...');
        const migrationPath = path.join(process.cwd(), 'api/src/database/migrations/005-knowledge-graph.sql');
        const migration = fs.readFileSync(migrationPath, 'utf8');
        await uiClient.query(migration);
        console.log('✅ Knowledge graph schema created');
        
        // Insert sample data
        console.log('📝 Inserting sample knowledge graph data...');
        const sampleDataPath = path.join(process.cwd(), 'api/src/database/seeds/knowledge-graph-sample.sql');
        const sampleData = fs.readFileSync(sampleDataPath, 'utf8');
        await uiClient.query(sampleData);
        console.log('✅ Sample data inserted');
        
        // Test queries
        console.log('🧪 Testing knowledge graph queries...');
        
        // Test entity query
        const entityResult = await uiClient.query(
            'SELECT COUNT(*) as count FROM kg_entities'
        );
        console.log(`   Entities: ${entityResult.rows[0].count}`);
        
        // Test relationship query
        const relResult = await uiClient.query(
            'SELECT COUNT(*) as count FROM kg_relationships'
        );
        console.log(`   Relationships: ${relResult.rows[0].count}`);
        
        // Test sample query
        const testQuery = await uiClient.query(`
            SELECT e.name, et.name as type, e.description
            FROM kg_entities e
            JOIN entity_types et ON e.entity_type_id = et.id
            WHERE e.name ILIKE '%alice%'
            LIMIT 3
        `);
        
        console.log('   Sample entities:');
        testQuery.rows.forEach(row => {
            console.log(`     • ${row.name} (${row.type}): ${row.description}`);
        });
        
        uiClient.release();
        await uiProcessPool.end();
        
        console.log('');
        console.log('✅ Knowledge Graph setup completed successfully!');
        console.log('');
        console.log('🧪 Next steps:');
        console.log('1. Start the API server:     cd api && npm start');
        console.log('2. Start the web server:     python3 -m http.server 8000');
        console.log('3. Test KG functionality:    http://localhost:8000/test-knowledge-graph.html');
        console.log('');
        
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    }
}

setupKnowledgeGraph().finally(() => {
    pool.end();
});