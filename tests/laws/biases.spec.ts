import { uncataloguedWords, staleWordExemptions } from "../../src/checks/laws/biases.ts";
import { describe, expect, it } from "vitest";
import { root, ownCode } from "../support/sources.ts";
const repo = { root, code: ownCode };
import pkg from "../../package.json" with { type: "json" };
const options = pkg.desert.laws;
/**
 * The code that writes words no model and nobody reads as the being's: each file, with why. Anything else in words
 * the system writes (an option and its purpose, a kind's purpose, what the code writes into memory, a tool's purpose
 * and skill, a door's lines, the admin's replies) lives in the catalog, src/texts/.
 */
const words = { catalog: options.catalog, exempt: options.exemptWords };

describe("law 20: every text the system writes lives in the bias catalog", () => {
  it("no file of src outside the catalog holds a text in words, but the exempt ones and thrown errors", () => {
    expect(uncataloguedWords(repo, words)).toEqual([]);
  });

  it("the exemptions are not stale: each names a file that holds such words", () => {
    expect(staleWordExemptions(repo, words)).toEqual([]);
  });
});
