#!/bin/bash
# Start Django with Daphne for WebSocket support
cd "$(dirname "$0")"
echo "Starting Daphne server..."
daphne -b 0.0.0.0 -p 8000 project.asgi:application
