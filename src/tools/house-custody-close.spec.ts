// Reviewer (fourth, behavior). Rule 208 promises: closing during a use clears the buffers and the use rejects with
// E-CUSTODY-DENIED. With step 4, each custody check first looks at the registry's exclusion. In a startHouse house,
// what does a use get when the house closes midway? Invented data.
// The use keeps E-CUSTODY-DENIED; the action that awaited it reports the house's interruption.
import { expect, it } from "vitest";
import { Type } from "@sinclair/typebox";
import { adapterHouse } from "../../tests/support/adapter-house.ts";
import { references, validity, permissions, signer, imported, call } from "../../tests/support/declared-adapters.ts";
import { toolAct } from "./act-definition.ts";
import { Value } from "@sinclair/typebox/value";

import type { AdapterDeclaration } from "./adapter-contract.ts";
it("N8: closing the house during a use: the use rejects with E-CUSTODY-DENIED and the buffers end zeroed", async () => {
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
      import: () => ({ key: resolver.capture(Buffer.from("INVENTED_MATERIAL")) }),
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
  expect(result).toMatchObject({ status: "interrupted", reason: "acción interrumpida", effects: [] });
  expect(zeroed).toBe(true);
  expect(outcome).toMatchObject({ code: "E-CUSTODY-DENIED" });
});
