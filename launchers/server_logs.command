#!/bin/bash

# Change to the directory containing this script
cd "$(dirname "$0")"

LOG_FILE="server/server.log"

if [ ! -f "$LOG_FILE" ]; then
    echo "⚠️  No log file found"
    exit 1
fi

# Default: show last 50 lines
LINES=${1:-50}

if [ "$1" == "-f" ] || [ "$1" == "--follow" ]; then
    echo "📝 Following server logs (Ctrl+C to stop)..."
    echo ""
    tail -f "$LOG_FILE"
else
    echo "📝 Last $LINES lines of server logs:"
    echo ""
    tail -n "$LINES" "$LOG_FILE"
    echo ""
    echo "Tip: Use './server_logs.command -f' to follow logs in real-time"
    echo "     Use './server_logs.command 100' to see last 100 lines"
fi
