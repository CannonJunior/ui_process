#!/bin/bash
echo "🛑 Stopping all Process Flow Designer services..."

# Kill processes on specific ports
for port in 8000 3001 3002; do
    if command -v lsof >/dev/null 2>&1; then
        pid=$(lsof -ti :$port)
        if [ ! -z "$pid" ]; then
            kill -9 $pid 2>/dev/null || true
            echo "✅ Stopped service on port $port (PID: $pid)"
        fi
    fi
done

echo "✅ All services stopped"
