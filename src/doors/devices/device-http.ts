// Serve the device door over plain HTTP: a signed challenge opens an in-memory session that long-polls for work.
import type { DeviceEndpoint } from "../../fields/device-protocol.ts";
import { createDeviceDoor } from "../../runtime/devices/device-authentication.ts";
import { bodyFailure, empty, header, readBody, type McpRequest, type McpResponse } from "../mcp/mcp-access.ts";
import { RemoteDeviceSession, RemoteDeviceSessions, type Observer } from "./device-sessions.ts";
import { challengeBody, connectBody, deviceHttpLimits, devicePaths, parsed, pollBody } from "./device-wire.ts";
export type DeviceAccess = Readonly<{
  authentication: (id: string) => string;
  connect: (id: string, endpoint: DeviceEndpoint) => Readonly<{ disconnect: () => void }>;
}>;
/** What a host gives the HTTP door to admit devices; the clock and waits are injectable for tests. */
export type DeviceDoorOptions = Readonly<{
  access: DeviceAccess;
  now?: () => number;
  idleMs?: number;
  pollMs?: number;
  /** Called with every valid result a device posts, before the house receives it. */
  observe?: Observer;
}>;
const answer = (value: unknown): McpResponse => ({
  status: 200,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(value),
});
const denied = () => empty(401, { "WWW-Authenticate": "Bearer", "Cache-Control": "no-store" });
const challengeMs = 30_000;
class DeviceHttp {
  private readonly access: DeviceAccess;
  private readonly now: () => number;
  private readonly idleMs: number;
  private readonly pollMs: number;
  private readonly observe: Observer | undefined;
  private readonly sessions = new RemoteDeviceSessions();
  private readonly challenges = new Map<string, Readonly<{ device: string; expires: number }>>();
  private readonly door: ReturnType<typeof createDeviceDoor>;
  private readonly closing = new AbortController();
  private readonly timer: NodeJS.Timeout;
  private readonly unwatch: () => void;
  constructor(options: DeviceDoorOptions, watch: (changed: () => void) => () => void) {
    this.access = options.access;
    this.now = options.now ?? Date.now;
    this.idleMs = options.idleMs ?? deviceHttpLimits.idleMs;
    this.pollMs = options.pollMs ?? deviceHttpLimits.pollMs;
    this.observe = options.observe;
    // Only a verified signature reaches this connect, so an anonymous caller can never end a live session.
    this.door = createDeviceDoor(
      {
        authentication: id => this.access.authentication(id),
        connect: (id, endpoint) => {
          this.sessions.replace(id);
          return this.access.connect(id, endpoint);
        },
      },
      this.now,
    );
    this.timer = setInterval(() => this.sweep(), Math.min(this.idleMs, 5_000));
    this.timer.unref();
    this.unwatch = watch(() => this.sweep());
  }
  private sweep() {
    this.sessions.sweep(this.now(), this.idleMs, device => {
      try {
        this.access.authentication(device);
        return true;
      } catch {
        return false;
      }
    });
  }
  async handle(request: McpRequest): Promise<McpResponse> {
    if (this.closing.signal.aborted) return empty(503);
    this.sweep();
    const paths: readonly string[] = Object.values(devicePaths);
    if (!paths.includes(request.path)) return empty(404);
    if (request.method !== "POST") return empty(405, { Allow: "POST" });
    if (request.path === devicePaths.poll) return this.poll(request);
    const failed = bodyFailure(request);
    if (failed) return failed;
    const text = await body(request);
    if (typeof text !== "string") return text;
    return request.path === devicePaths.challenge ? this.challenge(text) : this.connect(text);
  }
  private challenge(text: string): McpResponse {
    const input = parsed(challengeBody, text);
    if (!input) return empty(400);
    const now = this.now();
    for (const [id, each] of this.challenges) if (each.expires <= now) this.challenges.delete(id);
    const open = [...this.challenges.values()].filter(each => each.device === input.device).length;
    if (open >= deviceHttpLimits.challenges) return empty(429, { "Retry-After": "30" });
    try {
      const issued = this.door.challenge(input.device);
      this.challenges.set(issued.id, { device: input.device, expires: now + challengeMs });
      return answer(issued);
    } catch {
      return denied();
    }
  }
  private connect(text: string): McpResponse {
    const input = parsed(connectBody, text);
    if (!input) return empty(400);
    const pending = this.challenges.get(input.id);
    this.challenges.delete(input.id);
    if (!pending) return denied();
    if (this.sessions.full(pending.device)) return empty(503, { "Retry-After": "30" });
    const session = new RemoteDeviceSession(pending.device, this.now(), this.observe);
    try {
      session.bind(this.door.connect(input.id, input.signature, session.endpoint(input.inventory)));
    } catch {
      session.end();
      return denied();
    }
    return answer({ session: this.sessions.add(session) });
  }
  private async poll(request: McpRequest): Promise<McpResponse> {
    const token = header(request, "authorization")?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
    const session = this.sessions.find(token);
    if (!session) return denied();
    session.seen = this.now();
    const failed = bodyFailure(request);
    if (failed) return failed;
    const text = await body(request);
    if (typeof text !== "string") return text;
    const input = parsed(pollBody, text);
    if (!input) return empty(400);
    if (!session.live()) return denied();
    session.settle(input.results);
    const signal = AbortSignal.any([this.closing.signal, ...(request.signal ? [request.signal] : [])]);
    try {
      await session.wait(this.pollMs, signal);
    } finally {
      session.seen = this.now();
    }
    if (this.closing.signal.aborted) return empty(503);
    if (!session.live()) return denied();
    // A caller that already left takes nothing, so its requests stay queued for the next poll.
    if (request.signal?.aborted) return empty(408);
    return answer({ requests: session.take() });
  }
  close() {
    this.closing.abort();
    clearInterval(this.timer);
    this.unwatch();
    this.sessions.close();
    return Promise.resolve();
  }
}
async function body(request: McpRequest): Promise<string | McpResponse> {
  try {
    return (await readBody(request)) ?? empty(413);
  } catch {
    return empty(400);
  }
}
/** The HTTP device door; `watch` subscribes to house changes so a retired device is cut off at once. */
export const deviceHttp = (options: DeviceDoorOptions, watch: (changed: () => void) => () => void) =>
  new DeviceHttp(options, watch);
export type DeviceHttpDoor = ReturnType<typeof deviceHttp>;
