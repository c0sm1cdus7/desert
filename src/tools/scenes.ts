// Every actor writes its own scene; only identities have preferences and things in view.
import { actCatalog } from "../catalogs/acts.ts";
import { ids } from "../catalogs/ids.ts";
import { mindTool } from "../house/house.ts";
import { effect } from "../journal/events.ts";
import { accepted, ownAct } from "./act-definition.ts";
import { preferenceAct } from "./preferences.ts";
import type { OwnAct, Program } from "./tool-contract.ts";
export function houseActs<X extends Program>(attendance: readonly OwnAct<X>[]) {
  const scene = ownAct<X, typeof actCatalog.scene.input>(ids.self, "scene", actCatalog.scene, (input, { by }) =>
    accepted(effect("scene", input, by)),
  );
  const identity = [...attendance, preferenceAct<X>(), scene];
  return (by: string): readonly OwnAct<X>[] => (mindTool(by) === undefined ? identity : [scene]);
}
