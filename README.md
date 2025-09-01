# Process Flow Designer

A web-based process flow designer with Eisenhower Matrix task management, featuring D3-powered animations and comprehensive workflow tools.

## ✨ Features

- **Interactive Process Flow Design**: Create nodes (process, decision, terminal) with drag-and-drop functionality
- **Advanced Task Management**: Create, manage, and organize tasks with tag-based categorization
- **Eisenhower Matrix**: Dynamic 4-quadrant visualization for task prioritization with smooth D3 transitions
- **Tag System**: Flexible tagging with urgency, importance, stage, and custom categories
- **Save/Load Workflows**: Export and import complete workflow configurations
- **Real-time Chat Assistant**: AI-powered process flow guidance (requires Ollama)
- **Responsive Design**: Works on desktop and mobile devices

## 🚀 Quick Start

### Prerequisites

- **Node.js** (version 14.0.0 or higher)
- **Python 3.10+** (for MCP note-taking servers)
- **Git** (for nb note-taking CLI)
- **PostgreSQL** (optional, for persistent workflow storage) - see [PostgreSQL Setup](#postgresql-setup) below
- **Ollama** (optional, for AI chat assistant) - see [Ollama Installation](#ollama-installation) below
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation & Running

1. **Clone or download the project files**
2. **Navigate to the project directory**
   ```bash
   cd ui_process
   ```

3. **Install Node.js dependencies**
   ```bash
   npm install
   ```

4. **Set up Python environment** (for MCP note-taking servers)
   ```bash
   python3 -m venv venv_linux
   source venv_linux/bin/activate
   # MCP servers use built-in Python libraries only
   ```

5. **Install nb CLI** (for note-taking features)
   ```bash
   npm run install-nb
   # Or manually: curl -L https://raw.github.com/xwmx/nb/master/nb --create-dirs -o ~/.local/bin/nb && chmod +x ~/.local/bin/nb
   ```

6. **Start the application** (automatically starts both services)
   ```bash
   npm start
   ```
   
   This will start:
   - Main server on http://localhost:8000
   - MCP service on http://localhost:3001 (for workflow commands)
   
   **Alternative startup options:**
   ```bash
   # Start server only (limited functionality)
   npm run start:simple
   
   # Manual startup (separate terminals)
   npm run start:manual
   
   # Development mode with auto-reload
   npm run dev
   ```

7. **Open your browser**
   - The application will automatically open at http://localhost:8000
   - Check the health indicators (⚡🤖) in the top-right toolbar
   
8. **Verify services are running**
   - ⚡ **MCP** should show green (workflow commands available)
   - 🤖 **AI** shows green if Ollama is running (optional)
   - Click indicators for detailed status and troubleshooting

### Alternative Port

To use a different port:
```bash
PORT=8080 npm start
```

## 🤖 Ollama Installation

Ollama enables the AI chat assistant for intelligent workflow guidance. Installation is optional but recommended for the full experience.

### Install Ollama

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**macOS:**
```bash
# Using Homebrew
brew install ollama

# Or download from https://ollama.com/download
```

**Windows:**
```bash
# Download installer from https://ollama.com/download
# Or using winget
winget install Ollama.Ollama
```

### Setup and Start Ollama

1. **Start the Ollama service:**
   ```bash
   ollama serve
   ```

2. **Pull a recommended model** (in a new terminal):
   ```bash
   # Lightweight model (recommended for local development)
   ollama pull qwen2.5:3b
   
   # Alternative models:
   ollama pull llama3.2:3b    # Meta's Llama 3.2
   ollama pull mistral:7b     # Larger, more capable model
   ollama pull codellama:7b   # Specialized for code assistance
   ```

3. **Verify installation:**
   ```bash
   ollama list
   ollama run qwen2.5:3b "Hello, how can you help with process flows?"
   ```

### Model Recommendations

| Model | Size | Use Case | Memory Required |
|-------|------|----------|----------------|
| `qwen2.5:3b` | ~2GB | General chat, lightweight | 4GB RAM |
| `llama3.2:3b` | ~2GB | General purpose, good quality | 4GB RAM |
| `mistral:7b` | ~4GB | Better reasoning, more capable | 8GB RAM |
| `codellama:7b` | ~4GB | Code-focused assistance | 8GB RAM |

### Configure Model (Optional)

The application uses `qwen2.5:3b` by default. To use a different model:

1. **Edit `chat-interface.js`** and change the model name:
   ```javascript
   model: "llama3.2:3b"  // Change from qwen2.5:3b
   ```

2. **Or set environment variable:**
   ```bash
   OLLAMA_MODEL=mistral:7b npm start
   ```

### Troubleshooting Ollama

**Service not running:**
```bash
# Check if Ollama is running
curl http://localhost:11434/api/version

# If not running, start it
ollama serve
```

**Model not found:**
```bash
# List available models
ollama list

# Pull the required model
ollama pull qwen2.5:3b
```

**Performance issues:**
- Use smaller models (3B parameters) for better performance on limited hardware
- Ensure adequate RAM (at least 4GB free for 3B models)
- Close other resource-intensive applications

**Connection issues:**
- Verify Ollama is running on `localhost:11434`
- Check firewall settings if using custom network configuration
- The 🤖 AI indicator in the toolbar shows connection status

## 🗄️ PostgreSQL Setup

PostgreSQL provides persistent storage for workflows, tasks, and advanced features like vector search and real-time collaboration. The application works without PostgreSQL (using local storage) but the database unlocks additional capabilities.

### Database Features

**With PostgreSQL:**
- ✅ Persistent workflow storage across sessions
- ✅ Real-time collaborative editing via WebSocket
- ✅ Vector search for semantic workflow discovery
- ✅ Advanced querying and analytics
- ✅ Import/export with version control
- ✅ Multi-user support with authentication

**Without PostgreSQL:**
- ✅ Basic workflow creation and management
- ✅ Local browser storage (workflows saved per browser)
- ❌ No collaboration or sharing features
- ❌ Limited search capabilities

### Setup Options

Choose the option that best fits your environment:

#### Option 1: Automated Setup Script (Recommended)

If you have administrator privileges:

```bash
# Run the automated setup script
./scripts/setup-postgres.sh

# The script will:
# - Install PostgreSQL + pgvector extension
# - Create database and user
# - Configure permissions
# - Test the connection
```

#### Option 2: Docker Setup (Development)

Best for development and testing:

**Create `docker-compose.yml`:**
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

**Start the database:**
```bash
# Start PostgreSQL container
docker-compose up -d

# Verify it's running
docker-compose ps

# View logs if needed
docker-compose logs postgres
```

#### Option 3: Manual Installation

**Ubuntu/Debian:**
```bash
# Update packages
sudo apt update

# Install PostgreSQL and extensions
sudo apt install -y postgresql postgresql-contrib postgresql-server-dev-all

# Install pgvector extension
sudo apt install -y build-essential git
cd /tmp
git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS:**
```bash
# Using Homebrew
brew install postgresql@15
brew services start postgresql@15

# Install pgvector
git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
cd pgvector
make
make install
```

**Setup Database:**
```bash
# Create user and database
sudo -u postgres psql -c "CREATE USER ui_process_user WITH PASSWORD 'ui_process_dev_password';"
sudo -u postgres psql -c "ALTER USER ui_process_user CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE ui_process_dev OWNER ui_process_user;"

# Enable extensions
sudo -u postgres psql -d ui_process_dev -c "CREATE EXTENSION IF NOT EXISTS vector;"
sudo -u postgres psql -d ui_process_dev -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

# Grant permissions
sudo -u postgres psql -d ui_process_dev -c "GRANT ALL PRIVILEGES ON DATABASE ui_process_dev TO ui_process_user;"
```

### Start the API Server

Once PostgreSQL is running:

```bash
# Navigate to API directory
cd api

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Run database migrations
npm run db:migrate

# Start the API server
npm run dev

# The API server will start on http://localhost:3001
```

### Verify Database Connection

Test the setup:

```bash
# Health check
curl http://localhost:3001/health

# Database connection test
curl http://localhost:3001/api/v1

# Create a test workflow
curl -X POST http://localhost:3001/api/v1/workflows \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Workflow", "description": "Database test"}'
```

### Configuration

**Database Connection (`api/.env`):**
```env
# PostgreSQL connection
DATABASE_URL=postgresql://ui_process_user:ui_process_dev_password@localhost:5432/ui_process_dev

# Server configuration
PORT=3001
NODE_ENV=development

# Optional: Enable authentication
JWT_SECRET=your-secret-key-here
```

### Development Without PostgreSQL

If you prefer to develop without setting up PostgreSQL:

```bash
cd api
npm install

# Enable mock data mode
echo "USE_MOCK_DATA=true" >> .env

# Start server with in-memory storage
npm run dev
```

### Troubleshooting PostgreSQL

**Service not running:**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql

# For Docker:
docker-compose up postgres
```

**Connection errors:**
```bash
# Test direct connection
PGPASSWORD=ui_process_dev_password psql -h localhost -U ui_process_user -d ui_process_dev -c "SELECT version();"

# Check if port 5432 is open
sudo netstat -tlnp | grep 5432
```

**Permission issues:**
```bash
# Reset user permissions
sudo -u postgres psql -d ui_process_dev -c "GRANT ALL ON SCHEMA public TO ui_process_user;"
sudo -u postgres psql -d ui_process_dev -c "GRANT ALL ON ALL TABLES IN SCHEMA public TO ui_process_user;"
```

**pgvector extension missing:**
```bash
# Verify extension is available
sudo -u postgres psql -c "SELECT * FROM pg_available_extensions WHERE name = 'vector';"

# Create extension manually
sudo -u postgres psql -d ui_process_dev -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### Advanced Features

**Vector Search Setup:**
```bash
# Install additional dependencies for embeddings
cd api
npm install openai @pinecone-database/pinecone

# Enable vector features in .env
echo "ENABLE_VECTOR_SEARCH=true" >> .env
echo "OPENAI_API_KEY=your-key-here" >> .env
```

**Real-time Collaboration:**
```bash
# WebSocket connection test
# Open browser console on http://localhost:8000
const ws = new WebSocket('ws://localhost:3001');
ws.onopen = () => console.log('Connected to WebSocket');
ws.onmessage = (msg) => console.log('Received:', msg.data);
```

For more detailed information, see [POSTGRESQL_SETUP_GUIDE.md](POSTGRESQL_SETUP_GUIDE.md).

## 🎯 Usage Guide

### Basic Workflow

1. **Create Nodes**: Select node type from dropdown and create process elements
2. **Add Tasks**: Click "Add Task" to create task nodes with detailed management
3. **Create Flowlines**: Right-click nodes to create connections between elements
4. **Manage Tags**: Right-click tasks to add urgency, importance, and custom tags
5. **Eisenhower Matrix**: Toggle matrix view to visualize task prioritization
6. **Save/Load**: Export workflows as JSON files for later use

### Eisenhower Matrix

The matrix organizes tasks into 4 quadrants based on tags:
- **Top-Left**: Not Urgent & Important (Green)
- **Top-Right**: Urgent & Important (Red)  
- **Bottom-Left**: Not Urgent & Not Important (Gray)
- **Bottom-Right**: Urgent & Not Important (Yellow)

**Tag Requirements:**
- Add `urgency: "urgent"` or `urgency: "not-urgent"` tags
- Add `importance: "important"` or `importance: "not-important"` tags
- Tasks automatically position in appropriate quadrants with smooth D3 animations

### Advanced Features

- **Dynamic Repositioning**: Tasks automatically move when tags change
- **Smooth Animations**: All matrix transitions use professional D3 animations
- **Smart Collision Avoidance**: Multiple tasks in quadrants organize automatically
- **Position Memory**: Matrix toggle preserves original task positions

## 🛠️ Development

### Server Configuration

The built-in server includes:
- **Static File Serving**: All project assets (HTML, CSS, JS, images)
- **MIME Type Support**: Proper content types for all file formats
- **Security Features**: Directory traversal protection
- **Development Headers**: No-cache headers for active development
- **Graceful Shutdown**: Clean server termination

### File Structure

```
ui_process/
├── index.html          # Main application entry point
├── script.js           # Core application logic (~2,400 lines)
├── styles.css          # Complete styling with responsive design
├── config.js           # Application configuration and tag definitions
├── chat-interface.js   # AI chat functionality (requires Ollama)
├── server.js           # Local development server
├── package.json        # Node.js configuration
├── README.md          # This documentation
└── assets/            # Documentation and static assets
    └── docs/
        ├── process-flow-guide.md
        └── troubleshooting.md
```

### Browser Support

- **Chrome/Chromium**: Full support including D3 animations
- **Firefox**: Full support
- **Safari**: Full support
- **Edge**: Full support
- **Mobile Browsers**: Responsive design with touch support

## 🔧 Configuration

### Tag System

Edit `config.js` to customize tag categories and options:

```javascript
tagSystem: {
    categories: [
        { value: "urgency", label: "Urgency" },
        { value: "importance", label: "Importance" },
        // Add custom categories
    ],
    options: {
        urgency: [
            { value: "urgent", label: "Urgent" },
            { value: "not-urgent", label: "Not-Urgent" }
        ],
        // Add custom options
    }
}
```

### UI Constants

Adjust spacing and sizing in `config.js`:

```javascript
ui: {
    taskOffset: 80,     // Distance below anchor node for first task
    taskSpacing: 50,    // Spacing between tasks in slots
    tagSpacing: 4,      // Spacing between tags
    tagHeight: 20       // Height of tag elements
}
```

## 🤖 Chat Assistant & Note-Taking

The application includes an AI chat assistant with intelligent note-taking capabilities:

### Basic Chat Assistant (Optional)

1. **Install and configure Ollama** - see [Ollama Installation](#ollama-installation) section above for detailed instructions
2. **Ensure Ollama service is running**: `ollama serve`
3. **Verify model is available**: `ollama list` (should show `qwen2.5:3b` or your chosen model)
4. **Click the Chat button** in the application toolbar
5. **Check the 🤖 AI indicator** - it should show green when properly connected

### Advanced Note-Taking System

The chat interface includes a sophisticated note-taking system powered by the [nb](https://github.com/xwmx/nb) CLI tool through Model Context Protocol (MCP) integration.

#### Setup Note-Taking

The MCP service starts automatically with `npm start`. If you need to start it manually:

1. **Start the MCP service** (only if not using `npm start`):
   ```bash
   npm run mcp
   ```

2. **Initialize nb** (first time only):
   ```bash
   nb init
   ```

3. **Verify connection** in chat:
   ```
   /help
   ```
   
   Check that the ⚡ MCP indicator shows green in the toolbar.

#### Available Commands

**Note Management:**
- `/note-create "Meeting notes: Discussed project timeline and deliverables"` - Create new note
- `/note-search "project timeline"` - Search notes by content
- `/note-list tag:meeting limit:10` - List notes with filters
- `/note-tag <note_id> meeting,urgent` - Add tags to note

**Opportunity Organization:**
- `/opp-create "Website Redesign - Complete overhaul with new branding"` - Create opportunity
- `/opp-list tag:web` - List opportunities by tag
- `/opp-link <opp_id> <task_id>` - Link opportunity to task

**Smart Features:**
- `/analyze "This is important for the Q1 launch"` - Get association suggestions
- `/help <command>` - Get command-specific help
- `/status` - Check system status

#### Intelligent Features

- **Auto-Association**: Notes are automatically linked to similar opportunities
- **Smart Tagging**: Content analysis suggests relevant tags
- **Context Awareness**: Chat provides suggestions based on current workflow
- **Semantic Search**: Find related notes even with different keywords

### Workflow Commands

The chat interface now supports powerful workflow commands for creating and managing process elements:

**Node Management:**
- `/node-create process "Data Processing"` - Create process nodes
- `/node-delete "Node Name"` - Delete nodes
- `/node-rename "Old" "New"` - Rename nodes

**Task Management:**
- `/task-create "Task Name" "Node Name"` - Create tasks
- `/task-move "Task" "Target Node"` - Move tasks
- `/task-priority "Task" high` - Set priority

**Flow Control:**
- `/connect "Start" "End"` - Create flowlines
- `/disconnect "Start" "End"` - Remove connections
- `/matrix-enter` - Enter Eisenhower Matrix mode

**Workflow Operations:**
- `/workflow-save "filename"` - Save workflow
- `/workflow-load "filename"` - Load workflow
- `/workflow-status` - Show current status

See [docs/workflow-commands.md](docs/workflow-commands.md) for complete command reference.

## 📁 Workflow Files

- **Export**: Click "Save Workflow" to download JSON files
- **Import**: Click "Load Workflow" to upload JSON files
- **Format**: Human-readable JSON with complete state information
- **Version**: Schema version 1.1 includes enhanced positioning data

## 🔍 Troubleshooting

### Server Issues

- **Port in use**: Change port with `PORT=8080 npm start`
- **Permission errors**: Ensure Node.js is properly installed
- **File access**: Check file permissions in project directory

### Browser Issues

- **CORS errors**: Use the local server (don't open index.html directly)
- **D3 animations not working**: Ensure modern browser with JavaScript enabled
- **Chat not connecting**: Verify Ollama is running on localhost:11434

### Note-Taking Issues

- **"Note-taking system offline"**: Start MCP service with `npm run mcp`
- **"nb not found"**: Install nb CLI with `npm run install-nb`
- **Commands not working**: Type `/help` to verify connection and see available commands
- **MCP service fails**: Check Python virtual environment is activated

### Performance

- **Large workflows**: Consider reducing number of tasks per quadrant
- **Animation lag**: Check browser developer tools for performance insights
- **Memory usage**: Refresh page for complex workflows to reset state
- **Note search slow**: Use specific keywords for better performance

## 📋 Technical Details

### Dependencies

**Runtime:**
- D3.js v7 (animations and transitions)
- PrimeReact (date picker component)

**Development:**
- Node.js: Express, CORS
- Python: MCP note-taking servers (built-in libraries only)
- nb CLI: Note-taking and organization

### Architecture

- **ES6 Classes**: Modular object-oriented design
- **Event-Driven**: Publisher-subscriber pattern for component communication
- **SVG Graphics**: Scalable flowline rendering
- **CSS Grid**: Responsive Eisenhower Matrix layout
- **Local Storage**: Workflow persistence

### Browser APIs Used

- HTML5 Drag and Drop API
- Canvas API (coordinate calculations)
- File API (workflow import/export)
- Fetch API (chat functionality)
- ResizeObserver API (dynamic layouts)

## 📄 License

---

**🎯 Ready to design better processes!**

Start the server and begin creating your workflows with intelligent task management.
