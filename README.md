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

1. **Install Ollama**: https://ollama.ai/
2. **Pull a model**: `ollama pull qwen2.5:3b`
3. **Start Ollama service**: `ollama serve`
4. **Click the Chat button** in the application toolbar

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
