// Refuses cases that call or expect data outside the half the requester declares.
import { Value } from "@sinclair/typebox/value";
import type { TSchema } from "@sinclair/typebox";
import type { ContractCase, ContractCaseStep, ContractRequest } from "../../tools/contracts/package-contracts.ts";
import { projectValue } from "./project-value.ts";
function exactShape(schema: TSchema, value: unknown): boolean {
  try {
    return Value.Equal(projectValue(schema, value), value);
  } catch {
    return false;
  }
}
function expectedValue(value: unknown): unknown {
  return typeof value === "object" && value !== null ? Reflect.get(value, "value") : undefined;
}
function validStep(step: ContractCaseStep, request: ContractRequest): boolean {
  if (step.kind === "action") {
    const action = request.acciones[step.name];
    if (!action || !Value.Check(action.entrada, step.input)) return false;
    if (typeof step.expect !== "object" || step.expect === null) return false;
    const status: unknown = Reflect.get(step.expect, "status");
    if (status === "core-failure") return true;
    if (status !== "accepted" && status !== "rejected") return false;
    return exactShape(status === "accepted" ? action.salida : action.rechazos, expectedValue(step.expect));
  }
  if (step.kind === "read") {
    const object = request.objetos[step.name];
    if (!object || !Value.Check(object.clave, step.key)) return false;
    const value = expectedValue(step.expect);
    return value === undefined || exactShape(object.datos, value);
  }
  const notice = request.avisos[step.name];
  return !!notice && Array.isArray(step.expect) && step.expect.every(value => exactShape(notice.datos, value));
}
export function caseDeclarationErrors(request: ContractRequest, base: string): string[] {
  const ids = new Set<string>();
  return request.casos.flatMap((scenario: ContractCase) => {
    const errors: string[] = [];
    if (ids.has(scenario.id)) errors.push(`${base}/casos/${scenario.id}:caso-repetido`);
    ids.add(scenario.id);
    if (!scenario.steps.length) errors.push(`${base}/casos/${scenario.id}:caso-vacio`);
    scenario.steps.forEach((step, index) => {
      if (!validStep(step, request)) errors.push(`${base}/casos/${scenario.id}/${index}:fuera-del-pedido`);
    });
    return errors;
  });
}
