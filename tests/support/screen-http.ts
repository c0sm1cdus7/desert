// The screen door on a loopback listener, mounted the way a host would, and a client of it: for specs only.
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { setTimeout as delay } from "node:timers/promises";
import type { ScreenDoor } from "../../src/doors/screen/screen-door.ts";
import { parseFrame, type Frame } from "../../src/doors/screen/screen-wire.ts";
import type { Intent } from "../../src/surface/contract/contract.ts";

/** The person's session, from its cookie: the door never sees a cookie, only the id the host resolves from it. */
const sessionOf = (request: IncomingMessage): string | undefined =>
  /(?:^|;\s*)session=([\w-]+)/u.exec(request.headers.cookie ?? "")?.[1];
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
/** Every response as it arrived: its headers and its body, to read what it should never hold. */
type Seen = { readonly headers: Headers; readonly body: string; readonly epoch?: string };
const frameOf = (text: string): Frame => {
  const parsed = parseFrame(JSON.parse(text));
  if (!parsed.ok) throw new Error(`not a frame: ${parsed.reason}`);
  return parsed.value;
};
/** Reads a stream of events in the background, handing each screen to `got` with its body as it came. */
function readEvents(stream: Response, got: (frame: Frame, body: string) => void): void {
  const head = "event: screen\ndata: ";
  void (async () => {
    const decoder = new TextDecoder();
    let text = "";
    const reader = stream.body?.getReader();
    for (let read = await reader?.read(); read && !read.done; read = await reader?.read()) {
      const chunk: unknown = read.value;
      if (chunk instanceof Uint8Array) text += decoder.decode(chunk, { stream: true });
      const events = text.split("\n\n");
      text = events.pop() ?? "";
      for (const event of events.filter(line => line.startsWith(head))) got(frameOf(event.slice(head.length)), event);
    }
  })().catch(() => undefined);
}
/** A browser tab as a host would serve it: its first look, one stream, a look until a screen comes, and its batches
 * numbered after the newest frame it has. Every response it got is kept in `seen`. */
export async function screenClient(url: string, cookie: string, rows: number) {
  const seen: Seen[] = [];
  const pushed: Frame[] = [];
  const headers = { cookie, "Content-Type": "application/json" };
  const view = { visible: true, viewport: { rows } };
  let current: Frame | undefined;
  const post = async (path: string, body: unknown): Promise<Frame> => {
    const response = await fetch(`${url}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
    const text = await response.text();
    const frame = frameOf(text);
    seen.push({ headers: response.headers, body: text, epoch: frame.epoch });
    return (current = frame);
  };
  const first = await post("/surface/look", view);
  const leave = new AbortController();
  const stream = await fetch(`${url}/surface/stream?client=${first.client}`, { headers, signal: leave.signal });
  seen.push({ headers: stream.headers, body: "" });
  readEvents(stream, (frame, body) => {
    seen.push({ headers: stream.headers, body, epoch: frame.epoch });
    pushed.push((current = frame));
  });
  const newest = (): Frame => current ?? first;
  const until = async (holds: (frame: Frame) => boolean): Promise<Frame> => {
    for (let n = 0; n < 200; n++) {
      const looked = await post("/surface/look", { ...view, client: newest().client });
      if (holds(looked)) return looked;
      await delay(25);
    }
    throw new Error("the screen never came");
  };
  const act = (intents: readonly Intent[]): Promise<Frame> => {
    const at = newest();
    return post("/surface/intents", { epoch: at.epoch, client: at.client, seq: at.seq + 1, rev: at.rev, intents });
  };
  return { first, seen, pushed, until, act, leave: () => leave.abort() };
}
