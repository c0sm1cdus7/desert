import { uncataloguedWords, staleWordExemptions } from "./biases.ts";
import { lawRepository } from "../../../tests/support/law-repository.ts";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { proseOf } from "./law-words.ts";

describe("law 20: every text the system writes lives in the bias catalog", () => {
  it("finds words written in code, and lets codes, ids, a template's joints and a thrown error through", () => {
    const code = [
      'const a = "I look at it again, one level higher.";',
      "const b = `blocked by the rule ${rule}`;",
      'const c = { kind: "actor-opened", id: "actors.open.kenon", at: "10:05" };',
      "const d = `${why} → ${how}: ${story}`;",
      "throw new Error(`the home is too long (${path}): use a shorter one`);",
      'const e = new TypeError("not a frame at all");',
    ].join("\n");
    const source = ts.createSourceFile("s.ts", code, ts.ScriptTarget.Latest, true);
    expect(proseOf(source)).toEqual(["I look at it again, one level higher.", "blocked by the rule "]);
  });
});

it("catches uncatalogued prose and rejects missing, empty-reason and no-longer-needed exemptions", () => {
  const repo = lawRepository({
    "src/a.ts": 'export const message = "A visible sentence";',
    "src/plain.ts": "export {};",
  });
  const options = { catalog: [], exempt: {} };
  expect(uncataloguedWords(repo, options)).toEqual(["src/a.ts: A visible sentence"]);
  expect(uncataloguedWords(repo, { ...options, catalog: ["src/a.ts"] })).toEqual([]);
  expect(uncataloguedWords(repo, { ...options, exempt: { "src/a.ts": "Technical text" } })).toEqual([]);
  expect(staleWordExemptions(repo, { ...options, exempt: { "gone.ts": "Technical text" } })).toEqual(["gone.ts"]);
  expect(staleWordExemptions(repo, { ...options, exempt: { "src/a.ts": "" } })).toEqual(["src/a.ts"]);
  expect(staleWordExemptions(repo, { ...options, exempt: { "src/plain.ts": "Technical text" } })).toEqual([
    "src/plain.ts",
  ]);
});
