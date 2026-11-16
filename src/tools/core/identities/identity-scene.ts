// The same bounded general scene, offered on its author's row by the ordinary declared action path.
import { object, scene } from "../../../catalogs/acts.ts";
import { text } from "../../../catalogs/fields.ts";
import { effect } from "../../../journal/events.ts";
import { genericTexts as generic } from "../../../texts/generic-surface.texts.ts";
import { identityTexts as words } from "../../../texts/identities/identities.texts.ts";
import { programAct } from "../../promises.ts";
import type { Program } from "../../tool-contract.ts";
/** Free text with something visible, within the scene's bound: the field holds the same rule as the house. */
const input = object({
  general: { ...text(words.general, generic.lacks.visible), maxLength: scene.properties.general.maxLength },
});
const cases = [
  {
    promise: words.promises.memberScene,
    by: "carla",
    on: "identities/carla",
    input: { general: words.sceneExample },
    then: { says: words.sceneSaved, facts: [] },
  },
  {
    promise: words.promises.adminScene,
    on: "identities/ana",
    input: { general: words.sceneExample },
    then: { says: words.sceneSaved, facts: [] },
  },
  {
    promise: words.promises.memberSceneOnly,
    by: "beto",
    on: "identities/carla",
    input: { general: words.sceneExample },
    then: { refused: words.ownScene },
  },
  {
    promise: words.promises.adminSceneOnly,
    on: "identities/carla",
    input: { general: words.sceneExample },
    then: { refused: words.ownScene },
  },
] as const;
export function identityScene<X extends Program>() {
  return programAct<X, typeof input>({
    ...words.scene,
    input,
    on: "thing",
    leaves: false,
    undoable: true,
    refuses: [words.ownScene],
    offered: ({ by }, target) => (target === `identities/${by}` ? undefined : words.ownScene),
    run: ({ general }, { by }) => ({
      status: "accepted",
      text: words.sceneSaved,
      effects: [effect("scene", { general }, by)],
    }),
    cases,
  });
}
