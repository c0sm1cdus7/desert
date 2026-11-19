// Personal scene, visibility and attendance use registered declarations and the ordinary action engine.
import { oneOf, option, text, thing } from "../../fields/fields.ts";
import { isMindActor } from "../../fields/mind-actor.ts";
import { object } from "../../fields/visible-text.ts";
import { effect } from "../../house/facts.ts";
import { hides } from "../../house/members.ts";
import { hideable, sceneLimits, type Hideable } from "../../house/own-acts.ts";
import { personalTexts as words } from "../../texts/personal.texts.ts";
import { programAct } from "../promises.ts";
import type { Program, ToolRegistry } from "../tool-contract.ts";
const sceneInput = object({ general: { ...text(words.general, words.message), maxLength: sceneLimits.general } });
const addressedInput = object({
  recipient: text(words.recipient, words.recipientHint),
  message: { ...text(words.message, words.message), maxLength: sceneLimits.each },
});
function sceneAction<X extends Program>() {
  return programAct<X, typeof sceneInput>({
    ...words.scene,
    input: sceneInput,
    on: "tool",
    undoable: true,
    run: ({ general }, { state, by }) => ({
      status: "accepted",
      text: words.sceneSaved,
      effects: [effect("scene", { general, to: state.house.scenes.get(by)?.data.to ?? {} }, by)],
    }),
    cases: [
      {
        promise: words.sceneSaved,
        by: "beto",
        input: { general: words.example },
        then: { says: words.sceneSaved, facts: [] },
      },
    ],
  });
}
const addressedCases = [
  {
    promise: words.sceneSaved,
    by: "beto",
    input: { recipient: "ana", message: words.toExample },
    then: { says: words.sceneSaved, facts: [] },
  },
  {
    promise: words.absent,
    input: { recipient: "missing", message: words.toExample },
    then: { refused: words.absent },
  },
  {
    promise: words.full,
    by: "beto",
    given: [
      {
        scene: {
          by: "beto",
          general: words.example,
          to: Object.fromEntries(
            Array.from({ length: sceneLimits.identities }, (_, index) => [`former-${index}`, words.toExample]),
          ),
        },
      },
    ],
    input: { recipient: "ana", message: words.toExample },
    then: { refused: words.full },
  },
] as const satisfies readonly import("../promises.ts").Case<Program, typeof addressedInput>[];
function addressedAction<X extends Program>() {
  return programAct<X, typeof addressedInput>({
    ...words.addressed,
    input: addressedInput,
    on: "tool",
    undoable: true,
    refuses: [words.absent, words.full],
    stops: ({ recipient }, { house, by }) => {
      if (typeof recipient !== "string") return undefined;
      if (isMindActor(recipient) || !house.grants.has(recipient)) return words.absent;
      const parts = house.scenes.get(by)?.data.to ?? {};
      return !Object.hasOwn(parts, recipient) && Object.keys(parts).length >= sceneLimits.identities
        ? words.full
        : undefined;
    },
    run: ({ recipient, message }, { state, by }) => ({
      status: "accepted",
      text: words.sceneSaved,
      effects: [
        effect(
          "scene",
          {
            general: state.house.scenes.get(by)?.data.general ?? words.example,
            to: { ...state.house.scenes.get(by)?.data.to, [recipient]: message },
          },
          by,
        ),
      ],
    }),
    cases: addressedCases,
  });
}
export const personalScenes = <X extends Program>() => ({ scene: sceneAction<X>(), addressed: addressedAction<X>() });
export function personalAttendance<X extends Program>(registry: ToolRegistry<X>, leaving: boolean) {
  const input = object({ target: thing(words.target, "house-targets", undefined, undefined, words.noTargets) });
  const result = leaving ? words.left : words.looked;
  const targets = (state: Parameters<ToolRegistry<X>[number]["targets"]>[0]) =>
    registry.flatMap(tool => [tool.id, ...tool.targets(state)]);
  return programAct<X, typeof input>({
    ...words[leaving ? "unattend" : "attend"],
    input,
    on: "tool",
    undoable: true,
    refuses: [words.missing],
    choices: (source, state) =>
      source === "house-targets" ? targets(state).map(target => ({ value: target, title: target })) : undefined,
    stops: ({ target }, state) =>
      typeof target === "string" && !targets(state).includes(target) ? words.missing : undefined,
    run: ({ target }, { by }) => ({
      status: "accepted",
      text: result,
      effects: [effect(leaving ? "unattended" : "attended", { target }, by)],
    }),
    cases: [
      { promise: result, by: "beto", input: { target: "rules" }, then: { says: result, facts: [] } },
      { promise: words.missing, input: { target: "missing" }, then: { refused: words.missing } },
    ],
  });
}
export function personalPreference<X extends Program>(hide: Hideable) {
  const input = object({
    value: oneOf(words.preferences[hide].name, option("show", words.show, "m"), option("hide", words.hide, "o")),
  });
  return programAct<X, typeof input>({
    ...words.preferences[hide],
    input,
    on: "tool",
    undoable: true,
    datum: ({ house, by }) => (hides(house, by, hide) ? words.hide : words.show),
    run: ({ value }, { by }) => ({
      status: "accepted",
      text: words.preferenceSaved,
      effects: [effect("preferred", { hide, on: value === "hide" }, by)],
    }),
    cases: [
      { promise: words.hide, by: "beto", input: { value: "hide" }, then: { says: words.preferenceSaved, facts: [] } },
      { promise: words.show, by: "beto", input: { value: "show" }, then: { says: words.preferenceSaved, facts: [] } },
    ],
  });
}
export const personalPreferences = <X extends Program>() =>
  Object.fromEntries(hideable.map(hide => [hide, personalPreference<X>(hide)]));
