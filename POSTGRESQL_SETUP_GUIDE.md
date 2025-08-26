# PostgreSQL + pgvector Setup Guide

This guide explains how to set up the PostgreSQL backend for the UI Process application.

## Phase 1 Implementation Status ✅

The following components have been successfully implemented:

### ✅ Database Schema & Migrations
- **Complete schema**: All tables from the integration plan implemented
- **Migrations**: Automated migration system with SQL files
- **Indexes**: Optimized indexes for performance and vector search
- **Extensions**: pgvector and uuid-ossp extension support

### ✅ API Server Architecture  
- **Express.js server** with WebSocket support
- **Authentication**: JWT-based auth with refresh tokens
- **Rate limiting**: Configurable rate limits for different endpoints
- **Error handling**: Comprehensive error handling and validation
- **Middleware**: Auth, rate limiting, CORS, security headers

### ✅ Core API Routes
- **Workflows**: Full CRUD with import/export functionality
- **Opportunities**: Business opportunity management
- **Nodes**: Workflow node operations
- **Tasks**: Task management with tag support
- **Search**: Text search with vector search placeholder
- **Auth**: Complete authentication system

### ✅ Real-time Features
- **WebSocket server**: Real-time updates for collaborative editing
- **Broadcasting**: Event-driven updates for workflow changes
- **Connection management**: Proper connection handling and cleanup

## Quick Development Setup

Since PostgreSQL installation requires system-level permissions, here are the setup options:

### Option 1: Local PostgreSQL Installation

If you have admin access:

```bash
# Run the setup script
./scripts/setup-postgres.sh

# Install API dependencies
cd api && npm install

# Setup database
npm run db:setup && npm run db:migrate

# Start development server
npm run dev
```

### Option 2: Docker Setup (Recommended for Development)

Create a `docker-compose.yml` file:

```yaml
version: '3.8'
services:
  postgres:
    image: pgvector/pgvector:pg15
    environment:
      POSTGRES_DB: ui_process_dev
      POSTGRES_USER: ui_process_user
      POSTGRES_PASSWORD: ui_process_dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/migrations:/docker-entrypoint-initdb.d/

volumes:
  postgres_data:
```

Then run:

```bash
# Start PostgreSQL with pgvector
docker-compose up -d

# Install API dependencies  
cd api && npm install

# Run migrations
npm run db:migrate

# Start API server
npm run dev
```

### Option 3: Development with Mock Data

For immediate testing without PostgreSQL:

```bash
cd api
npm install

# Set environment variable to use mock data
echo "USE_MOCK_DATA=true" >> .env

# Start server (will use in-memory data)
npm run dev
```

## Testing the Implementation

Once the API server is running, you can test it:

```bash
# Health check
curl http://localhost:3001/health

# API info
curl http://localhost:3001/api/v1

# Test workflow creation (with auth disabled in dev)
curl -X POST http://localhost:3001/api/v1/workflows \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Workflow", "description": "Development test"}'
```

## Integration with Frontend

The API is designed to be a drop-in replacement for the current frontend localStorage system:

1. **Same Data Schema**: Uses the same workflow JSON format
2. **Import/Export**: Can import existing workflow files
3. **Real-time Updates**: WebSocket integration for live collaboration
4. **Backward Compatibility**: Supports both v1.1 and v2.0.0 workflow formats

## Next Implementation Phases

### Phase 2: Frontend Integration
- Sync service between frontend and API
- Real-time WebSocket connection
- Conflict resolution for concurrent edits

### Phase 3: Vector Search
- OpenAI embeddings integration
- Semantic search implementation
- Document chunking pipeline

### Phase 4: RAG Chat Enhancement
- Context-aware chat responses
- Vector similarity search for chat
- Source citation and references

## Architecture Highlights

### Database Design
- **Multi-tenant**: Organization-based data isolation
- **Scalable**: Optimized indexes and query patterns
- **Extensible**: JSONB metadata fields for future features
- **Audit Trail**: Complete change tracking

### API Features
- **RESTful**: Standard REST API with consistent patterns
- **Real-time**: WebSocket support for live updates
- **Secure**: JWT authentication with refresh tokens
- **Performant**: Connection pooling and query optimization

### Development Experience
- **Hot Reload**: Development server with automatic reloading
- **Error Handling**: Detailed error messages and logging
- **Validation**: Input validation with Joi schemas
- **Documentation**: Comprehensive API documentation

This implementation provides a solid foundation for the advanced workflow management system described in the PostgreSQL integration plan.