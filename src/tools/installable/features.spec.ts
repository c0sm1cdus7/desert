import { expect, it } from "vitest";
import { Type } from "@sinclair/typebox";
import { defineProgram, programAct } from "./program.ts";
import { sampleMetadata, sampleBody, sampleOptions, type Sample } from "../../../tests/support/installable-program.ts";
import { compose } from "../../runtime/distributions/compose.ts";
import { distributionRig } from "../../../tests/support/distribution-rig.ts";
import { houseTools } from "../../surface/bridge/assembly/house-tools.ts";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
it("keeps same-named menus separate and opens only the actions of their own group", () => {
  const original = sampleBody.tools.personal;
  const group = {
    ...original,
    menus: { more: { name: "más", purpose: "otras acciones", key: "m" } },
    acts: { ...original.acts, edit: { ...original.acts.edit, under: "more" } },
  };
  const program = defineProgram(sampleMetadata, { ...sampleBody, tools: { personal: group, shared: group } });
  const result = compose({ ...sampleOptions, programs: [program] });
  const rig = distributionRig(result.program);
  try {
    rig.attend("notes");
    const notes = houseTools(rig.ports(), result.shown).find(tool => tool.id === "notes");
    expect(notes?.menusOn?.["personal/more"]?.listed?.("notes/personal/same")).toBe(true);
    expect(notes?.menusOn?.["personal/more"]?.listed?.("notes/shared/same")).toBe(false);
    expect(notes?.menusOn?.["personal/more"]?.listed?.("notes/personal")).toBe(false);
    expect(
      notes
        ?.view("notes/personal/same#personal/more")
        .flatMap(stack => stack.rows)
        .map(row => row.act),
    ).toEqual(["personal/edit"]);
  } finally {
    rig.close();
  }
});
it("offers a group action from another group while preserving its owner, folder and local reading", async () => {
  const original = sampleBody.tools.personal;
  const seen: string[] = [];
  const add = {
    ...original.acts.add,
    key: "x",
    confirms: () => "Anotar",
    also: {
      tool: "shared",
      with: (state: import("../tool-contract.ts").State<Sample>, target: string) => {
        seen.push(`${Object.keys(state.tools).join()}:${target}`);
        return {};
      },
    },
  };
  const program = defineProgram(sampleMetadata, {
    ...sampleBody,
    tools: { personal: { ...original, acts: { ...original.acts, add } }, shared: original },
  });
  const result = compose({ ...sampleOptions, programs: [program] });
  const rig = distributionRig(result.program);
  try {
    rig.attend("notes");
    const notes = houseTools(rig.ports(), result.shown).find(tool => tool.id === "notes");
    const rows = notes?.alsoOn?.("notes/shared/same") ?? [];
    expect(rows.map(row => [row.act, row.on])).toEqual([["personal/add", { tool: "notes", target: "notes/personal" }]]);
    expect(seen).toContain("own:same");
    const row = rows[0];
    expect((await settle(rig.act(row?.act ?? "", row?.on?.target ?? ""))).status).toBe("accepted");
    expect(rig.state().tools.notes.count).toBe(1);
  } finally {
    rig.close();
  }
});
it("maps returned destinations and made objects and gives reject the original local result", async () => {
  const seen: unknown[] = [];
  const action = programAct<Sample, ReturnType<typeof Type.Object>>({
    name: "abrir",
    enter: "abrir",
    purpose: "abrir la nota",
    key: "a",
    on: "tool",
    undoable: true,
    input: Type.Object({}),
    run: () => ({ status: "accepted", text: "Abierta", target: "same", made: ["same"] }),
    cases: [{ promise: "Abre la nota", input: {}, then: { says: "Abierta", facts: [] } }],
  });
  const add = {
    ...action,
    reject: (
      context: import("../tool-contract.ts").ActContext<Sample>,
      accepted: Extract<import("../tool-contract.ts").ActResult<Sample>, { status: "accepted" }>,
    ) => {
      seen.push([context.target, accepted.target, accepted.made, Object.keys(context.state.tools)]);
      return undefined;
    },
  };
  const original = sampleBody.tools.personal;
  const program = defineProgram(sampleMetadata, {
    ...sampleBody,
    tools: { personal: { ...original, acts: { add } } },
  });
  const result = compose({ ...sampleOptions, programs: [program] });
  const rig = distributionRig(result.program);
  try {
    rig.attend("notes");
    const done = await settle(rig.act("personal/add", "notes/personal"));
    expect(done.status).toBe("accepted");
    expect(seen).toEqual([["personal", "same", ["same"], ["own"]]]);
    const entry = done.effects.find(event => event.layer === "house" && event.kind === "tool-entry");
    if (!entry) throw new Error("Missing entry");
    expect([entry.data.target, entry.data.made]).toEqual(["notes/personal/same", ["notes/personal/same"]]);
  } finally {
    rig.close();
  }
});

it("does not let group metadata hide an engine action from surface laws", () => {
  const result = compose(sampleOptions);
  const rig = distributionRig(result.program);
  try {
    const tool = result.program.registry[0];
    if (!tool) throw new Error("Missing program");
    const ports = { ...rig.ports(), registry: [{ ...tool, groups: [] }] };
    expect(() => houseTools(ports, result.shown)).toThrow("Group coverage differs from the installed actions of notes");
  } finally {
    rig.close();
  }
});
