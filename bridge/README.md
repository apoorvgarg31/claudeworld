# ClaudeWorld Bridge

The bridge server connects Claude Code (CLI) to the ClaudeWorld UI (browser).

## Architecture

```
┌─────────────┐     events      ┌────────────────┐     ws      ┌──────────────┐
│ Claude Code │ ───────────────▶│ Bridge Server  │ ◀──────────▶│ ClaudeWorld  │
│    (CLI)    │                 │  (Port 3030)   │             │   (Browser)  │
└─────────────┘                 └────────────────┘             └──────────────┘
```

## Running the Bridge

```bash
npm run bridge
```

## Sending Events

### Via HTTP API

```bash
curl -X POST http://localhost:3030/api/event \
  -H "Content-Type: application/json" \
  -d '{"type": "skill_start", "payload": {"skill": "dev-workflow"}}'
```

### Via WebSocket

Connect to `ws://localhost:3030` and emit:

```javascript
socket.emit('cli:event', {
  type: 'tool_use',
  payload: { tool: 'Read' },
  timestamp: Date.now()
})
```

## Event Types

| Type | Payload | Description |
|------|---------|-------------|
| `skill_start` | `{ skill: string }` | Character walks to skill room |
| `skill_end` | `{ skill: string }` | Character returns to lobby |
| `tool_use` | `{ tool: string }` | Brief visit to tool station |
| `xp_gain` | `{ xp: number }` | Award XP |
| `level_up` | `{ level: number }` | Level up celebration |
| `task_complete` | `{}` | Big XP reward |
| `error` | `{ message: string }` | Error notification |

## Health Check

```bash
curl http://localhost:3030/health
```

Response:
```json
{
  "status": "ok",
  "clients": 2,
  "uptime": 123.456
}
```

## Integration with Claude Code

### Option 1: MCP Server (Recommended)
Create an MCP server that hooks into Claude Code events and sends them to the bridge.

### Option 2: CLI Wrapper
Wrap the `claude` command to intercept and emit events.

### Option 3: Direct Integration
Modify Claude Code (if using custom build) to emit events directly.

See the main project README for integration instructions.
