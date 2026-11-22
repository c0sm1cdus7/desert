// Every check a program's promises derive, in one list: the gate of a program runs them all and chooses none.
import type { Shown } from "../surface/bridge/ports/house-ports.ts";
import { withRulesWords } from "../surface/bridge/views/rules-words.ts";
import { coreRegistry } from "../tools/identities/identities.ts";
import { withIdentityWords } from "../tools/identities/identity-reading.ts";
import { withPersonalWords } from "../tools/personal/personal.ts";
import type { Composition } from "../tools/promises.ts";
import type { Program } from "../tools/tool-contract.ts";
import { contractChecks } from "./contracts/program-contract-cases.ts";
import { opacityChecks } from "./opacity/opacity-derived.ts";
import { promisedChecks } from "./promises/cases/promised.ts";
import type { Check } from "./promises/promised-stage.ts";
import { walkedChecks } from "./promises/walk/promised-walk.ts";
/** What each act promises on the house, and the same promises kept by keys from the Menu. A check DESERT gains
 * reaches every program the day it moves onto that DESERT: no program lists the checks it wants. */
export const programChecks = <X extends Program>(program: Composition<X>, shown: Shown<X>): readonly Check[] => {
  const registry = coreRegistry(
    program.registry,
    "house",
    program.identities,
    program.minds?.assistants,
    program.minds?.programs,
  );
  const house = { ...program, registry };
  const surface = withPersonalWords(registry, withRulesWords(registry, withIdentityWords(registry, shown)));
  return [
    ...contractChecks(house),
    ...promisedChecks(house, surface),
    ...opacityChecks(house),
    ...walkedChecks(house, surface),
  ];
};
