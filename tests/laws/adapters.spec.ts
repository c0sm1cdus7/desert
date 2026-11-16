import { outsideAccess, outsideGlobals } from "../../src/checks/laws/adapters.ts";
import { describe, expect, it } from "vitest";
import { root } from "../support/sources.ts";
const repo = { root, code: ["src"] };
import pkg from "../../package.json" with { type: "json" };
const options = pkg.desert.laws;

describe("law 10: what talks to the outside lives in infrastructure and composition", () => {
  it("no file outside an adapter imports the network, processes, the file system, the system or a database", () => {
    expect(outsideAccess(repo, options)).toEqual([]);
  });

  it("no file outside an adapter reaches a network global, called or not", () => {
    expect(outsideGlobals(repo, options)).toEqual([]);
  });
});
