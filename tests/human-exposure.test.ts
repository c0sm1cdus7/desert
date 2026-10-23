import test from "node:test";
import assert from "node:assert/strict";
import { humanSurface } from "../src/surfaces.ts";
import { CreateNote, ReadNote } from "../products/notebook/journeys.ts";

const author = () => ({ id: "human", journeys: [CreateNote, ReadNote], locale: "en" });

test("Human authoring exposes journeys and language locale without a second semantic owner", () => {
  const source = author();
  const exposure = humanSurface(source);
  assert.deepEqual(exposure, {
    id: "human", kind: "human", journeys: [CreateNote, ReadNote], locale: "en",
  });
  assert.equal(exposure.journeys[0], CreateNote);
  assert.equal(exposure.journeys[1], ReadNote);
  assert.notEqual(exposure.journeys, source.journeys);
  assert.ok(Object.isFrozen(exposure));
  assert.ok(Object.isFrozen(exposure.journeys));
});

test("Human authoring rejects semantic maps even when supplied through a variable", () => {
  for (const key of ["inputs", "fieldRepresentations", "commit", "language"]) for (const value of [{}, undefined, null]) {
    const injected = { ...author(), [key]: value };
    assert.throws(() => humanSurface(injected as never), { message: "SURFACE_SEMANTICS_FORBIDDEN" });
  }
});

test("Human exposure cannot ignore extra or incomplete authoring", () => {
  assert.throws(() => humanSurface({ ...author(), padding: 0 } as never), { message: "INVALID_HUMAN_EXPOSURE" });
  const { locale, ...missingLocale } = author();
  assert.throws(() => humanSurface(missingLocale as never), { message: "INVALID_HUMAN_EXPOSURE" });
  assert.throws(() => humanSurface({ ...author(), journeys: [] } as never), { message: "INVALID_HUMAN_EXPOSURE" });
  assert.throws(() => humanSurface({ ...author(), journeys: [ReadNote.id] } as never), { message: "STRING_MODULE_REFERENCE_FORBIDDEN" });
});
