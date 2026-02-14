#!/usr/bin/env bun

import { OpencodeClient } from "../src/opencode-client.js";
import { loadRegistry } from "../src/registry.js";
import { SessionStore } from "../src/session-store.js";

const registry = loadRegistry();
const sessions = new SessionStore();

async function testHealth() {
  console.log("=== Test 1: Health check ===");
  const client = new OpencodeClient(registry.agents["mac-mini"]);
  const health = await client.health();
  console.log("Health:", health);
  if (!health.healthy) throw new Error("Mac Mini not healthy");
  console.log("PASS\n");
}

async function testCreateSession() {
  console.log("=== Test 2: Create session ===");
  const client = new OpencodeClient(registry.agents["mac-mini"]);
  const session = await client.createSession("Smoke test");
  console.log("Session:", session.id);
  if (!session.id) throw new Error("No session ID returned");
  sessions.set("mac-mini", session.id);
  console.log("PASS\n");
  return session.id;
}

async function testPrompt(sessionId: string) {
  console.log("=== Test 3: Send prompt ===");
  console.log("Sending prompt to Mac Mini agent (this may take 30-120s)...");
  const client = new OpencodeClient(registry.agents["mac-mini"]);
  const result = await client.prompt(
    sessionId,
    'Reply with exactly: "BRIDGE_TEST_OK" and nothing else. No explanation.'
  );
  console.log("Response parts:", result.parts?.length ?? 0);
  const text = result.parts
    ?.filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("\n");
  console.log("Response text:", text?.slice(0, 200));
  if (!text) throw new Error("Empty response");
  console.log("PASS\n");
}

async function testCleanup(sessionId: string) {
  console.log("=== Test 4: Cleanup ===");
  const client = new OpencodeClient(registry.agents["mac-mini"]);
  await client.deleteSession(sessionId);
  sessions.delete("mac-mini");
  console.log("Deleted session", sessionId);
  console.log("PASS\n");
}

async function main() {
  try {
    await testHealth();
    const sessionId = await testCreateSession();
    await testPrompt(sessionId);
    await testCleanup(sessionId);
    console.log("ALL TESTS PASSED");
  } catch (err) {
    console.error("FAIL:", err);
    process.exit(1);
  }
}

main();
