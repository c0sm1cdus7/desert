// A house's router: its tools in the product's words, its connection in the bar, and a redraw whenever it changes.
import { redrawMs } from "../../catalogs/time.ts";
import type { Product } from "../../tools/tool-contract.ts";
import { startRouter, type Router } from "../router.ts";
import type { HousePorts, SurfaceWords } from "./house-ports.ts";
import { houseTools, type Screens } from "./house-tools.ts";
/** What every renderer of a product starts from: the same tools, bar and moves, whatever it draws on. */
export function houseRouter<X extends Product>(
  ports: HousePorts<X>,
  words: SurfaceWords,
  screens: Screens<X> = {},
): Router {
  const clock = (): string => new Date(ports.now()).toTimeString().slice(0, 5);
  return startRouter({
    tools: houseTools(ports, words, screens),
    bar: () => ({ state: ports.connection(), clock: clock(), now: ports.now() }),
    changes: ports.watch,
    redrawMs,
  });
}
