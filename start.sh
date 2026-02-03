#!/usr/bin/env bash
# ClaudeWorld - Start everything with one command

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
ORANGE='\033[0;33m'
NC='\033[0m'

echo -e "${ORANGE}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║   🌍 ClaudeWorld - Starting...                           ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Install hooks if needed
if [ ! -f "$HOME/.claudeworld/hooks/claudeworld-hook.sh" ]; then
  echo -e "${BLUE}📦 Installing hooks...${NC}"
  bash "$(dirname "$0")/hooks/setup.sh"
fi

# Kill existing processes
echo -e "${BLUE}🧹 Cleaning up...${NC}"
lsof -ti:3030 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:3000 2>/dev/null | xargs kill -9 2>/dev/null || true
tmux kill-session -t claude 2>/dev/null || true

# Start bridge
echo -e "${BLUE}🌉 Starting bridge...${NC}"
npm run bridge &
BRIDGE_PID=$!
sleep 2

# Start UI
echo -e "${BLUE}🖥️  Starting UI...${NC}"
npm run dev &
DEV_PID=$!
sleep 3

# Start Claude in tmux
echo -e "${BLUE}🤖 Starting Claude in tmux...${NC}"
tmux new-session -d -s claude 'claude'

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗"
echo -e "║   ✅ ClaudeWorld is running!                             ║"
echo -e "║                                                          ║"
echo -e "║   🌐 UI:     http://localhost:3000                       ║"
echo -e "║   🌉 Bridge: http://localhost:3030                       ║"
echo -e "║   🤖 Claude: tmux attach -t claude                       ║"
echo -e "║                                                          ║"
echo -e "║   Press Ctrl+C to stop                                   ║"
echo -e "╚══════════════════════════════════════════════════════════╝${NC}"

# Open browser on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
  sleep 1
  open http://localhost:3000 2>/dev/null || true
fi

# Cleanup on exit
cleanup() {
  echo -e "\n${ORANGE}🛑 Stopping...${NC}"
  kill $BRIDGE_PID 2>/dev/null || true
  kill $DEV_PID 2>/dev/null || true
  tmux kill-session -t claude 2>/dev/null || true
  echo -e "${GREEN}✓ Stopped${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM
wait
