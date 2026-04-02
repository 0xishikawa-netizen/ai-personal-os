#!/bin/zsh

echo "🚀 Starting Kairos..."

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$BASE_DIR" || exit 1

if ! docker info &>/dev/null; then
  echo "❌ Docker が起動していません。"
  exit 1
fi

# Backend
echo "▶ Backend starting..."
if docker compose ps --status running | grep -q "api"; then
  docker compose restart api
else
  docker compose up -d --build
fi

# Frontend
echo "▶ Frontend starting..."
osascript -e 'tell application "Terminal"
    do script "cd '"$BASE_DIR"'/frontend && npm run dev"
end tell'

# Mobile
echo "▶ Mobile starting..."
osascript -e 'tell application "Terminal"
    do script "cd '"$BASE_DIR"'/mobile && npx expo start"
end tell'

echo "✅ Done! API: http://localhost:8080"