import type { ApiMethods, Evidence } from "../types.ts";

export class TransportError extends Error {
  readonly code: string;
  constructor(code: string) { super(code); this.code = code; }
}

export function webTransport(digest: string) {
  async function request(path: string, body?: unknown): Promise<unknown> {
    try {
      const response = await fetch(`/api/${path}`, { method: body === undefined ? "GET" : "POST",
        headers: { "Content-Type": "application/json", "X-Desert-Contract": digest },
        credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(path === "availability" ? 1200 : 20000),
        ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      const result = await response.json();
      if (!response.ok) throw new TransportError(typeof result.error === "string" ? result.error : "INVALID_RESPONSE");
      return result;
    } catch (error) {
      if (error instanceof TransportError) throw error;
      throw new TransportError("CONNECTION_LOST");
    }
  }
  return {
    async connect(invitation: string) {
      const result = await request("connect", { invitation }) as { contractDigest: string };
      if (result.contractDigest !== digest) throw new TransportError("CONTRACT_MISMATCH");
    },
    async evidence() { return await request("availability") as Evidence; },
    async call<K extends keyof ApiMethods>(method: K, input: ApiMethods[K]["input"]): Promise<ApiMethods[K]["output"]> {
      return await request(method, input) as ApiMethods[K]["output"];
    },
  };
}
export type Transport = ReturnType<typeof webTransport>;
