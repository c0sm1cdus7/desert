import assert from "node:assert/strict";
import { Notebook } from "../../products/notebook/product.ts";
import { Note, OnlyOwnerCanAccess } from "../../products/notebook/note.ts";
import { NotesController } from "../../products/notebook/dependencies.ts";
import { CreateNote, ReadNote, ArchiveNote } from "../../products/notebook/journeys.ts";
import type { SurfaceDefinition } from "../../src/program-grammar.ts";
import { Check } from "@sinclair/typebox/value";
import { ProductDefinitionSchema } from "../../src/contracts.ts";

// Negative compiler tests deliberately mutate raw input, never the authored product.
type MutableInput<T> = T extends string ? string : T extends number ? number
  : T extends object ? { -readonly [Key in keyof T]: MutableInput<T[Key]> } : T;

type NotebookFixture = Omit<typeof Notebook, "objects" | "journeys" | "surfaces" | "dependencies" | "policies"> & {
  objects: [typeof Note]; journeys: [typeof CreateNote, typeof ReadNote, typeof ArchiveNote];
  surfaces: [Extract<SurfaceDefinition, { kind: "human" }>, Extract<SurfaceDefinition, { kind: "agent" }>];
  dependencies: [typeof NotesController]; policies: [typeof OnlyOwnerCanAccess];
};

export function notebookDefinition(): MutableInput<NotebookFixture> {
  // Rejection tests deliberately mutate these positions. A changed example must invalidate their assumptions.
  assert.deepEqual(Notebook.objects, [Note]);
  assert.deepEqual(Notebook.journeys, [CreateNote, ReadNote, ArchiveNote]);
  assert.deepEqual(Notebook.dependencies, [NotesController]);
  assert.deepEqual(Notebook.policies, [OnlyOwnerCanAccess]);
  assert.deepEqual(Notebook.surfaces.map(surface => surface.kind), ["human", "agent"]);
  return structuredClone(Notebook) as MutableInput<NotebookFixture>;
}

export function protocolNotebookDefinition() {
  const snapshot: unknown = structuredClone(Notebook);
  assert.ok(Check(ProductDefinitionSchema, snapshot));
  return snapshot;
}
