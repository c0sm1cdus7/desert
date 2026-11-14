// The one way a surface talks with a house: intents in, the screen out. Every renderer uses it, and decides nothing.
import { routerDefects, type DefectReporter } from "./guards/router-defect.ts";
import type { Intent, Screen } from "./contract.ts";
import type { Result, Tool } from "./shown-tool.ts";
import { resolve } from "./resolve.ts";
import { actOf, start, type Bar, type Running, type Session, type Viewport } from "./screen.ts";
import { finished, settled, step } from "./step.ts";

export interface Router {
  /** The one screen for where this device stands, for the room its renderer has. */
  screen(viewport: Viewport): Screen;
  /** What the person did, in the surface's own intents. False once they asked to leave. */
  send(intent: Intent): boolean;
  /** Calls back when the screen may have changed without an intent: the house moved, an act ended, time passed. */
  watch(changed: () => void): () => void;
  /** Resolves once every act and message already on its way has landed. */
  idle(): Promise<void>;
  stop(): void;
}
export type RouterSource = Readonly<{
  tools: readonly Tool[];
  bar: () => Bar;
  first?: Session;
  before?: () => boolean;
}> &
  /** The house saying that something in it changed, and how often a screen that shows time is drawn again. */
  Readonly<{ changes?: (changed: () => void) => () => void; redrawMs?: number; defect: DefectReporter }>;

/** What the house answers later: each answer lands when it comes, and anyone can wait for all of them. */
function landings(landed: () => void) {
  const pending = new Set<Promise<void>>();
  return {
    later: <T>(answer: Promise<T>, land: (value: T) => void): void => {
      const landing = answer.then(value => {
        land(value);
        pending.delete(landing);
        landed();
      });
      pending.add(landing);
    },
    idle: async (): Promise<void> => {
      while (pending.size) await Promise.all(pending);
    },
  };
}
export function startRouter({ tools, bar, changes, redrawMs, first = start, defect, before }: RouterSource): Router {
  let session = first;
  const back = (): void => void (session = session.length > 1 ? session.slice(0, -1) : first);
  const reset = () => (before?.() ? (session = start) : undefined);
  const { protect } = routerDefects(() => session, bar, defect, back, reset);
  const watchers = new Set<() => void>();
  const changed = (): void => watchers.forEach(watcher => watcher());
  const { later, idle } = landings(changed);
  const run = (walk: Running): void => {
    const done = Promise.resolve()
      .then(() => actOf(tools, walk).run(walk.answers))
      .catch((failure: unknown): Result => ({
        ok: false,
        reason: defect(failure, walk.tool, walk.target ?? walk.tool, walk.act),
      }));
    later(done, result => (session = finished(session, walk, result, bar().clock)));
  };
  const stops = [changes?.(changed), redrawMs ? clearInterval.bind(null, setInterval(changed, redrawMs)) : undefined];
  return protect({
    idle,
    screen: viewport => resolve(session, tools, bar(), viewport),
    send: intent => {
      const stepped = step(session, intent, tools, bar().now);
      session = stepped.session;
      if (stepped.quit) return false;
      if (stepped.run) run(stepped.run);
      const { sending } = stepped;
      if (sending) later(sending, refused => (session = settled(session, sending, refused)));
      return true;
    },
    watch: watcher => {
      watchers.add(watcher);
      return () => void watchers.delete(watcher);
    },
    stop: () => {
      stops.forEach(stop => stop?.());
      watchers.clear();
    },
  });
}
