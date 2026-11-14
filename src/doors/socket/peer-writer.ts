// Backpressure pauses only this peer. Full snapshots stream lazily; later deliveries have a bounded queue.
import { performance } from "node:perf_hooks";
import type { Duplex } from "node:stream";
import { socketLimits } from "../../catalogs/levers.ts";
import { socketTexts } from "../../texts/socket.texts.ts";
class PeerWriter {
  private readonly stream: Duplex;
  private readonly failed: (reason: string) => void;
  private readonly queue: { frames: readonly Buffer[]; bytes: number }[] = [];
  private current: readonly Buffer[] = [];
  private index = 0;
  private queued = 0;
  private blocked = false;
  private stopped = false;
  private timer: NodeJS.Timeout | undefined;
  constructor(stream: Duplex, failed: (reason: string) => void) {
    this.stream = stream;
    this.failed = failed;
    stream.on("drain", () => {
      this.blocked = false;
      clearTimeout(this.timer);
      this.pump();
    });
    stream.once("close", this.stop);
  }
  readonly stop = () => {
    this.stopped = true;
    this.queue.length = 0;
    this.current = [];
    clearTimeout(this.timer);
  };
  private next(): Buffer | undefined {
    if (this.index === this.current.length) {
      const next = this.queue.shift();
      if (!next) {
        this.current = [];
        this.index = 0;
        return;
      }
      this.queued -= next.bytes;
      this.current = next.frames;
      this.index = 0;
    }
    return this.current[this.index++];
  }
  private readonly pump = () => {
    if (this.stopped || this.blocked || this.stream.destroyed) return;
    try {
      for (let turns = 0; turns < 32; turns++) {
        const bytes = this.next();
        if (!bytes) return;
        if (!this.stream.write(bytes)) {
          this.pause();
          return;
        }
      }
      setImmediate(this.pump);
    } catch {
      this.failed(socketTexts.stateFailed);
    }
  };
  private pause() {
    this.blocked = true;
    const idle = performance.eventLoopUtilization().idle;
    const check = () => {
      if (this.stopped || !this.blocked) return;
      const remaining = socketLimits.blockedMs - (performance.eventLoopUtilization().idle - idle);
      if (remaining <= 0) this.failed(socketTexts.slow);
      else this.timer = setTimeout(check, Math.max(1, remaining));
    };
    this.timer = setTimeout(check, socketLimits.blockedMs);
  }
  readonly send = (frames: readonly Buffer[]) => {
    if (this.stopped || this.stream.destroyed) return;
    const bytes = frames.reduce((sum, frame) => sum + frame.length, 0);
    const busy = this.blocked || this.index < this.current.length || this.queue.length > 0;
    if (busy && this.queued + bytes > socketLimits.pendingBytes) {
      this.failed(socketTexts.slow);
      return;
    }
    this.queue.push({ frames, bytes });
    this.queued += bytes;
    this.pump();
  };
}
export const peerWriter = (stream: Duplex, failed: (reason: string) => void) => new PeerWriter(stream, failed);
