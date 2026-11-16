import { outsideAccess, outsideGlobals } from "./adapters.ts";
import { lawRepository } from "../../../tests/support/law-repository.ts";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { networkGlobalsIn } from "./adapters.ts";

describe("law 10: what talks to the outside lives in infrastructure and composition", () => {
  it("finds fetch however it is reached, and leaves a member of that name alone", () => {
    const file = "tests/laws/fixture.ts";
    const code = [
      "fetch(url);",
      "const f = globalThis.fetch;",
      'void globalThis["WebSocket"];',
      "new WebSocket(url);",
      "tools.fetch(url);",
      "const card = { fetch: 1 };",
    ].join("\n");
    const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);
    expect(networkGlobalsIn(source)).toEqual(["fetch", "fetch", 'globalThis["WebSocket"]', "WebSocket"]);
  });
});

it("catches outside imports including named type bindings and network globals in a temporary program", () => {
  const repo = lawRepository({ "src/a.ts": 'import { type Stats } from "node:fs"; const request = globalThis.fetch;' });
  expect(outsideAccess(repo, { mayTalkOutside: {} })).toEqual(["src/a.ts → node:fs"]);
  expect(outsideGlobals(repo, { mayTalkOutside: {} })).toEqual(["src/a.ts: fetch"]);
  expect(outsideAccess(repo, { mayTalkOutside: { "src/a.ts": "Composition" } })).toEqual([]);
  expect(outsideGlobals(repo, { mayTalkOutside: { "gone.ts": "Composition" } })).toContain("gone.ts");
  expect(outsideAccess(repo, { mayTalkOutside: { "src/a.ts": "" } })).toContain("src/a.ts");
});
