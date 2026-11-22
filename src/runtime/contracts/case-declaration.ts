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
    const action = request.actions[step.name];
    if (!action || !Value.Check(action.input, step.input)) return false;
    if (typeof step.expect !== "object" || step.expect === null) return false;
    const status: unknown = Reflect.get(step.expect, "status");
    if (status === "core-failure") return true;
    if (status !== "accepted" && status !== "rejected") return false;
    return exactShape(status === "accepted" ? action.output : action.rejections, expectedValue(step.expect));
  }
  if (step.kind === "read") {
    const object = request.objects[step.name];
    if (!object || !Value.Check(object.key, step.key)) return false;
    const value = expectedValue(step.expect);
    return value === undefined || exactShape(object.data, value);
  }
  const notice = request.notices[step.name];
  return !!notice && Array.isArray(step.expect) && step.expect.every(value => exactShape(notice.data, value));
}
export function caseDeclarationErrors(request: ContractRequest, base: string): string[] {
  const ids = new Set<string>();
  return request.cases.flatMap((scenario: ContractCase) => {
    const errors: string[] = [];
    if (ids.has(scenario.id)) errors.push(`${base}/cases/${scenario.id}:duplicate-case`);
    ids.add(scenario.id);
    if (!scenario.steps.length) errors.push(`${base}/cases/${scenario.id}:empty-case`);
    scenario.steps.forEach((step, index) => {
      if (!validStep(step, request)) errors.push(`${base}/cases/${scenario.id}/${index}:outside-request`);
    });
    return errors;
  });
}
