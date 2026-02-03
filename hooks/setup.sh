#!/usr/bin/env bash
# ClaudeWorld Hook Setup

set -e

HOOK_PATH="$HOME/.claudeworld/hooks/claudeworld-hook.sh"
SETTINGS_FILE="$HOME/.claude/settings.json"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE_HOOK="$SCRIPT_DIR/claudeworld-hook.sh"

echo "🌍 ClaudeWorld Hook Setup"
echo ""

# Create directories
mkdir -p "$HOME/.claudeworld/hooks"
mkdir -p "$HOME/.claude"

# Copy hook script
cp "$SOURCE_HOOK" "$HOOK_PATH"
chmod +x "$HOOK_PATH"
echo "✓ Installed hook to $HOOK_PATH"

# Check for jq
if ! command -v jq &> /dev/null; then
  echo "⚠️  jq not found. Install with: brew install jq"
  exit 1
fi

# Backup settings
if [ -f "$SETTINGS_FILE" ]; then
  cp "$SETTINGS_FILE" "${SETTINGS_FILE}.backup"
  echo "✓ Backed up existing settings"
else
  echo '{}' > "$SETTINGS_FILE"
fi

# Update settings with correct hook format
jq --arg hook "$HOOK_PATH" '
  .hooks = (.hooks // {}) |
  .hooks.PreToolUse = [{"hooks": [{"type": "command", "command": $hook, "timeout": 5}]}] |
  .hooks.PostToolUse = [{"hooks": [{"type": "command", "command": $hook, "timeout": 5}]}] |
  .hooks.Stop = [{"hooks": [{"type": "command", "command": $hook, "timeout": 5}]}]
' "$SETTINGS_FILE" > "${SETTINGS_FILE}.tmp"
mv "${SETTINGS_FILE}.tmp" "$SETTINGS_FILE"

echo "✓ Configured Claude Code hooks"
echo ""
echo "🎉 Setup complete! Now run: npm run world"
