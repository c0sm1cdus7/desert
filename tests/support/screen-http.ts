// The screen door on a loopback listener, mounted the way a host would: for specs only, since the door has no listener.
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { ScreenDoor } from "../../src/doors/screen/screen-door.ts";

/** The person's session, from its cookie: the door never sees a cookie, only the id the host resolves from it. */
const sessionOf = (request: IncomingMessage): string | undefined =>
  /(?:^|;\s*)sesion=([\w-]+)/u.exec(request.headers.cookie ?? "")?.[1];
async function bodyOf(request: IncomingMessage): Promise<{ readonly json: unknown } | undefined> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  try {
    return { json: JSON.parse(Buffer.concat(chunks).toString("utf8")) };
  } catch {
    return undefined;
  }
}
const send = (response: ServerResponse, status: number, body?: unknown): void => {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(body === undefined ? undefined : JSON.stringify(body));
};
/** A frame for every POST, refused or not; a 400 only for a body that is not JSON. */
async function posted(door: ScreenDoor, house: string, session: string, request: IncomingMessage, res: ServerResponse) {
  const body = await bodyOf(request);
  const path = request.url ?? "";
  if (!body) send(res, 400);
  else if (path === "/surface/look") send(res, 200, await door.look(session, house, body.json));
  else if (path === "/surface/intents") send(res, 200, await door.send(session, house, body.json));
  else send(res, 404);
}
/** Each frame one `event: screen`; a keepalive is a comment line. */
async function streamed(
  door: ScreenDoor,
  house: string,
  session: string,
  request: IncomingMessage,
  res: ServerResponse,
) {
  const client = new URL(request.url ?? "", "http://door").searchParams.get("client") ?? "";
  const leave = new AbortController();
  request.on("close", () => leave.abort());
  res.writeHead(200, { "Content-Type": "text/event-stream" });
  res.write(": connected\n\n");
  for await (const item of door.stream(session, house, client, leave.signal))
    res.write(item === "keepalive" ? ": keepalive\n\n" : `event: screen\ndata: ${JSON.stringify(item)}\n\n`);
  res.end();
}
export async function screenHttp(door: ScreenDoor, house: string) {
  const server = createServer((request, response) => {
    response.setHeader("Cache-Control", "no-store");
    const session = sessionOf(request);
    if (!session) {
      send(response, 401);
      return;
    }
    const route = request.method === "GET" && request.url?.startsWith("/surface/stream") ? streamed : posted;
    route(door, house, session, request, response).catch(() => {
      send(response, 500);
    });
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address !== null ? address.port : 0;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => {
      server.closeAllConnections();
      return new Promise<void>(resolve => server.close(() => resolve()));
    },
  };
}
