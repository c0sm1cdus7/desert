import { explicitKit } from "../../house/kit-selection.ts";
import { expect, it, vi } from "vitest";
import { object } from "../../fields/visible-text.ts";
import { text } from "../../fields/fields.ts";
import { vocabulary, type ProgramFacts } from "../../journal/vocabulary.ts";
import { staged, perform } from "../../checks/promises/promised-stage.ts";
import { programAct, type Composition, type ProgramTool } from "../promises.ts";
import { effect } from "../../house/facts.ts";
import { actorDisplayName } from "../../house/actor-display.ts";
const catalog = { "note-added": object({ text: text("Nota", "Texto") }) };
type Notes = {
  fact: ProgramFacts<typeof catalog>;
  tools: { notes: readonly { text: string; by: string }[]; conversation: number };
};
const words = vocabulary(catalog);
const notes: ProgramTool<Notes> = {
  id: "notes",
  purpose: "Notas de prueba",
  facts: ["note-added"],
  targets: () => [],
  view: () => "Notas",
  summary: () => "Notas",
  acts: {
    note: programAct<Notes, (typeof catalog)["note-added"]>({
      input: catalog["note-added"],
      name: "anotar",
      enter: "anotar",
      purpose: "guardar una nota",
      key: "a",
      on: "tool",
      undoable: true,
      run: (input, { by }) => ({
        status: "accepted",
        text: "Anotada · Nota",
        effects: [words.fact("note-added", input, by)],
      }),
      cases: [{ promise: "notes", input: { text: "Mate" }, then: { says: "Anotada · Nota", facts: [] } }],
    }),
  },
};
const conversation: ProgramTool<Notes> = {
  ...notes,
  id: "conversation",
  facts: [],
  acts: {
    say: programAct<Notes, ReturnType<typeof object>>({
      input: object({}),
      name: "decir",
      enter: "decir",
      purpose: "conversación de prueba",
      key: "d",
      on: "tool",
      undoable: true,
      run: () => ({ status: "accepted", text: "Dicho · Mensaje" }),
      cases: [{ promise: "says", input: {}, then: { says: "Dicho · Mensaje", facts: [] } }],
    }),
  },
};
const program: Composition<Notes> = {
  identities: true,
  projectionVersion: "test",
  words,
  registry: [notes, conversation],
  slices: {
    initial: { notes: [], conversation: 0 },
    step: {
      notes: (kept, event) => (event.kind === "note-added" ? [...kept, { text: event.data.text, by: event.by }] : kept),
      conversation: kept => kept,
    },
  },
};
const kit = [
  { tool: "conversation", acts: ["say"] },
  { tool: "notes", acts: ["note"] },
];
const on = "identities/franco";
const adoption = { act: "adopt-assistant", by: "franco", on, input: { legacy: "nora", name: "Nora", kit } };
const setup = async (house: Parameters<typeof perform<Notes>>[0]) => {
  for (const identity of ["franco", "nora", "martin"])
    expect(
      (
        await perform(house, "identities", {
          act: "new",
          input: {
            identity,
            name: identity === "franco" ? "Franco" : identity,
            tools: ["notes", "conversation"],
            language: "es",
          },
        })
      ).status,
    ).toBe("accepted");
  expect((await perform(house, "identities", { act: "hand", on, input: {} })).status).toBe("accepted");
};
const domain = (effects: readonly { kind: string }[]) =>
  effects.filter(e => e.kind === "removed" || e.kind.startsWith("assistant-"));
