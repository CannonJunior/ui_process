#!/bin/bash

# Process Flow Designer Startup Script
# Starts both the main server and MCP services

set -e

echo "🚀 Process Flow Designer - Full Stack Startup"
echo "=============================================="
echo ""

# Function to kill process on a port
kill_port() {
    local port=$1
    echo "🔪 Killing any process on port $port..."
    
    if command -v lsof >/dev/null 2>&1; then
        local pid=$(lsof -ti :$port)
        if [ ! -z "$pid" ]; then
            kill -9 $pid 2>/dev/null || true
            echo "   Killed process $pid on port $port"
        else
            echo "   No process found on port $port"
        fi
    elif command -v fuser >/dev/null 2>&1; then
        fuser -k $port/tcp 2>/dev/null || true
        echo "   Attempted to kill process on port $port"
    else
        echo "   Unable to kill process - lsof/fuser not available"
    fi
}

# Stop existing services on required ports
echo "🔍 Preparing ports..."
kill_port 8000  # Main web server
kill_port 3001  # MCP service
kill_port 3002  # API server (if running)

echo "✅ Ports prepared"
echo ""

# Function to check if PostgreSQL is running
check_postgres() {
    if command -v pg_isready >/dev/null 2>&1; then
        if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
            return 0
        fi
    fi
    
    # Alternative check using systemctl
    if command -v systemctl >/dev/null 2>&1; then
        if systemctl is-active --quiet postgresql; then
            return 0
        fi
    fi
    
    return 1
}

# Start PostgreSQL if not running
echo "🐘 Checking PostgreSQL..."
if check_postgres; then
    echo "✅ PostgreSQL is already running"
else
    echo "🔄 Starting PostgreSQL..."
    
    # Try to start PostgreSQL service
    if command -v systemctl >/dev/null 2>&1; then
        if sudo systemctl start postgresql 2>/dev/null; then
            echo "✅ PostgreSQL service started"
            sleep 3
            if check_postgres; then
                echo "✅ PostgreSQL is now running"
            else
                echo "⚠️ PostgreSQL started but not responding properly"
            fi
        else
            echo "⚠️ Failed to start PostgreSQL service"
            echo "   Run './scripts/setup-postgres.sh' to install PostgreSQL"
            echo "   The application will continue without database features"
        fi
    else
        echo "⚠️ systemctl not available - cannot start PostgreSQL"
        echo "   Please start PostgreSQL manually or install systemd"
    fi
fi

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
    if [ ! -z "$API_PID" ] && ps -p $API_PID > /dev/null 2>&1; then
        kill $API_PID
        echo "   Stopped API server (PID: $API_PID)"
    fi
    
    # Also kill processes by port as fallback
    kill_port 8000
    kill_port 3001
    kill_port 3002
    
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
    
    # Start API server in background (if PostgreSQL is running)
    if check_postgres; then
        echo "🗄️ Starting API server on port 3002..."
        cd api
        PORT=3002 nohup npm start > ../api-server.log 2>&1 &
        API_PID=$!
        cd ..
        echo "   API server started (PID: $API_PID)"
    else
        echo "⚠️ Skipping API server - PostgreSQL not available"
    fi
    
    # Start MCP service in background
    echo "📡 Starting MCP service on port 3001..."
    nohup npm run start:mcp > mcp-service.log 2>&1 &
    MCP_PID=$!
    echo "   MCP service started (PID: $MCP_PID)"
    
    # Give services time to start
    sleep 3
    
    # Start main server
    echo "🌐 Starting main server on port 8000..."
    nohup npm run start:server > web-server.log 2>&1 &
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