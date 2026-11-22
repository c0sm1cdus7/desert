import { expect, it, vi } from "vitest";
import { fixture, secret, type P } from "../../../tests/support/secret-rig.ts";
import { declaredInput } from "./declared-input.ts";
import { effect } from "../../house/facts.ts";
import { ownAct } from "../../tools/act-definition.ts";
it("16.000 declaraciones no vuelven a filtrar toda la actividad por cada acción", () => {
  const rig = fixture(secret, undefined, {}, { own: () => [] });
  rig.set({ value: "datum" });
  const state = rig.house.tools.state();
  const entry = state.entries[0];
  if (!entry) throw new Error("Falta actividad de la fixture");
  const entries = Array.from({ length: 16_000 }, () => entry);
  let visited = 0;
  const filter = vi.spyOn(entries, "filter").mockImplementation(() => {
    visited += entries.length;
    return [];
  });
  try {
    for (let i = 0; i < 16_000; i++)
      expect(
        declaredInput(
          rig.options,
          { ...state, entries },
          {
            by: "ana",
            data: { object: i % 2 ? "vault" : "child", option: "set" },
          },
        ),
      ).toBe(secret);
    expect(visited).toBeLessThanOrEqual(16_000);
  } finally {
    filter.mockRestore();
  }
});
it("una declaración dinámica que sí lee actividad conserva la vista privada de la identidad", () => {
  const rig = fixture();
  rig.set({ value: "datum" });
  rig.house.bus.emit(
    effect(
      "tool-entry",
      {
        tool: "vault",
        target: "vault",
        author: "ana",
        detail: "dato de actividad",
        text: "privado",
      },
      "ana",
    ),
  );
  const state = rig.house.tools.state();
  expect(state.entries.some(entry => entry.data.detail === "dato de actividad")).toBe(true);
  const own = vi.fn((view: typeof state) => {
    expect(view.by).toBe("bob");
    expect(view.entries).toBe(view.entries);
    expect(view.entries).toEqual(state.entries);
    return [
      ownAct<P, typeof secret>("own", "set", { input: secret, purpose: "Propia" }, () => ({ status: "accepted" })),
    ];
  });
  expect(
    declaredInput({ ...rig.options, own }, state, {
      by: "bob",
      data: { object: "own", option: "set" },
    }),
  ).toBe(secret);
  expect(own).toHaveBeenCalledOnce();
});
