#!/usr/bin/env bash
# ClaudeWorld Hook - Captures Claude Code events
BRIDGE_URL="${CLAUDEWORLD_BRIDGE_URL:-http://localhost:3030}"

# Find jq
JQ=$(command -v jq 2>/dev/null || echo "/usr/bin/jq")
if [ ! -x "$JQ" ]; then
  exit 0
fi

input=$(cat)
hook_event_name=$(echo "$input" | $JQ -r '.hook_event_name // "unknown"')
tool_name=$(echo "$input" | $JQ -r '.tool_name // "unknown"')
timestamp=$(($(date +%s) * 1000))

case "$hook_event_name" in
  PreToolUse)
    curl -s -X POST "${BRIDGE_URL}/api/event" \
      -H "Content-Type: application/json" \
      -d "{\"type\":\"tool_use\",\"payload\":{\"tool\":\"${tool_name}\",\"xp\":10},\"timestamp\":${timestamp}}" \
      > /dev/null 2>&1 &
    ;;
  Stop)
    curl -s -X POST "${BRIDGE_URL}/api/event" \
      -H "Content-Type: application/json" \
      -d "{\"type\":\"skill_end\",\"payload\":{\"skill\":\"lobby\"},\"timestamp\":${timestamp}}" \
      > /dev/null 2>&1 &
    ;;
esac

exit 0
