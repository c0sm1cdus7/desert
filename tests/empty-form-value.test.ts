import assert from "node:assert/strict";
import test from "node:test";
import { compile } from "../src/compile.ts";
import { Notebook } from "../products/notebook/product.ts";
import type { ProductDefinition } from "../src/contracts.ts";
import type { HumanSurface } from "../src/web/types.ts";
import { deriveForm } from "../src/interaction/form.ts";
import { humanState } from "../src/web/client/state.ts";
import { notebookScope } from "./fixtures/notebook-scope.ts";

test("property presence does not impose nonempty text and initial draft matches displayed controls", () => {
  const definition: ProductDefinition = JSON.parse(JSON.stringify(Notebook));
  definition.objects[0]!.facts.title = { kind: "text", minLength: 0 };
  const application = compile(definition);
  const surface = application.surface("human") as HumanSurface;
  const create = surface.journeys.find(journey => journey.id === "create-note")!;
  assert.equal(create.kind, "mutation");
  assert.equal(application.validateInput(create.commandId, { title: "", body: "Body" }).valid, true);
  assert.equal(application.validateInput(create.commandId, { body: "Body" }).valid, false);
  const fields = deriveForm(create, surface.fieldRepresentations);
  assert.equal(fields.find(field => field.name === "title")!.required, false);
  assert.equal(fields.find(field => field.name === "body")!.required, true);
  assert.deepEqual(humanState(surface, notebookScope(surface)).get().draft, { title: "", body: "" });
});
