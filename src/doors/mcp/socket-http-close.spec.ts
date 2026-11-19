// A wire destroyed while the event stream is paused at a yield must not leave a rejected read unobserved.
import { expect, it } from "vitest";
import { PassThrough } from "node:stream";
import { setImmediate as tick } from "node:timers/promises";
import { events } from "./socket-http.ts";
it("ends quietly when the wire closes between a yield and the next read", async () => {
  const unobserved: unknown[] = [];
  const record = (reason: unknown) => void unobserved.push(reason);
  process.on("unhandledRejection", record);
  try {
    const wire = new PassThrough();
    const stream = events(wire)[Symbol.asyncIterator]();
    expect((await stream.next()).value).toBe(": connected\n\n");
    wire.write(Buffer.from("frame"));
    expect((await stream.next()).value).toMatch(/^data: /);
    // Paused at the data yield: the connection drops before the consumer asks for more.
    wire.destroy();
    expect((await stream.next()).done).toBe(true);
    for (let turn = 0; turn < 5; turn++) await tick();
    expect(unobserved).toEqual([]);
  } finally {
    process.off("unhandledRejection", record);
  }
});
