/**
 * Knowledge Graph Setup
 * Creates KG tables in the existing ui_process_dev database
 */

import { query } from './src/config/database.js';
import fs from 'fs';
import path from 'path';

async function setupKnowledgeGraph() {
    try {
        console.log('🧠 Setting up Knowledge Graph tables...');
        
        // Run the knowledge graph migration
        const migrationPath = path.join(process.cwd(), 'src/database/migrations/005-knowledge-graph.sql');
        console.log('📁 Reading migration file:', migrationPath);
        
        const migration = fs.readFileSync(migrationPath, 'utf8');
        console.log('🔧 Executing migration...');
        
        await query(migration);
        console.log('✅ Knowledge graph schema created');
        
        // Insert sample data
        console.log('📝 Inserting sample knowledge graph data...');
        const sampleDataPath = path.join(process.cwd(), 'src/database/seeds/knowledge-graph-sample.sql');
        const sampleData = fs.readFileSync(sampleDataPath, 'utf8');
        
        await query(sampleData);
        console.log('✅ Sample data inserted');
        
        // Test queries
        console.log('🧪 Testing knowledge graph queries...');
        
        // Test entity query
        const entityResult = await query('SELECT COUNT(*) as count FROM kg_entities');
        console.log(`   Entities: ${entityResult.rows[0].count}`);
        
        // Test relationship query
        const relResult = await query('SELECT COUNT(*) as count FROM kg_relationships');
        console.log(`   Relationships: ${relResult.rows[0].count}`);
        
        console.log('✅ Knowledge Graph setup completed successfully!');
        
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        console.error('Full error:', error);
        process.exit(1);
    }
}

setupKnowledgeGraph();