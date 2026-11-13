import { Type } from "@sinclair/typebox";
import { expect, it } from "vitest";
import { fixture, secret, ref, has, inputOf, field } from "../../../tests/support/secret-rig.ts";
import { ownAct } from "../../tools/act-definition.ts";
import { effect } from "../../journal/events.ts";
import type { ActResult } from "../../tools/tool-contract.ts";
import type { P } from "../../../tests/support/secret-rig.ts";
it("recorre listas, opcionales y solo la rama válida de la unión", () => {
  const shape = Type.Object({
    box: Type.Object({
      values: Type.Array(Type.String({ secret: true })),
      absent: Type.Optional(Type.String({ secret: true })),
    }),
    choice: Type.Union([
      Type.Object({ kind: Type.Literal("private"), value: Type.String({ secret: true }) }),
      Type.Object({ kind: Type.Literal("public"), value: Type.String() }),
    ]),
  });
  const rig = fixture(shape);
  rig.set({ box: { values: ["x", "value"] }, choice: { kind: "private", value: "sale-registered" } });
  const input = inputOf(rig);
  const values = field(field(input, "box"), "values");
  expect(Array.isArray(values) && values.every(ref)).toBe(true);
  expect(ref(field(field(input, "choice"), "value"))).toBe(true);
  expect(field(field(input, "choice"), "kind")).toBe("private");
  expect(field(field(input, "box"), "absent")).toBeUndefined();
  rig.set({ box: { values: [] }, choice: { kind: "public", value: "public-description" } });
  expect(field(field(inputOf(rig), "choice"), "value")).toBe("public-description");
});
it("una unión malformada no deja su contenido en el diagnóstico", () => {
  const shape = Type.Union([
    Type.Object({ kind: Type.Literal("private"), value: Type.String({ secret: true }) }),
    Type.Object({ kind: Type.Literal("public"), value: Type.String() }),
  ]);
  const rig = fixture(shape);
  expect(rig.set({ kind: "unknown", value: "dato-inventado" }).status).toBe("rejected");
  expect(has(rig.facts(), "dato-inventado")).toBe(false);
});
it("dos acciones intercaladas no limpian con secretos de la otra ni de la bóveda", async () => {
  const release: (() => void)[] = [];
  const rig = fixture(
    secret,
    input =>
      new Promise<ActResult<P>>(resolve => {
        const value = String(field(input, "value"));
        release.push(() =>
          resolve({
            status: "accepted",
            text: value,
            detail: value === "primer-dato" ? "segundo-dato" : "primer-dato",
          }),
        );
      }),
  );
  const a = rig.set({ value: "primer-dato" });
  const b = rig.set({ value: "segundo-dato" });
  expect(a.status === "processing" && b.status === "processing").toBe(true);
  release[1]?.();
  release[0]?.();
  if (a.status !== "processing" || b.status !== "processing") throw new Error("No inició");
  const [first, second] = await Promise.all([a.completion, b.completion]);
  expect(has(first, "primer-dato")).toBe(false);
  expect(has(first, "segundo-dato")).toBe(true);
  expect(has(second, "segundo-dato")).toBe(false);
  expect(has(second, "primer-dato")).toBe(true);
  rig.ports().act({ act: "attend", input: { target: "other" } }, 0);
  expect(has(rig.set({ value: "primer-dato" }, "other"), "primer-dato")).toBe(true);
  rig.restart();
  const entry = rig.house.bus.emit(
    effect("tool-entry", { tool: "vault", target: "vault", author: "ana", text: "primer-dato" }, "ana"),
  );
  expect(entry.data.text).toBe("primer-dato");
});
it("conserva referencias al reiniciar y aísla las casas", () => {
  const a = fixture();
  const b = fixture();
  a.set({ value: "dato-inventado" });
  b.set({ value: "dato-inventado" });
  const first = field(inputOf(a), "value");
  expect(ref(first) && first !== field(inputOf(b), "value")).toBe(true);
  a.restart();
  a.set({ value: "dato-inventado" });
  expect(field(inputOf(a), "value")).toBe(first);
});
it("resuelve acciones propias, destinos de cosas y llamadas anidadas", async () => {
  const rig = fixture(
    secret,
    undefined,
    {},
    {
      own: () => [
        ownAct<P, typeof secret>("own", "save", { input: secret, purpose: "Propia" }, input => ({
          status: "accepted",
          text: input.value,
        })),
      ],
    },
  );
  const own = rig.ports().act({ act: "save", target: "own", input: { value: "dato-propio" } }, 0);
  expect(own.status).toBe("accepted");
  expect(has(rig.facts(), "dato-propio")).toBe(false);
  rig.set({ value: "dato-hijo" }, "child");
  expect(ref(field(inputOf(rig), "value"))).toBe(true);
  const nested = fixture(
    secret,
    async (input, context) => {
      await context.execute?.({ act: "set", target: "vault", input: { value: "dato-anidado" } });
      return { status: "accepted", text: String(field(input, "value")) };
    },
    {},
    {
      own: () => [
        ownAct<P, typeof secret>("own", "forward", { input: secret, purpose: "Anida" }, async (input, context) => {
          await context.execute?.({ act: "set", target: "vault", input });
          return { status: "accepted", text: input.value };
        }),
      ],
    },
  );
  const started = nested.ports().act({ act: "forward", target: "own", input: { value: "dato-puente" } }, 0);
  if (started.status === "processing") await started.completion;
  expect(has(nested.facts(), "dato-puente") || has(nested.facts(), "dato-anidado")).toBe(false);
});
it("un corte mientras espera conserva el plegado y el reinicio interrumpe la acción", async () => {
  let release = () => {};
  const rig = fixture(
    secret,
    () =>
      new Promise<ActResult<P>>(resolve => {
        release = () => resolve({ status: "accepted", text: "dato-pendiente" });
      }),
  );
  const started = rig.set({ value: "dato-pendiente" });
  expect(has(rig.house.tools.state(), "dato-pendiente")).toBe(false);
  rig.restart();
  release();
  if (started.status === "processing") expect((await started.completion).status).toBe("rejected");
  expect(has(rig.facts(), "dato-pendiente") || has(rig.house.tools.state(), "dato-pendiente")).toBe(false);
});
