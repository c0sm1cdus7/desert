// Every actor writes its own scene; only identities have preferences and things in view.
import { actCatalog } from "../catalogs/acts.ts";
import { ids } from "../catalogs/ids.ts";
import { mindTool } from "../house/house.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { effect } from "../journal/events.ts";
import { accepted, ownAct, rejected } from "./act-definition.ts";
import { preferenceAct } from "./preferences.ts";
import type { OwnAct, Program } from "./tool-contract.ts";
export function houseActs<X extends Program>(attendance: readonly OwnAct<X>[]) {
  const scene = ownAct<X, typeof actCatalog.scene.input>(
    ids.self,
    "scene",
    actCatalog.scene,
    (input, { by, state }) => {
      const absent = Object.keys(input.to ?? {}).find(to => mindTool(to) !== undefined || !state.house.grants.has(to));
      return absent === undefined ? accepted(effect("scene", input, by)) : rejected(toolTexts.sceneRecipient(absent));
    },
  );
  const identity = [...attendance, preferenceAct<X>(), scene];
  return (by: string): readonly OwnAct<X>[] => (mindTool(by) === undefined ? identity : [scene]);
}
