// A client's stream: the frames pushed to it while attached, and a keepalive when nothing was said for a while.
import type { TimeSource } from "../../journal/clock.ts";
import { screenLimits } from "./screen-limits.ts";
import type { Client, Item } from "./screen-session.ts";

/** What a stream has to say next, and how its reader is woken when something arrives. */
class Queue {
  private readonly items: Item[] = [];
  private wake: (() => void) | undefined;
  ended = false;
  readonly put = (item: Item): void => {
    this.items.push(item);
    this.wake?.();
  };
  readonly end = (): void => {
    this.ended = true;
    this.wake?.();
  };
  async next(): Promise<Item | undefined> {
    while (!this.items.length && !this.ended) await new Promise<void>(resolve => (this.wake = resolve));
    this.wake = undefined;
    return this.ended ? undefined : this.items.shift();
  }
}
/** Attaches a client while the stream is read: one stream per client, so a newer one ends the older. */
export async function* streamOf(
  client: Client | undefined,
  time: TimeSource,
  signal: AbortSignal,
  left: () => void,
): AsyncGenerator<Item> {
  if (!client || signal.aborted) return;
  client.end?.();
  const queue = new Queue();
  client.push = queue.put;
  client.end = queue.end;
  signal.addEventListener("abort", queue.end, { once: true });
  const keepalive = () => time.wait(time.now() + screenLimits.keepaliveMs, () => queue.put("keepalive"));
  let quiet = keepalive();
  try {
    for (let item = await queue.next(); item !== undefined; item = await queue.next()) {
      quiet();
      yield item;
      quiet = keepalive();
    }
  } finally {
    quiet();
    signal.removeEventListener("abort", queue.end);
    if (client.push === queue.put) {
      client.push = undefined;
      client.end = undefined;
      left();
    }
  }
}
