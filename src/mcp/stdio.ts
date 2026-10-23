import { serveStdio, StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import type { LocalSession } from "../local/session.ts";
import { createAgentMcpServer } from "./server.ts";

export function serveAgentStdio(session: LocalSession) {
  // Validate the session before opening stdin; the factory is owned by the MCP transport.
  const first = createAgentMcpServer(session);
  let used = false;
  return serveStdio(() => {
    if (!used) { used = true; return first; }
    return createAgentMcpServer(session);
  }, { transport: new StdioServerTransport(process.stdin, process.stdout, { maxBufferSize: 1024 * 1024 }) });
}
