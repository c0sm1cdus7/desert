import { expect, it } from "vitest";
import { identityNameProblem } from "./identity-name.ts";

it.each([
  ["shop", "casa"],
  ["mind:desk", "mente"],
  [" ana", "recortado"],
  ["ana ", "recortado"],
  ["ana\n", "recortado"],
  ["a\u0001na", "control"],
  ["ana\u200b", "formato"],
  ["\u0301", "visible"],
])("rechaza %j por %s", (name, problem) => {
  expect(identityNameProblem(name, "shop")).toContain(problem);
});
it("conserva nombres distintos por mayúsculas", () => {
  expect(identityNameProblem("Ana", "shop")).toBeUndefined();
  expect(identityNameProblem("ana", "shop")).toBeUndefined();
});
