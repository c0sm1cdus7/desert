import { existsSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { fromRoot, parsed, proseOf, root, sourceFiles } from "../support/sources.ts";

/**
 * The code that writes words no model and nobody reads as the being's: each file, with why. Anything else in words
 * the system writes (an option and its purpose, a kind's purpose, what the code writes into memory, a tool's purpose
 * and skill, a door's lines, the admin's replies) lives in the catalog, src/texts/.
 */
const exempt: Readonly<Record<string, string>> = {
  "src/keychain/custody/custody-database.ts": "the encrypted custody store SQL, separate from the journal",
  "src/keychain/custody/custody-migration.ts": "the legacy secret store SQL read during custody adoption",
  "src/storage/journal-store.ts": "the journal's SQL",
  "src/storage/journal-reader.ts": "the read-only journal's SQL, extracted from journal-store",
};

const isCatalog = (file: string): boolean => fromRoot(file).startsWith("src/texts/");
const writing = (): string[] => sourceFiles().filter(file => !isCatalog(file) && !(fromRoot(file) in exempt));

describe("law 20: every text the system writes lives in the bias catalog", () => {
  it("no file of src outside the catalog holds a text in words, but the exempt ones and thrown errors", () => {
    const outside = writing().flatMap(file => proseOf(parsed(file)).map(text => `${fromRoot(file)}: ${text}`));
    expect(outside).toEqual([]);
  });

  it("the exemptions are not stale: each names a file that holds such words", () => {
    const stale = Object.keys(exempt).filter(path => {
      const file = join(root, path);
      return !existsSync(file) || proseOf(parsed(file)).length === 0;
    });
    expect(stale).toEqual([]);
  });

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
