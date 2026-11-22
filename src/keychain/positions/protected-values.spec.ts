// The real protected reader normalizes core history while preserving opaque references and strict new emissions.
import { expect, it } from "vitest";
import { Type } from "@sinclair/typebox";
import { randomUUID } from "node:crypto";
import { vocabulary } from "../../journal/vocabulary.ts";
import { protectedVocabulary } from "./protected-vocabulary.ts";
it("keeps secret references intact and reads no door origin stored under its old name: it is migrated", () => {
  const original = vocabulary({ secret: Type.Object({ value: Type.String({ secret: true, maxLength: 2 }) }) });
  const words = protectedVocabulary(original);
  const reference = `secret:${randomUUID()}`;
  const stored = { ...original.fact("secret", { value: reference }, "ana"), id: randomUUID(), seq: 1, at: 1000 };
  expect(words.read(stored)).toEqual(stored);
  expect(Object.isFrozen(words.read(stored))).toBe(true);
  const historical = {
    layer: "house",
    kind: "door-key-issued",
    by: "ana",
    cause: [],
    id: randomUUID(),
    seq: 2,
    at: 1001,
    data: { id: randomUUID(), identity: "beto", door: "agente", fingerprint: "a".repeat(64) },
  };
  expect(() => words.read(historical)).toThrow("Invalid protected event");
  const migrated = { ...historical, data: { ...historical.data, door: "agent" } };
  expect(words.read(migrated)).toMatchObject({ data: { door: "agent" } });
});
