// Revisor (cuarta, conducta). La regla 208 promete: cerrar durante un uso borra los búferes y el uso rechaza con
// E-CUSTODY-DENIED. Con el paso 4, cada comprobación de la custodia mira antes la exclusión del registro. En una casa
// de startHouse, ¿qué recibe un uso cuando la casa se cierra en medio? Datos inventados.
import { expect, it } from "vitest";
import { Type } from "@sinclair/typebox";
import { adapterHouse } from "../../tests/support/adapter-house.ts";
import { references, validity, permissions, signer, imported, call } from "../../tests/support/declared-adapters.ts";
import { toolAct } from "./act-definition.ts";
import { Value } from "@sinclair/typebox/value";

import type { AdapterDeclaration } from "./adapter-contract.ts";
it("N8: cerrar la casa durante un uso: el uso rechaza con E-CUSTODY-DENIED y los búferes quedan en cero", async () => {
  let release: () => void = () => {};
  let inside: () => void = () => {};
  const entered = new Promise<void>(r => (inside = r));
  const gate = new Promise<void>(r => (release = r));
  let seen: Uint8Array | undefined;
  let outcome: unknown;
  const importer = signer.methods.import;
  if (!importer) throw new Error("fixture import");
  const slow: AdapterDeclaration = {
    methods: {
      import: importer,
      inspect: { input: references, output: validity, permissions },
    },
    open: resolver => ({
      import: () => ({ key: resolver.capture(Buffer.from("MATERIAL_INVENTADO")) }),
      inspect: async input => {
        if (!Value.Check(references, input)) throw new Error("fixture input");
        try {
          const r = await resolver.use(input, async material => {
            seen = material.key;
            inside();
            await gate;
            return { valid: true };
          });
          outcome = "ok";
          return r;
        } catch (e: unknown) {
          outcome = e;
          throw e;
        }
      },
    }),
  };
  const empty = Type.Object({});
  const rig = adapterHouse(
    {
      sign: toolAct(empty, async (_, ctx) => ({
        status: "accepted",
        effects: [ctx.credentials.replace("signing", await imported(ctx), ctx.credentials.revision("signing"))],
      })),
      use: toolAct(empty, async (_, ctx) => {
        const cur = ctx.credentials.current("signing");
        if (!cur) return { status: "rejected", reason: "sin firma" };
        await call(ctx, "inspect", cur.refs);
        return { status: "accepted", text: "usada" };
      }),
    },
    {},
    { signer: slow },
  );
  expect((await rig.act("sign")).status).toBe("accepted");
  const pending = rig.act("use");
  await entered;
  rig.close();
  const zeroed = seen?.every(byte => byte === 0);
  release();
  const result = await pending;
  expect(result.status).toBe("rejected");
  expect(zeroed).toBe(true);
  expect(outcome).toMatchObject({ code: "E-CUSTODY-DENIED" });
});
