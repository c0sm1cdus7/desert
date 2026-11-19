import { expect, it, vi } from "vitest";
import { existsSync, readdirSync, statSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { keptFixture } from "../../../tests/support/kept-inspection.ts";
import { inspectKept } from "./kept-inspection.ts";
import * as calculations from "../calculations/check-calculations.ts";
import { InspectionUnavailable } from "../../tools/failures/inspection-unavailable.ts";
const copies = () => readdirSync(tmpdir()).filter(name => name.startsWith("desert-inspection-"));
for (const fails of [false, true])
  it(`X01: borra la copia privada al terminar, falla=${fails}`, async () => {
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
        if (fails) throw new Error("corte sintético");
      });
      if (fails) await expect(inspection).rejects.toThrow("corte sintético");
      else await expect(inspection).resolves.toBeUndefined();
      expect(owned.every(home => !existsSync(home))).toBe(true);
    } finally {
      owned.forEach(home => rmSync(home, { recursive: true, force: true }));
    }
  });
it("X06: una reapertura que difiere del plegado completo impide entrar a inspección", async () => {
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

it("la inspección no crea auxiliares ni cambia los bytes junto a la evidencia", async () => {
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

it("X01: una falla antes de abrir también borra la copia temporal", async () => {
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
it("dos inspecciones simultáneas del mismo conservado limpian solo su propia copia", async () => {
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