it("Railway: Franco adopts nora with conversation and notes, keeps authorship and persists", async () => {
  await staged(program, async ({ house, reopen }) => {
    await setup(house());
    await perform(house(), "notes", { act: "note", by: "nora", input: { text: "Mate de ayer" } });
    const old = house().journal.replay<unknown[]>([], (events, e) =>
      e.kind === "note-added" ? [...events, e] : events,
    );
    const result = await perform(house(), "identities", adoption);
    expect(result.status).toBe("accepted");
    expect(domain(result.effects)).toMatchObject([
      { kind: "removed", by: "franco", data: { identity: "nora" } },
      { kind: "assistant-enabled", by: "franco", data: { owner: "franco", name: "Nora" } },
      { kind: "assistant-adopted", by: "franco", data: { owner: "franco", legacy: "nora" } },
      { kind: "assistant-kit-set", by: "franco", data: { version: 2, owner: "franco", kit: explicitKit(kit) } },
    ]);
    reopen();
    expect(house().tools.state().house.grants.has("nora")).toBe(false);
    expect(house().tools.state().house.assistants.get("franco")).toEqual({
      owner: "franco",
      name: "Nora",
      enabled: true,
      legacy: "nora",
      kit: [],
      selections: explicitKit(kit),
    });
    expect(
      house().journal.replay<unknown[]>([], (events, e) => (e.kind === "note-added" ? [...events, e] : events)),
    ).toEqual(old);
    house().bus.emit(
      effect(
        "mind-card-assigned",
        { mind: "assistant:franco", card: "synthetic", version: "1", capabilities: [] },
        "franco",
      ),
    );
    expect(
      (await perform(house(), "notes", { act: "note", by: "assistant:franco", input: { text: "Mate de mañana" } }))
        .status,
    ).toBe("accepted");
    expect(house().tools.state().tools.notes).toEqual([
      { text: "Mate de ayer", by: "nora" },
      { text: "Mate de mañana", by: "assistant:franco" },
    ]);
    expect(actorDisplayName(house().tools.state().house, "assistant:franco", "es")).toBe("Nora, por Franco");
    expect(actorDisplayName(house().tools.state().house, "nora", "es")).toBe("nora");
  });
});
it("Martín does not delegate to Nora; the different admin adopts without signing Franco's kit", async () => {
  await staged(program, async ({ house }) => {
    await setup(house());
    await perform(house(), "identities", { act: "hand", by: "franco", on: "identities/martin", input: {} });
    const result = await perform(house(), "identities", { ...adoption, by: "martin" });
    expect(result.status).toBe("accepted");
    expect(domain(result.effects)).toHaveLength(3);
    expect(house().tools.state().house.assistants.get("franco")?.kit).toEqual([]);
    expect(
      result.effects.some(e => e.kind === "tool-entry" && e.data.text.includes("falta delegación del titular")),
    ).toBe(true);
    expect(
      await perform(house(), "identities", { act: "delegate-assistant", by: "martin", on, input: { kit } }),
    ).toMatchObject({ status: "rejected", reason: "solo el titular del asistente" });
    expect(
      (await perform(house(), "identities", { act: "delegate-assistant", by: "franco", on, input: { kit } })).status,
    ).toBe("accepted");
  });
});
it("repeating after disabling does not revive or change name, kit or link", async () => {
  await staged(program, async ({ house, reopen }) => {
    await setup(house());
    await perform(house(), "identities", adoption);
    await perform(house(), "identities", { act: "disable-assistant", by: "franco", on, input: {} });
    reopen();
    const before = house().tools.state().house;
    for (let i = 0; i < 2; i++) {
      const result = await perform(house(), "identities", {
        ...adoption,
        input: { ...adoption.input, name: "Otra", kit: [] },
      });
      expect(result.status).toBe("accepted");
      expect(domain(result.effects)).toEqual([]);
      expect(result.effects.some(e => e.kind === "tool-entry" && e.data.text.includes("Adopción ya realizada"))).toBe(
        true,
      );
      expect(house().tools.state().house).toEqual(before);
    }
  });
});
it("adopts the already retired identity and refuses an invalid kit without half-retiring it", async () => {
  await staged(program, async ({ house }) => {
    await setup(house());
    const bad = await perform(house(), "identities", {
      ...adoption,
      input: { ...adoption.input, kit: [{ tool: "invented", acts: [] }] },
    });
    expect(bad.status).toBe("rejected");
    expect(domain(bad.effects)).toEqual([]);
    expect(house().tools.state().house.grants.has("nora")).toBe(true);
    expect(house().tools.state().house.assistants.size).toBe(0);
    await perform(house(), "identities", { act: "remove", by: "franco", on: "identities/nora", input: {} });
    const done = await perform(house(), "identities", adoption);
    expect(done.status).toBe("accepted");
    expect(domain(done.effects).map(e => e.kind)).toEqual([
      "assistant-enabled",
      "assistant-adopted",
      "assistant-kit-set",
    ]);
  });
});
it("collisions and two adoptions neither transfer a link nor overwrite the assistant", async () => {
  await staged(program, async ({ house }) => {
    await setup(house());
    const results = await Promise.all([
      perform(house(), "identities", adoption),
      perform(house(), "identities", adoption),
    ]);
    expect(results.map(result => result.status)).toEqual(["accepted", "accepted"]);
    expect(results.flatMap(result => domain(result.effects)).filter(e => e.kind === "assistant-adopted")).toHaveLength(
      1,
    );
    for (const request of [
      { ...adoption, on: "identities/martin" },
      { ...adoption, input: { ...adoption.input, legacy: "martin" } },
      { ...adoption, on: "identities/nora", input: { ...adoption.input, legacy: "franco" } },
    ])
      expect((await perform(house(), "identities", request)).status).toBe("rejected");
    expect(house().tools.state().house.assistants.get("franco")?.legacy).toBe("nora");
  });
});

it("a cut while writing the adoption reverts the whole batch and allows a retry", async () => {
  await staged(program, async ({ house, reopen }) => {
    await setup(house());
    const append = house().journal.append.bind(house().journal);
    const spy = vi.spyOn(house().journal, "append").mockImplementation((event, at) => {
      if (event.kind === "assistant-adopted") throw new Error("Corte sintético");
      return append(event, at);
    });
    try {
      const failed = await perform(house(), "identities", adoption);
      expect(failed.status).toBe("rejected");
      expect(domain(failed.effects)).toEqual([]);
      expect(spy.mock.calls.some(([event]) => event.kind === "assistant-adopted")).toBe(true);
    } finally {
      spy.mockRestore();
    }
    reopen();
    expect(house().tools.state().house.grants.has("nora")).toBe(true);
    expect(house().tools.state().house.assistants.has("franco")).toBe(false);
    expect((await perform(house(), "identities", adoption)).status).toBe("accepted");
  });
});
