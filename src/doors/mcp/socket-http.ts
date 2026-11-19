// Carry the socket protocol over authenticated POSTs and a bounded event stream on the MCP listener.
import { randomUUID } from "node:crypto";
import { duplexPair, type Duplex } from "node:stream";
import type { Program } from "../../tools/tool-contract.ts";
import { isMindActor } from "../../fields/mind-actor.ts";
import { present } from "../../house/kit.ts";
import { liveDoorKeys } from "../socket/peers/live-door-keys.ts";
import { remoteSessions } from "../socket/server/remote-sessions.ts";
import type { Session } from "../socket/requests/door-session.ts";
import { clientFrame } from "../socket/wire/frame.ts";
import { readClient, socketLimits } from "../socket/wire/protocol.ts";
import { requestBudget } from "../socket/peers/request-budget.ts";
import { authenticate, bodyFailure, empty, header, readBody, type McpRequest, type McpResponse } from "./mcp-access.ts";
import { abortableResponse } from "./mcp-sessions.ts";
type Channel = { key: string; wire: Duplex; stop: () => void; signal: AbortSignal };
class SocketHttp<X extends Program> {
  private readonly house: Session<X>["house"];
  private readonly keys: Session<X>["keys"];
  private readonly sessions: ReturnType<typeof remoteSessions<X>>;
  private readonly channels = new Map<string, Channel>();
  private readonly budgets = new Map<string, ReturnType<typeof requestBudget>>();
  private readonly closing = new AbortController();
  constructor(house: Session<X>["house"], keys: Session<X>["keys"]) {
    this.house = house;
    this.keys = keys;
    this.sessions = remoteSessions(house, keys);
  }
  private identity(request: McpRequest) {
    const key = authenticate(request, this.keys);
    return key &&
      !isMindActor(key.identity) &&
      present(this.house.registry, this.house.tools.state().house, key.identity)
      ? key
      : undefined;
  }
  private open(request: McpRequest, key: string): McpResponse {
    if ([...this.channels.values()].filter(channel => channel.key === key).length >= socketLimits.waits)
      return empty(429);
    const id = randomUUID();
    const [wire, peer] = duplexPair();
    const controller = new AbortController();
    const stop = () => {
      controller.abort();
      wire.destroy();
      peer.destroy();
    };
    const channel = { key, wire, stop, signal: controller.signal };
    this.channels.set(id, channel);
    const unwatch = this.house.bus.on(() => {
      if (this.identity(request)?.id !== key) stop();
    });
    request.signal?.addEventListener("abort", stop, { once: true });
    wire.once("close", () => {
      peer.destroy();
      unwatch();
      this.channels.delete(id);
      request.signal?.removeEventListener("abort", stop);
    });
    peer.once("close", stop);
    this.sessions.accept(peer);
    if (request.signal?.aborted) stop();
    return {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
        "Desert-Session": id,
      },
      body: "",
      events: events(wire),
    };
  }
  private async post(request: McpRequest, key: string): Promise<McpResponse> {
    const channel = this.channels.get(header(request, "desert-session") ?? "");
    if (!channel || channel.key !== key || channel.wire.destroyed) return empty(409);
    const failed = bodyFailure(request);
    if (failed) return failed;
    const signal = AbortSignal.any([
      this.closing.signal,
      channel.signal,
      AbortSignal.timeout(socketLimits.frameMs),
      ...(request.signal ? [request.signal] : []),
    ]);
    return abortableResponse(this.write(request, key, channel, signal), signal, () =>
      empty(this.identity(request)?.id === key ? 408 : 401),
    );
  }
  private async write(request: McpRequest, key: string, channel: Channel, signal: AbortSignal) {
    try {
      const body = await readBody(request);
      if (body === undefined) return empty(413);
      if (signal.aborted) return empty(408);
      if (this.identity(request)?.id !== key) return empty(401);
      if (channel.wire.destroyed) return empty(409);
      const message = readClient(JSON.parse(body));
      // The HTTP header is the sole credential; a hello body cannot switch identities.
      if (message.tipo === "hola") message.token = header(request, "authorization")?.replace(/^Bearer /i, "") ?? "";
      if (channel.wire.writableLength > socketLimits.pendingBytes) {
        channel.stop();
        return empty(429);
      }
      await new Promise<void>((resolve, reject) =>
        channel.wire.write(clientFrame(message), error => (error ? reject(error) : resolve())),
      );
      return empty(202);
    } catch {
      return empty(400);
    }
  }
  async handle(request: McpRequest): Promise<McpResponse> {
    if (this.closing.signal.aborted) return empty(503);
    if (request.method !== "GET" && request.method !== "POST") return empty(405, { Allow: "GET,POST" });
    const key = this.identity(request);
    if (!key?.id) return empty(401, { "WWW-Authenticate": "Bearer" });
    const budget = this.budgets.get(key.identity) ?? requestBudget();
    this.budgets.set(key.identity, budget);
    if (!budget.take(false)) return empty(429, { "Retry-After": "1" });
    return request.method === "GET" ? this.open(request, key.id) : this.post(request, key.id);
  }
  async close() {
    this.closing.abort();
    for (const channel of this.channels.values()) channel.stop();
    await this.sessions.close();
  }
}
export const socketHttp = <X extends Program>(house: Session<X>["house"], keys = liveDoorKeys(house)) =>
  new SocketHttp(house, keys);
async function* events(wire: Duplex): AsyncIterable<string> {
  const reader = wire[Symbol.asyncIterator]();
  let timer: NodeJS.Timeout | undefined;
  try {
    yield ": connected\n\n";
    let next = reader.next();
    while (!wire.destroyed) {
      const item = await Promise.race([
        next,
        new Promise<undefined>(resolve => {
          timer = setTimeout(() => resolve(undefined), 15_000);
        }),
      ]);
      clearTimeout(timer);
      if (!item) {
        yield ": keepalive\n\n";
        continue;
      }
      if (item.done || !Buffer.isBuffer(item.value)) break;
      const value = item.value;
      for (let offset = 0; offset < value.length; offset += socketLimits.chunk)
        yield `data: ${value.subarray(offset, offset + socketLimits.chunk).toString("base64")}\n\n`;
      next = reader.next();
    }
  } catch {
    /* Disconnects end only this stream; reconnection uses the existing request book. */
  } finally {
    clearTimeout(timer);
    wire.destroy();
  }
}
