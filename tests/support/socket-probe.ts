// Wire-only test peer: TypeBox checks server JSON; only this client deserializes received v8 state.
import type { Duplex } from "node:stream";
import { connect } from "node:net";
import { connectionState } from "../../src/doors/socket/connection-state.ts";
import { houseProtocolVersion } from "../../src/catalogs/levers.ts";
import { setTimeout as delay } from "node:timers/promises";
import { frameReader, clientFrame } from "../../src/doors/socket/frame.ts";
import { readClient, readServer, type ServerMessage } from "../../src/doors/socket/protocol.ts";
export const wire = (value: unknown, type = 0): Buffer => {
  const body = type === 0 ? Buffer.from(JSON.stringify(value)) : Buffer.from([255]);
  const header = Buffer.alloc(5);
  header.writeUInt32BE(body.length + 1);
  header[4] = type;
  return Buffer.concat([header, body]);
};
function incoming(socket: Duplex) {
  const messages: ServerMessage[] = [];
  const states: unknown[] = [];
  const order: string[] = [];
  const timeline: (ServerMessage | { tipo: "v8"; state: unknown })[] = [];
  let closed = false;
  const view = connectionState();
  const reader = frameReader("server", value => {
    if (Buffer.isBuffer(value)) {
      if (!view.accept(value)) return;
      const state: unknown = view.state();
      states.push(state);
      timeline.push({ tipo: "v8", state });
      order.push("v8");
    } else {
      const message = readServer(value);
      view.metadata(message);
      messages.push(message);
      timeline.push(message);
      order.push(message.tipo);
    }
  });
  socket.on("error", () => {});
  socket.on("end", () => {
    reader.end();
    closed = true;
    socket.destroy();
  });
  socket.on("close", () => {
    closed = true;
  });
  socket.on("data", (chunk: Buffer) => reader.push(chunk));
  const until = async (check: () => boolean, ms = 1500) => {
    const end = Date.now() + ms;
    while (!check() && !closed && Date.now() < end) await delay(5);
    return check();
  };
  return { messages, states, order, timeline, until, closed: () => closed };
}
export async function probe(path: string | Duplex) {
  const socket = typeof path === "string" ? connect(path) : path;
  const received = incoming(socket);
  if (typeof path === "string")
    await new Promise<void>((resolve, reject) => {
      socket.once("connect", resolve);
      socket.once("error", reject);
    });
  return {
    socket,
    ...received,
    send: (value: unknown) => {
      socket.write(clientFrame(readClient(value)));
    },
    hello: (token = "ana-terminal", extra = {}) => {
      socket.write(
        wire({ tipo: "hola", protocolo: houseProtocolVersion, node: process.versions.node, token, ...extra }),
      );
    },
    result: async (id: string) => {
      await received.until(() => received.messages.some(m => m.tipo === "resultado" && m.id === id));
      return received.messages.find(
        (m): m is Extract<ServerMessage, { tipo: "resultado" }> => m.tipo === "resultado" && m.id === id,
      );
    },
  };
}
