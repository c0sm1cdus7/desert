// Every actor writes its own scene; only identities have preferences and things in view.
import { actCatalog } from "./own-acts.ts";
import { ids } from "./ids.ts";
import { mindTool } from "./kit.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import { effect, type HouseEvent } from "./facts.ts";
import { accepted, ownAct, rejected } from "../tools/act-definition.ts";
import { preferenceAct } from "./preferences.ts";
import type { OwnAct, Program } from "../tools/tool-contract.ts";
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

import type { House } from "./members.ts";

/** Fold the shared scene exactly as written by its actor. */
export function sceneStep(state: House, event: HouseEvent): House {
  if (event.kind === "scene" && (state.grants.has(event.by) || mindTool(event.by) !== undefined))
    return { ...state, scenes: new Map(state.scenes).set(event.by, event) };
  return state;
}
