import { uncataloguedWords, staleWordExemptions } from "../../src/checks/laws/biases.ts";
import { describe, expect, it } from "vitest";
import { root } from "../support/sources.ts";
const repo = { root, code: ["src"] };
import pkg from "../../package.json" with { type: "json" };
const options = pkg.desert.laws;
const words = { catalog: options.catalog, exempt: options.exemptWords };

describe("law 20: every text the system writes lives in the bias catalog", () => {
  it("no file of src outside the catalog holds a text in words, but the exempt ones and thrown errors", () => {
    expect(uncataloguedWords(repo, words)).toEqual([]);
  });

  it("the exemptions are not stale: each names a file that holds such words", () => {
    expect(staleWordExemptions(repo, words)).toEqual([]);
  });
});
