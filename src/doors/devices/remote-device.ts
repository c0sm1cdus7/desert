// Connect a device to a remote house over HTTPS: sign one challenge, long-poll for work, post receipts and notices.
import { setTimeout as pause } from "node:timers/promises";
import type { DeviceEndpoint, DeviceRequest } from "../../fields/device-protocol.ts";
import { remoteAddress } from "../../runtime/remote-address.ts";
import { deviceTexts } from "../../texts/devices.texts.ts";
import {
  challengeAnswer,
  connectAnswer,
  deviceHttpLimits,
  devicePaths,
  parsed,
  pollAnswer,
  type CallResult,
} from "./device-wire.ts";
import { NoticeOutbox, reasonOf } from "./remote-notices.ts";
export type RemoteDeviceOptions = Readonly<{
  /** The house origin: HTTPS, or plain HTTP only on localhost. */
  url: string;
  device: string;
  /** Signs the challenge with the device's Ed25519 key and returns base64; the private key stays with the caller. */
  sign: (message: string) => string | Promise<string>;
  endpoint: DeviceEndpoint;
  fetch?: typeof fetch;
  signal?: AbortSignal;
  backoff?: Readonly<{ first: number; max: number }>;
  /** Hears why each connection ended before the next attempt ("connection"), and each problem with a notice, such as
   * one the house refused ("notice"); the reason never carries the session token. */
  report?: (reason: string, about: DeviceReport) => void;
}>;
/** What a reported reason is about, so the host can tell a dropped connection from a notice problem. */
type DeviceReport = "connection" | "notice";
type Link = {
  token: string;
  ready: CallResult[];
  outbox: NoticeOutbox | undefined;
  alive: boolean;
  flushing: boolean;
  cut: Error | undefined;
};
const openMs = 10_000;
class RemoteDevice {
  private readonly options: RemoteDeviceOptions;
  private readonly send: typeof fetch;
  private readonly signal: AbortSignal;
  private retries = 0;
  constructor(options: RemoteDeviceOptions, signal: AbortSignal) {
    this.options = options;
    this.send = options.fetch ?? fetch;
    this.signal = signal;
    remoteAddress(options.url);
  }
  async run() {
    const { first, max } = this.options.backoff ?? { first: 500, max: 30_000 };
    while (!this.stopped()) {
      try {
        await this.serve(await this.open());
      } catch (error) {
        this.tell(reasonOf(error), "connection");
      }
      if (this.stopped()) return;
      await pause(Math.min(max, first * 2 ** this.retries), undefined, { signal: this.signal }).catch(() => undefined);
      this.retries = Math.min(this.retries + 1, 16);
    }
  }
  private stopped() {
    return this.signal.aborted;
  }
  /** Nothing fails in silence: the host decides where the reason goes; a failing reporter never stops the device. */
  private tell(reason: string, about: DeviceReport) {
    try {
      this.options.report?.(reason, about);
    } catch {
      /* The device keeps serving even when its reporter breaks. */
    }
  }
  private async post(path: string, value: unknown, milliseconds: number, token?: string) {
    const response = await this.send(remoteAddress(this.options.url, path), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(value),
      redirect: "error",
      signal: AbortSignal.any([this.signal, AbortSignal.timeout(milliseconds)]),
    });
    const text = await response.text();
    if (response.status === 401) throw new Error(deviceTexts.authentication);
    if (response.status === 400) throw new Error(deviceTexts.refusedBody);
    if (response.status !== 200) throw new Error(deviceTexts.unavailable);
    return text;
  }
  private async open() {
    const { device, endpoint, sign } = this.options;
    const challenge = parsed(challengeAnswer, await this.post(devicePaths.challenge, { device }, openMs));
    if (!challenge) throw new Error(deviceTexts.invalid);
    const signature = await sign(challenge.message);
    const body = { id: challenge.id, signature, inventory: endpoint.inventory };
    const connected = parsed(connectAnswer, await this.post(devicePaths.connect, body, openMs));
    if (!connected) throw new Error(deviceTexts.invalid);
    return connected.session;
  }
  private async serve(token: string) {
    const link: Link = { token, ready: [], outbox: undefined, alive: true, flushing: false, cut: undefined };
    const notices = this.options.endpoint.notices;
    if (notices)
      link.outbox = new NoticeOutbox(
        notices,
        reason => this.tell(reason, "notice"),
        () => this.flush(link),
      );
    const stop = link.outbox ? await link.outbox.open(() => link.alive) : () => {};
    try {
      while (link.alive && !this.signal.aborted) await this.poll(link);
    } finally {
      link.alive = false;
      stop();
    }
    if (link.cut && !this.signal.aborted) throw link.cut;
  }
  private async poll(link: Link) {
    const { results, size } = take(link.ready);
    const body = link.outbox ? { results, notices: link.outbox.offer(size) } : { results };
    const answer = parsed(pollAnswer, await this.post(devicePaths.poll, body, pollTimeout(), link.token));
    if (!answer) throw new Error(deviceTexts.invalid);
    this.retries = 0;
    link.outbox?.settle(answer.answered ?? []);
    for (const { call, request } of answer.requests) void this.execute(link, call, request);
  }
  private async execute(link: Link, call: string, request: DeviceRequest) {
    let entry: CallResult;
    try {
      entry = { call, result: await this.options.endpoint.receive(request) };
      // A receipt too large for one body cannot travel, so the house learns its outcome is unknown.
      const bytes = Buffer.byteLength(JSON.stringify(entry)) + 1;
      if (deviceHttpLimits.envelope + bytes > deviceHttpLimits.body) entry = { call, failed: true };
    } catch {
      entry = { call, failed: true };
    }
    if (!link.alive) return;
    link.ready.push(entry);
    this.flush(link);
  }
  /** A second poll carries ready results and new notices at once; the house answers it without waiting and keeps
   * the first one. */
  private flush(link: Link) {
    if (!link.alive || link.flushing || this.signal.aborted) return;
    if (link.ready.length === 0 && !link.outbox?.ready()) return;
    link.flushing = true;
    void this.poll(link)
      .catch((error: unknown) => {
        link.cut ??= error instanceof Error ? error : new Error(String(error));
        link.alive = false;
      })
      .finally(() => {
        link.flushing = false;
        this.flush(link);
      });
  }
}
const pollTimeout = () => deviceHttpLimits.pollMs + 15_000;
/** The results that fit in one body, and the bytes they use, so notices share what is left. */
function take(ready: CallResult[]) {
  const results: CallResult[] = [];
  let size: number = deviceHttpLimits.envelope;
  for (const next of ready) {
    const bytes = Buffer.byteLength(JSON.stringify(next)) + 1;
    if (results.length >= deviceHttpLimits.results || size + bytes > deviceHttpLimits.body) break;
    results.push(next);
    size += bytes;
  }
  ready.splice(0, results.length);
  return { results, size };
}
/** Runs until `signal` aborts, reconnecting with backoff after a network failure or a refused session. */
export async function connectRemoteDevice(options: RemoteDeviceOptions): Promise<void> {
  await new RemoteDevice(options, options.signal ?? new AbortController().signal).run();
}
