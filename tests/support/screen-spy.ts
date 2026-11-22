// A spy router behind the screen door, a watch fired by hand and a fake clock: what the door's specs count.
import type { TimeSource } from "../../src/journal/clock.ts";
import type { Intent, Screen } from "../../src/surface/contract/contract.ts";
import type { Router } from "../../src/surface/router/router.ts";
import type { OpenHouse } from "../../src/doors/socket/client/open-house-router.ts";
import { screenDoor, type ScreenHost } from "../../src/doors/screen/screen-door.ts";
import { shopShown, type Shop } from "./shop.ts";

/** A screen that says what it shows and the room it was drawn for. */
export const spyScreen = (text: string, rows: number): Screen => ({
  title: "Prueba",
  state: "connected",
  clock: "10:00",
  body: { kind: "list", stacks: [{ title: "Filas", rows: [{ title: text, selected: true }, { title: `${rows}` }] }] },
  hints: [{ intent: "confirm", does: "abrir" }],
  menu: true,
});
/** A router that counts what the door asks of it, and a house around it that ends when told to. */
export function spyHouse(screen: (text: string, rows: number) => Screen = spyScreen) {
  const counts = { screen: 0, send: 0, stop: 0, close: 0 };
  const sent: Intent[] = [];
  const watchers = new Set<() => void>();
  /** What the router shows next, and whether its house ended: a spec changes them. */
  const state = { text: "Uno", ended: false };
  const fire = () => watchers.forEach(watcher => watcher());
  const router: Router = {
    screen: viewport => {
      counts.screen += 1;
      return screen(state.text, viewport.rows);
    },
    send: intent => {
      counts.send += 1;
      sent.push(intent);
      return intent.kind !== "quit";
    },
    watch: watcher => {
      watchers.add(watcher);
      return () => void watchers.delete(watcher);
    },
    idle: () => Promise.resolve(),
    stop: () => void (counts.stop += 1),
  };
  const house: OpenHouse = {
    router,
    ended: () => state.ended,
    failure: () => undefined,
    watch: watcher => router.watch(watcher),
    close: () => {
      counts.close += 1;
      router.stop();
    },
  };
  return { counts, sent, state, fire, house };
}
/** A clock that moves only when a spec moves it, firing what was armed up to then. */
export function fakeTime(start = 1_800_000_000_000) {
  let now = start;
  const armed = new Set<{ readonly at: number; readonly fire: () => void }>();
  const time: TimeSource = {
    now: () => now,
    wait: (at, fire) => {
      const timer = { at, fire };
      armed.add(timer);
      return () => void armed.delete(timer);
    },
  };
  const advance = (ms: number): void => {
    now += ms;
    for (const timer of [...armed].sort((a, b) => a.at - b.at))
      if (timer.at <= now && armed.delete(timer)) timer.fire();
  };
  return { time, advance, armed: () => armed.size };
}
/** A door over spy houses: every open is counted, and each house is kept for the spec to drive. */
export function spyDoor(open?: () => Promise<OpenHouse>, screen?: (text: string, rows: number) => Screen) {
  const clock = fakeTime();
  const houses: ReturnType<typeof spyHouse>[] = [];
  const opens: { readonly id: string; readonly house: string }[] = [];
  let names = 0;
  const host: ScreenHost<Shop> = {
    shown: { ...shopShown, hour: () => "10:00" },
    time: clock.time,
    epoch: () => `n${(names += 1)}`,
    open: session => {
      opens.push(session);
      if (open) return open();
      const spy = spyHouse(screen);
      houses.push(spy);
      return Promise.resolve(spy.house);
    },
  };
  return { door: screenDoor(host), clock, houses, opens };
}
/** Reads a stream in the background: what it said so far, and whether it ended. */
export function collect<T>(stream: AsyncIterable<T>) {
  const got: T[] = [];
  const state = { done: false };
  void (async () => {
    for await (const item of stream) got.push(item);
    state.done = true;
  })();
  return { got, done: () => state.done };
}
/** Lets every promise already settled run its callbacks. */
export const flush = (): Promise<void> => new Promise(resolve => setImmediate(resolve));
