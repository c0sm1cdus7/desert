// Length includes the type byte; JSON and v8 have separate limits. Clients' binary input is never decoded.
import { meant } from "../../../fields/phrases.ts";
import { socketTexts } from "../../../texts/socket.texts.ts";
import { readClient, readServer, socketLimits, type ClientMessage, type ServerMessage } from "./protocol.ts";

const invalid = (): never => {
  throw new Error(meant(socketTexts.frame));
};
const envelope = (type: number, body: Buffer, limit: number): Buffer => {
  if (body.length > limit) invalid();
  const header = Buffer.alloc(5);
  header.writeUInt32BE(body.length + 1);
  header[4] = type;
  return Buffer.concat([header, body]);
};
export const clientFrame = (value: ClientMessage): Buffer =>
  envelope(0, Buffer.from(JSON.stringify(readClient(value))), socketLimits.json);
export const serverFrame = (value: ServerMessage): Buffer =>
  envelope(0, Buffer.from(JSON.stringify(readServer(value))), socketLimits.json);
export const binaryFrame = (bytes: Buffer): Buffer => envelope(1, bytes, socketLimits.state);
function frameLength(bytes: Buffer, side: "client" | "server"): number {
  const length = bytes.readUInt32BE(0);
  if (length < 1 || length > (side === "client" ? socketLimits.json : socketLimits.state) + 1) invalid();
  if (bytes.length < 5) return length;
  const type = bytes[4];
  if (type !== 0 && (type !== 1 || side === "client")) invalid();
  if (type === 0 && length > socketLimits.json + 1) invalid();
  return length;
}
type Received = ClientMessage | ServerMessage | Buffer;
class FrameReader {
  private readonly header = Buffer.alloc(5);
  private headerBytes = 0;
  private body: Buffer | undefined;
  private bodyBytes = 0;
  private failed = false;
  private delivered = 0;
  private readonly side: "client" | "server";
  private readonly receive: (value: Received) => void;
  constructor(side: "client" | "server", receive: (value: Received) => void) {
    this.side = side;
    this.receive = receive;
  }
  private readHeader(chunk: Buffer, offset: number): number {
    const count = Math.min(5 - this.headerBytes, chunk.length - offset);
    chunk.copy(this.header, this.headerBytes, offset, offset + count);
    this.headerBytes += count;
    if (this.headerBytes >= 4) frameLength(this.header.subarray(0, this.headerBytes), this.side);
    if (this.headerBytes === 5) this.body = Buffer.allocUnsafe(frameLength(this.header, this.side) - 1);
    return count;
  }
  private readBody(chunk: Buffer, offset: number): number {
    const body = this.body;
    if (!body) return invalid();
    const count = Math.min(body.length - this.bodyBytes, chunk.length - offset);
    chunk.copy(body, this.bodyBytes, offset, offset + count);
    this.bodyBytes += count;
    if (this.bodyBytes === body.length) this.deliver(body);
    return count;
  }
  private deliver(body: Buffer) {
    this.delivered++;
    const binary = this.header[4] === 1;
    this.headerBytes = 0;
    this.bodyBytes = 0;
    this.body = undefined;
    const read = this.side === "client" ? readClient : readServer;
    this.receive(binary ? body : read(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body))));
  }
  readonly push = (chunk: Buffer, limit = Infinity): number => {
    this.delivered = 0;
    if (this.failed) invalid();
    try {
      let offset = 0;
      while (offset < chunk.length && this.delivered < limit) {
        if (this.headerBytes < 5) offset += this.readHeader(chunk, offset);
        if (this.headerBytes === 5) offset += this.readBody(chunk, offset);
      }
      return offset;
    } catch (error) {
      this.failed = true;
      this.body = undefined;
      throw error;
    }
  };
  readonly discard = () => {
    this.body = undefined;
    this.failed = true;
  };
  readonly pending = () => this.headerBytes > 0;
  readonly end = () => {
    if (this.pending()) invalid();
  };
}
export const frameReader = (side: "client" | "server", receive: (value: Received) => void) =>
  new FrameReader(side, receive);
