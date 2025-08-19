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
- **Python 3.10+** (for MCP servers)
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

4. **Set up Python environment** (for MCP servers)
   ```bash
   python3 -m venv venv_linux
   source venv_linux/bin/activate
   # Install any required Python packages as needed
   ```

5. **Start the local server**
   ```bash
   npm start
   ```
   
   Or alternatively:
   ```bash
   node server.js
   ```

6. **Open your browser**
   - The server will automatically attempt to open your default browser
   - Manual access: http://localhost:8000

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

## 🤖 Chat Assistant (Optional)

The application includes an AI chat assistant powered by Ollama:

1. **Install Ollama**: https://ollama.ai/
2. **Pull a model**: `ollama pull qwen2.5:3b`
3. **Start Ollama service**: `ollama serve`
4. **Click the Chat button** in the application toolbar

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

### Performance

- **Large workflows**: Consider reducing number of tasks per quadrant
- **Animation lag**: Check browser developer tools for performance insights
- **Memory usage**: Refresh page for complex workflows to reset state

## 📋 Technical Details

### Dependencies

**Runtime:**
- D3.js v7 (animations and transitions)
- PrimeReact (date picker component)

**Development:**
- Node.js: Express, CORS
- Python: MCP servers (installed separately)

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

MIT License - Feel free to use, modify, and distribute.

---

**🎯 Ready to design better processes!**

Start the server and begin creating your workflows with intelligent task management.