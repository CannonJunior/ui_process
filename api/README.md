# UI Process API

PostgreSQL + pgvector backend API for the UI Process application.

## Quick Start

### 1. Install PostgreSQL and pgvector

```bash
# Run the automated setup script
cd ..
chmod +x scripts/setup-postgres.sh
./scripts/setup-postgres.sh
```

### 2. Install Dependencies

```bash
cd api
npm install
```

### 3. Setup Database

```bash
# Create database and user
npm run db:setup

# Run migrations
npm run db:migrate
```

### 4. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3001`

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Login with email/password
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user info

### Workflows
- `GET /api/v1/workflows` - List workflows
- `POST /api/v1/workflows` - Create workflow
- `GET /api/v1/workflows/:id` - Get workflow with all data
- `PUT /api/v1/workflows/:id` - Update workflow
- `DELETE /api/v1/workflows/:id` - Delete workflow
- `POST /api/v1/workflows/import` - Import workflow from JSON
- `GET /api/v1/workflows/:id/export` - Export workflow to JSON

### Other Endpoints
- `GET /health` - Health check
- `GET /api/v1` - API info
- WebSocket at `ws://localhost:3001` for real-time updates

## Environment Variables

Copy `.env.example` to `.env` and adjust values as needed.

Key settings:
- `DEV_DISABLE_AUTH=true` - Disable authentication for development
- `PORT=3001` - API server port
- Database connection settings

## Development

```bash
# Start with auto-reload
npm run dev

# Run tests (when available)
npm test

# Check code style
npm run lint
```

## Database Schema

The database implements the full schema from `docs/postgresql-integration-plan.md`:

- **Core Tables**: organizations, users, workflows, nodes, tasks, opportunities
- **Relationships**: entity_relationships, task_tags
- **RAG/Chat**: document_chunks, chat_conversations, chat_messages
- **Audit**: audit_log

Vector search capabilities provided by pgvector extension.

## Next Steps

1. **Phase 2**: Implement frontend sync service
2. **Phase 3**: Add vector search with embeddings
3. **Phase 4**: RAG chat integration
4. **Phase 5**: Advanced relationship tracking