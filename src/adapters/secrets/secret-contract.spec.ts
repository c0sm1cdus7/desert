import { expect, expectTypeOf, it } from "vitest";
import * as levers from "../../catalogs/levers.ts";
import type { Program, ToolAct } from "../../tools/tool-contract.ts";
it("el contrato no ofrece secretInputs ni un mínimo que no protege", () => {
  expectTypeOf<ToolAct<Program>>().not.toHaveProperty("secretInputs");
  expect(levers).not.toHaveProperty("secretLimits");
});
