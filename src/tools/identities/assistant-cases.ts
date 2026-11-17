// Expresa casos declarados de asistentes y rechazos sin cambios para las superficies comunes.
import { assistantText, type AssistantTextKey } from "../../texts/assistant.texts.ts";
import { identityTexts } from "../../texts/identities.texts.ts";
import type { Case, Step } from "../promises.ts";
import type { Program, ToolRegistry } from "../tool-contract.ts";
type Cases<X extends Program, I> = [Case<X> & { input: I }, ...(Case<X> & { input: I })[]];
type Kit = { tool: string; acts: string[] }[];
const w = (key: AssistantTextKey) => assistantText(key, "es");
const on = "identities/carla";
const input = { name: "Nora" };
const enabled = { act: "enable-assistant", on, input };
const removed = { act: "remove", on, input: {} };
const named = { act: "new", input: { identity: "nora", name: "Nora", tools: [] } };
const adopt = { legacy: "nora", name: "Nora" };
const adoption = { act: "adopt-assistant", on, input: adopt };
const success = (key: AssistantTextKey, sure?: string) => ({ says: w(key), facts: [], ...(sure ? { sure } : {}) });
const refusal = (key: AssistantTextKey) => ({ refused: w(key) });
function enableCases<X extends Program>(): Cases<X, { name: string }> {
  return [
    { promise: w("caseEnabled"), on, input, then: success("enabled") },
    { promise: w("caseRepeat"), given: [enabled], on, input, then: success("unchanged") },
    { promise: w("caseConflict"), given: [enabled], on, input: { name: "Otra" }, then: refusal("conflict") },
    { promise: w("caseAbsent"), given: [removed], on, input, then: refusal("absent") },
    { promise: w("caseAdmin"), by: "beto", on, input, then: { refused: identityTexts.only } },
  ];
}
function disableCases<X extends Program>(): Cases<X, Record<string, never>> {
  return [
    { promise: w("caseDisabled"), given: [enabled], on, input: {}, then: success("disabledDone") },
    {
      promise: w("caseRepeat"),
      given: [enabled, { act: "disable-assistant", on, input: {} }],
      on,
      input: {},
      then: success("unchanged"),
    },
    { promise: w("caseMissing"), on, input: {}, then: refusal("disabled") },
    { promise: w("caseAdmin"), by: "beto", given: [enabled], on, input: {}, then: { refused: identityTexts.only } },
  ];
}
function delegateCases<X extends Program>(registry: ToolRegistry<X>): Cases<X, { kit: Kit }> {
  const tool = registry.find(each => Object.keys(each.acts).length > 0);
  const act = tool && Object.keys(tool.acts)[0];
  const kit = tool && act ? [{ tool: tool.id, acts: [act] }] : [];
  return [
    { promise: w("caseDelegate"), given: [enabled], on, by: "carla", input: { kit: [] }, then: success("unchanged") },
    { promise: w("caseOwner"), given: [enabled], on, input: { kit }, then: refusal("owner") },
    { promise: w("caseMissing"), on, by: "carla", input: { kit }, then: refusal("disabled") },
    { promise: w("caseAbsent"), given: [enabled, removed], on, input: { kit }, then: refusal("absent") },
    ...invalidDelegationCases<X>(),
    ...(kit.length
      ? [
          {
            promise: w("casePermission"),
            given: [enabled],
            on,
            by: "carla",
            input: { kit },
            then: refusal("permission"),
          },
        ]
      : []),
  ];
}
function invalidDelegationCases<X extends Program>(): (Case<X> & { input: { kit: Kit } })[] {
  return [
    {
      promise: w("caseReserved"),
      given: [enabled],
      on,
      by: "carla",
      input: { kit: [{ tool: "identities", acts: [] }] },
      then: refusal("reserved"),
    },
    {
      promise: w("caseUnknown"),
      given: [enabled],
      on,
      by: "carla",
      input: { kit: [{ tool: "absent", acts: [] }] },
      then: refusal("unknown"),
    },
    {
      promise: w("caseDuplicate"),
      given: [enabled],
      on,
      by: "carla",
      input: {
        kit: [
          { tool: "absent", acts: [] },
          { tool: "absent", acts: [] },
        ],
      },
      then: refusal("repeated"),
    },
  ];
}
function adoptionCases<X extends Program>(): Cases<X, { name: string; legacy: string; kit?: Kit }> {
  const sure = w("confirmAdopt");
  const adoptCases: Cases<X, { name: string; legacy: string; kit?: Kit }> = [
    { promise: w("caseAdopt"), given: [named], on, input: adopt, then: success("adoptedPending", sure) },
    { promise: w("caseRepeat"), given: [named, adoption], on, input: adopt, then: success("adoptedAlready", sure) },
    { promise: w("caseAdmin"), given: [named], on, by: "beto", input: adopt, then: { refused: identityTexts.only } },
    { promise: w("caseAbsent"), given: [named, removed], on, input: adopt, then: refusal("absent") },
    { promise: w("caseLegacy"), on, input: adopt, then: refusal("legacyInvalid") },
    {
      promise: w("caseConflict"),
      given: [named, enabled],
      on,
      input: { ...adopt, name: "Otra" },
      then: refusal("conflict"),
    },
    {
      promise: w("caseCollision"),
      given: [named, adoption],
      on,
      input: { ...adopt, legacy: "beto" },
      then: refusal("incompatible"),
    },
    {
      promise: w("collision"),
      given: [named, adoption],
      on: "identities/beto",
      input: adopt,
      then: refusal("collision"),
    },
  ];
  return [...adoptCases, ...invalidAdoptionCases<X>()];
}
function invalidAdoptionCases<X extends Program>(): (Case<X> & {
  input: { name: string; legacy: string; kit?: Kit };
})[] {
  const adoptCases: (Case<X> & { input: { name: string; legacy: string; kit?: Kit } })[] = [];
  const setup: Step[] = [named];
  for (const [key, kit] of [
    ["reserved", [{ tool: "identities", acts: [] }]],
    ["unknown", [{ tool: "absent", acts: [] }]],
    [
      "repeated",
      [
        { tool: "absent", acts: [] },
        { tool: "absent", acts: [] },
      ],
    ],
  ] as const)
    adoptCases.push({
      promise: w(key),
      given: setup,
      on: "identities/ana",
      input: { ...adopt, kit: kit.map(each => ({ tool: each.tool, acts: [...each.acts] })) },
      then: refusal(key),
    });
  return adoptCases;
}

export function assistantCases<X extends Program>(registry: ToolRegistry<X>) {
  return {
    enable: enableCases<X>(),
    disable: disableCases<X>(),
    delegate: delegateCases<X>(registry),
    adopt: adoptionCases<X>(),
  };
}
