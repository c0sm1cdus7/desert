// Checks own paths and complete halves before lending ports between programs.
import { diagnoseContracts } from "./contract-graph.ts";
import { schemaInclusion } from "./schema-inclusion.ts";
import type { ContractInterface } from "../../tools/contracts/contract-types.ts";
import type { ContractPackage } from "../../tools/contracts/package-contracts.ts";
const supportedReading = (value: unknown): boolean => value === "house";
function shapes(half: ContractInterface, base: string): string[] {
  const errors: string[] = [];
  for (const [name, action] of Object.entries(half.actions))
    for (const [key, schema] of Object.entries(action).filter(([key]) => key !== "route"))
      if (typeof schema === "object")
        errors.push(
          ...schemaInclusion(schema, schema, `${base}/actions/${name}/${key}`, key === "input" ? "input" : "reading"),
        );
  for (const [name, object] of Object.entries(half.objects)) {
    if (!supportedReading(object.reading)) errors.push(`${base}/objects/${name}:unsupported-reading`);
    // A consumer reads each object by its name beside `can` (state.readings): no object takes that name.
    if (name === "can") errors.push(`${base}/objects/${name}:reserved-name`);
    errors.push(...schemaInclusion(object.key, object.key, `${base}/objects/${name}/key`, "input"));
    errors.push(...schemaInclusion(object.data, object.data, `${base}/objects/${name}/data`, "reading"));
  }
  for (const [name, notice] of Object.entries(half.notices)) {
    if (!supportedReading(notice.reading)) errors.push(`${base}/notices/${name}:unsupported-reading`);
    errors.push(...schemaInclusion(notice.data, notice.data, `${base}/notices/${name}/data`, "reading"));
  }
  return errors;
}
function ownOffers(program: ContractPackage): string[] {
  const errors: string[] = [];
  const routes = Object.entries(program.tools).flatMap(([tool, actions]) => actions.map(a => `${tool}/${a}`));
  for (const [name, offer] of Object.entries(program.offers)) {
    const base = `${program.id}/${name}`;
    for (const [action, value] of Object.entries(offer.actions))
      if (!routes.includes(value.route)) errors.push(`${base}/actions/${action}:foreign-route:${value.route}`);
    for (const [object, value] of Object.entries(offer.objects))
      if (!Object.hasOwn(program.projectors, value.projector))
        errors.push(`${base}/objects/${object}:missing-projector:${value.projector}`);
    for (const [notice, value] of Object.entries(offer.notices))
      if (!program.facts.includes(value.fact)) errors.push(`${base}/notices/${notice}:unowned-fact:${value.fact}`);
  }
  return errors;
}
export function structuralContractErrors(programs: readonly ContractPackage[]): string[] {
  const errors = diagnoseContracts(programs);
  const ids = new Set<string>(),
    facts = new Set<string>();
  for (const program of programs) {
    if (program.desert !== 1) errors.push(`desert-contract:${program.id}`);
    if (ids.has(program.id)) errors.push(`duplicate-id:${program.id}`);
    ids.add(program.id);
    for (const fact of program.facts) {
      if (facts.has(fact)) errors.push(`duplicate-fact:${fact}`);
      if (!fact.startsWith(`${program.id}/`)) errors.push(`foreign-fact:${fact}`);
      facts.add(fact);
    }
    errors.push(...ownOffers(program));
    const halves: readonly Readonly<Record<string, ContractInterface>>[] = [program.offers, program.requests];
    for (const half of halves)
      for (const [name, contract] of Object.entries(half)) errors.push(...shapes(contract, `${program.id}/${name}`));
  }
  return [...new Set(errors)];
}
