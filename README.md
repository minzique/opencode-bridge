# opencode-bridge

MCP server that lets AI agents in [OpenCode](https://opencode.ai) talk to other OpenCode instances — locally or over the network.

```
┌──────────────────┐       ┌──────────────────┐
│  OpenCode A      │ stdio │  MCP Bridge      │  HTTP   ┌──────────────┐
│  (your session)  │◄─────►│  Server          │────────►│ OpenCode B   │
│                  │       │                  │         │ (remote)     │
└──────────────────┘       └──────────────────┘         └──────────────┘
```

## What it does

Three MCP tools exposed to your agent:

| Tool | Description |
|------|-------------|
| `ask_agent` | Send a prompt to a named remote agent and get the response back. Supports session continuity. |
| `list_agents` | Health-check all registered agents (ONLINE/OFFLINE + version). |
| `relay_code` | Git push/pull through a shared remote for relaying code between machines. |

## Setup

### 1. Install

```bash
git clone https://github.com/minzique/opencode-bridge.git
cd opencode-bridge
bun install
```

### 2. Configure agents

Edit `agents.json` to point at your OpenCode instances:

```json
{
  "agents": {
    "mac-mini": {
      "url": "http://minzis-mac-mini.local:4096",
      "description": "Remote Mac Mini agent"
    },
    "gpu-box": {
      "url": "http://10.0.0.5:4096",
      "password": "secret",
      "description": "GPU server for heavy tasks"
    }
  }
}
```

### 3. Start remote OpenCode servers

On each remote machine:

```bash
opencode serve --port 4096 --hostname 0.0.0.0
```

Add `--mdns` for automatic LAN discovery. Set `OPENCODE_SERVER_PASSWORD` for auth.

### 4. Register with OpenCode

Add to `~/.config/opencode/opencode.json`:

```json
{
  "mcp": {
    "bridge": {
      "type": "local",
      "command": ["bun", "run", "/path/to/opencode-bridge/src/index.ts"],
      "enabled": true,
      "environment": {
        "BRIDGE_CONFIG": "/path/to/opencode-bridge/agents.json"
      }
    }
  }
}
```

Verify: `opencode mcp ls` should show `bridge` as connected.

## Usage

Once registered, your agent can use the tools directly:

```
> Use ask_agent to ask mac-mini for its hostname

{
  "agent": "mac-mini",
  "session_id": "ses_abc123",
  "response": "Minzis-Mac-mini.local"
}

> Follow up on that same session — what OS is it running?

{
  "agent": "mac-mini",
  "session_id": "ses_abc123",
  "response": "macOS 15.3 (Sequoia)"
}
```

Session IDs are persisted to `.sessions.json` — conversations survive MCP server restarts.

## Tool reference

### ask_agent

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agent` | string | yes | Agent name from `agents.json` |
| `prompt` | string | yes | The prompt to send |
| `session_id` | string | no | Continue an existing conversation |
| `new_session` | boolean | no | Force a new session |

### list_agents

No parameters. Returns status of all configured agents.

### relay_code

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `direction` | `"push"` \| `"pull"` | yes | Push local or pull remote changes |
| `remote` | string | no | Git remote name (default: `"relay"`) |
| `branch` | string | no | Git branch (default: `"main"`) |
| `message` | string | no | Commit message for push |
| `cwd` | string | no | Working directory |

## How it works

OpenCode already has a client-server architecture — the TUI is just a client talking to an HTTP server. `opencode serve` exposes this as a headless API. This bridge is an MCP server that:

1. Receives tool calls from your OpenCode agent via stdio
2. Translates them to HTTP requests against remote OpenCode servers
3. Returns responses back through MCP

The OpenCode REST API handles sessions, messages, tool execution, and streaming. The bridge just routes between instances.

## Requirements

- [Bun](https://bun.sh) 1.0+
- [OpenCode](https://opencode.ai) 1.2+ on both local and remote machines
- Network connectivity between machines (LAN or VPN)

## License

MIT
