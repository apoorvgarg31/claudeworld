#!/bin/bash
# ClaudeWorld Post-Tool Hook
# Sends tool_use event to bridge when Claude uses a tool

BRIDGE_URL="${CLAUDEWORLD_BRIDGE:-http://localhost:3030}"

# Read hook data from stdin
HOOK_DATA=$(cat)

# Extract tool name from the hook data
TOOL_NAME=$(echo "$HOOK_DATA" | jq -r '.tool_name // .toolName // "unknown"' 2>/dev/null)

# Send event to bridge
curl -s -X POST "$BRIDGE_URL/api/event" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"tool_use\",
    \"payload\": {
      \"tool\": \"$TOOL_NAME\"
    },
    \"timestamp\": $(date +%s000)
  }" > /dev/null 2>&1 &

exit 0
