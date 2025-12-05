#!/bin/bash

# Change to the directory containing this script
cd "$(dirname "$0")"

PID_FILE="server/server.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "❌ Server is not running"
    exit 1
fi

PID=$(cat "$PID_FILE")

if ps -p "$PID" > /dev/null 2>&1; then
    echo "✅ Server is running (PID: $PID)"

    # Show process info
    echo ""
    echo "Process info:"
    ps -p "$PID" -o pid,etime,rss,command

    # Try to check if port 13030 is listening
    if lsof -i :13030 > /dev/null 2>&1; then
        echo ""
        echo "✅ Listening on port 13030"
    else
        echo ""
        echo "⚠️  Port 13030 is not listening (server may have issues)"
    fi

    exit 0
else
    echo "❌ Server is not running (stale PID file)"
    echo "Run ./stop_server.command to clean up"
    exit 1
fi
