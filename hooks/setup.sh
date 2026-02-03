#!/bin/bash
# ClaudeWorld Hook Setup
# Installs hooks into Claude Code settings

set -e

HOOKS_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_SETTINGS="$HOME/.claude/settings.json"

echo "🚀 Setting up ClaudeWorld hooks..."

# Make hooks executable
chmod +x "$HOOKS_DIR/post-tool.sh"
chmod +x "$HOOKS_DIR/assistant-message.sh"

# Backup existing settings
if [ -f "$CLAUDE_SETTINGS" ]; then
  cp "$CLAUDE_SETTINGS" "$CLAUDE_SETTINGS.backup"
  echo "📦 Backed up existing settings"
fi

# Create settings if doesn't exist
if [ ! -f "$CLAUDE_SETTINGS" ]; then
  mkdir -p "$(dirname "$CLAUDE_SETTINGS")"
  echo '{}' > "$CLAUDE_SETTINGS"
fi

# Add hooks to settings using jq
UPDATED=$(jq --arg postTool "$HOOKS_DIR/post-tool.sh" \
              --arg assistantMsg "$HOOKS_DIR/assistant-message.sh" '
  .hooks = (.hooks // {}) |
  .hooks.postToolUse = [{ command: $postTool }] |
  .hooks.assistantMessage = [{ command: $assistantMsg }]
' "$CLAUDE_SETTINGS")

echo "$UPDATED" > "$CLAUDE_SETTINGS"

echo "✅ Hooks installed!"
echo ""
echo "Hooks added:"
echo "  - postToolUse: $HOOKS_DIR/post-tool.sh"
echo "  - assistantMessage: $HOOKS_DIR/assistant-message.sh"
echo ""
echo "🎮 Now run: npm run bridge"
echo "   Then start Claude Code in tmux: tmux new -s claude && claude"
