// Enumerate every case and every derived law: programs do not choose their own guarantees.
import type { Shown } from "../surface/bridge/house-ports.ts";
import type { Composition } from "../tools/promises.ts";
import type { Program } from "../tools/tool-contract.ts";
import type { Check } from "./promised-stage.ts";
import { walkCheck } from "./walks/case-walk.ts";
import { availabilityChecks } from "./promised-availability.ts";
import { choiceChecks } from "./promised-choices.ts";
import { findChecks } from "./promised-find.ts";
import { noticeChecks } from "./promised-notices.ts";
import { shownChecks } from "./promised-off.ts";
/** Every case of every act, kept by keys from the Menu: accepted cases must be reached.
 * Refusals also admit a positive construction proof.
 * And what each person sees of what they cannot do. */
export function walkedChecks<X extends Program>(program: Composition<X>, shown: Shown<X>): readonly Check[] {
  const cases = program.registry.flatMap(tool =>
    Object.entries(tool.acts).flatMap(([name, act]) =>
      act.cases.map(kase => walkCheck(program, shown, { tool, name, act }, kase)),
    ),
  );
  const derived = [choiceChecks, availabilityChecks, shownChecks, noticeChecks, findChecks];
  return [...cases, ...derived.flatMap(checks => checks(program, shown))];
}
