#!/bin/zsh

echo "🚀 Starting Kairos..."

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$BASE_DIR" || exit 1

if ! docker info &>/dev/null; then
  echo "❌ Docker が起動していません。"
  exit 1
fi

# Backend（restart だとイメージが古いまま → Flyway V5 などが jar に乗らないことがある）
echo "▶ Backend starting..."
docker compose up -d --build api

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