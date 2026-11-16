import { expect, it } from "vitest";
import { identityNameProblem } from "./identity-name.ts";

it("explains the same rule without repeating the rejected identifier", () => {
  expect(identityNameProblem("Ana", "shop")).toMatch(/letra.*64/);
  expect(identityNameProblem("Ana", "shop")).not.toContain("Ana");
  expect(identityNameProblem("ana", "shop")).toBeUndefined();
});
