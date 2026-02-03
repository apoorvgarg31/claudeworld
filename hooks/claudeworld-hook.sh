#!/bin/bash
# ClaudeWorld Hook - Captures Claude Code events
# Install: Add to ~/.claude/settings.json hooks section

BRIDGE_URL="${CLAUDEWORLD_BRIDGE:-http://localhost:3030}"

# Read hook input from stdin
INPUT=$(cat)

# Try to parse without jq (but jq is better if available)
if command -v jq &> /dev/null; then
  HOOK_TYPE=$(echo "$INPUT" | jq -r '.hook_event_name // "unknown"')
  SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
  TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // ""')
  TRANSCRIPT=$(echo "$INPUT" | jq -r '.transcript_path // ""')
else
  # Fallback: parse JSON with grep/sed
  HOOK_TYPE=$(echo "$INPUT" | grep -o '"hook_event_name"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*: *"\([^"]*\)".*/\1/' || echo "unknown")
  SESSION_ID=$(echo "$INPUT" | grep -o '"session_id"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*: *"\([^"]*\)".*/\1/' || echo "unknown")
  TOOL_NAME=$(echo "$INPUT" | grep -o '"tool_name"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*: *"\([^"]*\)".*/\1/' || echo "")
  TRANSCRIPT=$(echo "$INPUT" | grep -o '"transcript_path"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*: *"\([^"]*\)".*/\1/' || echo "")
fi

TIMESTAMP=$(date +%s)000

case "$HOOK_TYPE" in
  PreToolUse|PostToolUse)
    # Tool use event
    curl -s -X POST "$BRIDGE_URL/api/event" \
      -H "Content-Type: application/json" \
      -d "{\"type\":\"tool_use\",\"payload\":{\"tool\":\"$TOOL_NAME\",\"session\":\"$SESSION_ID\"},\"timestamp\":$TIMESTAMP}" &
    ;;

  Stop)
    # Claude finished - try to get response from transcript
    RESPONSE=""
    if [ -n "$TRANSCRIPT" ] && [ -f "$TRANSCRIPT" ]; then
      if command -v jq &> /dev/null; then
        # Get last assistant message from transcript
        RESPONSE=$(tail -100 "$TRANSCRIPT" | jq -rs '
          [.[] | select(.type == "assistant")] | last |
          .message.content | map(select(.type == "text")) | map(.text) | join("\n")
        ' 2>/dev/null | head -c 5000)
      else
        # Fallback: get last text content
        RESPONSE=$(tail -50 "$TRANSCRIPT" | grep -o '"text":"[^"]*"' | tail -1 | sed 's/"text":"\([^"]*\)"/\1/' | head -c 2000)
      fi
    fi

    # Escape for JSON
    RESPONSE_ESCAPED=$(echo "$RESPONSE" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g' | tr '\n' ' ')

    curl -s -X POST "$BRIDGE_URL/api/event" \
      -H "Content-Type: application/json" \
      -d "{\"type\":\"stop\",\"payload\":{\"response\":\"$RESPONSE_ESCAPED\",\"session\":\"$SESSION_ID\"},\"timestamp\":$TIMESTAMP}" &
    ;;

  UserPromptSubmit)
    # User sent a prompt
    curl -s -X POST "$BRIDGE_URL/api/event" \
      -H "Content-Type: application/json" \
      -d "{\"type\":\"user_prompt\",\"payload\":{\"session\":\"$SESSION_ID\"},\"timestamp\":$TIMESTAMP}" &
    ;;
esac

exit 0
