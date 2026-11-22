import { expect, it } from "vitest";
import { contractHouse, documents, sales, required } from "../../../tests/support/distribution-contracts.ts";
import { createContractRuntime } from "./contract-runtime.ts";
import { startTools } from "../../tools/start.ts";
import { selectionKit, type Selection } from "../../house/kit-selection.ts";
import { selectionProblem } from "../../house/kit-validation.ts";
const grants: readonly Selection[] = [
  { kind: "program", program: "documents" },
  { kind: "tool", program: "documents", tool: "fiscal" },
  { kind: "action", program: "documents", tool: "fiscal", action: "issue" },
];
it.each(grants)("executes with the installed $kind selection and retains the actor", async selection => {
  const selections: readonly Selection[] = [{ kind: "program", program: "sales" }, selection];
  const house = contractHouse(undefined, ":memory:", selections);
  const runtime = createContractRuntime([sales(), documents()], house.ports, house.history);
  const engine = startTools({ ...house.ports, history: house.events(), contracts: runtime.context });
  try {
    for (const target of ["sales/billing", "documents/fiscal"])
      engine.act({ act: "attend", input: { target } }, 0, "beto");
    expect(selectionProblem(selectionKit(selections), house.ports.registry)).toBeUndefined();
    const started = engine.act({ act: "billing/invoice", target: "sales/billing", input: { sale: "v1" } }, 0, "beto");
    const result = started.status === "processing" ? await started.completion : started;
    expect(result.value).toEqual({ status: "accepted", value: { id: "v1" } });
    expect(
      house
        .events()
        .filter(event => event.kind === "documents/issued")
        .map(event => event.by),
    ).toEqual(["beto"]);
  } finally {
    engine.stop();
    house.close();
  }
});
it("rejects a route whose action has no installed executor", () => {
  const house = contractHouse();
  try {
    const registry = house.ports.registry.map(tool => (tool.id === "documents" ? { ...tool, acts: {} } : tool));
    expect(() => createContractRuntime([sales(), documents()], { ...house.ports, registry }, house.history)).toThrow(
      expect.objectContaining({ errors: ["documents/fiscal/issue:route-without-executor"] }),
    );
  } finally {
    house.close();
  }
});

import { sampleProgram } from "../../../tests/support/installable-program.ts";
import { editKit } from "../../house/kit-edit.ts";
import { expandKit, explicitKit, kitLayout, selectionKitSchema } from "../../house/kit-selection.ts";
import { Value } from "@sinclair/typebox/value";
import { checkKitMigration } from "../../house/kit-migration.ts";
import { kitEffects } from "../../tools/identities/kit-effects.ts";
it("distinguishes equal local action names, edits siblings and persists only local segments", () => {
  const registry = [sampleProgram.install().tool];
  const layout = kitLayout(registry);
  const branch: Selection = { kind: "action", program: "notes", tool: "personal", action: "add" };
  const selected = selectionKit([branch]);
  expect(selectionProblem(selected, registry)).toBeUndefined();
  expect(expandKit(selected, registry)).toEqual([{ tool: "notes", acts: ["personal/add"] }]);
  expect(expandKit(selectionKit([{ ...branch, tool: "missing" }]), registry)).toEqual([]);
  expect(selectionProblem(selectionKit([{ ...branch, tool: "missing" }]), registry)).toBeDefined();
  const divided = editKit(
    selectionKit([{ kind: "program", program: "notes" }]),
    branch,
    false,
    Object.keys(required(registry[0]).acts),
    layout,
  );
  expect(divided).toEqual(
    selectionKit([
      { kind: "tool", program: "notes", tool: "shared" },
      { kind: "action", program: "notes", tool: "personal", action: "edit" },
    ]),
  );
  expect(Value.Check(selectionKitSchema, divided)).toBe(true);
  expect(expandKit(divided, registry)).toEqual([
    { tool: "notes", acts: ["personal/edit", "shared/add", "shared/edit"] },
  ]);
  expect(explicitKit([{ tool: "notes", acts: ["personal/add"] }], layout)).toEqual(selected);
  expect(() => checkKitMigration({ version: 1, scopes: [], actions: [], retired: [branch] }, registry)).toThrow(
    "Retired kit identifier reused",
  );
  const house = contractHouse();
  try {
    const tool = house.ports.registry.find(tool => tool.id === "documents");
    if (!tool) throw new Error("Missing provider");
    const effects = kitEffects(house.ports.state().house, "ana", "beto", tool, "fiscal/issue", false);
    for (const event of effects) house.ports.bus.emit(event);
    expect(house.ports.state().house.selections?.get("beto")).toEqual(
      selectionKit([{ kind: "program", program: "sales" }]),
    );
    const restored = kitEffects(house.ports.state().house, "ana", "beto", tool, "fiscal/issue", true);
    for (const event of restored) house.ports.bus.emit(event);
    expect(house.ports.state().house.selections?.get("beto")).toEqual(
      selectionKit([
        { kind: "program", program: "sales" },
        { kind: "action", program: "documents", tool: "fiscal", action: "issue" },
      ]),
    );
  } finally {
    house.close();
  }
});
it("inherits new actions only from folders of the installed group", () => {
  const installed = sampleProgram.install().tool;
  const updated = {
    ...installed,
    acts: { ...installed.acts, "personal/new": installed.acts["personal/add"] },
    actionTools: { ...installed.actionTools, "personal/new": "personal" },
  };
  const folder = selectionKit([{ kind: "tool", program: "notes", tool: "personal" }]);
  expect(expandKit(folder, [updated])).toEqual([
    { tool: "notes", acts: ["personal/add", "personal/edit", "personal/new"] },
  ]);
  expect(
    expandKit(selectionKit([{ kind: "action", program: "notes", tool: "personal", action: "add" }]), [updated]),
  ).toEqual([{ tool: "notes", acts: ["personal/add"] }]);
});
