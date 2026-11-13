// Closed things are absent from every picker, including searches and a closed current value.
import { strictEqual } from "node:assert/strict";
import type { Field } from "../../surface/contract.ts";
import type { Composition } from "../../tools/promises.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { Seat } from "../promised-keys.ts";

export function closedChoices<X extends Program>(program: Composition<X>, seat: Seat<X>, field: Field | null) {
  if (field?.kind !== "pick") return;
  const source = program.registry.find(tool => tool.id === field.of);
  for (const value of source?.targets(seat.state()) ?? []) {
    if (!source?.closed?.(seat.state(), value, seat.now())) continue;
    for (const query of ["", field.shown(value)])
      strictEqual(
        field.found(query).some(option => option.value === value),
        false,
      );
  }
}
