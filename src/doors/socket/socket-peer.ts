// Authentication is a server-side key lookup. No declaration in hello chooses an identity or a door.
import type { Duplex } from "node:stream";
import { houseProtocolVersion, socketLimits } from "../../catalogs/levers.ts";
import { socketTexts as said } from "../../texts/socket.texts.ts";
import { requestBudget } from "./request-budget.ts";
import { peerWriter } from "./peer-writer.ts";
import { connectPeer } from "./peer-input.ts";
import { serverFrame } from "./frame.ts";
import type { ClientMessage, ServerMessage } from "./protocol.ts";
export type DoorKey = Readonly<{ identity: string; door: "terminal" | "agente" }>;
export type Peer = ReturnType<typeof socketPeer>;
type Welcome = Extract<ClientMessage, { tipo: "hola" }>;
export const helloFailure = (hello: Welcome): string | undefined => {
  if (hello.protocolo !== houseProtocolVersion) return said.version(houseProtocolVersion, hello.protocolo);
  if (hello.node !== process.versions.node) return said.node(process.versions.node, hello.node);
  return undefined;
};
class SocketPeer {
  readonly stream: Duplex;
  readonly budget = requestBudget();
  private readonly writer: ReturnType<typeof peerWriter>;
  private readonly timer: NodeJS.Timeout;
  private readonly report: (text: string) => void;
  private entered: DoorKey | undefined;
  private ended = false;
  private sequence = -1;
  private mismatchReported = false;
  constructor(
    stream: Duplex,
    receive: (message: ClientMessage) => void,
    gone: () => void,
    report: (text: string) => void,
  ) {
    this.stream = stream;
    this.report = report;
    this.timer = setTimeout(() => stream.destroy(), socketLimits.helloMs);
    this.writer = peerWriter(stream, this.fail);
    connectPeer(
      stream,
      receive,
      () => this.fail(said.bodyTimeout),
      () => {
        this.ended = true;
        clearTimeout(this.timer);
        gone();
      },
    );
  }
  readonly key = () => this.entered;
  readonly live = () => !this.ended && !this.stream.destroyed;
  readonly seq = () => this.sequence;
  readonly reportMismatch = () => {
    if (this.mismatchReported) return;
    this.mismatchReported = true;
    this.report(said.stateMismatch);
  };
  readonly sent = (value: number) => {
    this.sequence = value;
  };
  readonly enter = (value: DoorKey) => {
    this.entered = value;
    clearTimeout(this.timer);
  };
  readonly sendFrames = (frames: readonly Buffer[]) => {
    if (this.live()) this.writer.send(frames);
  };
  readonly sendBytes = (bytes: Buffer) => this.sendFrames([bytes]);
  readonly send = (message: ServerMessage) => this.sendBytes(serverFrame(message));
  readonly end = (message?: ServerMessage) => {
    if (this.ended) return;
    if (message) this.send(message);
    this.ended = true;
    clearTimeout(this.timer);
    this.stream.end();
    endSoon(this.stream);
  };
  readonly fail = (reason: string) => {
    if (this.ended) return;
    this.report(reason);
    this.writer.stop();
    try {
      if (this.entered && !this.stream.destroyed) this.stream.write(serverFrame({ tipo: "cortado", motivo: reason }));
    } catch {
      this.stream.destroy();
    }
    this.end();
  };
}
export const socketPeer = (
  stream: Duplex,
  receive: (message: ClientMessage) => void,
  gone: () => void,
  report: (text: string) => void = text => {
    process.stderr.write(`${text}\n`);
  },
) => new SocketPeer(stream, receive, gone, report);
function endSoon(stream: Duplex) {
  const cutoff = setTimeout(() => stream.destroy(), 250);
  cutoff.unref();
  stream.once("close", () => clearTimeout(cutoff));
}
