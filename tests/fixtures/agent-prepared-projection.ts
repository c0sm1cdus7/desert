import type { ProductDefinition } from "../../src/contracts.ts";
import { protocolNotebookDefinition } from "./notebook.ts";
import type { Intent, Run } from "../../src/local/types.ts";

export function agentProjectionDefinition(): ProductDefinition {
  const definition: ProductDefinition = protocolNotebookDefinition();
  const note = definition.objects[0]!;
  for (const field of ["privateFact", "otherSurfaceFact", "siblingInput", "aliasSource", "aliasTarget"]) {
    note.facts[field] = { kind: "text" };
  }
  const create = definition.journeys!.find(item => item.id === "create-note")!;
  const read = definition.journeys!.find(item => item.id === "read-note")!;
  const archive = definition.journeys!.find(item => item.id === "archive-note")!;
  if (create.kind !== "mutation" || create.command.kind !== "create" || read.kind !== "read"
    || archive.kind !== "mutation") throw new Error("Invalid fixture");
  for (const field of ["privateFact", "otherSurfaceFact", "siblingInput", "aliasSource", "aliasTarget"]) {
    create.command.values[field] = { kind: "literal", value: `test-only-secret:${field}` };
  }
  read.fields = ["title", "state"];
  read.collection = ["title"];
  definition.journeys!.push(
    { ...read, id: "read-other-surface", fields: ["otherSurfaceFact"], collection: ["otherSurfaceFact"] },
    { ...archive, id: "edit-sibling", command: { id: "edit-sibling-record", kind: "update", object: "note",
      input: ["siblingInput"], when: {}, set: { siblingInput: { kind: "input", field: "siblingInput" } } } },
    { ...archive, id: "edit-alias", command: { id: "edit-alias-record", kind: "update", object: "note",
      input: ["aliasSource"], when: {}, set: { aliasTarget: { kind: "input", field: "aliasSource" } } } },
  );
  definition.surfaces = [
    { id: "agent", kind: "agent", journeys: ["create-note", "read-note", "archive-note", "edit-sibling", "edit-alias"] },
    { id: "other-agent", kind: "agent", journeys: ["read-other-surface"] },
  ];
  return definition;
}

export const initialFacts = {
  title: "Public title", body: "Supplied body", state: "active", owner: "identity",
  privateFact: "test-only-secret:privateFact", otherSurfaceFact: "test-only-secret:otherSurfaceFact",
  siblingInput: "test-only-secret:siblingInput", aliasSource: "test-only-secret:aliasSource",
  aliasTarget: "test-only-secret:aliasTarget",
};

export function preparedRun(journey: string): Run {
  return { id: "run", actor: "identity", surface: "agent", journey,
    subject: null, contract_digest: "digest", expires_at: new Date("2030-01-01"), state: "prepared" };
}

export function preparedIntent(): Intent {
  return { id: "intent", run_id: "run", input: { title: "Public title", body: "Supplied body" },
    effect: { kind: "create", objectType: "note", objectId: "one", expectedVersion: 0, facts: { ...initialFacts } },
    confirmation_digest: "original-confirmation" };
}
