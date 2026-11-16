import { Duplex } from "node:stream";
import { performance } from "node:perf_hooks";
import { afterEach, expect, it, vi } from "vitest";
import { peerWriter } from "./peer-writer.ts";
import { socketLimits } from "../../catalogs/levers.ts";
import { socketTexts } from "../../texts/socket.texts.ts";
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
it("N4: time spent by the house working is not time given to a reader to drain", async () => {
  vi.useFakeTimers();
  let idle = 0;
  let active = 0;
  vi.spyOn(performance, "eventLoopUtilization").mockImplementation(() => ({ idle, active, utilization: 1 }));
  let drained: (() => void) | undefined;
  const stream = new Duplex({
    highWaterMark: 1,
    read() {},
    write(_bytes, _encoding, done) {
      drained = done;
    },
  });
  const failed = vi.fn();
  const writer = peerWriter(stream, failed);
  try {
    writer.send([Buffer.alloc(10)]);
    active = 8000;
    await vi.advanceTimersByTimeAsync(8000);
    expect(failed).not.toHaveBeenCalled();
    drained?.();
    await vi.advanceTimersByTimeAsync(1);
    idle = 2000;
    await vi.advanceTimersByTimeAsync(2000);
    expect(failed).not.toHaveBeenCalled();
  } finally {
    writer.stop();
    stream.destroy();
  }
});
it("N07: a peer that never drains is cut after one second of idle opportunity", async () => {
  vi.useFakeTimers();
  let idle = 0;
  vi.spyOn(performance, "eventLoopUtilization").mockImplementation(() => ({ idle, active: 0, utilization: 0 }));
  const stream = new Duplex({ highWaterMark: 1, read() {}, write() {} });
  const failed = vi.fn();
  const writer = peerWriter(stream, failed);
  try {
    writer.send([Buffer.alloc(10)]);
    idle = socketLimits.blockedMs - 1;
    await vi.advanceTimersByTimeAsync(socketLimits.blockedMs - 1);
    expect(failed).not.toHaveBeenCalled();
    idle++;
    await vi.advanceTimersByTimeAsync(1);
    expect(failed).toHaveBeenCalledExactlyOnceWith(socketTexts.slow);
  } finally {
    writer.stop();
    stream.destroy();
  }
});
