import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface AgentConfig {
  url: string;
  description?: string;
  password?: string;
  username?: string;
}

export interface BridgeConfig {
  agents: Record<string, AgentConfig>;
}

const DEFAULT_CONFIG_PATH = resolve(
  import.meta.dirname ?? ".",
  "../agents.json"
);

export function loadRegistry(
  configPath?: string
): BridgeConfig {
  const path = configPath ?? process.env.BRIDGE_CONFIG ?? DEFAULT_CONFIG_PATH;
  const raw = readFileSync(path, "utf-8");
  const parsed = JSON.parse(raw) as BridgeConfig;

  if (!parsed.agents || typeof parsed.agents !== "object") {
    throw new Error(`Invalid agents.json: missing "agents" object at ${path}`);
  }

  for (const [name, agent] of Object.entries(parsed.agents)) {
    if (!agent.url) {
      throw new Error(`Agent "${name}" missing required "url" field`);
    }
  }

  return parsed;
}

export function getAgent(
  registry: BridgeConfig,
  name: string
): AgentConfig {
  const agent = registry.agents[name];
  if (!agent) {
    const available = Object.keys(registry.agents).join(", ");
    throw new Error(
      `Agent "${name}" not found. Available: ${available}`
    );
  }
  return agent;
}

export function listAgentNames(registry: BridgeConfig): string[] {
  return Object.keys(registry.agents);
}
