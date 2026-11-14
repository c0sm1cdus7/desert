// A transport can be replaced without replacing the router or replaying an act.
import type { Duplex } from "node:stream";
import type { State, Program } from "../../tools/tool-contract.ts";
import type { Screen } from "../../surface/contract.ts";
import { socketTexts } from "../../texts/socket.texts.ts";
import { clientFrame } from "./frame.ts";
import { connectionState } from "./connection-state.ts";
import { clientStream } from "./client-stream.ts";
import type { ClientMessage, ServerMessage } from "./protocol.ts";
import { socketLimits } from "../../catalogs/levers.ts";
import { SocketOpeningError } from "./socket-error.ts";
export interface SocketConnection<X extends Program> {
  readonly state: () => State<X>;
  readonly identity: () => string;
  readonly now: () => number;
  readonly status: () => Screen["state"];
  readonly failure: () => string | undefined;
  send: (message: ClientMessage) => boolean;
  readonly watch: (changed: () => void) => () => void;
  readonly receive: (listener: (message: ServerMessage) => void) => () => void;
  readonly attach: (stream: Duplex) => Promise<void>;
  readonly close: () => void;
}
class Connection<X extends Program> implements SocketConnection<X> {
  private readonly view = connectionState<X>();
  private readonly listeners = new Set<(message: ServerMessage) => void>();
  private stream: Duplex | undefined;
  private closed = false;
  private failureReason: string | undefined;
  private sequence = -1;
  private failedSequence = -1;
  private failures = 0;
  private reported = false;
  private quotaNotice = -Infinity;
  private readonly token: string;
  constructor(token: string) {
    this.token = token;
  }
  readonly state = () => this.view.state();
  readonly identity = () => this.view.identity();
  readonly now = () => this.view.now();
  readonly status = () => this.view.status();
  readonly failure = () => this.failureReason;
  readonly watch = (changed: () => void) => this.view.watch(changed);
  readonly receive = (listener: (message: ServerMessage) => void) => {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  };
  private incoming(value: Buffer | ServerMessage): boolean {
    if (Buffer.isBuffer(value)) {
      try {
        const accepted = this.view.accept(value);
        if (accepted) this.failures = 0;
        return accepted;
      } catch {
        this.view.reset();
        this.failures = this.failedSequence === this.sequence ? this.failures + 1 : 1;
        this.failedSequence = this.sequence;
        if (this.failures >= socketLimits.stateAttempts) {
          this.failureReason = socketTexts.stateUnverified;
          this.close();
          throw new SocketOpeningError(this.failureReason);
        }
        this.view.setStatus("connecting");
        if (!this.reported) process.stderr.write(`${socketTexts.stateMismatch}\n`);
        this.reported = true;
        this.stream?.write(clientFrame({ tipo: "sincronizar" }));
        return false;
      }
    }
    if (value.tipo === "estado") this.sequence = value.seq;
    this.view.metadata(value);
    this.listeners.forEach(listener => listener(value));
    this.notice(value);
    if (value.tipo === "cortado" || (value.tipo === "rechazo" && !value.id)) this.close();
    else if (value.tipo === "cerrando") {
      this.view.setStatus("signal-lost");
      this.stream?.destroy();
    }
    return false;
  }
  private notice(message: ServerMessage) {
    if (message.tipo === "cortado") process.stderr.write(`${message.motivo}\n`);
    if (message.tipo !== "rechazo" || message.motivo !== socketTexts.quota) return;
    const now = performance.now();
    if (now - this.quotaNotice < socketLimits.requestMs) return;
    this.quotaNotice = now;
    process.stderr.write(`${socketTexts.quota}\n`);
  }
  readonly send = (message: ClientMessage): boolean => {
    if (this.closed || this.status() !== "connected" || !this.stream || this.stream.destroyed) return false;
    try {
      this.stream.write(clientFrame(message));
      return true;
    } catch {
      this.stream.destroy();
      return false;
    }
  };
  readonly attach = async (next: Duplex): Promise<void> => {
    if (this.closed) {
      next.destroy();
      throw new Error("Connection is closed");
    }
    this.stream?.destroy();
    this.stream = next;
    this.failures = 0;
    this.view.reset();
    this.view.setStatus("connecting");
    await clientStream(
      next,
      this.token,
      value => {
        return this.stream === next && !next.destroyed && !this.closed ? this.incoming(value) : false;
      },
      () => {
        if (this.stream === next && !this.closed) this.view.setStatus("signal-lost");
      },
    );
  };
  readonly close = (): void => {
    this.closed = true;
    this.stream?.destroy();
    this.view.setStatus("disconnected");
  };
}
export const socketConnection = <X extends Program>(token: string): SocketConnection<X> => new Connection<X>(token);
