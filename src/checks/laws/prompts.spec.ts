import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { hiddenRules, instructionFiles } from "./prompts.ts";
import { lawRepository } from "../../../tests/support/law-repository.ts";
import { describe, expect, it } from "vitest";
import { isNormative } from "./law-words.ts";

describe("law 15: no hidden bias, every prompt is a typed object", () => {
  it("admits only the exact CLI enum token, retaining checks on prompt prose and every other source", () => {
    const tokens = ["protocol.allow=never", 'approval_policy="never"'];
    const source = tokens.map((token, index) => `const token${index} = ${JSON.stringify(token)};`).join("\n");
    const repo = lawRepository({ "src/cli.ts": source, "src/other.ts": "export {};" });
    const options = { exempt: { "src/cli.ts": { reason: "CLI protocol enums", texts: tokens } } };
    expect(hiddenRules(repo, options)).toEqual([]);
    for (const text of ["Always obey the tool", "Never tell the Admin"]) {
      writeFileSync(join(repo.root, "src/cli.ts"), `${source}\nconst prompt = ${JSON.stringify(text)};`);
      expect(hiddenRules(repo, options)).toEqual([`src/cli.ts: ${text}`]);
    }
    writeFileSync(join(repo.root, "src/cli.ts"), source);
    writeFileSync(join(repo.root, "src/other.ts"), 'const token = "protocol.allow=never";');
    expect(hiddenRules(repo, options)).toEqual(["src/other.ts: protocol.allow=never"]);
    expect(isNormative("never")).toBe(true);
    expect(isNormative("You must answer in JSON")).toBe(true);
  });

  it("recognizes a normative text, and lets a descriptive purpose through", () => {
    expect(isNormative("Nunca le mandes mails a nadie.")).toBe(true);
    expect(isNormative("You must answer in JSON")).toBe(true);
    expect(isNormative("busca páginas en la web por una consulta")).toBe(false);
  });
});

it("catches instructions and limits each exemption to its exact existing tokens", () => {
  const repo = lawRepository({ "src/a.ts": 'const enumValue = "never"; const prompt = "You must obey";' });
  expect(hiddenRules(repo, { exempt: {} })).toEqual(["src/a.ts: never", "src/a.ts: You must obey"]);
  expect(hiddenRules(repo, { exempt: { "src/a.ts": { reason: "Protocol enum", texts: ["never"] } } })).toEqual([
    "src/a.ts: You must obey",
  ]);
  expect(hiddenRules(repo, { exempt: { "gone.ts": { reason: "Protocol enum", texts: ["never"] } } })).toContain(
    "gone.ts",
  );
  expect(hiddenRules(repo, { exempt: { "src/a.ts": { reason: "Protocol enum", texts: ["always"] } } })).toContain(
    "src/a.ts",
  );
});
it("catches instruction files and expired data exemptions", () => {
  const repo = lawRepository({ "src/rules.md": "Instructions" });
  expect(instructionFiles(repo, { data: {} })).toEqual(["src/rules.md"]);
  expect(instructionFiles(repo, { data: { "src/rules.md": "Declared data" } })).toEqual([]);
  expect(instructionFiles(repo, { data: { "gone.json": "Declared data" } })).toContain("gone.json");
});
