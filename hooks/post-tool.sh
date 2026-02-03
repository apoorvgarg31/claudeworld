#!/bin/bash
# ClaudeWorld Post-Tool Hook - NO JQ NEEDED

BRIDGE_URL="${CLAUDEWORLD_BRIDGE:-http://localhost:3030}"

# Read hook data from stdin
read -r HOOK_DATA

# Extract tool name using grep/sed (no jq needed)
TOOL_NAME=$(echo "$HOOK_DATA" | grep -o '"tool_name"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*: *"\([^"]*\)".*/\1/' || echo "unknown")
if [ -z "$TOOL_NAME" ] || [ "$TOOL_NAME" = "unknown" ]; then
  TOOL_NAME=$(echo "$HOOK_DATA" | grep -o '"toolName"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*: *"\([^"]*\)".*/\1/' || echo "unknown")
fi

# Send event to bridge (background, don't block)
curl -s -X POST "$BRIDGE_URL/api/event" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"tool_use\",\"payload\":{\"tool\":\"$TOOL_NAME\"},\"timestamp\":$(date +%s)000}" \
  > /dev/null 2>&1 &

exit 0
