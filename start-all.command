#!/bin/zsh

echo " Starting AI Personal OS..."

BASE_DIR="/Users/ishikawatatsuya/developer/ai-personal-os"

cd $BASE_DIR

# ----------------------
# Backend (Docker)
# ----------------------
echo "▶ Backend starting..."
docker compose up -d --build

# ----------------------
# Frontend (Next.js)
# ----------------------
echo "▶ Frontend starting..."
osascript -e 'tell application "Terminal"
    do script "cd '"$BASE_DIR"'/frontend && npm run dev"
end tell'

# ----------------------
# Mobile (Expo)
# ----------------------
echo "▶ Mobile starting..."
osascript -e 'tell application "Terminal"
    do script "cd '"$BASE_DIR"'/mobile && npx expo start"
end tell'

echo "All services launched!"
