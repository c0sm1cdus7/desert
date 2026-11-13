// A house's router: its tools in the program's words, its connection in the bar, and a redraw whenever it changes.
import { redrawMs } from "../../catalogs/time.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { startRouter, type Router } from "../router.ts";
import type { HousePorts, Shown } from "./house-ports.ts";
import { houseTools } from "./house-tools.ts";
/** What every renderer of a program starts from: the same tools, bar and moves, whatever it draws on. */
export function houseRouter<X extends Program>(ports: HousePorts<X>, shown: Shown<X>): Router {
  const clock = (): string => new Date(ports.now()).toTimeString().slice(0, 5);
  return startRouter({
    tools: houseTools(ports, shown),
    bar: () => ({ state: ports.connection(), clock: clock(), now: ports.now() }),
    changes: ports.watch,
    redrawMs,
    defect: ports.defect,
  });
}
