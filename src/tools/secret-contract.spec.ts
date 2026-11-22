import { expect, expectTypeOf, it } from "vitest";
import * as levers from "../house/own-acts.ts";
import type { Program, ToolAct } from "./tool-contract.ts";
it("the contract offers no secretInputs and no minimum that does not protect", () => {
  expectTypeOf<ToolAct<Program>>().not.toHaveProperty("secretInputs");
  expect(levers).not.toHaveProperty("secretLimits");
});
