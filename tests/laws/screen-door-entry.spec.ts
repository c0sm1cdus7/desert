// The screen door's entries: its wire is browser-safe, no program may import either, and the door talks to nothing.
import { readFileSync } from "node:fs";
import { isBuiltin } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { outsideAccess, outsideGlobals } from "../../src/checks/laws/adapters.ts";
import { isProgramEntry } from "../../src/checks/laws/program-imports.ts";
import { importsOf, root, ownCode } from "../support/sources.ts";

const pkg: unknown = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const field = (value: unknown, key: string): unknown =>
  typeof value === "object" && value !== null && key in value
    ? Object.fromEntries(Object.entries(value))[key]
    : undefined;
const exportsOf = field(pkg, "exports");
const mayTalkOutside = field(field(field(pkg, "desert"), "laws"), "mayTalkOutside");
/** What a browser bundle may take from the wire's closure: the contract, its texts, the door's bounds, TypeBox. */
const allowed = [
  "src/surface/contract/",
  "src/texts/",
  "src/fields/languages.ts",
  "src/fields/phrases.ts",
  "src/doors/screen/screen-wire.ts",
  "src/doors/screen/screen-limits.ts",
];
const packages = new Set(["@sinclair/typebox", "@sinclair/typebox/value"]);
function unsafeIn(entry: string): readonly string[] {
  const seen = new Set<string>();
  const unsafe: string[] = [];
  for (let queue = [entry], file = queue.shift(); file !== undefined; file = queue.shift()) {
    if (seen.has(file)) continue;
    seen.add(file);
    const at = relative(root, file);
    if (!allowed.some(path => at.startsWith(path))) unsafe.push(`${at}: outside what a browser may load`);
    for (const specifier of importsOf(file)) {
      if (specifier.startsWith(".")) queue.push(resolve(dirname(file), specifier));
      else if (isBuiltin(specifier) || !packages.has(specifier)) unsafe.push(`${at} → ${specifier}`);
    }
  }
  return unsafe;
}
const repo = { root, code: ownCode };
const options = {
  mayTalkOutside: Object.fromEntries(
    Object.entries(typeof mayTalkOutside === "object" && mayTalkOutside !== null ? mayTalkOutside : {}).map(
      ([path, why]) => [path, String(why)],
    ),
  ),
};
describe("the screen door's entries", () => {
  it("publishes the door for hosts and its wire for browsers", () => {
    expect(field(exportsOf, "./doors/screen")).toBe("./src/doors/screen/public-screen.ts");
    expect(field(exportsOf, "./doors/screen/wire")).toBe("./src/doors/screen/screen-wire.ts");
  });
  it("keeps the wire's closure to what a browser can load", () => {
    expect(unsafeIn(join(root, "src/doors/screen/screen-wire.ts"))).toEqual([]);
    expect(unsafeIn(join(root, "src/doors/screen/public-screen.ts")).length).toBeGreaterThan(0);
  });
  it("is no program entry: a program never hosts a door", () => {
    expect([isProgramEntry("desert/doors/screen"), isProgramEntry("desert/doors/screen/wire")]).toEqual([false, false]);
  });
  it("talks to nothing: no file under src/doors/screen imports what reaches outside nor names fetch", () => {
    expect(Object.keys(options.mayTalkOutside).filter(path => path.startsWith("src/doors/screen"))).toEqual([]);
    const ours = (found: readonly string[]) => found.filter(line => line.startsWith("src/doors/screen/"));
    expect(ours(outsideAccess(repo, options))).toEqual([]);
    expect(ours(outsideGlobals(repo, options))).toEqual([]);
  });
});
