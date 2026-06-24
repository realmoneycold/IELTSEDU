#!/bin/bash
# Deploy script — run this on your REMOTE server after pulling latest code
set -e

echo "=== IELTSPRACTICE Deploy ==="

# Pull latest code
echo "[1/3] Pulling latest code..."
git pull origin main

# Install dependencies if needed
echo "[2/3] Installing dependencies..."
npm install

# Restart server with PM2 (preferred) or fallback to kill + start
echo "[3/3] Restarting server..."
if command -v pm2 &> /dev/null; then
  pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js
  pm2 save
  echo "Server restarted with PM2."
else
  echo "PM2 not found. Trying to find and kill existing node process..."
  pkill -f "node src/server.js" || true
  sleep 2
  nohup node src/server.js > logs/server.log 2>&1 &
  echo "Server started manually."
fi

echo "=== Deploy complete ==="
