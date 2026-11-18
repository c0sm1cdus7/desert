// Diagnostica proveedores y recorridos cíclicos antes de enlazar programas.
import type { ContractInterface } from "./contract-types.ts";
import { compareContracts } from "./compare-contracts.ts";

export type ContractProgram = Readonly<{
  id: string;
  ofrece: Readonly<Record<string, ContractInterface>>;
  pide: Readonly<Record<string, ContractInterface>>;
}>;
export function diagnoseContracts(programs: readonly ContractProgram[]): string[] {
  const errors: string[] = [];
  const providers = (name: string) => programs.filter(program => Object.hasOwn(program.ofrece, name));
  for (const program of programs) {
    for (const [name, request] of Object.entries(program.pide)) {
      const matches = providers(name),
        path = `${program.id}/${name}`;
      if (matches.length === 0) errors.push(`sin-proveedor:${path}`);
      else if (matches.length > 1) errors.push(`dos-o-mas-proveedores:${path}`);
      else if (matches[0]?.ofrece[name]) errors.push(...compareContracts(request, matches[0].ofrece[name], path));
    }
  }
  function visit(program: ContractProgram, seen: readonly ContractProgram[], route: string): void {
    if (seen.includes(program)) {
      errors.push(`ciclo:${route}${program.id}`);
      return;
    }
    for (const name of Object.keys(program.pide)) {
      const matches = providers(name);
      if (matches.length === 1 && matches[0])
        visit(matches[0], [...seen, program], `${route}${program.id}-[${name}]->`);
    }
  }
  for (const program of programs) visit(program, [], "");
  return [...new Set(errors)];
}
