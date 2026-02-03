#!/usr/bin/env bash
# ClaudeWorld Hook - Captures Claude Code events for 3D visualization
# Based on Vibecraft's approach
#
# Install: Add to ~/.claude/settings.json hooks

set -e

# Cross-Platform PATH Setup
KNOWN_PATHS=(
  "/opt/homebrew/bin"
  "/usr/local/bin"
  "$HOME/.local/bin"
  "/usr/bin"
  "/bin"
)

for dir in "${KNOWN_PATHS[@]}"; do
  [ -d "$dir" ] && export PATH="$dir:$PATH"
done

# Find jq
find_tool() {
  local name="$1"
  local found=$(command -v "$name" 2>/dev/null)
  if [ -n "$found" ]; then
    echo "$found"
    return 0
  fi
  for dir in "${KNOWN_PATHS[@]}"; do
    if [ -x "$dir/$name" ]; then
      echo "$dir/$name"
      return 0
    fi
  done
  return 1
}

JQ=$(find_tool "jq") || exit 1
CURL=$(find_tool "curl") || CURL=""

# Configuration
BRIDGE_URL="${CLAUDEWORLD_BRIDGE_URL:-http://localhost:3030}"

# Read input from stdin
input=$(cat)

hook_event_name=$(echo "$input" | "$JQ" -r '.hook_event_name // "unknown"')
session_id=$(echo "$input" | "$JQ" -r '.session_id // "unknown"')

# Generate timestamp
if [[ "$OSTYPE" == "darwin"* ]]; then
  if command -v perl &> /dev/null; then
    timestamp=$(perl -MTime::HiRes=time -e 'printf "%.0f", time * 1000')
  else
    timestamp=$(($(date +%s) * 1000))
  fi
else
  ms_part=$(date +%N | cut -c1-3)
  timestamp=$(($(date +%s) * 1000 + 10#$ms_part))
fi

# Map tool to room and XP
get_tool_info() {
  local tool="$1"
  case "$tool" in
    Read)        echo "Read|10" ;;
    Write)       echo "Write|15" ;;
    Edit)        echo "Edit|12" ;;
    Bash|bash)   echo "Exec|10" ;;
    execute_command) echo "Exec|10" ;;
    WebFetch|web_fetch) echo "Browser|10" ;;
    WebSearch|web_search) echo "Search|10" ;;
    mcp__*)      echo "Browser|5" ;;
    *)           echo "$tool|10" ;;
  esac
}

# Handle events
case "$hook_event_name" in
  PreToolUse)
    tool_name=$(echo "$input" | "$JQ" -r '.tool_name // "unknown"')
    tool_info=$(get_tool_info "$tool_name")
    room=$(echo "$tool_info" | cut -d'|' -f1)
    xp=$(echo "$tool_info" | cut -d'|' -f2)
    
    # Send to bridge
    if [ -n "$CURL" ]; then
      "$CURL" -s -X POST "${BRIDGE_URL}/api/event" \
        -H "Content-Type: application/json" \
        -d "{\"type\":\"tool_use\",\"payload\":{\"tool\":\"${room}\",\"xp\":${xp}},\"timestamp\":${timestamp}}" \
        > /dev/null 2>&1 &
    fi
    ;;
    
  PostToolUse)
    # Tool finished - could send completion event
    ;;
    
  Stop)
    # Claude stopped - return to lobby
    if [ -n "$CURL" ]; then
      "$CURL" -s -X POST "${BRIDGE_URL}/api/event" \
        -H "Content-Type: application/json" \
        -d "{\"type\":\"skill_end\",\"payload\":{\"skill\":\"lobby\"},\"timestamp\":${timestamp}}" \
        > /dev/null 2>&1 &
    fi
    ;;
esac

exit 0
