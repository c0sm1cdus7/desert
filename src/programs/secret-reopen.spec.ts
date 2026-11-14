import { Type } from "@sinclair/typebox";
import { expect, it, vi } from "vitest";
import { copyFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fixture, home, words, type P } from "../../tests/support/secret-rig.ts";
import { SqliteJournal } from "../adapters/storage/journal-store.ts";
import type { HouseOptions } from "./house-runtime.ts";
import type { Composition } from "../tools/promises.ts";
import { vocabulary, type Emission } from "../journal/events.ts";
import { checkReopenedState } from "../adapters/storage/reopened-state.ts";
import { renewKeptJournals } from "./renew-kept.ts";
import { upgradeComparison } from "./upgrade-comparison.ts";
import { staged } from "./promised-stage.ts";
import { keptChecks } from "./kept-journals.ts";
import { codeUpgradeCheck } from "./code-upgrade-check.ts";
import { codeProjectionVersion } from "./calculation-version.ts";
const composition = (options: HouseOptions<P>): Composition<P> => ({
  ...options,
  registry: options.registry.map(tool => ({ ...tool, acts: {} })),
});
for (const [name, schema, material] of [
  ["máximo", Type.String({ secret: true, maxLength: 13 }), "inventado"],
  ["mínimo", Type.String({ secret: true, minLength: 50 }), "x".repeat(50)],
  ["forma", Type.String({ secret: true, pattern: "^inventado$" }), "inventado"],
] as const) {
  const prepare = () => {
    const words = vocabulary({ "sale-registered": Type.Object({ value: schema, copy: Type.String() }) });
    const rig = fixture(undefined, undefined, {}, { words });
    return { rig, words, event: words.fact("sale-registered", { value: material, copy: "público" }, "ana") };
  };
  it(`H1: termina el caso prometido con secreto acotado por ${name}`, async () => {
    const { rig, event } = prepare();
    await staged<P>(composition(rig.options), stage => {
      stage.house().bus.emit(event);
      stage.reopen();
      expect(
        stage
          .house()
          .tools.state()
          .tools.vault.some(e => e.kind === "sale-registered"),
      ).toBe(true);
      return Promise.resolve();
    });
  });
  for (const path of ["conservado", "renovación", "subida"] as const)
    it(`H1: ${path} lee la referencia con ${name} del material`, () => {
      const { rig, event } = prepare();
      rig.house.bus.emit(event);
      rig.close();
      const folder = home(),
        file = join(folder, "kept.sqlite");
      copyFileSync(join(rig.path, "journal.sqlite"), file);
      if (path === "conservado") checkReopenedState<P>(file, rig.options);
      else if (path === "renovación")
        expect(renewKeptJournals<P>(composition(rig.options), folder)).toEqual(["kept.sqlite"]);
      else {
        const comparison = upgradeComparison<P>(composition(rig.options), file, rig.options.by);
        try {
          expect(comparison.status.reused).toBe(true);
          comparison.compare();
        } finally {
          comparison.close();
        }
      }
    });
}
it("H1: el chequeo de código sin hechos secretos también pasa", async () => {
  const rig = fixture(),
    source = join(home(), "calculation.ts");
  writeFileSync(source, "export const version = 1;\n");
  await expect(
    codeUpgradeCheck<P>({ ...composition(rig.options), projectionVersion: codeProjectionVersion([source]) }).run(),
  ).resolves.toBeUndefined();
});
it("H6: abrir el conservado aún exige un proveedor; este paso no decide su custodia", async () => {
  const rig = fixture();
  rig.close();
  const folder = home();
  copyFileSync(join(rig.path, "journal.sqlite"), join(folder, "kept.sqlite"));
  const { secretKeys: _keys, ...program } = rig.options;
  const check = keptChecks<P>(
    composition(program),
    { words: {}, locale: { currency: "$", thousands: ".", decimal: ",", day: "dd/mm/aaaa" } },
    folder,
  )[0];
  expect(check).toBeDefined();
  await expect(check?.run()).rejects.toMatchObject({ code: "E-CUSTODY-PROVIDER" });
});

it("H1: ambas aperturas del chequeo de código admiten un hecho protegido", async () => {
  const rig = fixture(),
    source = join(home(), "calculation.ts");
  writeFileSync(source, "export const version = 1;\n");
  const append: unknown = Reflect.get(SqliteJournal.prototype, "append");
  if (typeof append !== "function") throw new Error("Missing journal append");
  const spy = vi.spyOn(SqliteJournal.prototype, "append").mockImplementation(function (
    this: SqliteJournal,
    entry: Emission,
    at: number,
  ) {
    const event = words.read(Reflect.apply(append, this, [entry, at]));
    if (entry.kind === "boot")
      Reflect.apply(append, this, [
        words.fact(
          "sale-registered",
          {
            value: "secret:00000000-0000-0000-0000-000000000000",
            copy: "público",
          },
          entry.by,
        ),
        at,
      ]);
    return event;
  });
  try {
    await expect(
      codeUpgradeCheck<P>({ ...composition(rig.options), projectionVersion: codeProjectionVersion([source]) }).run(),
    ).resolves.toBeUndefined();
  } finally {
    spy.mockRestore();
  }
});
