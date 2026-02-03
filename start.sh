#!/usr/bin/env bash
# ClaudeWorld - Start everything with one command
# Usage: ./start.sh [--with-claude]

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
ORANGE='\033[0;33m'
NC='\033[0m'

echo -e "${ORANGE}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║                                                          ║"
echo "║   🌍 ClaudeWorld - Starting...                           ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if hooks are installed
if [ ! -f "$HOME/.claudeworld/hooks/claudeworld-hook.sh" ]; then
  echo -e "${BLUE}📦 First run - installing hooks...${NC}"
  ./hooks/setup.sh
  echo ""
fi

# Kill any existing processes on our ports
echo -e "${BLUE}🧹 Cleaning up old processes...${NC}"
lsof -ti:3030 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Start bridge in background
echo -e "${BLUE}🌉 Starting bridge server...${NC}"
npm run bridge &
BRIDGE_PID=$!
sleep 2

# Start Next.js dev server in background
echo -e "${BLUE}🖥️  Starting UI server...${NC}"
npm run dev &
DEV_PID=$!
sleep 3

# Optionally start Claude in tmux
if [ "$1" = "--with-claude" ]; then
  echo -e "${BLUE}🤖 Starting Claude in tmux...${NC}"
  tmux kill-session -t claude 2>/dev/null || true
  tmux new-session -d -s claude 'claude'
  echo -e "${GREEN}✓ Claude running in tmux session 'claude'${NC}"
  echo "  Attach with: tmux attach -t claude"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                          ║${NC}"
echo -e "${GREEN}║   ✅ ClaudeWorld is running!                             ║${NC}"
echo -e "${GREEN}║                                                          ║${NC}"
echo -e "${GREEN}║   🌐 UI:     http://localhost:3000                       ║${NC}"
echo -e "${GREEN}║   🌉 Bridge: http://localhost:3030                       ║${NC}"
echo -e "${GREEN}║                                                          ║${NC}"
echo -e "${GREEN}║   Press Ctrl+C to stop all services                      ║${NC}"
echo -e "${GREEN}║                                                          ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Open browser (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
  sleep 1
  open http://localhost:3000
fi

# Wait and cleanup on exit
cleanup() {
  echo ""
  echo -e "${ORANGE}🛑 Shutting down ClaudeWorld...${NC}"
  kill $BRIDGE_PID 2>/dev/null || true
  kill $DEV_PID 2>/dev/null || true
  echo -e "${GREEN}✓ Stopped${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

# Keep script running
wait
