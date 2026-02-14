#!/usr/bin/env bun

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "bun",
  args: ["run", "/Users/minzi/Developer/opencode-bridge/src/index.ts"],
  env: {
    ...process.env,
    BRIDGE_CONFIG: "/Users/minzi/Developer/opencode-bridge/agents.json",
  },
});

const client = new Client({ name: "test-client", version: "1.0.0" });
await client.connect(transport);

console.log("=== MCP Protocol Test ===\n");

console.log("1. Listing tools...");
const tools = await client.listTools();
console.log("Tools:", tools.tools.map((t) => t.name).join(", "));
console.log();

console.log("2. Calling list_agents...");
const listResult = await client.callTool({ name: "list_agents", arguments: {} });
console.log("Result:", (listResult.content as Array<{ text: string }>)[0]?.text);
console.log();

console.log("3. Calling ask_agent (Mac Mini)...");
const askResult = await client.callTool({
  name: "ask_agent",
  arguments: {
    agent: "mac-mini",
    prompt: 'What is your hostname? Run `hostname` and reply with just the output.',
    new_session: true,
  },
});
const response = (askResult.content as Array<{ text: string }>)[0]?.text;
console.log("Result:", response);
console.log();

const parsed = JSON.parse(response);
console.log("4. Calling ask_agent with session continuity...");
const followUp = await client.callTool({
  name: "ask_agent",
  arguments: {
    agent: "mac-mini",
    prompt: "What did I just ask you? Reply in one sentence.",
    session_id: parsed.session_id,
  },
});
console.log("Follow-up:", (followUp.content as Array<{ text: string }>)[0]?.text);
console.log();

await client.close();
console.log("ALL MCP PROTOCOL TESTS PASSED");
