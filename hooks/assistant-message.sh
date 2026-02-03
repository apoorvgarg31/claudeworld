#!/bin/bash
# ClaudeWorld Assistant Message Hook - NO JQ

BRIDGE_URL="${CLAUDEWORLD_BRIDGE:-http://localhost:3030}"

# Read message from stdin (limit to 2000 chars)
MESSAGE=$(head -c 2000)

# Escape for JSON
ESCAPED=$(echo "$MESSAGE" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g' | tr '\n' ' ')

# Send to bridge
curl -s -X POST "$BRIDGE_URL/api/event" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"claude_output\",\"payload\":{\"output\":\"$ESCAPED\"},\"timestamp\":$(date +%s)000}" \
  > /dev/null 2>&1 &

exit 0
