import { opacityChecks } from "./opacity/opacity-derived.ts";
// Every check a program's promises derive, in one list: the gate of a program runs them all and chooses none.
import type { Shown } from "../surface/bridge/house-ports.ts";
import type { Composition } from "../tools/promises.ts";
import type { Program } from "../tools/tool-contract.ts";
import type { Check } from "./promised-stage.ts";
import { walkedChecks } from "./promised-walk.ts";
import { promisedChecks } from "./promised.ts";

/** What each act promises on the house, and the same promises kept by keys from the Menu. A check DESERT gains
 * reaches every program the day it moves onto that DESERT: no program lists the checks it wants. */
export const programChecks = <X extends Program>(program: Composition<X>, shown: Shown<X>): readonly Check[] => [
  ...promisedChecks(program),
  ...opacityChecks(program),
  ...walkedChecks(program, shown),
];
