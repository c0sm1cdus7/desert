// A house's router: its tools in the program's words and the reader's language, its connection in the bar, redrawn.
import type { Language } from "../../../fields/languages.ts";
import { readerLanguage } from "../../../house/members.ts";
import { redrawMs } from "../../../journal/clock.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import { startRouter, type Router } from "../../router/router.ts";
import type { HousePorts, Shown } from "../ports/house-ports.ts";
import { withOpeningNotices } from "./opening-notices.ts";
import { houseTools } from "./house-tools.ts";
/** The surface in one language: every word of the house said in it, from the Menu on. */
function routerIn<X extends Program>(ports: HousePorts<X>, shown: Shown<X>, language: Language, changed: () => void) {
  let instant: number | undefined;
  const reading = { ...ports, now: () => instant ?? ports.now() };
  const during = <T>(read: () => T): T => {
    const before = instant;
    instant = before ?? ports.now();
    try {
      return read();
    } finally {
      instant = before;
    }
  };
  // The program's hour where it gives one (a web server runs in no person's zone); the process's own where not.
  const clock = (): string => shown.hour?.(reading.now()) ?? new Date(reading.now()).toTimeString().slice(0, 5);
  const router = startRouter({
    tools: houseTools(reading, shown, language),
    bar: () => ({ state: ports.connection(), clock: clock(), now: reading.now(), language }),
    changes: ports.watch,
    redrawMs,
    defect: ports.defect,
    before: () => !ports.state().house.grants.has(ports.me),
  });
  router.watch(changed);
  const screen: Router["screen"] = view => during(() => router.screen(view));
  const send: Router["send"] = intent => during(() => router.send(intent));
  return { ...router, screen, send };
}
/** What every renderer of a program starts from: the same tools, bar and moves, whatever it draws on. When its
 * reader changes the language it reads the house in, the surface starts again in that language, from the Menu. */
export function houseRouter<X extends Program>(ports: HousePorts<X>, shown: Shown<X>): Router {
  const watchers = new Set<() => void>();
  const changed = (): void => watchers.forEach(watcher => watcher());
  let current: Readonly<{ language: Language; router: Router }> | undefined;
  /** A state that cannot be read leaves the reader where they are: the router reads it again, and says why. */
  const spoken = (): Language => {
    try {
      return readerLanguage(ports.state().house, ports.me);
    } catch (error) {
      if (current) return current.language;
      throw error;
    }
  };
  const router = (): Router => {
    const language = spoken();
    if (current?.language === language) return current.router;
    current?.router.stop();
    current = { language, router: routerIn(ports, shown, language, changed) };
    return current.router;
  };
  const first = router();
  return withOpeningNotices(
    {
      screen: viewport => router().screen(viewport),
      send: intent => router().send(intent),
      watch: watcher => {
        watchers.add(watcher);
        return () => void watchers.delete(watcher);
      },
      idle: () => (current?.router ?? first).idle(),
      stop: () => {
        current?.router.stop();
        watchers.clear();
      },
    },
    ports.openingNotices?.() ?? [],
  );
}
