/**
 * Database Query API Routes
 * Handles direct PostgreSQL queries from the chat interface
 */

import express from 'express';
import rateLimit from 'express-rate-limit';

import { query } from '../config/database.js';

const router = express.Router();

// Rate limiting for database queries - stricter limits for security
const queryRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Max 10 queries per 15 minutes per IP
    message: {
        error: 'Too many database queries. Please wait before trying again.',
        retryAfter: '15 minutes'
    }
});

/**
 * POST /api/v1/db/query
 * Execute a direct PostgreSQL query
 */
router.post('/query', queryRateLimit, async (req, res) => {
    try {
        const { query: sqlQuery, safe_mode = true } = req.body;

        if (!sqlQuery) {
            return res.status(400).json({
                error: 'SQL query is required',
                message: 'Please provide a query in the request body'
            });
        }

        // Basic validation for safety
        const queryLower = sqlQuery.toLowerCase().trim();
        
        // In safe mode, only allow SELECT statements and basic operations
        if (safe_mode) {
            const allowedOperations = [
                'select', 'with', '(', 'values'
            ];
            
            const isAllowed = allowedOperations.some(op => queryLower.startsWith(op));
            
            if (!isAllowed) {
                return res.status(403).json({
                    error: 'Query not allowed in safe mode',
                    message: 'Only SELECT queries are allowed in safe mode. Use safe_mode: false to allow other operations (not recommended).',
                    allowedOperations: allowedOperations
                });
            }
        }

        // Additional security checks - block dangerous operations
        const dangerousOperations = [
            'drop database', 'drop schema', 'drop user', 'create user',
            'alter user', 'grant', 'revoke'
        ];
        
        const isDangerous = dangerousOperations.some(op => queryLower.includes(op));
        
        if (isDangerous) {
            return res.status(403).json({
                error: 'Dangerous operation detected',
                message: 'This operation is not allowed for security reasons',
                query: sqlQuery
            });
        }

        // Execute the query
        console.log(`🔍 Executing database query: ${sqlQuery.substring(0, 100)}${sqlQuery.length > 100 ? '...' : ''}`);
        
        const startTime = Date.now();
        const result = await query(sqlQuery);
        const executionTime = Date.now() - startTime;

        // Format the response
        const response = {
            query: sqlQuery,
            executionTime: `${executionTime}ms`,
            rowCount: result.rowCount,
            rows: result.rows,
            fields: result.fields?.map(f => ({
                name: f.name,
                dataTypeID: f.dataTypeID
            })) || []
        };

        // Log successful query
        console.log(`✅ Query executed successfully in ${executionTime}ms, returned ${result.rowCount} rows`);

        res.json(response);
        
    } catch (error) {
        console.error('Database query error:', error);
        
        // Return appropriate error based on the type
        if (error.code) {
            // PostgreSQL error
            res.status(400).json({
                error: 'Database query failed',
                message: error.message,
                code: error.code,
                detail: error.detail,
                hint: error.hint,
                position: error.position
            });
        } else {
            // General error
            res.status(500).json({
                error: 'Internal server error',
                message: error.message
            });
        }
    }
});

/**
 * GET /api/v1/db/schema
 * Get database schema information
 */
router.get('/schema', async (req, res) => {
    try {
        const schemaQuery = `
            SELECT 
                table_schema,
                table_name,
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns
            WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
            ORDER BY table_schema, table_name, ordinal_position
        `;

        const result = await query(schemaQuery);
        
        // Group by schema and table
        const schema = {};
        
        for (const row of result.rows) {
            const { table_schema, table_name, column_name, data_type, is_nullable, column_default } = row;
            
            if (!schema[table_schema]) {
                schema[table_schema] = {};
            }
            
            if (!schema[table_schema][table_name]) {
                schema[table_schema][table_name] = [];
            }
            
            schema[table_schema][table_name].push({
                column: column_name,
                type: data_type,
                nullable: is_nullable === 'YES',
                default: column_default
            });
        }

        res.json({
            schema: schema,
            tableCount: Object.values(schema).reduce((acc, tables) => acc + Object.keys(tables).length, 0),
            columnCount: result.rows.length
        });
        
    } catch (error) {
        console.error('Schema query error:', error);
        res.status(500).json({
            error: 'Failed to retrieve schema',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/db/tables
 * Get list of all tables
 */
router.get('/tables', async (req, res) => {
    try {
        const tablesQuery = `
            SELECT 
                table_schema,
                table_name,
                table_type
            FROM information_schema.tables
            WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
            ORDER BY table_schema, table_name
        `;

        const result = await query(tablesQuery);

        res.json({
            tables: result.rows,
            count: result.rows.length
        });
        
    } catch (error) {
        console.error('Tables query error:', error);
        res.status(500).json({
            error: 'Failed to retrieve tables',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/db/connection
 * Get database connection information
 */
router.get('/connection', async (req, res) => {
    try {
        // Get database connection info
        const connectionQuery = `
            SELECT 
                current_database() as database_name,
                current_user as username,
                inet_server_addr() as server_host,
                inet_server_port() as server_port,
                version() as version
        `;

        const result = await query(connectionQuery);
        const connectionInfo = result.rows[0];

        // Get environment info (safely)
        const host = process.env.DB_HOST || 'localhost';
        const port = process.env.DB_PORT || '5432';
        const database = process.env.DB_NAME || connectionInfo.database_name;

        res.json({
            connection: {
                host: host,
                port: port,
                database: database,
                username: connectionInfo.username,
                server_host: connectionInfo.server_host,
                server_port: connectionInfo.server_port,
                version: connectionInfo.version,
                url: `postgresql://${connectionInfo.username}@${host}:${port}/${database}`
            },
            api_endpoint: `http://localhost:${process.env.PORT || 3001}/api/v1/db`,
            status: 'connected'
        });
        
    } catch (error) {
        console.error('Connection info query error:', error);
        res.status(500).json({
            error: 'Failed to retrieve connection information',
            message: error.message,
            status: 'error'
        });
    }
});

export default router;