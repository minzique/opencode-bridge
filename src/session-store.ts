import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_STORE_PATH = resolve(
  import.meta.dirname ?? ".",
  "../.sessions.json"
);

export class SessionStore {
  private store: Record<string, string> = {};
  private path: string;

  constructor(path?: string) {
    this.path = path ?? process.env.BRIDGE_SESSION_STORE ?? DEFAULT_STORE_PATH;
    this.load();
  }

  private load(): void {
    try {
      const raw = readFileSync(this.path, "utf-8");
      this.store = JSON.parse(raw);
    } catch {
      this.store = {};
    }
  }

  private save(): void {
    writeFileSync(this.path, JSON.stringify(this.store, null, 2));
  }

  get(agentName: string): string | undefined {
    return this.store[agentName];
  }

  set(agentName: string, sessionId: string): void {
    this.store[agentName] = sessionId;
    this.save();
  }

  delete(agentName: string): void {
    delete this.store[agentName];
    this.save();
  }

  all(): Record<string, string> {
    return { ...this.store };
  }
}
