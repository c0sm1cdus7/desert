// The English-names law: DESERT names nothing in Spanish outside its texts, and the law sees every kind of name.
import { describe, expect, it } from "vitest";
import { spanishNames, spanishWordsOf, wordsOf } from "../../src/checks/laws/english-names.ts";
import { lawRepository } from "../support/law-repository.ts";
import { root, ownCode } from "../support/sources.ts";
import cases from "./english-names-cases.json" with { type: "json" };

const catalog = { catalog: ["src/texts/"] };

describe("the English-names law", () => {
  it("finds no Spanish name in DESERT: code, tests, file names and npm scripts", () => {
    expect(spanishNames({ root, code: ownCode }, catalog)).toEqual([]);
  });

  it("splits a name into its words in every case style", () => {
    expect(wordsOf("defineProgram")).toEqual(["define", "program"]);
    expect(wordsOf("HTTPServer_port-name.ts")).toEqual(["http", "server", "port", "name", "ts"]);
    for (const [name, words] of Object.entries(cases.words)) expect(spanishWordsOf(name)).toEqual(words);
  });

  it("names each Spanish identifier, key, file, folder and script, and every retired name a string holds", () => {
    expect(spanishNames(lawRepository(cases.planted.files), catalog)).toEqual(cases.planted.found);
  });

  it("leaves the catalog's Spanish strings alone, but never its keys", () => {
    expect(spanishNames(lawRepository(cases.catalog.files), catalog)).toEqual(cases.catalog.found);
  });
});
