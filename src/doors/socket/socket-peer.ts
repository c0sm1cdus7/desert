// Authentication is a server-side key lookup. No declaration in hello chooses an identity or a door.
import type { Duplex } from "node:stream";
import { houseProtocolVersion, socketLimits } from "../../catalogs/levers.ts";
import { socketTexts as said } from "../../texts/socket.texts.ts";
import { frameReader, serverFrame } from "./frame.ts";
import { readClient, type ClientMessage, type ServerMessage } from "./protocol.ts";
export type DoorKey = Readonly<{ identity: string; door: "terminal" | "agente" }>;
export type Peer = ReturnType<typeof socketPeer>;
type Welcome = Extract<ClientMessage, { tipo: "hola" }>;
export const helloFailure = (hello: Welcome): string | undefined => {
  if (hello.protocolo !== houseProtocolVersion) return said.version(houseProtocolVersion, hello.protocolo);
  if (hello.node !== process.versions.node) return said.node(process.versions.node, hello.node);
  return undefined;
};
export function socketPeer(stream: Duplex, receive: (message: ClientMessage) => void, gone: () => void) {
  let key: DoorKey | undefined;
  let ended = false;
  let seq = -1;
  const timer = setTimeout(() => stream.destroy(), socketLimits.helloMs);
  const sendBytes = (bytes: Buffer) => {
    if (ended || stream.destroyed) return;
    writeBytes(stream, bytes);
  };
  const send = (message: ServerMessage) => sendBytes(serverFrame(message));
  const end = (message?: ServerMessage) => {
    if (ended) return;
    if (message) send(message);
    ended = true;
    clearTimeout(timer);
    stream.end();
    endSoon(stream);
  };
  connectPeer(stream, receive, () => {
    ended = true;
    clearTimeout(timer);
    gone();
  });
  return {
    stream,
    send,
    sendBytes,
    end,
    key: () => key,
    live: () => !ended && !stream.destroyed,
    enter: (value: DoorKey) => {
      key = value;
      clearTimeout(timer);
    },
    seq: () => seq,
    sent: (value: number) => {
      seq = value;
    },
  };
}
function connectPeer(stream: Duplex, receive: (message: ClientMessage) => void, gone: () => void) {
  const reader = frameReader("client", value => receive(readClient(value)));
  stream.on("data", (bytes: Buffer) => {
    try {
      reader.push(bytes);
    } catch {
      stream.destroy();
    }
  });
  stream.on("end", () => {
    try {
      reader.end();
    } catch {
      /* A partial frame closes only this peer. */
    }
    stream.destroy();
  });
  stream.on("error", () => stream.destroy());
  stream.once("close", gone);
}

function endSoon(stream: Duplex) {
  const cutoff = setTimeout(() => stream.destroy(), 250);
  cutoff.unref();
  stream.once("close", () => clearTimeout(cutoff));
}

function writeBytes(stream: Duplex, bytes: Buffer) {
  if (stream.writableLength + bytes.length > socketLimits.state + socketLimits.json + 10) stream.destroy();
  else stream.write(bytes);
}
