// DESERT is where interface may live: its own map names exactly the files the interface law finds, and no other.
import { expect, it } from "vitest";
import { interfaceCode } from "../../src/checks/laws/interface-code.ts";
import { root } from "../support/sources.ts";
import pkg from "../../package.json" with { type: "json" };

const repo = { root, code: pkg.desert.laws.code };
/** The cell painter and its keys, the checks that drive a real terminal, and the consent page written by hand. */
const painters = [
  "src/checks/real-terminal.ts",
  "src/doors/mcp/oauth-page.ts",
  "src/doors/terminal/boot.ts",
  "src/doors/terminal/cells.ts",
  "src/doors/terminal/input.ts",
];
it("finds in DESERT nothing beyond what its own map names", () => {
  expect(interfaceCode(repo, { exempt: pkg.desert.laws.interface })).toEqual([]);
});
it("the map names exactly the files where the law finds interface, each with its reason", () => {
  const found = interfaceCode(repo, { exempt: {} }).map(line => line.split(/: | → /u)[0]);
  expect([...new Set(found)].sort()).toEqual(painters);
  expect(Object.keys(pkg.desert.laws.interface).sort()).toEqual(painters);
});
