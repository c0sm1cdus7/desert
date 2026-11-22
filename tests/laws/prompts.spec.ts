import { hiddenRules, instructionFiles } from "../../src/checks/laws/prompts.ts";
import { describe, expect, it } from "vitest";
import { root, ownCode } from "../support/sources.ts";
const repo = { root, code: ownCode };
import pkg from "../../package.json" with { type: "json" };
const options = pkg.desert.laws;

describe("law 15: no hidden bias, every prompt is a typed object", () => {
  it("no source text smuggles behavioral rules", () => {
    expect(hiddenRules(repo, { exempt: options.exemptRules })).toEqual([]);
  });

  it("admits only code, never instruction files", () => {
    expect(instructionFiles(repo, options)).toEqual([]);
  });
});
