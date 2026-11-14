// A hello completes only with a verified state; malformed or silent peers cannot leave attachment waiting forever.
import type { Duplex } from "node:stream";
import { houseProtocolVersion, socketLimits } from "../../catalogs/levers.ts";
import { socketTexts } from "../../texts/socket.texts.ts";
import { clientFrame, frameReader } from "./frame.ts";
import { readServer, type ServerMessage } from "./protocol.ts";
function attachmentWait(stream: Duplex) {
  let resolve = () => {};
  let reject: (error: Error) => void = () => {};
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  let waiting = true;
  const expired = () => {
    reject(new Error(socketTexts.startTimeout));
    stream.destroy();
  };
  let timer = setTimeout(expired, socketLimits.helloMs);
  return {
    promise,
    reject,
    begin: () => {
      waiting = true;
    },
    complete: () => {
      waiting = false;
      clearTimeout(timer);
      resolve();
    },
    progress: (partial: boolean) => {
      clearTimeout(timer);
      if (waiting || partial) timer = setTimeout(expired, socketLimits.frameMs);
    },
    closed: () => {
      clearTimeout(timer);
      reject(new Error(socketTexts.beforeState));
    },
  };
}
export function clientStream(
  stream: Duplex,
  token: string,
  receive: (value: Buffer | ServerMessage) => boolean,
  lost: () => void,
) {
  const ready = attachmentWait(stream);
  const reader = frameReader("server", value => {
    const message = Buffer.isBuffer(value) ? value : readServer(value);
    if (!Buffer.isBuffer(message) && message.tipo === "estado") ready.begin();
    if (receive(message)) ready.complete();
    else if (!Buffer.isBuffer(message) && message.tipo === "rechazo" && !message.id)
      ready.reject(new Error(message.motivo));
  });
  stream.on("data", (bytes: Buffer) => {
    try {
      reader.push(bytes);
      ready.progress(reader.pending());
    } catch {
      ready.reject(new Error(socketTexts.frame));
      stream.destroy();
    }
  });
  stream.on("error", () => stream.destroy());
  stream.on("end", () => stream.destroy());
  stream.on("close", () => {
    ready.closed();
    lost();
  });
  stream.write(clientFrame({ tipo: "hola", protocolo: houseProtocolVersion, node: process.versions.node, token }));
  return ready.promise;
}
