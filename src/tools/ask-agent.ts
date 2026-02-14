import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BridgeConfig } from "../registry.js";
import type { SessionStore } from "../session-store.js";
import { getAgent } from "../registry.js";
import { OpencodeClient } from "../opencode-client.js";

const inputSchema = z.object({
  agent: z.string().describe('Agent name from registry (e.g. "mac-mini")'),
  prompt: z.string().describe("The prompt to send to the remote agent"),
  session_id: z
    .string()
    .optional()
    .describe("Existing session ID to continue a conversation. Omit to start new."),
  new_session: z
    .boolean()
    .optional()
    .describe("Force a new session even if one exists for this agent"),
});

export function registerAskAgent(
  server: McpServer,
  registry: BridgeConfig,
  sessions: SessionStore
) {
  server.tool(
    "ask_agent",
    "Send a prompt to a remote OpenCode agent and get the response. Returns the agent's full reply text plus session_id for continuity.",
    inputSchema.shape,
    async (args) => {
      const { agent: agentName, prompt, session_id, new_session } = args;

      const agentConfig = getAgent(registry, agentName);
      const client = new OpencodeClient(agentConfig);

      let sessionId = session_id;

      if (!sessionId && !new_session) {
        sessionId = sessions.get(agentName);
      }

      if (!sessionId || new_session) {
        const title = `Bridge: ${prompt.slice(0, 60)}`;
        const session = await client.createSession(title);
        sessionId = session.id;
        sessions.set(agentName, sessionId);
      }

      try {
        const result = await client.prompt(sessionId, prompt);

        const responseText = result.parts
          .filter((p) => p.type === "text" && p.text)
          .map((p) => p.text)
          .join("\n");

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  agent: agentName,
                  session_id: sessionId,
                  response: responseText || "(empty response)",
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);

        if (msg.includes("404") || msg.includes("not found")) {
          sessions.delete(agentName);
        }

        return {
          content: [
            {
              type: "text" as const,
              text: `Error talking to agent "${agentName}": ${msg}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
