// A hello completes only with its state; malformed or silent peers cannot leave an attachment waiting forever.
import type { Duplex } from "node:stream";
import { houseProtocolVersion, socketLimits } from "../../catalogs/levers.ts";
import { clientFrame, frameReader } from "./frame.ts";
import { readServer, type ServerMessage } from "./protocol.ts";
export function clientStream(
  stream: Duplex,
  token: string,
  receive: (value: Buffer | ServerMessage) => void,
  lost: () => void,
) {
  let resolve = () => {};
  let reject: (error: Error) => void = () => {};
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  const ready = { resolve, reject, promise };
  const timer = setTimeout(() => stream.destroy(), socketLimits.helloMs);
  const reader = frameReader("server", value => {
    const message = Buffer.isBuffer(value) ? value : readServer(value);
    receive(message);
    if (Buffer.isBuffer(message)) {
      clearTimeout(timer);
      ready.resolve();
    } else if (message.tipo === "rechazo" && !message.id) ready.reject(new Error(message.motivo));
  });
  stream.on("data", (bytes: Buffer) => {
    try {
      reader.push(bytes);
    } catch {
      stream.destroy();
    }
  });
  stream.on("error", () => stream.destroy());
  stream.on("end", () => stream.destroy());
  stream.on("close", () => {
    clearTimeout(timer);
    ready.reject(new Error("House connection closed before state"));
    lost();
  });
  stream.write(clientFrame({ tipo: "hola", protocolo: houseProtocolVersion, node: process.versions.node, token }));
  return ready.promise;
}
