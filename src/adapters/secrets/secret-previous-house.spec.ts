import { MemoryHouseKeys } from "./custody/house-keys.ts";
import { expect, it } from "vitest";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Type } from "@sinclair/typebox";
import { vocabulary } from "../../journal/events.ts";
import { toolAct } from "../../tools/act-definition.ts";
import { startHouse } from "../../programs/house-runtime.ts";
import { fixture, home, time, has, secret } from "../../../tests/support/secret-rig.ts";
import previous from "../../../tests/support/a01-previous-house.json" with { type: "json" };
const words = vocabulary({ "key-saved": Type.Object({ key: Type.String({ secret: true }), note: Type.String() }) });
for (const kind of ["fact", "exposed"] as const) {
  for (const oldMark of [false, true]) {
    it(`rechaza la casa WAL de 0ec3f7b sin cambiar registro ni bóveda: ${kind}, marca v1 ${oldMark}`, () => {
      const rig = fixture();
      const path = home();
      const files = previous[kind];
      for (const [name, bytes] of Object.entries(files)) writeFileSync(join(path, name), Buffer.from(bytes, "base64"));
      if (oldMark) writeFileSync(join(path, "secret-protection.json"), '{"version":1,"reviewed":2,"unreviewable":0}');
      const registry = [
        {
          id: "vault",
          purpose: "Inventado",
          targets: () => [],
          view: () => "",
          summary: () => "",
          acts: {
            set: toolAct(secret, () => ({ status: "accepted" })),
            fact: toolAct(Type.Object({ note: Type.String() }), () => ({ status: "accepted" })),
          },
        },
      ];
      let failure: unknown;
      try {
        startHouse(path, {
          by: rig.options.by,
          projectionVersion: rig.options.projectionVersion,
          secretKeys: rig.options.secretKeys ?? new MemoryHouseKeys(),
          creation: rig.options.creation,
          words,
          slices: {
            initial: { vault: 0 },
            step: { vault: state => Number(state) + 1 },
          },
          registry,
        }).close();
      } catch (error) {
        failure = error;
      }
      expect(failure).toMatchObject({ code: "E-SECRET-HISTORY" });
      expect(failure).toHaveProperty(
        "positions",
        expect.arrayContaining([
          expect.objectContaining(
            kind === "fact"
              ? { action: "key-saved", position: "/data/key" }
              : { action: "vault/set", position: "/value" },
          ),
        ]),
      );
      expect(has(failure, kind === "fact" ? "CLAVE" : "Ω")).toBe(false);
      for (const [name, bytes] of Object.entries(files))
        expect(readFileSync(join(path, name))).toEqual(Buffer.from(bytes, "base64"));
      expect(readdirSync(path).sort()).toEqual([
        "fixture.sqlite",
        "journal.sqlite",
        "journal.sqlite-shm",
        "journal.sqlite-wal",
        ...(oldMark ? ["secret-protection.json"] : []),
      ]);
      expect(readFileSync(join(path, "journal.sqlite-wal")).length).toBe(0);
    });
  }
}
it("la casa real anterior con referencias abre y cuenta hechos y acciones", () => {
  const rig = fixture();
  const path = home();
  for (const [name, bytes] of Object.entries(previous.reference))
    writeFileSync(join(path, name), Buffer.from(bytes, "base64"));
  const opened = startHouse(path, rig.options, time);
  opened.close();
  expect(JSON.parse(readFileSync(join(path, "secret-protection.json"), "utf8"))).toMatchObject({
    version: 2,
    reviewed: 2,
    reviewedFacts: 0,
    unreviewable: 0,
  });
});
