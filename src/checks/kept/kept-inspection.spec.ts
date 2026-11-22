import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { existsSync, readdirSync, statSync, rmSync, readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { keptFixture } from "../../../tests/support/kept-inspection.ts";
import { inspectKept } from "./kept-inspection.ts";
import * as calculations from "../calculations/check-calculations.ts";
import { InspectionUnavailable } from "../../tools/failures/inspection-unavailable.ts";
const temporary = vi.hoisted(() => ({ root: "" }));
vi.mock("node:os", async importOriginal => {
  const original = await importOriginal<typeof import("node:os")>();
  return { ...original, tmpdir: () => temporary.root || original.tmpdir() };
});
// Inspect and clean only this suite's copies; other workers may be inspecting at the same time.
beforeAll(() => {
  temporary.root = mkdtempSync(join(tmpdir(), "kept-inspection-owned-"));
});
afterAll(() => {
  rmSync(temporary.root, { recursive: true, force: true });
  temporary.root = "";
});
const copies = () => readdirSync(tmpdir()).filter(name => name.startsWith("desert-inspection-"));
for (const fails of [false, true])
  it(`X01: deletes the private copy when done, fails=${fails}`, async () => {
    const fixture = keptFixture();
    fixture.save();
    const before = copies();
    const owned: string[] = [];
    try {
      const inspection = inspectKept(fixture.program, fixture.file, async () => {
        const added = copies().filter(name => !before.includes(name));
        expect(added).toHaveLength(1);
        for (const name of added) {
          const home = join(tmpdir(), name);
          owned.push(home);
          expect(statSync(home).mode & 0o777).toBe(0o700);
          for (const file of readdirSync(home)) expect(statSync(join(home, file)).mode & 0o777).toBe(0o600);
        }
        await Promise.resolve();
        if (fails) throw new Error("synthetic cut");
      });
      if (fails) await expect(inspection).rejects.toThrow("synthetic cut");
      else await expect(inspection).resolves.toBeUndefined();
      expect(owned.every(home => !existsSync(home))).toBe(true);
    } finally {
      owned.forEach(home => rmSync(home, { recursive: true, force: true }));
    }
  });
it("X06: a reopening that differs from the full fold blocks entering inspection", async () => {
  const fixture = keptFixture();
  fixture.save();
  const use = vi.fn();
  const original = calculations.checkCalculations;
  const calculate = vi.spyOn(calculations, "checkCalculations").mockImplementation((...args) => ({
    ...original(...args),
    by: "otra identidad sintética",
  }));
  try {
    await expect(inspectKept(fixture.program, fixture.file, use)).rejects.toThrow("Reopened state differs");
    expect(use).not.toHaveBeenCalled();
  } finally {
    calculate.mockRestore();
  }
});

it("inspection creates no auxiliary files and changes no bytes beside the evidence", async () => {
  const fixture = keptFixture();
  fixture.save();
  const before = readFileSync(fixture.file);
  await inspectKept(fixture.program, fixture.file, house => {
    expect(readdirSync(fixture.folder)).toEqual(["kept.sqlite"]);
    expect(() => house.devices.door.challenge("device")).toThrow(InspectionUnavailable);
    expect(() =>
      house.devices.door.connect("challenge", "synthetic", {
        inventory: [],
        receive: () => Promise.resolve({ status: "accepted", reference: "unused" }),
      }),
    ).toThrow(InspectionUnavailable);
  });
  expect(readFileSync(fixture.file)).toEqual(before);
  expect(readdirSync(fixture.folder)).toEqual(["kept.sqlite"]);
});

it("X01: a failure before opening also deletes the temporary copy", async () => {
  const fixture = keptFixture();
  const before = copies();
  await expect(inspectKept(fixture.program, fixture.file, () => {})).rejects.toThrow();
  const added = copies().filter(name => !before.includes(name));
  try {
    expect(added).toEqual([]);
  } finally {
    added.forEach(name => rmSync(join(tmpdir(), name), { recursive: true, force: true }));
  }
});
it("two simultaneous inspections of the same kept journal clean only their own copy", async () => {
  const fixture = keptFixture();
  fixture.save();
  const before = copies();
  let entered: () => void = () => {};
  let release: () => void = () => {};
  const ready = new Promise<void>(resolve => {
    entered = resolve;
  });
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  const first = inspectKept(fixture.program, fixture.file, async () => {
    entered();
    await gate;
  });
  try {
    await ready;
    const duringFirst = copies();
    expect(duringFirst.filter(name => !before.includes(name))).toHaveLength(1);
    await inspectKept(fixture.program, fixture.file, () => {
      expect(copies().filter(name => !before.includes(name))).toHaveLength(2);
    });
    expect(copies()).toEqual(duringFirst);
    expect(readdirSync(fixture.folder)).toEqual(["kept.sqlite"]);
  } finally {
    release();
    await first;
  }
  expect(copies()).toEqual(before);
});
