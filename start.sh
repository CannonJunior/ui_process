#!/bin/bash

# Process Flow Designer - Local Server Startup Script

echo "🚀 Starting Process Flow Designer..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v)
echo "✅ Node.js version: $NODE_VERSION"

# Change to script directory
cd "$(dirname "$0")"

# Start the server
echo "🌐 Starting server on http://localhost:3000"
echo "📁 Serving files from: $(pwd)"
echo ""

# Start server with proper error handling
if node server.js; then
    echo "✅ Server stopped gracefully"
else
    echo "❌ Server stopped with error code $?"
fi