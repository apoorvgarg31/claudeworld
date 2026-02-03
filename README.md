# 🌍 ClaudeWorld

**Your AI becomes a character in a virtual office.**

ClaudeWorld is a 3D visual companion for Claude Code. Watch your AI walk to skill rooms, type at workstations, and level up as you code together.

![ClaudeWorld Banner](./docs/banner.png)

---

## ✨ Features

### 🏢 Virtual Office
Your Claude lives in a beautiful 3D office building:
- **Lobby** — Where Claude waits for instructions
- **Skills Floor** — Rooms for dev-workflow, orchestra, and more
- **Tools Floor** — Workstations for Read, Write, Exec, Browse

### 🤖 Living Character
Claude isn't just text anymore:
- **Walks** to the appropriate room when you call a skill
- **Types** at the workstation when using tools
- **Celebrates** when you level up
- **Idles** with personality when waiting

### 📈 XP & Leveling
Gamify your coding:
- Earn **+50 XP** for using skills
- Earn **+10 XP** for each tool use
- Earn **+100 XP** for completing tasks
- Watch your level bar fill up with satisfying animations

### 🏆 Achievements
Unlock achievements as you work:
- 🔥 **On Fire** — Maintain a 3-day streak
- 🦉 **Night Owl** — Code after midnight
- 🔧 **Tool Master** — Use all tools in one session
- ⭐ **Rising Star** — Reach level 5
- And 50+ more!

### 🎨 Beautiful Design
- Modern glassmorphism UI
- Anthropic-inspired color palette
- Smooth 60fps animations
- Dark mode by default

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/apoorvgarg31/claudeworld.git
cd claudeworld

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running the Bridge Server

In a separate terminal:

```bash
npm run bridge
```

This starts the WebSocket bridge on port 3030.

---

## 🔌 Connecting to Claude Code

### Option 1: Send Events via HTTP

```bash
# Skill started
curl -X POST http://localhost:3030/api/event \
  -H "Content-Type: application/json" \
  -d '{"type": "skill_start", "payload": {"skill": "dev-workflow"}}'

# Tool used
curl -X POST http://localhost:3030/api/event \
  -H "Content-Type: application/json" \
  -d '{"type": "tool_use", "payload": {"tool": "Read"}}'
```

### Option 2: WebSocket Connection

Connect your Claude Code instance to `ws://localhost:3030` and emit events:

```javascript
socket.emit('cli:event', {
  type: 'skill_start',
  payload: { skill: 'dev-workflow' },
  timestamp: Date.now()
})
```

### Option 3: MCP Server ✅

The MCP server automatically tracks Claude Code activity and awards XP.

**Setup:**
```bash
cd mcp
npm install
npm run build
```

**Add to your Claude Code config** (`~/.claude/config.json`):
```json
{
  "mcpServers": {
    "claudeworld": {
      "command": "node",
      "args": ["/path/to/claudeworld/mcp/dist/index.js"]
    }
  }
}
```

**XP Rewards:**
| Event | XP |
|-------|-----|
| Tool use | +10 (bonus for Write/Edit/browser) |
| Skill start/end | +25 (bonus for orchestra/debugging) |
| Commit | +50 |
| Task complete | +100 |

**MCP Tools Available:**
- `send_xp` — Award XP directly
- `send_event` — Send any event type
- `get_status` — Check XP/level/connection
- `track_tool` — Quick tool tracking
- `track_commit` — Quick commit tracking

---

## 📁 Project Structure

```
claudeworld/
├── app/
│   ├── layout.tsx      # Root layout with fonts & meta
│   ├── page.tsx        # Main page with Scene + HUD
│   └── globals.css     # Global styles & animations
├── components/
│   ├── Scene.tsx       # 3D Spline scene (or placeholder)
│   ├── HUD.tsx         # XP bar, level, streak display
│   └── XPPopup.tsx     # Floating "+50 XP" animations
├── lib/
│   ├── store.ts        # Zustand state management
│   ├── socket.ts       # Socket.io client
│   └── events.ts       # Event handlers
├── bridge/
│   ├── server.ts       # WebSocket bridge server
│   └── README.md       # Bridge documentation
└── public/
    └── ...             # Static assets
```

---

## 🎮 Event Schema

```typescript
interface ClaudeWorldEvent {
  type: 'skill_start' | 'skill_end' | 'tool_use' | 'xp_gain' | 'level_up' | 'error'
  payload: {
    skill?: string    // "dev-workflow", "orchestra", etc.
    tool?: string     // "Read", "Write", "Exec", etc.
    xp?: number       // XP amount
    level?: number    // New level
    message?: string  // Error message
  }
  timestamp: number
}
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **3D** | [Spline](https://spline.design) + [@splinetool/react-spline](https://www.npmjs.com/package/@splinetool/react-spline) |
| **Framework** | [Next.js 14](https://nextjs.org) (App Router) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com) |
| **Animation** | [Framer Motion](https://www.framer.com/motion/) |
| **State** | [Zustand](https://github.com/pmndrs/zustand) |
| **Realtime** | [Socket.io](https://socket.io) |

---

## 🗺️ Roadmap

### MVP (v1.0)
- [x] Project setup with Next.js + Tailwind
- [x] State management with Zustand
- [x] WebSocket bridge server
- [x] HUD with XP & level display
- [x] MCP server for Claude Code integration
- [ ] 3D scene in Spline
- [ ] Character animations
- [ ] Sound effects

### v2.0 — Multiplayer
- [ ] Join codes (ABC123)
- [ ] See friends' characters
- [ ] Real-time sync with PartyKit
- [ ] Chat bubbles

### v3.0 — Customization
- [ ] Character skins
- [ ] Office themes
- [ ] Desk decorations
- [ ] Achievement badges

---

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Credits

Built with ❤️ by [Apy](https://github.com/apoorvgarg31)

Inspired by:
- [Habitica](https://habitica.com) — Gamification done right
- [GitHub Skyline](https://skyline.github.com) — 3D data visualization
- [Anthropic](https://anthropic.com) — For building Claude

---

<p align="center">
  <strong>Make coding feel like a game. 🎮</strong>
</p>
