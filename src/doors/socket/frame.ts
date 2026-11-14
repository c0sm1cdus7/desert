// Length includes the type byte; JSON and v8 have separate limits. Clients' binary input is never decoded.
import { serialize } from "node:v8";
import { socketLimits } from "../../catalogs/levers.ts";
import { socketTexts } from "../../texts/socket.texts.ts";
import { readClient, readServer, type ClientMessage, type ServerMessage } from "./protocol.ts";
const invalid = (): never => {
  throw new Error(socketTexts.frame);
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
export const stateFrame = (value: unknown): Buffer => envelope(1, serialize(value), socketLimits.state);
function frameLength(bytes: Buffer, side: "client" | "server"): number {
  const length = bytes.readUInt32BE(0);
  if (length < 1 || length > (side === "client" ? socketLimits.json : socketLimits.state) + 1) invalid();
  if (bytes.length < 5) return length;
  const type = bytes[4];
  if (type !== 0 && (type !== 1 || side === "client")) invalid();
  if (type === 0 && length > socketLimits.json + 1) invalid();
  return length;
}
export function frameReader(
  side: "client" | "server",
  receive: (value: ClientMessage | ServerMessage | Buffer) => void,
) {
  let pending = Buffer.alloc(0);
  let failed = false;
  const push = (chunk: Buffer) => {
    if (failed) invalid();
    pending = Buffer.concat([pending, chunk]);
    try {
      while (pending.length >= 4) {
        const length = frameLength(pending, side);
        if (pending.length < length + 4) break;
        const body = pending.subarray(5, length + 4);
        const binary = pending[4] === 1;
        pending = pending.subarray(length + 4);
        const read = side === "client" ? readClient : readServer;
        receive(binary ? body : read(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body))));
      }
    } catch (error) {
      failed = true;
      pending = Buffer.alloc(0);
      throw error;
    }
  };
  return {
    push,
    end: () => {
      if (pending.length) invalid();
    },
  };
}
