// Closes contract maps without inherited properties and copies declarations before binding them.
import { Value } from "@sinclair/typebox/value";
import type { ContractPackage } from "../../tools/contracts/package-contracts.ts";
export function contractRecord<T>(entries: Iterable<readonly [string, T]>): Readonly<Record<string, T>> {
  const record = Object.fromEntries(entries);
  Object.setPrototypeOf(record, null);
  return Object.freeze(record);
}
export function copyContractPackages(programs: readonly ContractPackage[]): readonly ContractPackage[] {
  return programs.map(program => ({
    ...program,
    tools: Value.Clone(program.tools),
    facts: [...program.facts],
    offers: Value.Clone(program.offers),
    requests: Value.Clone(program.requests),
    projectors: { ...program.projectors },
  }));
}
