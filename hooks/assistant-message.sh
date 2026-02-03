#!/bin/bash
# ClaudeWorld Assistant Message Hook
# Sends Claude's response to bridge

BRIDGE_URL="${CLAUDEWORLD_BRIDGE:-http://localhost:3030}"

# Read message from stdin
MESSAGE=$(cat)

# Extract the actual message content
CONTENT=$(echo "$MESSAGE" | jq -r '.message // .content // .' 2>/dev/null | head -c 2000)

# Send to bridge
curl -s -X POST "$BRIDGE_URL/api/event" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg content "$CONTENT" '{
    type: "claude_output",
    payload: { output: $content },
    timestamp: (now * 1000 | floor)
  }')" > /dev/null 2>&1 &

exit 0
