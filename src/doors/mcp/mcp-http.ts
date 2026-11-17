// Adaptador HTTP fino: presta un cuerpo perezoso al manejador y escucha solo donde el programa lo indica.
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { socketLimits } from "../socket/wire/protocol.ts";
import type { McpRequest, McpResponse } from "./mcp-access.ts";
type Door = Readonly<{ handle: (request: McpRequest) => Promise<McpResponse>; close: () => Promise<void> }>;
function incoming(request: IncomingMessage, response: ServerResponse): McpRequest {
  const controller = new AbortController();
  const abort = () => controller.abort();
  request.once("aborted", abort);
  response.once("close", abort);
  return {
    method: request.method ?? "",
    path: request.url ?? "",
    headers: request.headers,
    signal: controller.signal,
    body: async function* () {
      for await (const chunk of request.iterator({ destroyOnReturn: false })) {
        if (!(chunk instanceof Uint8Array)) throw new Error("Invalid HTTP body chunk");
        yield chunk;
      }
    },
  };
}
async function answer(door: Door, request: IncomingMessage, response: ServerResponse) {
  try {
    const result = await door.handle(incoming(request, response));
    if (response.destroyed) return;
    response.writeHead(result.status, { ...result.headers, ...(request.complete ? {} : { Connection: "close" }) });
    response.end(result.body);
  } catch {
    if (!response.headersSent) response.writeHead(500);
    response.end();
  }
}
export async function serveMcp(door: Door, options: Readonly<{ host: string; port: number }>) {
  if (!options.host || !Number.isInteger(options.port) || options.port < 0 || options.port > 65535)
    throw new Error("MCP requires host and a valid port");
  const server = createServer((request, response) => {
    void answer(door, request, response);
  });
  server.requestTimeout = 65_000;
  server.headersTimeout = socketLimits.frameMs;
  await new Promise<void>((resolve, reject) => {
    const fail = (error: Error) => reject(error);
    server.once("error", fail);
    server.listen(options.port, options.host, () => {
      server.off("error", fail);
      resolve();
    });
  });
  const close = async () => {
    const closing = new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
    server.closeAllConnections();
    await door.close();
    await closing;
  };
  return { address: server.address(), close };
}
