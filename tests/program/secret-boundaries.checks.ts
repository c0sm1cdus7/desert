import { expect, it } from "vitest";
import { programSecretBoundaries } from "../laws/program-secret-boundaries.ts";
it("tools cannot import secret custody, factories or direct I/O", () => {
  expect(programSecretBoundaries(process.cwd())).toEqual([]);
});
