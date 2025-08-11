# Ollama Setup Guide for Process Flow Designer

## Installation

### Windows
```bash
winget install Ollama.Ollama
```
Or download from https://ollama.ai

### Linux/macOS
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

## Setup qwen2.5:3b Model

After installing Ollama, pull the recommended model:

```bash
ollama pull qwen2.5:3b
```

This model is optimized for limited hardware while providing excellent performance for the Process Flow Designer chat interface.

## Starting Ollama

Start the Ollama service:
```bash
ollama serve
```

The service will run on `http://localhost:11434`

## Verify Installation

Check that the model is available:
```bash
ollama list
```

You should see `qwen2.5:3b` in the list.

## Chat Integration

Once Ollama is running with the qwen2.5:3b model:

1. Open the Process Flow Designer
2. Click the "💬 Chat" button in the toolbar
3. The status indicator should show "Connected to qwen2.5:3b"
4. Start asking questions about your process flows!

## Troubleshooting

**Problem**: Chat shows "Ollama not running"
- **Solution**: Start Ollama service with `ollama serve`

**Problem**: Chat shows "Model qwen2.5:3b not found"
- **Solution**: Run `ollama pull qwen2.5:3b` to download the model

**Problem**: Slow responses
- **Solution**: qwen2.5:3b is optimized for limited hardware, but ensure no other heavy processes are running

## Features

The chat assistant can help with:
- Understanding node types and flowlines
- Task management and advancement
- Tagging system usage
- Troubleshooting workflow issues
- Best practices for process design
- Application state awareness (knows your current workflow)

The assistant has access to the complete Process Flow Designer documentation and understands the current state of your workflow for contextual assistance.