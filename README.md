# opencode-bridge

An MCP server that enables AI agents running on different machines to communicate with each other through HTTP relay.

## What It Does

`opencode-bridge` acts as a bridge between OpenCode instances running on separate machines. It provides three MCP tools that allow agents to:

- **Ask questions** to remote agents and get responses
- **List available agents** with their online/offline status
- **Relay code** through a shared git remote for cross-machine collaboration

## Architecture

The bridge consists of:

1. **Agent Registry** (`agents.json`) — Maps agent names to their OpenCode HTTP endpoints
2. **Session Store** (`.sessions.json`) — Tracks active conversation sessions per agent
3. **OpenCode Client** — HTTP client for the OpenCode REST API (`/session`, `/message`, `/health`)
4. **Three MCP Tools**:
   - `ask_agent` — Send prompts to remote agents, maintain conversation continuity
   - `list_agents` — Check agent availability and session status
   - `relay_code` — Push/pull code via git remote for file sharing between machines

When you call `ask_agent`, the bridge:
1. Looks up the agent's URL in the registry
2. Reuses an existing session or creates a new one
3. Sends the prompt via HTTP POST to the remote OpenCode instance
4. Returns the agent's response and session ID for follow-up questions

## Setup

### Prerequisites

- Node.js 18+ or Bun
- OpenCode instances running on each machine you want to connect
- Network access between machines (HTTP)

### Installation

```bash
cd opencode-bridge
bun install  # or npm install
```

### Configuration

Create `agents.json` in the project root:

```json
{
  "agents": {
    "mac-mini": {
      "url": "http://minzis-mac-mini.local:4096",
      "description": "Remote Mac Mini agent — Google Gemini, general purpose",
      "username": "opencode",
      "password": "optional-password"
    },
    "workstation": {
      "url": "http://192.168.1.100:4096",
      "description": "Linux workstation with GPU"
    }
  }
}
```

**Required fields:**
- `url` — Full HTTP URL to the OpenCode instance (including port)

**Optional fields:**
- `description` — Human-readable description
- `username` — HTTP Basic Auth username (defaults to "opencode")
- `password` — HTTP Basic Auth password

### Running the Server

```bash
bun run dev
```

The MCP server runs on stdio and can be integrated into any MCP-compatible client.

### Environment Variables

- `BRIDGE_CONFIG` — Path to `agents.json` (default: `./agents.json`)
- `BRIDGE_SESSION_STORE` — Path to session store (default: `./.sessions.json`)
- `BRIDGE_GIT_CWD` — Working directory for `relay_code` git operations (default: current directory)

## Usage

### Ask a Remote Agent

```typescript
// First question (creates new session)
ask_agent({
  agent: "mac-mini",
  prompt: "What's the weather in Tokyo?"
})

// Follow-up question (reuses session)
ask_agent({
  agent: "mac-mini",
  prompt: "What about tomorrow?"
})

// Force new session
ask_agent({
  agent: "mac-mini",
  prompt: "New topic: explain quantum computing",
  new_session: true
})
```

**Returns:**
```json
{
  "agent": "mac-mini",
  "session_id": "ses_abc123...",
  "response": "The weather in Tokyo is..."
}
```

### List Available Agents

```typescript
list_agents()
```

**Returns:**
```
mac-mini: ONLINE (v1.2.3) @ http://minzis-mac-mini.local:4096 — Remote Mac Mini agent
  session: ses_abc123...

workstation: OFFLINE @ http://192.168.1.100:4096 — Linux workstation with GPU
  no active session
```

### Relay Code Between Machines

```typescript
// Push local changes to relay remote
relay_code({
  direction: "push",
  message: "Add new feature",
  remote: "relay",
  branch: "main"
})

// Pull changes from relay remote
relay_code({
  direction: "pull",
  remote: "relay",
  branch: "main"
})
```

**Use case:** Agent A on machine 1 writes code, pushes to shared git remote. Agent B on machine 2 pulls the code and continues work.

## How Sessions Work

- Each agent maintains one active session at a time (stored in `.sessions.json`)
- Sessions persist across bridge restarts
- If a session becomes invalid (404), it's automatically cleared
- Use `new_session: true` to start fresh conversations

## Development

```bash
# Run tests
bun test

# Type checking
bun run tsc --noEmit
```

## Project Structure

```
opencode-bridge/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── registry.ts           # Agent registry loader
│   ├── session-store.ts      # Session persistence
│   ├── opencode-client.ts    # HTTP client for OpenCode API
│   └── tools/
│       ├── ask-agent.ts      # ask_agent tool
│       ├── list-agents.ts    # list_agents tool
│       └── relay-code.ts     # relay_code tool
├── agents.json               # Agent registry (user-created)
├── .sessions.json            # Session store (auto-generated)
└── package.json
```

## Troubleshooting

**Agent shows OFFLINE:**
- Check that the OpenCode instance is running on the target machine
- Verify network connectivity: `curl http://target-url:4096/global/health`
- Check firewall rules

**Session errors (404):**
- Session may have expired on the remote instance
- Use `new_session: true` to create a fresh session

**relay_code fails:**
- Ensure git remote is configured: `git remote -v`
- Check that you have push/pull permissions
- Verify the working directory with `cwd` parameter
