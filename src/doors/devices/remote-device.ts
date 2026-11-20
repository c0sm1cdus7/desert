// Connect a device to a remote house over HTTPS: sign one challenge, long-poll for work and post its receipts.
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
}>;
type Link = { token: string; ready: CallResult[]; alive: boolean; flushing: boolean };
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
      } catch {
        /* Network failures and refusals only delay the next attempt; nothing about them is printed. */
      }
      if (this.stopped()) return;
      await pause(Math.min(max, first * 2 ** this.retries), undefined, { signal: this.signal }).catch(() => undefined);
      this.retries = Math.min(this.retries + 1, 16);
    }
  }
  private stopped() {
    return this.signal.aborted;
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
    const link: Link = { token, ready: [], alive: true, flushing: false };
    try {
      while (link.alive && !this.signal.aborted) await this.poll(link);
    } finally {
      link.alive = false;
    }
  }
  private async poll(link: Link) {
    const text = await this.post(devicePaths.poll, { results: take(link.ready) }, pollTimeout(), link.token);
    const answer = parsed(pollAnswer, text);
    if (!answer) throw new Error(deviceTexts.invalid);
    this.retries = 0;
    for (const { call, request } of answer.requests) void this.execute(link, call, request);
  }
  private async execute(link: Link, call: string, request: DeviceRequest) {
    let entry: CallResult;
    try {
      entry = { call, result: await this.options.endpoint.receive(request) };
      // A receipt too large for one body cannot travel, so the house learns its outcome is unknown.
      if (Buffer.byteLength(JSON.stringify(entry)) + 64 > deviceHttpLimits.body) entry = { call, failed: true };
    } catch {
      entry = { call, failed: true };
    }
    if (!link.alive) return;
    link.ready.push(entry);
    this.flush(link);
  }
  /** A second poll carries ready results at once; the house answers the older waiting poll right away. */
  private flush(link: Link) {
    if (!link.alive || link.flushing || this.signal.aborted || link.ready.length === 0) return;
    link.flushing = true;
    void this.poll(link)
      .catch(() => {
        link.alive = false;
      })
      .finally(() => {
        link.flushing = false;
        this.flush(link);
      });
  }
}
const pollTimeout = () => deviceHttpLimits.pollMs + 15_000;
function take(ready: CallResult[]) {
  const taken: CallResult[] = [];
  let size = 64;
  for (const next of ready) {
    const bytes = Buffer.byteLength(JSON.stringify(next)) + 1;
    if (taken.length >= deviceHttpLimits.results || size + bytes > deviceHttpLimits.body) break;
    taken.push(next);
    size += bytes;
  }
  ready.splice(0, taken.length);
  return taken;
}
/** Runs until `signal` aborts, reconnecting with backoff after a network failure or a refused session. */
export async function connectRemoteDevice(options: RemoteDeviceOptions): Promise<void> {
  await new RemoteDevice(options, options.signal ?? new AbortController().signal).run();
}
