/**
 * Database Migration Runner
 * Executes SQL migration files in order
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { testConnection, query } from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
    console.log('🗃️  Running database migrations...');

    try {
        // Test connection first
        const connected = await testConnection();
        if (!connected) {
            console.error('❌ Database connection failed');
            process.exit(1);
        }

        // Get migration files
        const migrationsDir = path.join(__dirname, '../../database/migrations');
        const migrationFiles = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort();

        console.log(`📂 Found ${migrationFiles.length} migration files`);

        // Run each migration
        for (const file of migrationFiles) {
            console.log(`📄 Running migration: ${file}`);
            
            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8');
            
            try {
                await query(sql);
                console.log(`✅ Migration completed: ${file}`);
            } catch (error) {
                console.error(`❌ Migration failed: ${file}`);
                console.error('Error:', error.message);
                process.exit(1);
            }
        }

        console.log('🎉 All migrations completed successfully!');
        
        // Test some basic queries
        console.log('🧪 Testing database structure...');
        
        const tables = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        console.log(`✅ Created ${tables.rows.length} tables:`);
        tables.rows.forEach(row => console.log(`   - ${row.table_name}`));
        
        // Check extensions
        const extensions = await query(`
            SELECT extname 
            FROM pg_extension 
            WHERE extname IN ('uuid-ossp', 'vector')
        `);
        
        console.log(`✅ Extensions installed: ${extensions.rows.map(r => r.extname).join(', ')}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigrations();