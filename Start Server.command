#!/bin/bash

# Change to the script's directory
cd "$(dirname "$0")/server"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Dependencies not found. Installing..."
    npm install
    if [ $? -ne 0 ]; then
        echo "Failed to install dependencies. Please check your npm configuration."
        exit 1
    fi
    echo "Dependencies installed successfully."
fi

# Start the server
node server.js
