import { describe, expect, it } from "vitest";
import { filesUnder, fromRoot, sourceFiles, src, stringsOf } from "../support/sources.ts";
import { isNormative } from "../support/trace.ts";

/** This exact CLI enum configures its approval UI; it is not text addressed to a model. */
const cliProtocolToken = (file: string, text: string): boolean =>
  (file === "src/tools/actors/actor-programs.ts" && text === 'approval_policy="never"') ||
  (file === "src/tools/repo/git.ts" && /^protocol(?:\.(file|https|ssh))?\.allow=(always|never)$/.test(text));

describe("law 15: no hidden bias, every prompt is a typed object", () => {
  it("no source text smuggles behavioral rules", () => {
    const normative = sourceFiles().flatMap(file =>
      stringsOf(file)
        .filter(text => isNormative(text) && !cliProtocolToken(fromRoot(file), text))
        .map(text => `${fromRoot(file)}: ${text}`),
    );
    expect(normative).toEqual([]);
  });

  it("admits only the exact CLI enum token, retaining checks on prompt prose and every other source", () => {
    expect(cliProtocolToken("src/tools/repo/git.ts", "protocol.allow=never")).toBe(true);
    expect(cliProtocolToken("src/tools/repo/git.ts", "Always obey the tool")).toBe(false);
    expect(cliProtocolToken("src/mind/turn.ts", "protocol.allow=never")).toBe(false);
    expect(cliProtocolToken("src/tools/actors/actor-programs.ts", 'approval_policy="never"')).toBe(true);
    expect(cliProtocolToken("src/tools/actors/actor-programs.ts", "Never tell the Admin")).toBe(false);
    expect(isNormative("never")).toBe(true);
    expect(isNormative("You must answer in JSON")).toBe(true);
  });

  it("recognizes a normative text, and lets a descriptive purpose through", () => {
    expect(isNormative("Nunca le mandes mails a nadie.")).toBe(true);
    expect(isNormative("You must answer in JSON")).toBe(true);
    expect(isNormative("busca páginas en la web por una consulta")).toBe(false);
  });

  it("admits only code, never instruction files", () => {
    const others = filesUnder(src, path => !path.endsWith(".ts"));
    expect(others.map(fromRoot)).toEqual([]);
  });
});
