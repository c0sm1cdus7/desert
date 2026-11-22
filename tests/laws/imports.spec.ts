import { strayImports } from "../../src/checks/laws/imports.ts";
import { describe, expect, it } from "vitest";
import { root, ownCode } from "../support/sources.ts";
const repo = { root, code: ownCode };
import pkg from "../../package.json" with { type: "json" };
const options = pkg.desert.laws;

describe("law 2: explicit dependencies and isolated adapters", () => {
  it("checks static, dynamic, re-exported and type-only dependencies, without an external-source exception", () => {
    expect(strayImports(repo, options)).toEqual([]);
  });
});
