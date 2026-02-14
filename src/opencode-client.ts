export interface Session {
  id: string;
  parentID?: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessagePart {
  type: string;
  text?: string;
  [key: string]: unknown;
}

export interface MessageInfo {
  id: string;
  role: "user" | "assistant" | "system";
  sessionID: string;
  createdAt: string;
  [key: string]: unknown;
}

export interface MessageWithParts {
  info: MessageInfo;
  parts: MessagePart[];
}

export interface HealthResponse {
  healthy: boolean;
  version: string;
}

export interface SessionStatus {
  [sessionId: string]: unknown;
}

export class OpencodeClient {
  private baseUrl: string;
  private authHeader?: string;

  constructor(opts: {
    url: string;
    password?: string;
    username?: string;
  }) {
    this.baseUrl = opts.url.replace(/\/$/, "");
    if (opts.password) {
      const user = opts.username ?? "opencode";
      this.authHeader =
        "Basic " + Buffer.from(`${user}:${opts.password}`).toString("base64");
    }
  }

  private async request<T>(
    method: string,
    path: string,
    opts?: { body?: unknown; timeout?: number }
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (this.authHeader) {
      headers["Authorization"] = this.authHeader;
    }

    const controller = new AbortController();
    const timeoutMs = opts?.timeout ?? 300_000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: opts?.body ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `${method} ${path} → ${res.status} ${res.statusText}: ${text}`
        );
      }

      const text = await res.text();
      if (!text) return {} as T;
      return JSON.parse(text) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  /** GET /global/health */
  async health(): Promise<HealthResponse> {
    return this.request("GET", "/global/health", { timeout: 5_000 });
  }

  /** GET /session — list all sessions */
  async listSessions(): Promise<Session[]> {
    return this.request("GET", "/session");
  }

  /** POST /session — create a new session */
  async createSession(title?: string): Promise<Session> {
    return this.request("POST", "/session", {
      body: { title: title ?? "Bridge session" },
    });
  }

  /** GET /session/:id — get session details */
  async getSession(sessionId: string): Promise<Session> {
    return this.request("GET", `/session/${sessionId}`);
  }

  /** POST /session/:id/message — send prompt, wait for response */
  async prompt(
    sessionId: string,
    text: string,
    opts?: { model?: { providerID: string; modelID: string } }
  ): Promise<MessageWithParts> {
    return this.request("POST", `/session/${sessionId}/message`, {
      body: {
        parts: [{ type: "text", text }],
        ...(opts?.model ? { model: opts.model } : {}),
      },
      timeout: 300_000,
    });
  }

  /** POST /session/:id/prompt_async — fire-and-forget prompt */
  async promptAsync(
    sessionId: string,
    text: string
  ): Promise<void> {
    await this.request("POST", `/session/${sessionId}/prompt_async`, {
      body: {
        parts: [{ type: "text", text }],
      },
    });
  }

  /** GET /session/:id/message — list messages in session */
  async getMessages(
    sessionId: string,
    limit?: number
  ): Promise<MessageWithParts[]> {
    const query = limit ? `?limit=${limit}` : "";
    return this.request("GET", `/session/${sessionId}/message${query}`);
  }

  /** POST /session/:id/abort — abort running session */
  async abort(sessionId: string): Promise<boolean> {
    return this.request("POST", `/session/${sessionId}/abort`);
  }

  /** DELETE /session/:id — delete session */
  async deleteSession(sessionId: string): Promise<boolean> {
    return this.request("DELETE", `/session/${sessionId}`);
  }

  /** GET /session/status — get status of all sessions */
  async getSessionStatuses(): Promise<Record<string, unknown>> {
    return this.request("GET", "/session/status", { timeout: 10_000 });
  }
}
