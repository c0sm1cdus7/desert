// A bounded slice per event-loop turn gives other readers and drain callbacks a chance, even for packed frames.
import type { Duplex } from "node:stream";
import { socketLimits } from "../../catalogs/levers.ts";
import { frameReader } from "./frame.ts";
import { readClient, type ClientMessage } from "./protocol.ts";
class PeerInput {
  private deadline: NodeJS.Timeout | undefined;
  private scheduled: NodeJS.Immediate | undefined;
  private chunk: Buffer | undefined;
  private offset = 0;
  private readonly stream: Duplex;
  private readonly reader: ReturnType<typeof frameReader>;
  private readonly timeout: () => void;
  constructor(stream: Duplex, receive: (message: ClientMessage) => void, timeout: () => void, gone: () => void) {
    this.stream = stream;
    this.timeout = timeout;
    this.reader = frameReader("client", value => {
      clearTimeout(this.deadline);
      this.deadline = undefined;
      receive(readClient(value));
    });
    stream.on("data", (bytes: Buffer) => {
      stream.pause();
      this.chunk = bytes;
      this.offset = 0;
      this.scheduled = setImmediate(this.pump);
    });
    stream.on("end", () => {
      try {
        this.reader.end();
      } catch {
        /* An incomplete frame closes only its own connection. */
      }
      stream.destroy();
    });
    stream.on("error", () => stream.destroy());
    stream.once("close", () => {
      clearTimeout(this.deadline);
      if (this.scheduled) clearImmediate(this.scheduled);
      this.chunk = undefined;
      this.reader.discard();
      gone();
    });
  }
  private readonly pump = () => {
    this.scheduled = undefined;
    if (this.stream.destroyed || !this.chunk) return;
    try {
      this.offset += this.reader.push(this.chunk.subarray(this.offset), socketLimits.requestsPerTurn);
      if (this.reader.pending()) this.deadline ??= setTimeout(this.timeout, socketLimits.frameMs);
      else {
        clearTimeout(this.deadline);
        this.deadline = undefined;
      }
      if (this.offset < this.chunk.length) this.scheduled = setImmediate(this.pump);
      else {
        this.chunk = undefined;
        this.stream.resume();
      }
    } catch {
      this.stream.destroy();
    }
  };
}
export const connectPeer = (
  stream: Duplex,
  receive: (message: ClientMessage) => void,
  timeout: () => void,
  gone: () => void,
) => new PeerInput(stream, receive, timeout, gone);
