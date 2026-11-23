// Remote device sessions live only in memory, keyed by token digest, with bounded calls, answers and one waiting poll.
import { meant } from "../../fields/phrases.ts";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Value } from "@sinclair/typebox/value";
import {
  deviceResult,
  type DeviceEndpoint,
  type DeviceInstallation,
  type DeviceLink,
  type DeviceNotice,
  type DeviceRequest,
  type DeviceResult,
  type NoticeAnswer,
} from "../../fields/device-protocol.ts";
import { deviceTexts } from "../../texts/devices.texts.ts";
import { deviceHttpLimits, type CallResult } from "./device-wire.ts";
type Call = {
  request: DeviceRequest;
  delivered: boolean;
  resolve: (result: DeviceResult) => void;
  reject: (error: Error) => void;
};
/** Sees each valid receipt before the house does; its failure never changes the receipt. */
export type Observer = (device: string, request: DeviceRequest, result: DeviceResult) => void;
/** Sees a notice with its value once, when the house writes it; never a held or refused one, nor a repeat. */
export type NoticeObserver = (device: string, notice: DeviceNotice) => void;
const digest = (token: string) => createHash("sha256").update(token).digest("base64url");
export class RemoteDeviceSession {
  readonly device: string;
  seen: number;
  private readonly calls = new Map<string, Call>();
  private readonly queue: string[] = [];
  private readonly answers = new Map<string, NoticeAnswer>();
  private waiting: (() => void) | undefined;
  private connection: DeviceLink | undefined;
  private ended = false;
  private readonly observe: Observer | undefined;
  private readonly hear: NoticeObserver | undefined;
  constructor(device: string, seen: number, observe?: Observer, hear?: NoticeObserver) {
    this.device = device;
    this.seen = seen;
    this.observe = observe;
    this.hear = hear;
  }
  /** A method rather than a getter, so a check made before an await is never assumed after it. */
  live() {
    return !this.ended;
  }
  endpoint(inventory: readonly DeviceInstallation[]): DeviceEndpoint {
    return { inventory, receive: request => this.receive(request) };
  }
  bind(connection: DeviceLink) {
    this.connection = connection;
  }
  /** Each notice is answered now or, if held, when the house records it; it throws while the house cannot record. */
  announce(notices: readonly DeviceNotice[]) {
    const connection = this.connection;
    if (this.ended || !connection) throw new Error(meant(deviceTexts.unavailable));
    for (const notice of notices) {
      const answer = connection.announce(
        notice,
        later => {
          // A held notice's answer goes out with whichever poll is waiting; the one that brought it already left.
          this.answer(notice, later);
          this.waiting?.();
        },
        () => this.heard(notice),
      );
      if (answer !== "held") this.answer(notice, answer);
    }
  }
  private answer(notice: DeviceNotice, answer: NoticeAnswer) {
    if (!this.ended) this.answers.set(notice.execution, answer);
  }
  private heard(notice: DeviceNotice) {
    try {
      this.hear?.(this.device, notice);
    } catch {
      /* An observer is a host's view of the work; the house already recorded the notice. */
    }
  }
  /** Whether a poll has answers to carry, so it does not wait. */
  answering() {
    return this.answers.size > 0;
  }
  answered() {
    const taken = [...this.answers].slice(0, deviceHttpLimits.notices);
    for (const [execution] of taken) this.answers.delete(execution);
    return taken.map(([execution, answer]) => ({ execution, answer }));
  }
  private receive(request: DeviceRequest) {
    if (this.ended || this.calls.size >= deviceHttpLimits.calls)
      return Promise.reject(new Error(meant(deviceTexts.unavailable)));
    const call = randomUUID();
    return new Promise<DeviceResult>((resolve, reject) => {
      this.calls.set(call, { request, delivered: false, resolve, reject });
      this.queue.push(call);
      this.waiting?.();
    });
  }
  /** Only a delivered call takes a result, once; anything else is ignored without a trace. */
  settle(results: readonly CallResult[]) {
    for (const each of results) {
      const call = this.calls.get(each.call);
      if (!call?.delivered) continue;
      this.calls.delete(each.call);
      if (!("result" in each) || !Value.Check(deviceResult, each.result)) {
        call.reject(new Error(meant(deviceTexts.failed)));
        continue;
      }
      try {
        this.observe?.(this.device, call.request, each.result);
      } catch {
        /* An observer is a host's view of the work; the house still records the device's receipt. */
      }
      call.resolve(each.result);
    }
  }
  take() {
    return this.queue.splice(0, deviceHttpLimits.delivered).flatMap(call => {
      const found = this.calls.get(call);
      if (!found) return [];
      found.delivered = true;
      return [{ call, request: found.request }];
    });
  }
  /** One poll waits at a time: a newer poll answers the older one at once, so neither holds work back. */
  wait(milliseconds: number, signal: AbortSignal): Promise<void> {
    if (this.ended || this.queue.length > 0 || this.answers.size > 0 || signal.aborted) return Promise.resolve();
    this.waiting?.();
    return new Promise<void>(resolve => {
      const done = () => {
        clearTimeout(timer);
        signal.removeEventListener("abort", done);
        if (this.waiting === done) this.waiting = undefined;
        resolve();
      };
      const timer = setTimeout(done, milliseconds);
      this.waiting = done;
      signal.addEventListener("abort", done, { once: true });
    });
  }
  idle(now: number, milliseconds: number) {
    return this.waiting === undefined && now - this.seen >= milliseconds;
  }
  /** The house learns of the cut first, so pending executions end unknown with its own reason. */
  end() {
    if (this.ended) return;
    this.ended = true;
    this.waiting?.();
    this.connection?.disconnect();
    for (const call of this.calls.values()) call.reject(new Error(meant(deviceTexts.disconnected)));
    this.calls.clear();
    this.queue.length = 0;
    this.answers.clear();
  }
}
export class RemoteDeviceSessions {
  private readonly tokens = new Map<string, RemoteDeviceSession>();
  private readonly devices = new Map<string, RemoteDeviceSession>();
  full(device: string) {
    return this.tokens.size >= deviceHttpLimits.sessions && !this.devices.has(device);
  }
  /** A verified connection replaces the device's previous session before the house sees the new one. */
  replace(device: string) {
    this.devices.get(device)?.end();
    this.forget();
  }
  add(session: RemoteDeviceSession) {
    const token = randomBytes(32).toString("base64url");
    this.tokens.set(digest(token), session);
    this.devices.set(session.device, session);
    return token;
  }
  find(token: string | undefined) {
    const session = token === undefined ? undefined : this.tokens.get(digest(token));
    return session?.live() ? session : undefined;
  }
  sweep(now: number, idle: number, authorized: (device: string) => boolean) {
    for (const session of this.tokens.values())
      if (session.live() && (session.idle(now, idle) || !authorized(session.device))) session.end();
    this.forget();
  }
  close() {
    for (const session of this.tokens.values()) session.end();
    this.forget();
  }
  private forget() {
    for (const [key, session] of this.tokens) if (!session.live()) this.tokens.delete(key);
    for (const [device, session] of this.devices) if (!session.live()) this.devices.delete(device);
  }
}
