// Carries a mechanical stop from a capability to the act's result without turning it into a defect.
import { meant, type Text } from "../../fields/phrases.ts";
import type { HouseEmission } from "../../house/facts.ts";
export class MechanicalRuleFailure extends Error {
  readonly reason: Text;
  readonly effects: readonly HouseEmission[];
  constructor(reason: Text, effects: readonly HouseEmission[]) {
    super(meant(reason));
    this.reason = reason;
    this.effects = effects;
  }
}
