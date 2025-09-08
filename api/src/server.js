/**
 * UI Process API Server
 * Main server file for the PostgreSQL + pgvector backend
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

import { testConnection, closePool } from './config/database.js';
import { authMiddleware } from './middleware/auth.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route imports
import authRoutes from './routes/auth.js';
import workflowRoutes from './routes/workflows.js';
import opportunityRoutes from './routes/opportunities.js';
import nodeRoutes from './routes/nodes.js';
import flowlineRoutes from './routes/flowlines.js';
import taskRoutes from './routes/tasks.js';
import searchRoutes from './routes/search.js';
import chatRoutes from './routes/chat.js';
import relationshipRoutes from './routes/relationships.js';
import knowledgeGraphRoutes from './routes/knowledge-graph.js';
import databaseRoutes from './routes/database.js';
import debugRoutes from './routes/debug.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ===== MIDDLEWARE SETUP =====

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Allow WebSocket connections
    crossOriginEmbedderPolicy: false
}));

// CORS configuration - permissive for development
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        // Allow any localhost origin
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
        }
        
        // Allow file:// origins (for local development)
        if (origin.startsWith('file://')) {
            return callback(null, true);
        }
        
        callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    optionsSuccessStatus: 200,
    preflightContinue: false
}));

// Additional CORS headers middleware for extra compatibility
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }
    
    next();
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Compression
app.use(compression());

// Request logging
if (NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Rate limiting (applied globally)
app.use(rateLimiter);

// ===== ROUTES =====

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const dbStatus = await testConnection();
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            database: dbStatus ? 'connected' : 'disconnected',
            environment: NODE_ENV
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Health check failed',
            error: error.message
        });
    }
});

// API version endpoint
app.get('/api/v1', (req, res) => {
    res.json({
        message: 'UI Process API v1',
        version: '1.0.0',
        documentation: '/api/v1/docs',
        endpoints: {
            auth: '/api/v1/auth',
            workflows: '/api/v1/workflows',
            opportunities: '/api/v1/opportunities',
            nodes: '/api/v1/nodes',
            flowlines: '/api/v1/flowlines',
            tasks: '/api/v1/tasks',
            search: '/api/v1/search',
            chat: '/api/v1/chat',
            relationships: '/api/v1/relationships'
        }
    });
});

// Authentication routes (public)
app.use('/api/v1/auth', authRoutes);

// Protected routes (require authentication)
if (process.env.DEV_DISABLE_AUTH !== 'true') {
    app.use('/api/v1', authMiddleware);
} else {
    // Add a mock user for development when auth is disabled
    app.use('/api/v1', (req, res, next) => {
        req.user = {
            id: '1eb186ae-99e9-4acb-a13d-1c09fa80a58d',
            email: 'dev@uiprocess.local',
            name: 'Development User',
            role: 'admin',
            organization_id: '665be64b-26a8-46e2-83b5-75341ef5099b'
        };
        next();
    });
}

// API routes
app.use('/api/v1/workflows', workflowRoutes);
app.use('/api/v1/opportunities', opportunityRoutes);
app.use('/api/v1/nodes', nodeRoutes);
app.use('/api/v1/flowlines', flowlineRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/relationships', relationshipRoutes);
app.use('/api/v1/kg', knowledgeGraphRoutes);
app.use('/api/v1/db', databaseRoutes);
app.use('/api/v1/debug', debugRoutes);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        availableEndpoints: [
            'GET /health',
            'GET /api/v1',
            'POST /api/v1/auth/login',
            'GET /api/v1/workflows',
            'GET /api/v1/opportunities',
            'GET /api/v1/search/semantic'
        ]
    });
});

// Global error handler
app.use(errorHandler);

// ===== WEBSOCKET SETUP =====

const server = createServer(app);
const wss = new WebSocketServer({ server });

// WebSocket connection handling
wss.on('connection', (ws, req) => {
    console.log('🔌 WebSocket client connected');
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('📨 WebSocket message received:', data.type);
            
            // Handle different message types
            switch (data.type) {
                case 'subscribe':
                    // Subscribe to workflow updates
                    ws.workflowId = data.workflowId;
                    ws.send(JSON.stringify({
                        type: 'subscribed',
                        workflowId: data.workflowId,
                        message: 'Subscribed to workflow updates'
                    }));
                    break;
                    
                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong' }));
                    break;
                    
                default:
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: `Unknown message type: ${data.type}`
                    }));
            }
        } catch (error) {
            console.error('WebSocket message error:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid JSON message'
            }));
        }
    });
    
    ws.on('close', () => {
        console.log('🔌 WebSocket client disconnected');
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// Broadcast function for real-time updates
export function broadcast(workflowId, data) {
    wss.clients.forEach((client) => {
        if (client.readyState === 1 && client.workflowId === workflowId) { // OPEN state
            client.send(JSON.stringify(data));
        }
    });
}

// Make broadcast available globally
app.locals.broadcast = broadcast;

// ===== DEFAULT WORKFLOW SETUP =====

async function ensureDefaultWorkflow() {
    try {
        console.log('🔍 Checking for default workflow...');
        
        // Import query function from database config
        const { query } = await import('./config/database.js');
        
        // Check if any workflows exist
        const existingWorkflows = await query('SELECT COUNT(*) as count FROM workflows');
        const workflowCount = parseInt(existingWorkflows.rows[0].count);
        
        if (workflowCount === 0) {
            console.log('📝 Creating default workflow...');
            
            // Get or create default organization
            let defaultOrganization;
            const existingOrgs = await query('SELECT * FROM organizations LIMIT 1');
            
            if (existingOrgs.rows.length === 0) {
                console.log('🏢 Creating default organization...');
                const orgResult = await query(
                    'INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING *',
                    ['Default Organization', 'default']
                );
                defaultOrganization = orgResult.rows[0];
            } else {
                defaultOrganization = existingOrgs.rows[0];
            }
            
            // Create default workflow
            const workflowResult = await query(`
                INSERT INTO workflows (organization_id, name, description, version, metadata)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `, [
                defaultOrganization.id,
                'Default Workflow',
                'Default workflow created automatically for the UI Process Designer',
                '1.0.0',
                JSON.stringify({ 
                    auto_created: true, 
                    created_at: new Date().toISOString(),
                    purpose: 'Default workflow for node and task creation'
                })
            ]);
            
            const defaultWorkflow = workflowResult.rows[0];
            console.log(`✅ Default workflow created: ${defaultWorkflow.id}`);
            console.log(`   Name: ${defaultWorkflow.name}`);
            console.log(`   Organization: ${defaultOrganization.name}`);
            
        } else {
            console.log(`✅ Found ${workflowCount} existing workflow(s)`);
        }
        
    } catch (error) {
        console.error('❌ Failed to ensure default workflow:', error);
        console.error('   This may cause issues with node creation');
    }
}

// ===== SERVER STARTUP =====

async function startServer() {
    try {
        console.log('🚀 Starting UI Process API Server...');
        console.log(`📦 Environment: ${NODE_ENV}`);
        console.log(`🔧 Port: ${PORT}`);
        
        // Test database connection
        const dbConnected = await testConnection();
        if (!dbConnected) {
            console.error('❌ Database connection failed. Please check your configuration.');
            process.exit(1);
        }

        // Ensure default workflow exists
        await ensureDefaultWorkflow();
        
        // Start the server
        server.listen(PORT, () => {
            console.log('✅ Server started successfully!');
            console.log(`🌐 HTTP Server: http://localhost:${PORT}`);
            console.log(`🔌 WebSocket Server: ws://localhost:${PORT}`);
            console.log(`📚 API Documentation: http://localhost:${PORT}/api/v1`);
            console.log(`🩺 Health Check: http://localhost:${PORT}/health`);
            
            if (NODE_ENV === 'development') {
                console.log('🔧 Development mode active');
                if (process.env.DEV_DISABLE_AUTH === 'true') {
                    console.log('⚠️  Authentication disabled for development');
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Server startup failed:', error);
        process.exit(1);
    }
}

// ===== GRACEFUL SHUTDOWN =====

async function gracefulShutdown(signal) {
    console.log(`\n📤 Received ${signal}. Starting graceful shutdown...`);
    
    try {
        // Close WebSocket connections
        wss.clients.forEach((client) => {
            client.close();
        });
        
        // Close HTTP server
        server.close(() => {
            console.log('✅ HTTP server closed');
        });
        
        // Close database connection
        await closePool();
        
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start the server
startServer();