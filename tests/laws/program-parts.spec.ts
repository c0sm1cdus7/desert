// The gate partitions occurrences, never names: repetitions still belong to exactly one part.
import { describe, expect, it, vi } from "vitest";
import { program, shown } from "../support/shop-program.ts";
import { keptChecks } from "../../src/programs/kept-journals.ts";
import { programChecks } from "../../src/programs/program-checks.ts";
import { checksInPart, programPartCount } from "../program/parts.ts";
import { summarize } from "../program/manifest.ts";
import { programGroups, registerPart, type Group } from "../program/registration.ts";
import type { Check } from "../../src/programs/promised-stage.ts";

const parts = () => Array.from({ length: programPartCount }, (_, part) => part);
const collect = (groups: readonly Group[], part: number) => {
  const registered: { group: string; check: Check }[] = [];
  registerPart(groups, part, (group, checks) => {
    registered.push(...checks.map(check => ({ group, check })));
  });
  return registered;
};

describe("every derived check belongs to one part", () => {
  it.each([0, 1, 7, 8, 9, 4099])(
    "partitions %i occurrences, including repeated names, without loss or overlap",
    size => {
      const checks = Array.from({ length: size }, (_, id) => ({ id, name: `repeated ${id % 3}` }));
      const split = parts().map(part => checksInPart(checks, part));
      expect(split.flat()).toHaveLength(size);
      expect(split.flat().sort((a, b) => a.id - b.id)).toEqual(checks);
      expect(new Set(split.flat()).size).toBe(size);
      expect(Math.max(...split.map(part => part.length)) - Math.min(...split.map(part => part.length))).toBeLessThan(2);
      split.forEach((selected, part) => {
        expect(selected).toEqual(checks.filter((_, position) => position % programPartCount === part));
        expect(checksInPart(checks, part)).toEqual(selected);
      });
    },
  );

  it("rejects an invalid part instead of silently dropping checks", () => {
    for (const part of [-1, programPartCount, 0.5, NaN]) expect(() => checksInPart([], part)).toThrow("part");
  });

  it("registers exactly the old shop groups and names across all parts", async () => {
    const where = "tests/support/shop-program.ts";
    const registered: string[] = [];
    let group = "";
    vi.doMock("vitest", () => ({
      describe: (name: string, body: () => void) => {
        group = name;
        body();
      },
      inject: () => summarize(programGroups({ program, shown, where })),
      it: (name: string) => registered.push(`${group} > ${name}`),
    }));
    try {
      await import("../program/part-0.checks.ts");
      await import("../program/part-1.checks.ts");
      await import("../program/part-2.checks.ts");
      await import("../program/part-3.checks.ts");
      await import("../program/part-4.checks.ts");
      await import("../program/part-5.checks.ts");
      await import("../program/part-6.checks.ts");
      await import("../program/part-7.checks.ts");
    } finally {
      vi.doUnmock("vitest");
    }
    const original = programChecks(program, shown).map(
      check => `what the program composed in ${where} promises > ${check.name}`,
    );
    original.push(
      "the journals the program keeps > checks upgrade evidence even when the program names no journal folder",
      ...keptChecks(program, shown).map(check => `the journals the program keeps > ${check.name}`),
    );
    expect(registered.sort()).toEqual(original.sort());
  });

  it("distributes saved-journal checks too, even when their names repeat", () => {
    const checks = Array.from({ length: 33 }, () => ({ name: "kept journal", run: async () => {} }));
    const groups = [{ name: "the journals the program keeps", checks }];
    const registered = parts().map(part => collect(groups, part));
    expect(registered.flat().map(({ check }) => check)).toHaveLength(checks.length);
    expect(new Set(registered.flat().map(({ check }) => check)).size).toBe(checks.length);
    expect(registered.map(part => part.length)).toEqual([5, 4, 4, 4, 4, 4, 4, 4]);
  });

  it("registers a passing check for an empty part", async () => {
    for (const part of parts()) {
      const registered = collect([], part);
      expect(registered).toHaveLength(1);
      await expect(registered[0]?.check.run()).resolves.toBeUndefined();
    }
  });

  it("does not hide a failure in any part", async () => {
    const checks = parts().map(part => ({
      name: `failure ${part}`,
      run: () => Promise.reject(new Error(`failure ${part}`)),
    }));
    for (const part of parts()) {
      const [registered] = collect([{ name: "promises", checks }], part);
      await expect(registered?.check.run()).rejects.toThrow(`failure ${part}`);
    }
  });
});
