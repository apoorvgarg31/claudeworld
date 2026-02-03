#!/bin/bash
# ClaudeWorld Stop Hook - Captures Claude's response
# This fires when Claude finishes responding

BRIDGE_URL="${CLAUDEWORLD_BRIDGE:-http://localhost:3030}"

# Read the hook data from stdin
INPUT=$(cat)

# The stop event contains the response in the 'stop_reason' or we need to parse it
# For now, let's just signal that Claude stopped and capture what we can

# Try to extract any response text
RESPONSE=$(echo "$INPUT" | tr '\n' ' ' | head -c 3000)

# URL encode the response for safe transmission
ENCODED=$(printf '%s' "$RESPONSE" | python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read()))" 2>/dev/null || echo "$RESPONSE")

# Send to bridge
curl -s -X POST "$BRIDGE_URL/api/event" \
  -H "Content-Type: application/json" \
  --data-binary @- << EOF &
{
  "type": "stop",
  "payload": {
    "response": "$(echo "$RESPONSE" | sed 's/"/\\"/g' | tr -d '\n')"
  },
  "timestamp": $(date +%s)000
}
EOF

exit 0
