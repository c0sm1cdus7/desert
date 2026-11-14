import { object } from "../../../catalogs/acts.ts";
import { identityDisplayName, type House } from "../../../house/house.ts";
import { identityNameProblem } from "../../../house/identity-name.ts";
import { effect } from "../../../journal/events.ts";
import { identityTexts as words } from "../../../texts/identities/identities.texts.ts";
import { programAct } from "../../promises.ts";
import type { Program, ToolRegistry } from "../../tool-contract.ts";
import { targetIdentity } from "./identity-reading.ts";
import { removeCases, readmitCases, handCases } from "./identity-cases.ts";
const input = object({});
function otherPresent(house: House, target: string): string | undefined {
  const identity = targetIdentity(target);
  if (identity === house.admin) return words.admin;
  return house.removed.has(identity) ? words.removed : undefined;
}
function removeIdentity<X extends Program>() {
  return programAct<X, typeof input>({
    ...words.remove,
    input,
    on: "thing",
    leaves: false,
    undoable: false,
    refuses: [words.only, words.admin, words.removed],
    offered: ({ house }, target) => otherPresent(house, target),
    confirms: (_, { house }, target) => words.sureRemove(identityDisplayName(house, targetIdentity(target))),
    run: (_, { by, state, target }) => ({
      status: "accepted",
      text: words.taken(identityDisplayName(state.house, targetIdentity(target))),
      effects: [effect("removed", { identity: targetIdentity(target) }, by)],
    }),
    cases: removeCases,
  });
}
function readmitIdentity<X extends Program>(runner: string) {
  return programAct<X, typeof input>({
    ...words.readmit,
    input,
    on: "thing",
    leaves: false,
    undoable: true,
    refuses: [words.only, words.inside],
    offered: ({ house }, target) =>
      !house.removed.has(targetIdentity(target)) ? words.inside : identityNameProblem(targetIdentity(target), runner),
    run: (_, { by, state, target }) => ({
      status: "accepted",
      text: words.readmitted(identityDisplayName(state.house, targetIdentity(target))),
      effects: [effect("granted", { identity: targetIdentity(target), tools: [] }, by)],
    }),
    cases: readmitCases,
  });
}
function handIdentity<X extends Program>(runner: string, registry: ToolRegistry<X>) {
  return programAct<X, typeof input>({
    ...words.hand,
    input,
    on: "thing",
    leaves: false,
    undoable: false,
    refuses: [words.only, words.admin, words.removed],
    offered: ({ house }, target) => otherPresent(house, target) ?? identityNameProblem(targetIdentity(target), runner),
    confirms: (_, { house }, target) => words.sureHand(identityDisplayName(house, targetIdentity(target))),
    run: (_, { by, state, target }) => ({
      status: "accepted",
      text: words.handed(identityDisplayName(state.house, targetIdentity(target))),
      effects: [effect("handed", { to: targetIdentity(target) }, by)],
    }),
    cases: handCases<X>(registry),
  });
}
export const identityActions = <X extends Program>(runner: string, registry: ToolRegistry<X>) => ({
  remove: removeIdentity<X>(),
  readmit: readmitIdentity<X>(runner),
  hand: handIdentity<X>(runner, registry),
});
