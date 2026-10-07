#!/usr/bin/env bash
# Dream Intelligence System — Startup Script
# Starts both the FastAPI backend and the React frontend dev server

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo "🌙 Dream Intelligence System"
echo "=============================="
echo ""

# --- Backend ---
echo "▶ Starting FastAPI backend on http://localhost:8000 ..."
cd "$BACKEND_DIR"
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"

# Wait for backend to be ready
echo "  Waiting for backend to initialize..."
for i in {1..20}; do
  if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "  ✅ Backend ready!"
    break
  fi
  sleep 2
done

# --- Frontend ---
echo ""
echo "▶ Starting React frontend on http://localhost:5173 ..."
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID"

echo ""
echo "=============================="
echo "🚀 System running:"
echo "   Backend API:  http://localhost:8000"
echo "   Frontend App: http://localhost:5173"
echo "   API Docs:     http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers."
echo ""

# Wait and handle Ctrl+C
trap "echo ''; echo 'Shutting down...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
