import test from "node:test";
import assert from "node:assert/strict";
import { humanExposure } from "../src/exposures.ts";
import { CreateNote, ReadNote } from "../products/notebook/journeys.ts";

const author = () => ({ id: "human", journeys: [CreateNote, ReadNote], locale: "en" });

test("Human authoring exposes journeys and language locale without a second semantic owner", () => {
  const source = author();
  const exposure = humanExposure(source);
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
    assert.throws(() => humanExposure(injected as never), { message: "SURFACE_SEMANTICS_FORBIDDEN" });
  }
});

test("Human exposure cannot ignore extra or incomplete authoring", () => {
  assert.throws(() => humanExposure({ ...author(), padding: 0 } as never), { message: "INVALID_HUMAN_EXPOSURE" });
  const { locale, ...missingLocale } = author();
  assert.throws(() => humanExposure(missingLocale as never), { message: "INVALID_HUMAN_EXPOSURE" });
  assert.throws(() => humanExposure({ ...author(), journeys: [] } as never), { message: "INVALID_HUMAN_EXPOSURE" });
  assert.throws(() => humanExposure({ ...author(), journeys: [ReadNote.id] } as never), { message: "STRING_MODULE_REFERENCE_FORBIDDEN" });
});
