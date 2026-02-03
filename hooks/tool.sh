#!/bin/bash
# ClaudeWorld Tool Hook - Fires on tool use

BRIDGE_URL="${CLAUDEWORLD_BRIDGE:-http://localhost:3030}"

# Get tool name from env or parse stdin
TOOL="${CLAUDE_TOOL_NAME:-unknown}"

# Read stdin (contains tool details)
INPUT=$(cat)

# Try to get tool name from input if not in env
if [ "$TOOL" = "unknown" ]; then
  TOOL=$(echo "$INPUT" | grep -o '"tool"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*: *"\([^"]*\)".*/\1/')
  [ -z "$TOOL" ] && TOOL=$(echo "$INPUT" | grep -o '"name"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*: *"\([^"]*\)".*/\1/')
  [ -z "$TOOL" ] && TOOL="unknown"
fi

curl -s -X POST "$BRIDGE_URL/api/event" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"tool_use\",\"payload\":{\"tool\":\"$TOOL\"},\"timestamp\":$(date +%s)000}" &

exit 0
