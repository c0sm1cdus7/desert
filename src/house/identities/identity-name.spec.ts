import { expect, it } from "vitest";
import { everySaid, said } from "../../fields/phrases.ts";
import { identityNameProblem } from "./identity-name.ts";

it("explains the same rule without repeating the rejected identifier", () => {
  expect(said(identityNameProblem("Ana", "shop") ?? "", "es")).toMatch(/letra.*64/);
  expect(said(identityNameProblem("Ana", "shop") ?? "", "en")).toMatch(/letter.*64/);
  expect(everySaid(identityNameProblem("Ana", "shop") ?? "")).not.toContain("Ana");
  expect(identityNameProblem("ana", "shop")).toBeUndefined();
});
