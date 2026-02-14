#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadRegistry } from "./registry.js";
import { SessionStore } from "./session-store.js";
import { registerAskAgent } from "./tools/ask-agent.js";
import { registerListAgents } from "./tools/list-agents.js";
import { registerRelayCode } from "./tools/relay-code.js";

const registry = loadRegistry();
const sessions = new SessionStore();

const server = new McpServer({
  name: "opencode-bridge",
  version: "1.0.0",
});

registerAskAgent(server, registry, sessions);
registerListAgents(server, registry, sessions);
registerRelayCode(server);

const transport = new StdioServerTransport();
await server.connect(transport);

const shutdown = async () => {
  await server.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
