// Ejecuta los pasos declarativos por el puerto real y conserva observaciones con secuencias y procedencia.
import { Value } from "@sinclair/typebox/value";
import type { ContractAccess, ContractCut, ContractPort, ContractPublicNotice } from "../../tools/contract-port.ts";
import type { ContractCase, ContractCaseStep } from "../../tools/contracts/package-contracts.ts";
import { coreFailure } from "./contract-actions.ts";
type Walk = { notice?: ContractCut | undefined; observations: unknown[]; passed: boolean };
function isNotices(value: unknown): value is readonly ContractPublicNotice[] {
  return Array.isArray(value);
}
async function performStep(step: ContractCaseStep, port: ContractPort, cut: ContractCut, walk: Walk) {
  if (step.kind === "action") return await port.actions[step.name]?.(step.input);
  if (step.kind === "notices") {
    const notices = port.notices[step.name]?.(cut);
    if (isNotices(notices)) {
      walk.notice = notices.at(-1)?.cut;
      walk.observations.push(notices);
      return notices.map(notice => notice.value);
    }
    return notices;
  }
  const at = step.at === "notice" ? walk.notice : cut;
  if (!at) return coreFailure("invalid-reference");
  const reading = port.objects[step.name]?.read(step.key, at);
  walk.observations.push(reading);
  if (reading?.status === "found") return { status: reading.status, value: reading.value };
  if (reading?.status === "unavailable") return { status: reading.status };
  return reading;
}
export async function executeContractCase(scenario: ContractCase, name: string, access: () => ContractAccess) {
  const walk: Walk = { observations: [], passed: true };
  for (const step of scenario.steps) {
    const scope = access();
    const port = scope.contracts[name];
    const result = port ? await performStep(step, port, scope.cut, walk) : coreFailure("invalid-reference");
    walk.observations.push(result);
    if (!Value.Equal(result, step.expect)) walk.passed = false;
  }
  return walk;
}
