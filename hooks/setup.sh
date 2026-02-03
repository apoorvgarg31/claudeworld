#!/usr/bin/env bash
# ClaudeWorld Hook Setup
# Configures Claude Code to send events to ClaudeWorld

set -e

HOOK_PATH="$HOME/.claudeworld/hooks/claudeworld-hook.sh"
SETTINGS_FILE="$HOME/.claude/settings.json"
SOURCE_HOOK="$(dirname "$0")/claudeworld-hook.sh"

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
  # Backup existing settings
  cp "$SETTINGS_FILE" "${SETTINGS_FILE}.backup"
  echo "✓ Backed up existing settings"
  
  # Check if jq is available
  if command -v jq &> /dev/null; then
    # Add hooks using jq
    jq --arg hook "$HOOK_PATH" '
      .hooks = (.hooks // {}) |
      .hooks.PreToolUse = $hook |
      .hooks.PostToolUse = $hook |
      .hooks.Stop = $hook
    ' "$SETTINGS_FILE" > "${SETTINGS_FILE}.tmp"
    mv "${SETTINGS_FILE}.tmp" "$SETTINGS_FILE"
  else
    echo "⚠️  jq not found. Please manually add hooks to $SETTINGS_FILE"
    echo ""
    echo "Add this to your settings.json:"
    echo '  "hooks": {'
    echo "    \"PreToolUse\": \"$HOOK_PATH\","
    echo "    \"PostToolUse\": \"$HOOK_PATH\","
    echo "    \"Stop\": \"$HOOK_PATH\""
    echo '  }'
    exit 0
  fi
else
  # Create new settings file
  cat > "$SETTINGS_FILE" << EOF
{
  "hooks": {
    "PreToolUse": "$HOOK_PATH",
    "PostToolUse": "$HOOK_PATH",
    "Stop": "$HOOK_PATH"
  }
}
EOF
fi

echo "✓ Configured Claude Code hooks"
echo ""
echo "🎉 Setup complete!"
echo ""
echo "Now:"
echo "  1. Start the bridge: npm run bridge"
echo "  2. Start the UI: npm run dev"
echo "  3. Use Claude Code normally - Claude will move in ClaudeWorld!"
echo ""
echo "To uninstall: rm -rf ~/.claudeworld && edit ~/.claude/settings.json"
