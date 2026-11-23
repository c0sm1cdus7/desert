// Declares the acts that enable, retire, delegate to and atomically adopt assistants.
import { explicitKit, kitLayout } from "../../house/kit-selection.ts";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { object } from "../../fields/visible-text.ts";
import { text, someOf, option, many } from "../../fields/fields.ts";
import { assistantOwner, isMindActor } from "../../fields/mind-actor.ts";
import { delegatedKit, type DelegatedKit } from "../../house/assistants/assistant-facts.ts";
import { identityAllowedAct } from "../../house/identities/identity-permissions.ts";
import type { House } from "../../house/members.ts";
import { effect, type HouseEmission } from "../../house/facts.ts";
import { deepFreeze } from "../../journal/vocabulary.ts";
import { assistantText, type AssistantTextKey } from "../../texts/assistant.texts.ts";
import { identityTexts } from "../../texts/identities.texts.ts";
import { programAct } from "../promises.ts";
import type { Program, ToolRegistry, ActContext, State } from "../tool-contract.ts";
import { targetIdentity } from "./identity-reading.ts";
import { assistantCases } from "./assistant-cases.ts";
const w = (key: AssistantTextKey) => assistantText(key);
const nameInput = { ...text(w("name"), w("nameHint")), maxLength: 160 };
function ownerProblem(house: House, owner: string) {
  if (isMindActor(owner)) return identityTexts.ownActions;
  if (!Value.Check(assistantOwner, owner) || !house.grants.has(owner)) return w("absent");
  return undefined;
}
function kitProblem<X extends Program>(house: House, owner: string, kit: DelegatedKit, registry: ToolRegistry<X>) {
  if (new Set(kit.map(entry => entry.tool)).size !== kit.length) return w("repeated");
  for (const { tool, acts } of kit) {
    if (tool === "identities") return w("reserved");
    const declared = registry.find(entry => entry.id === tool);
    if (!declared || acts.some(act => !Object.hasOwn(declared.acts, act))) return w("unknown");
    if (acts.some(act => !identityAllowedAct(house, owner, tool, act, kitLayout(registry)))) return w("permission");
  }
  return undefined;
}
function adoptionProblem(house: House, owner: string, legacy: string, name: string) {
  const previous = house.assistants.get(owner);
  if (previous?.legacy === legacy) return undefined;
  if (previous?.legacy) return w("incompatible");
  if (previous?.enabled && previous.name !== name) return w("conflict");
  if (legacy === owner || legacy === house.admin || (!house.grants.has(legacy) && !house.removed.has(legacy)))
    return w("legacyInvalid");
  if ([...house.assistants.values()].some(each => each.legacy === legacy)) return w("collision");
  return undefined;
}
function kitInput<X extends Program>(registry: ToolRegistry<X>) {
  const acts = [...new Set(registry.flatMap(tool => Object.keys(tool.acts)))];
  return {
    ...many(
      object({
        tool: { ...text(w("tool"), w("toolHint")), maxLength: 160 },
        acts: someOf(w("acts"), "none", ...acts.map(act => option(act, act, ""))),
      }),
      { ask: w("more"), done: { title: w("done"), key: "t" }, another: { title: w("another"), key: "o" } },
    ),
    minItems: 0,
  };
}
type Cases<X extends Program> = ReturnType<typeof assistantCases<X>>;
const common = { on: "thing", leaves: false, undoable: true } as const;
const baseRefusals = [identityTexts.only, identityTexts.ownActions, w("absent")];
const checkOwner = ({ house }: { house: House }, target: string) => ownerProblem(house, targetIdentity(target));
function disabledProblem(house: House, target: string) {
  if (isMindActor(targetIdentity(target))) return identityTexts.ownActions;
  return house.assistants.has(targetIdentity(target)) ? undefined : w("disabled");
}
function delegationProblem({ by, house }: { by: string; house: House }, target: string) {
  const problem = ownerProblem(house, targetIdentity(target));
  if (problem) return problem;
  if (by !== targetIdentity(target)) return w("owner");
  return house.assistants.get(by)?.enabled ? undefined : w("disabled");
}
function enableAssistant<X extends Program>(cases: Cases<X>["enable"]) {
  const enableInput = object({ name: nameInput });
  return programAct<X, typeof enableInput>({
    ...common,
    name: w("enable"),
    enter: w("enableEnter"),
    purpose: w("enablePurpose"),
    key: "a",
    input: enableInput,
    refuses: [...baseRefusals, w("conflict")],
    offered: checkOwner,
    stops: ({ name }, { house }, target) => {
      const previous = house.assistants.get(targetIdentity(target));
      return name !== undefined && previous?.enabled && previous.name !== name ? w("conflict") : undefined;
    },
    run: ({ name }, { by, target, state: { house } }) => {
      const owner = targetIdentity(target);
      return {
        status: "accepted",
        text: w(house.assistants.get(owner)?.enabled ? "unchanged" : "enabled"),
        effects: house.assistants.get(owner)?.enabled ? [] : [effect("assistant-enabled", { owner, name }, by)],
      };
    },
    cases,
  });
}
function disableAssistant<X extends Program>(cases: Cases<X>["disable"]) {
  const disableInput = object({});
  return programAct<X, typeof disableInput>({
    ...common,
    name: w("disable"),
    enter: w("disableEnter"),
    purpose: w("disablePurpose"),
    key: "d",
    input: disableInput,
    refuses: [identityTexts.only, identityTexts.ownActions, w("disabled")],
    offered: ({ house }, target) => disabledProblem(house, target),
    run: (_, { by, target, state: { house } }) => {
      const owner = targetIdentity(target);
      const enabled = house.assistants.get(owner)?.enabled;
      return {
        status: "accepted",
        text: w(enabled ? "disabledDone" : "unchanged"),
        effects: enabled ? [effect("assistant-disabled", { owner }, by)] : [],
      };
    },
    cases,
  });
}
function delegateAssistant<X extends Program>(cases: Cases<X>["delegate"], registry: ToolRegistry<X>) {
  // Frozen so the surface validates this large schema once: it grows with every act of every program.
  const delegateInput = object({ kit: kitInput(registry) });
  deepFreeze(delegateInput);
  return programAct<X, typeof delegateInput>({
    ...common,
    name: w("delegate"),
    enter: w("delegateEnter"),
    purpose: w("delegatePurpose"),
    key: "g",
    input: delegateInput,
    refuses: [
      identityTexts.ownActions,
      w("owner"),
      w("absent"),
      w("disabled"),
      w("repeated"),
      w("reserved"),
      w("unknown"),
      w("permission"),
    ],
    offered: delegationProblem,
    stops: ({ kit }, { house }, target) =>
      Value.Check(delegatedKit, kit) ? kitProblem(house, targetIdentity(target), kit, registry) : undefined,
    run: ({ kit }, { by, target, state: { house } }) => {
      const owner = targetIdentity(target);
      const same =
        JSON.stringify(
          house.assistants.get(owner)?.selections ?? explicitKit(house.assistants.get(owner)?.kit ?? []),
        ) === JSON.stringify(explicitKit(kit, house.kitLayout));
      return {
        status: "accepted",
        text: w(same ? "unchanged" : "delegated"),
        effects: same
          ? []
          : [effect("assistant-kit-set", { version: 2, owner, kit: explicitKit(kit, house.kitLayout) }, by)],
      };
    },
    cases,
  });
}
function adoptAssistant<X extends Program>(cases: Cases<X>["adopt"], registry: ToolRegistry<X>) {
  const adoptInput = object({
    legacy: { ...text(w("legacy"), w("legacyHint")), ...assistantOwner, maxLength: 64 },
    name: nameInput,
    kit: Type.Optional(kitInput(registry)),
  });
  deepFreeze(adoptInput);
  return programAct<X, typeof adoptInput>({
    ...common,
    undoable: false,
    name: w("adopt"),
    enter: w("adoptEnter"),
    purpose: w("adoptPurpose"),
    key: "o",
    input: adoptInput,
    confirms: () => w("confirmAdopt"),
    refuses: [
      ...baseRefusals,
      w("conflict"),
      w("legacyInvalid"),
      w("collision"),
      w("incompatible"),
      w("repeated"),
      w("reserved"),
      w("unknown"),
    ],
    offered: checkOwner,
    stops: (input, state, target) => adoptionStops(input, state, target, registry),
    run: adoptionResult,
    cases,
  });
}
function adoptionStops<X extends Program>(
  input: Readonly<Record<string, unknown>>,
  { by, house }: State<X>,
  target: string,
  registry: ToolRegistry<X>,
) {
  const { legacy, name, kit } = input;
  const owner = targetIdentity(target);
  if (typeof legacy !== "string" || typeof name !== "string") return undefined;
  if (house.assistants.get(owner)?.legacy === legacy) return undefined;
  return (
    adoptionProblem(house, owner, legacy, name) ??
    (by === owner && Value.Check(delegatedKit, kit) ? kitProblem(house, owner, kit, registry) : undefined)
  );
}
function adoptionResult<X extends Program>(
  { legacy, name, kit }: { legacy: string; name: string; kit?: { tool: string; acts: string[] }[] },
  { by, target, state: { house } }: ActContext<X>,
) {
  const owner = targetIdentity(target);
  if (house.assistants.get(owner)?.legacy === legacy)
    return { status: "accepted" as const, text: w("adoptedAlready"), effects: [] };
  const effects: HouseEmission[] = [
    ...(house.grants.has(legacy) ? [effect("removed", { identity: legacy }, by)] : []),
    effect("assistant-enabled", { owner, name }, by),
    effect("assistant-adopted", { owner, legacy }, by),
    ...(by === owner && kit !== undefined
      ? [effect("assistant-kit-set", { version: 2, owner, kit: explicitKit(kit, house.kitLayout) }, by)]
      : []),
  ];
  return { status: "accepted" as const, text: w(by !== owner ? "adoptedPending" : "adopted"), effects };
}
export function assistantActions<X extends Program>(registry: ToolRegistry<X>) {
  const cases = assistantCases<X>(registry);
  return {
    "enable-assistant": enableAssistant(cases.enable),
    "disable-assistant": disableAssistant(cases.disable),
    "delegate-assistant": delegateAssistant(cases.delegate, registry),
    "adopt-assistant": adoptAssistant(cases.adopt, registry),
  };
}
