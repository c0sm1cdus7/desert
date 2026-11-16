import { importCycles } from "../../src/checks/laws/cycles.ts";
import { describe, expect, it } from "vitest";
import { root } from "../support/sources.ts";
const repo = { root, code: ["src"] };

describe("law 21: no import cycles among the production files", () => {
  it("no production file loads itself back through the imports that run", () => {
    expect(importCycles(repo)).toEqual([]);
  });
});
