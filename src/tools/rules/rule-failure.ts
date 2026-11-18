// Transporta un freno mecánico desde una capacidad hasta el resultado del acto sin convertirlo en defecto.
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
