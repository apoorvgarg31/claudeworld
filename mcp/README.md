# ClaudeWorld MCP Server

MCP server that bridges Claude Code activity to the ClaudeWorld visualization.

## What It Does

- **Listens** for Claude Code events via MCP tools
- **Emits** events to the ClaudeWorld bridge server (`ws://localhost:3030`)
- **Tracks** XP and levels based on activity
- **Exposes** MCP tools for manual event tracking

## XP Rewards

| Event Type | Base XP | Notes |
|------------|---------|-------|
| `tool_use` | 10 | +5 bonus for Write, +3 for Edit, +2 for exec |
| `commit` | 50 | Git commits are valuable! |
| `skill_start` | 25 | +10-15 bonus for complex skills |
| `skill_end` | 25 | Same bonuses as skill_start |
| `task_complete` | 100 | Major milestone |

## Installation

```bash
cd mcp/
npm install
npm run build
```

## Configuration

### Add to Claude Code

Add to your Claude Code MCP configuration (`~/.config/claude-code/mcp.json` or similar):

```json
{
  "mcpServers": {
    "claudeworld": {
      "command": "node",
      "args": ["/path/to/claudeworld/mcp/dist/index.js"],
      "env": {
        "CLAUDEWORLD_BRIDGE_URL": "ws://localhost:3030"
      }
    }
  }
}
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CLAUDEWORLD_BRIDGE_URL` | `ws://localhost:3030` | WebSocket URL of the bridge server |

## MCP Tools

### `send_xp`

Award XP directly to the avatar.

```typescript
send_xp({ xp: 50, reason: "Helped with debugging" })
// ✨ Awarded 50 XP for: Helped with debugging. Total: 150 XP (Level 2)
```

### `send_event`

Send any ClaudeWorld event type.

```typescript
send_event({
  event_type: "commit",
  branch: "main",
  files: ["src/index.ts", "README.md"]
})
// 📡 Sent commit event (+50 XP)
```

Event types: `tool_use`, `commit`, `skill_start`, `skill_end`, `task_start`, `task_end`, `task_complete`, `error`

### `get_status`

Get current avatar status.

```typescript
get_status()
// {
//   "connected": true,
//   "totalXP": 150,
//   "level": 2,
//   "nextLevelXP": 300,
//   "progress": "50%",
//   "queuedEvents": 0
// }
```

### `track_tool`

Quick shorthand for tracking tool usage.

```typescript
track_tool({ tool: "Write", duration: 150 })
// 🔧 Tracked Write usage (+15 XP)
```

### `track_commit`

Quick shorthand for tracking commits.

```typescript
track_commit({ branch: "feature/xyz", files: ["app.ts"] })
// 📝 Tracked commit (+50 XP) on feature/xyz
```

## Development

```bash
# Run in development mode (with hot reload)
npm run dev

# Build for production
npm run build

# Start production build
npm start
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Claude Code   │────▶│   MCP Server    │────▶│  Bridge Server  │
│  (MCP Client)   │     │  (this package) │ WS  │  (ws://3030)    │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │  ClaudeWorld UI │
                                                │   (Browser)     │
                                                └─────────────────┘
```

## License

MIT
