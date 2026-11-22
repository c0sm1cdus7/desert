// Carries a mechanical stop from a capability to the act's result without turning it into a defect.
import type { HouseEmission } from "../../house/facts.ts";
export class MechanicalRuleFailure extends Error {
  readonly reason: string;
  readonly effects: readonly HouseEmission[];
  constructor(reason: string, effects: readonly HouseEmission[]) {
    super(reason);
    this.reason = reason;
    this.effects = effects;
  }
}
