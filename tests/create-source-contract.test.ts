import test from "node:test";
import assert from "node:assert/strict";
import { compileViewProgram } from "../src/views/program.ts";
import { defineModule } from "../src/index.ts";
import { program, surface } from "./fixtures/view-program.ts";
import { notesSource } from "./fixtures/module-catalog.ts";
import { sourceRead } from "../src/views/program-bindings.ts";

test("a creation cannot infer its source even when exactly one matching read exists", () => {
  const candidate = structuredClone(program) as unknown as Record<string, any>;
  delete candidate.journeys.find((journey: any) => journey.kind === "create").source;
  assert.throws(() => compileViewProgram(candidate, surface), /INVALID_VIEW_PROGRAM/);
});

test("an authored creation must publish an explicit read source", () => {
  const candidate = notesSource() as unknown as Record<string, any>;
  delete candidate.journeys.find((journey: any) => journey.presentation?.kind === "create").presentation.source;
  assert.throws(() => defineModule(candidate as never), /INVALID_MODULE_DEFINITION/);
});

test("serialized v3 is not a compatibility path for an inferred creation source", () => {
  assert.throws(() => compileViewProgram({ ...program, version: "desert.view-program/3" }, surface), /INVALID_VIEW_PROGRAM/);
  const candidate = structuredClone(program) as unknown as Record<string, any>;
  candidate.journeys.find((journey: any) => journey.kind === "create").source = undefined;
  assert.throws(() => compileViewProgram(candidate, surface), /INVALID_VIEW_JSON/);
});

test("the runtime source resolver also fails closed instead of inferring a unique read", () => {
  const { source: _source, ...creation } = program.journeys[2];
  assert.throws(() => sourceRead(program, surface, creation as never), /INVALID_VIEW_SOURCE/);
});

test("an authored source is the admitted read identity, never an id, copy or mutation", () => {
  for (const [invalidSource, error] of [
    [(source: any) => source.journeys[1].execution.id, /STRING_MODULE_REFERENCE_FORBIDDEN/],
    [(source: any) => ({ ...source.journeys[1].execution }), /UNREGISTERED_LOCAL_REFERENCE/],
    [(source: any) => source.journeys[0].execution, /MODULE_SOURCE_REQUIRES_READ/],
    [() => undefined, /UNREGISTERED_LOCAL_REFERENCE/],
  ] as const) {
    const candidate = notesSource() as unknown as Record<string, any>;
    candidate.journeys[0].presentation.source = invalidSource(candidate);
    assert.throws(() => defineModule(candidate as never), error);
  }
});

test("the admitted read can be referenced by its execution or its paired presentation", () => {
  assert.doesNotThrow(() => defineModule(notesSource()));
  const candidate = notesSource();
  const withReadPresentation = { ...candidate, journeys: candidate.journeys.map((journey, index) => index === 0
    ? { ...journey, presentation: { ...candidate.journeys[0].presentation, source: candidate.journeys[1].presentation } }
    : journey) };
  assert.doesNotThrow(() => defineModule(withReadPresentation));
});

test("a presentation-only journey and an execution-only read cannot supply a rendered source", () => {
  for (const presentationOnly of [true, false]) {
    const candidate = notesSource() as unknown as Record<string, any>;
    if (presentationOnly) {
      const about = { id: "about", kind: "presentation", view: candidate.views[0], outputs: [] };
      candidate.journeys.push({ presentation: about });
      candidate.journeys[0].presentation.source = about;
    } else {
      delete candidate.journeys[1].presentation;
    }
    assert.throws(() => defineModule(candidate as never), /MODULE_SOURCE_REQUIRES_READ/);
  }
});
