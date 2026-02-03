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

# Create or update settings.json
if [ -f "$SETTINGS_FILE" ]; then
  cp "$SETTINGS_FILE" "${SETTINGS_FILE}.backup"
  echo "✓ Backed up existing settings"
fi

# Check for jq
if ! command -v jq &> /dev/null; then
  echo "⚠️  jq not found. Install with: brew install jq"
  echo ""
  echo "Then run this script again, or manually add to $SETTINGS_FILE:"
  echo "{\"hooks\":{\"PreToolUse\":\"$HOOK_PATH\",\"PostToolUse\":\"$HOOK_PATH\",\"Stop\":\"$HOOK_PATH\"}}"
  exit 1
fi

# Update settings with jq
if [ -f "$SETTINGS_FILE" ]; then
  jq --arg hook "$HOOK_PATH" '.hooks.PreToolUse = $hook | .hooks.PostToolUse = $hook | .hooks.Stop = $hook' "$SETTINGS_FILE" > "${SETTINGS_FILE}.tmp"
  mv "${SETTINGS_FILE}.tmp" "$SETTINGS_FILE"
else
  echo "{\"hooks\":{\"PreToolUse\":\"$HOOK_PATH\",\"PostToolUse\":\"$HOOK_PATH\",\"Stop\":\"$HOOK_PATH\"}}" > "$SETTINGS_FILE"
fi

echo "✓ Configured Claude Code hooks"
echo ""
echo "🎉 Setup complete! Now run: npm run world"
