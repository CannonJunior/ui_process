/**
 * Database Configuration
 * Manages PostgreSQL connection with pgvector support, with mock fallback
 */

import dotenv from 'dotenv';

dotenv.config();

// Check if we should use mock database
const USE_MOCK_DATA = process.env.USE_MOCK_DATA === 'true' || process.env.NODE_ENV === 'test';

let dbModule;

if (USE_MOCK_DATA) {
    console.log('🔧 Using mock database for development');
    dbModule = await import('./mockDatabase.js');
} else {
    // Real PostgreSQL implementation
    const pg = await import('pg');
    const { Pool } = pg.default;

    // Database configuration
    const dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || 'ui_process_dev',
        user: process.env.DB_USER || 'ui_process_user',
        password: process.env.DB_PASSWORD || 'ui_process_dev_password',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    };

    // Create connection pool
    const pool = new Pool(dbConfig);

    // Handle pool errors
    pool.on('error', (err, client) => {
        console.error('Unexpected error on idle client', err);
        process.exit(-1);
    });

    // Test database connection
    async function testConnection() {
        try {
            const client = await pool.connect();
            const result = await client.query('SELECT version(), current_database()');
            console.log('✅ Database connected successfully:');
            console.log(`   Version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
            console.log(`   Database: ${result.rows[0].current_database}`);
            
            try {
                await client.query('SELECT vector_dims(\'[1,2,3]\'::vector)');
                console.log('✅ pgvector extension is available');
            } catch (err) {
                console.warn('⚠️  pgvector extension not available:', err.message);
            }
            
            client.release();
            return true;
        } catch (err) {
            console.error('❌ Database connection failed:', err.message);
            return false;
        }
    }

    // Execute query with error handling
    async function query(text, params) {
        const start = Date.now();
        try {
            const result = await pool.query(text, params);
            const duration = Date.now() - start;
            
            if (process.env.LOG_LEVEL === 'debug') {
                console.log('Query executed:', { text, duration, rows: result.rowCount });
            }
            
            return result;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }

    // Get a client from the pool (for transactions)
    async function getClient() {
        return pool.connect();
    }

    // Execute queries within a transaction
    async function transaction(callback) {
        const client = await getClient();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // Graceful shutdown
    async function closePool() {
        console.log('🔄 Closing database connection pool...');
        await pool.end();
        console.log('✅ Database connection pool closed');
    }

    // Vector operations utilities
    const vectorOps = {
        createVector: (array) => `[${array.join(',')}]`,
        
        cosineSimilarity: async (vector1, vector2) => {
            const result = await query(
                'SELECT ($1::vector <=> $2::vector) as distance',
                [vector1, vector2]
            );
            return 1 - result.rows[0].distance;
        },
        
        findSimilar: async (tableName, vectorColumn, queryVector, limit = 10, threshold = 0.7) => {
            const similarityThreshold = 1 - threshold;
            const result = await query(`
                SELECT *, (${vectorColumn} <=> $1::vector) as distance,
                       (1 - (${vectorColumn} <=> $1::vector)) as similarity
                FROM ${tableName} 
                WHERE ${vectorColumn} <=> $1::vector < $2
                ORDER BY ${vectorColumn} <=> $1::vector
                LIMIT $3
            `, [queryVector, similarityThreshold, limit]);
            
            return result.rows;
        }
    };

    dbModule = {
        query,
        transaction,
        testConnection,
        getClient,
        closePool,
        vectorOps,
        dbConfig,
        pool,
        default: pool
    };
}

// Export all functions
export const { query, transaction, testConnection, getClient, closePool, vectorOps } = dbModule;
export const dbConfig = dbModule.dbConfig || { mock: true };
export default dbModule.default;