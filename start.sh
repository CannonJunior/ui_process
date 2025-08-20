#!/bin/bash

# Process Flow Designer Startup Script
# Starts both the main server and MCP services

set -e

echo "🚀 Process Flow Designer - Full Stack Startup"
echo "=============================================="
echo ""

# Function to check if a port is in use
check_port() {
    local port=$1
    if command -v lsof >/dev/null 2>&1; then
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            return 0
        fi
    elif command -v ss >/dev/null 2>&1; then
        if ss -tlnp | grep -q ":$port "; then
            return 0
        fi
    elif command -v netstat >/dev/null 2>&1; then
        if netstat -tlnp 2>/dev/null | grep -q ":$port "; then
            return 0
        fi
    fi
    return 1
}

# Check if ports are available
echo "🔍 Checking port availability..."
if check_port 8000; then
    echo "❌ Port 8000 is already in use (main server)"
    echo "   Please stop the existing service or use a different port"
    exit 1
fi

if check_port 3001; then
    echo "⚠️  Port 3001 is already in use (MCP service)"
    echo "   MCP service may already be running"
fi

echo "✅ Ports checked"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    if [ ! -z "$SERVER_PID" ] && ps -p $SERVER_PID > /dev/null 2>&1; then
        kill $SERVER_PID
        echo "   Stopped main server (PID: $SERVER_PID)"
    fi
    if [ ! -z "$MCP_PID" ] && ps -p $MCP_PID > /dev/null 2>&1; then
        kill $MCP_PID
        echo "   Stopped MCP service (PID: $MCP_PID)"
    fi
    echo "✅ Services stopped"
    exit 0
}

# Set up cleanup on exit
trap cleanup EXIT INT TERM

# Check if concurrently is available
if command -v npx >/dev/null 2>&1 && npx concurrently --version >/dev/null 2>&1; then
    echo "🔄 Starting both services with concurrently..."
    npm run start:full
else
    echo "🔄 Starting services manually..."
    echo ""
    
    # Start MCP service in background
    echo "📡 Starting MCP service on port 3001..."
    npm run start:mcp &
    MCP_PID=$!
    echo "   MCP service started (PID: $MCP_PID)"
    
    # Give MCP service time to start
    sleep 3
    
    # Start main server
    echo "🌐 Starting main server on port 8000..."
    npm run start:server &
    SERVER_PID=$!
    echo "   Main server started (PID: $SERVER_PID)"
    
    echo ""
    echo "✅ Both services are starting..."
    echo ""
    echo "📊 Service Status:"
    echo "   🌐 Main Server: http://localhost:8000"
    echo "   📡 MCP Service: http://localhost:3001"
    echo ""
    echo "🔧 Health Indicators:"
    echo "   Check the toolbar for service status indicators"
    echo "   ⚡ MCP should show green when connected"
    echo "   🤖 AI shows green if Ollama is running"
    echo ""
    echo "💬 Try workflow commands like:"
    echo "   /node-create process \"Test Node\""
    echo "   /workflow-status"
    echo ""
    echo "Press Ctrl+C to stop all services"
    echo ""
    
    # Wait for both processes
    wait
fi