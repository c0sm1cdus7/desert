import { expect, it } from "vitest";
import { Type } from "@sinclair/typebox";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fixture, home } from "../../../tests/support/secret-rig.ts";
import { vocabulary } from "../../journal/events.ts";
import { SqliteJournal } from "../storage/journal-store.ts";
import { protectHistory } from "./history/secret-history.ts";
import { protectedVocabulary } from "./positions/protected-vocabulary.ts";
const mark = Type.String({ secret: true, maxLength: 2 });
const words = vocabulary({
  nested: Type.Object({
    "a/b~": Type.Array(Type.Object({ token: mark })),
    absent: Type.Optional(mark),
    choice: Type.Union([
      Type.Object({ kind: Type.Literal("public"), value: Type.String() }),
      Type.Object({ kind: Type.Literal("private"), value: mark }),
    ]),
  }),
});
for (const exposed of [true, false])
  it(`la revisión de hechos recorre listas, uniones y opcionales: ${exposed}`, () => {
    const rig = fixture();
    const path = home();
    const journal = new SqliteJournal(join(path, "journal.sqlite"), protectedVocabulary(words));
    const value = exposed ? "Ω" : "secret:00000000-0000-0000-0000-000000000000";
    journal.append(
      words.fact(
        "nested",
        {
          "a/b~": [{ token: value }],
          choice: { kind: "private", value },
        },
        "ana",
      ),
      1000,
    );
    journal.append(
      words.fact(
        "nested",
        {
          "a/b~": [],
          choice: { kind: "public", value: "público" },
        },
        "ana",
      ),
      1000,
    );
    journal.close();
    const options = {
      by: "fixture",
      creation: rig.options.creation,
      words,
      registry: [],
      slices: { initial: {}, step: {} },
    };
    if (exposed)
      expect(() => protectHistory(path, options)).toThrow(
        expect.objectContaining({
          code: "E-SECRET-HISTORY",
          positions: [
            { action: "nested", position: "/data/a~1b~0/0/token", seq: 1 },
            { action: "nested", position: "/data/choice/value", seq: 1 },
          ],
        }),
      );
    else {
      protectHistory(path, options)();
      expect(JSON.parse(readFileSync(join(path, "secret-protection.json"), "utf8"))).toEqual({
        version: 2,
        reviewed: 0,
        reviewedFacts: 2,
        unreviewable: 0,
      });
    }
  });
it("un valor histórico que excede el esquema actual también falla con tipo y posición", () => {
  const rig = fixture();
  const path = home();
  const oldWords = vocabulary({ token: Type.Object({ value: Type.String() }) });
  const current = vocabulary({ token: Type.Object({ value: Type.String({ secret: true, maxLength: 1 }) }) });
  const journal = new SqliteJournal(join(path, "journal.sqlite"), oldWords);
  journal.append(oldWords.fact("token", { value: "INVENTADO-LARGO" }, "ana"), 1000);
  journal.close();
  expect(() =>
    protectHistory(path, {
      by: "fixture",
      creation: rig.options.creation,
      words: current,
      registry: [],
      slices: { initial: {}, step: {} },
    }),
  ).toThrow(
    expect.objectContaining({
      code: "E-SECRET-HISTORY",
      positions: [{ action: "token", position: "/data/value", seq: 1 }],
    }),
  );
});
