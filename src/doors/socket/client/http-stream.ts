// Adapt authenticated HTTP events to the existing framed duplex, with ordered POSTs and no action retries.
import { everySaid, meant } from "../../../fields/phrases.ts";
import { Duplex } from "node:stream";
import { remoteAddress } from "../../../runtime/remote-address.ts";
import { socketTexts } from "../../../texts/socket.texts.ts";
import { SocketOpeningError } from "../wire/socket-error.ts";
import { frameReader, serverFrame } from "../wire/frame.ts";
import { readClient, socketLimits, type ClientMessage } from "../wire/protocol.ts";
class HttpStream extends Duplex {
  private readonly url: URL;
  private readonly headers: Record<string, string>;
  private readonly controller: AbortController;
  private readonly send: typeof fetch;
  private resumeRead: (() => void) | undefined;
  constructor(url: URL, headers: Record<string, string>, controller: AbortController, send: typeof fetch) {
    super();
    this.url = url;
    this.headers = headers;
    this.controller = controller;
    this.send = send;
  }
  override _read() {
    this.resumeRead?.();
    this.resumeRead = undefined;
  }
  override _destroy(_error: Error | null, done: (error?: Error | null) => void) {
    this.controller.abort();
    this._read();
    done();
  }
  override _write(bytes: Buffer, _encoding: BufferEncoding, done: (error?: Error | null) => void) {
    void this.post(bytes).then(
      () => done(),
      () => {
        done(new Error(meant(socketTexts.beforeState)));
        this.destroy();
      },
    );
  }
  private async post(bytes: Buffer) {
    const messages: ClientMessage[] = [];
    const reader = frameReader("client", value => messages.push(readClient(value)));
    reader.push(bytes);
    reader.end();
    for (const message of messages) {
      const response = await this.send(this.url, {
        method: "POST",
        headers: { ...this.headers, "Content-Type": "application/json" },
        body: JSON.stringify(message.type === "hello" ? { ...message, token: "http" } : message),
        redirect: "error",
        signal: AbortSignal.any([this.controller.signal, AbortSignal.timeout(socketLimits.frameMs)]),
      });
      await response.body?.cancel();
      if (response.status === 401) this.push(serverFrame({ type: "cut", reason: socketTexts.denied }));
      if (response.status !== 202) throw new Error(meant(socketTexts.beforeState));
    }
  }
  async receive(body: ReadableStream<Uint8Array>) {
    try {
      for await (const bytes of eventBytes(body)) {
        if (this.destroyed) return;
        if (!this.push(bytes))
          await new Promise<void>(resolve => {
            this.resumeRead = resolve;
          });
      }
    } catch {
      /* Transport failures reveal no remote URL, header, body or credential. */
    } finally {
      this.destroy();
    }
  }
}
async function* eventBytes(body: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let pending = "";
  for await (const chunk of body) {
    pending += decoder.decode(chunk, { stream: true });
    let end: number;
    while ((end = pending.indexOf("\n\n")) >= 0) {
      const event = pending.slice(0, end);
      pending = pending.slice(end + 2);
      if (event.startsWith(":")) continue;
      if (event.length > socketLimits.chunk * 2 || !/^data: [A-Za-z0-9+/]+={0,2}$/.test(event))
        throw new Error(meant(socketTexts.frame));
      yield Buffer.from(event.slice(6), "base64");
    }
    if (pending.length > socketLimits.chunk * 2) throw new Error(meant(socketTexts.frame));
  }
  if (pending || decoder.decode()) throw new Error(meant(socketTexts.frame));
}
export async function httpStream(
  address: string,
  token: string,
  signal?: AbortSignal,
  send: typeof fetch = fetch,
): Promise<Duplex> {
  const url = remoteAddress(address);
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, socketLimits.helloMs);
  try {
    const headers = { Authorization: `Bearer ${token}` };
    const response = await send(url, { headers, redirect: "error", signal: controller.signal });
    const session = response.headers.get("desert-session");
    if (
      response.status !== 200 ||
      !response.body ||
      !session ||
      response.headers.get("content-type") !== "text/event-stream"
    ) {
      await response.body?.cancel();
      if (response.status === 401) throw new SocketOpeningError(everySaid(socketTexts.denied));
      throw new Error(meant(socketTexts.beforeState));
    }
    const stream = new HttpStream(url, { ...headers, "Desert-Session": session }, controller, send);
    stream.once("close", () => signal?.removeEventListener("abort", abort));
    void stream.receive(response.body);
    return stream;
  } catch (error) {
    controller.abort();
    signal?.removeEventListener("abort", abort);
    throw error instanceof SocketOpeningError ? error : new Error(meant(socketTexts.beforeState));
  } finally {
    clearTimeout(timer);
  }
}
