import "../../../tests/support/fixture-vault.ts";
import { Value } from "@sinclair/typebox/value";
import { Type } from "@sinclair/typebox";
import { expect, it } from "vitest";
import { opacityProgram, opacityInput } from "../../../tests/support/opacity-program.ts";
import { shopShown, type Shop } from "../../../tests/support/shop.ts";
import { programAct } from "../../tools/promises.ts";
import { secretRef } from "../../adapters/secrets/custody/custody-database.ts";
import { asking } from "../../surface/bridge/asking.ts";
import { questionWords } from "../../surface/bridge/questions/asking-clock.ts";
import { staged, perform } from "../promised-stage.ts";

for (const value of [
  "",
  "a",
  "abcdefghijk",
  "abcdefghijkl",
  "abcdefghijklm",
  "sale-registered",
  " uno\ndos ",
  "X".repeat(4000),
  "secret:00000000-0000-0000-0000-000000000000",
])
  it(`material exacto de ${value.length} caracteres, también al reabrir`, async () => {
    const observed: unknown[] = [];
    const input = { first: value, second: `${value}\notro` };
    const schema = Type.Object({
      first: Type.String({ secret: true, title: "Primer material", maxLength: 5000 }),
      second: Type.String({ secret: true, title: "Segundo material", maxLength: 5000 }),
    });
    const base = opacityProgram(schema);
    const act = programAct<Shop, typeof opacityInput>({
      input: schema,
      name: "guardar",
      enter: "guardar",
      key: "g",
      purpose: "guardar material",
      on: "tool",
      undoable: true,
      cases: [{ promise: "guarda", input, then: { facts: [], says: "Material · Guardado" } }],
      run: async (refs, context) => {
        expect(secretRef(refs.first) && secretRef(refs.second)).toBe(true);
        expect(refs.first).not.toBe(value);
        await context.ports.inspect?.check?.(refs);
        if (!secretRef(refs.first) || !secretRef(refs.second)) throw new Error("Falta referencia");
        return {
          status: "accepted",
          text: "Material · Guardado",
          effects: [
            context.credentials.replace(
              "signing",
              { first: refs.first, second: refs.second },
              context.credentials.revision("signing"),
            ),
          ],
        };
      },
    });
    const read = programAct<Shop, ReturnType<typeof Type.Object>>({
      input: Type.Object({}),
      name: "leer",
      enter: "leer",
      key: "l",
      purpose: "leer material",
      on: "tool",
      undoable: true,
      cases: [{ promise: "lee", input: {}, then: { facts: [], says: "Material · Leído" } }],
      run: async (_, context) => {
        await context.ports.inspect?.check?.(context.credentials.current("signing")?.refs);
        return { status: "accepted", text: "Material · Leído" };
      },
    });
    const referenceInput = Type.Object({
      first: Type.TemplateLiteral("secret:${string}"),
      second: Type.TemplateLiteral("secret:${string}"),
    });
    const program = {
      ...base,
      registry: base.registry.map(tool => (tool.id === "vault" ? { ...tool, acts: { set: act, read } } : tool)),
      credentialSlots: { vault: ["signing"] },
      adapters: {
        inspect: {
          methods: {
            check: {
              input: Type.Object({ first: Type.String(), second: Type.String() }),
              output: Type.Object({ valid: Type.Boolean() }, { additionalProperties: false }),
              permissions: { tools: ["vault"], slots: ["signing"], capture: false },
            },
          },
          open: (resolver: import("../../adapters/declared/adapter-contract.ts").SecretResolver) => ({
            check: (refs: unknown) => {
              if (!Value.Check(referenceInput, refs)) throw new Error("Referencia inválida");
              return resolver.use(refs, material => {
                observed.push(material);
                return { valid: true };
              });
            },
          }),
        },
      },
    };
    await staged(program, async ({ house, reopen }) => {
      const ask = asking(
        schema,
        questionWords(() => 1000, shopShown),
      );
      const fromQuestions = ask.submit([input.first, input.second]);
      expect((await perform(house(), "vault", { act: "set", input: fromQuestions })).status).toBe("accepted");
      expect(observed).toEqual([input]);
      reopen();
      expect((await perform(house(), "vault", { act: "read", input: {} })).status).toBe("accepted");
      expect(observed).toEqual([input, input]);
    });
  });
