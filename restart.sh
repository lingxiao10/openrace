#!/bin/bash
set -e
PROJ_DIR="/www/wwwroot/openrace.devokai.com/openrace"

echo "=== [1/3] Building backend ==="
cd "$PROJ_DIR/backend"
npm run build

echo "=== [2/3] Building frontend ==="
cd "$PROJ_DIR/frontend"
npm run build

echo "=== [3/3] Restarting pm2 (devuser) ==="
sudo -u devuser pm2 restart openrace-backend

echo "=== Done ==="
sudo -u devuser pm2 list
