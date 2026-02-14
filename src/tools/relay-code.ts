import { z } from "zod";
import { execSync } from "node:child_process";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const inputSchema = z.object({
  direction: z
    .enum(["push", "pull"])
    .describe("Push local changes to relay remote, or pull remote changes"),
  remote: z
    .string()
    .default("relay")
    .describe('Git remote name (default: "relay")'),
  branch: z
    .string()
    .default("main")
    .describe('Git branch (default: "main")'),
  message: z
    .string()
    .optional()
    .describe("Commit message when pushing (auto-commits staged + untracked)"),
  cwd: z
    .string()
    .optional()
    .describe("Working directory for git operations (defaults to bridge project root)"),
});

function git(cmd: string, cwd?: string): string {
  try {
    return execSync(`git ${cmd}`, {
      cwd: cwd ?? process.env.BRIDGE_GIT_CWD ?? process.cwd(),
      encoding: "utf-8",
      timeout: 30_000,
    }).trim();
  } catch (error) {
    const msg = error instanceof Error ? (error as { stderr?: string }).stderr ?? error.message : String(error);
    throw new Error(`git ${cmd} failed: ${msg}`);
  }
}

export function registerRelayCode(server: McpServer) {
  server.tool(
    "relay_code",
    "Push or pull code through a shared git remote for relaying between machines.",
    inputSchema.shape,
    async (args) => {
      const { direction, remote, branch, message, cwd } = args;

      try {
        if (direction === "push") {
          const status = git("status --porcelain", cwd);
          if (status) {
            git("add -A", cwd);
            git(`commit -m "${message ?? "bridge relay"}"`, cwd);
          }
          const output = git(`push ${remote} ${branch}`, cwd);
          return {
            content: [
              {
                type: "text" as const,
                text: `Pushed to ${remote}/${branch}.\n${output || "(up to date)"}`,
              },
            ],
          };
        }

        const output = git(`pull ${remote} ${branch}`, cwd);
        return {
          content: [
            {
              type: "text" as const,
              text: `Pulled from ${remote}/${branch}.\n${output}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `relay_code error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
