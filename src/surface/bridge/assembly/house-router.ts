// A house's router: its tools in the program's words, its connection in the bar, and a redraw whenever it changes.
import { redrawMs } from "../../../journal/clock.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import { startRouter, type Router } from "../../router/router.ts";
import type { HousePorts, Shown } from "../ports/house-ports.ts";
import { houseTools } from "./house-tools.ts";
/** What every renderer of a program starts from: the same tools, bar and moves, whatever it draws on. */
export function houseRouter<X extends Program>(ports: HousePorts<X>, shown: Shown<X>): Router {
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
  const clock = (): string => new Date(reading.now()).toTimeString().slice(0, 5);
  const router = startRouter({
    tools: houseTools(reading, shown),
    bar: () => ({ state: ports.connection(), clock: clock(), now: reading.now() }),
    changes: ports.watch,
    redrawMs,
    defect: ports.defect,
    before: () => !ports.state().house.grants.has(ports.me),
  });
  return {
    ...router,
    screen: view => during(() => router.screen(view)),
    send: intent => during(() => router.send(intent)),
  };
}
