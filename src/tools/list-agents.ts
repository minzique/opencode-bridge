import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BridgeConfig } from "../registry.js";
import type { SessionStore } from "../session-store.js";
import { OpencodeClient } from "../opencode-client.js";

export function registerListAgents(
  server: McpServer,
  registry: BridgeConfig,
  sessions: SessionStore
) {
  server.tool(
    "list_agents",
    "List all registered remote OpenCode agents with their online/offline status and active session info.",
    {},
    async () => {
      const lines: string[] = [];

      for (const [name, config] of Object.entries(registry.agents)) {
        const client = new OpencodeClient(config);
        let status = "OFFLINE";
        let version = "";

        try {
          const health = await client.health();
          if (health.healthy) {
            status = "ONLINE";
            version = health.version ? ` (v${health.version})` : "";
          }
        } catch {
          status = "OFFLINE";
        }

        const activeSession = sessions.get(name);
        const sessionInfo = activeSession
          ? `  session: ${activeSession}`
          : "  no active session";

        const desc = config.description ? ` — ${config.description}` : "";
        lines.push(
          `${name}: ${status}${version} @ ${config.url}${desc}\n${sessionInfo}`
        );
      }

      return {
        content: [
          {
            type: "text" as const,
            text: lines.length
              ? lines.join("\n\n")
              : "No agents configured in registry.",
          },
        ],
      };
    }
  );
}
