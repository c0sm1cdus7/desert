// Diagnoses providers and cyclic paths before programs are bound.
import type { ContractInterface } from "../../tools/contracts/contract-types.ts";
import { compareContracts } from "./compare-contracts.ts";

export type ContractProgram = Readonly<{
  id: string;
  offers: Readonly<Record<string, ContractInterface>>;
  requests: Readonly<Record<string, ContractInterface>>;
}>;
export function diagnoseContracts(programs: readonly ContractProgram[]): string[] {
  const errors: string[] = [];
  const providers = (name: string) => programs.filter(program => Object.hasOwn(program.offers, name));
  for (const program of programs) {
    for (const [name, request] of Object.entries(program.requests)) {
      const matches = providers(name),
        path = `${program.id}/${name}`;
      if (matches.length === 0) errors.push(`no-provider:${path}`);
      else if (matches.length > 1) errors.push(`multiple-providers:${path}`);
      else if (matches[0]?.offers[name]) errors.push(...compareContracts(request, matches[0].offers[name], path));
    }
  }
  function visit(program: ContractProgram, seen: readonly ContractProgram[], route: string): void {
    if (seen.includes(program)) {
      errors.push(`cycle:${route}${program.id}`);
      return;
    }
    for (const name of Object.keys(program.requests)) {
      const matches = providers(name);
      if (matches.length === 1 && matches[0])
        visit(matches[0], [...seen, program], `${route}${program.id}-[${name}]->`);
    }
  }
  for (const program of programs) visit(program, [], "");
  return [...new Set(errors)];
}
