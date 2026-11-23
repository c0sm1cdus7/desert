// Fifth review, order: a call to an adapter without credentials is cut too.
import { anyToolScreen } from "../../surface/bridge/views/any-tool.ts";
import { expect, it } from "vitest";
import { programAct } from "../../tools/promises.ts";
import { CustodyError } from "./house-keys.ts";
import { call } from "../../../tests/support/declared-adapters.ts";
import type { Shop } from "../../../tests/support/shop.ts";
import { offer, input, keptFixture, inspectionShown, inspectionAct } from "../../../tests/support/kept-inspection.ts";
import { keptChecks } from "../../checks/kept/kept-journals.ts";
const query = programAct<Shop, typeof input, typeof offer.outside>({
  ...offer,
  name: "consultar",
  enter: "consultar",
  key: "c",
  purpose: "la consulta sintética",
  run: async (_, ctx) => {
    await call(ctx, "import");
    return { status: "accepted", text: "Consultado" };
  },
});
it("C1: walks the adapter without bound credentials and counts the prevented action", async () => {
  const fixture = keptFixture({ query });
  fixture.save();
  const check = keptChecks(fixture.program, inspectionShown, fixture.folder)[1];
  expect(check).toBeDefined();
  await check?.run();
  expect(check?.report?.()).toContain("vault/query");
  expect(check?.report?.()).toContain("adapter signer.import");
});
for (const failure of [
  new Error("E-CUSTODY-DENIED"),
  new CustodyError("E-CUSTODY-DENIED"),
  Object.assign(new Error("E-CUSTODY-DENIED"), { name: "InspectionUnavailable", code: "E-CUSTODY-DENIED" }),
])
  it(`C1: a ${failure.name} failure with the same text is still a program failure`, async () => {
    const fixture = keptFixture({
      query: inspectionAct("query", "c", () => {
        throw failure;
      }),
    });
    fixture.save();
    const check = keptChecks(fixture.program, inspectionShown, fixture.folder)[1];
    await expect(check?.run()).rejects.toThrow("failed internally");
    expect(check?.report?.()).toBeUndefined();
  });
it("C1: cuts replacement and release, follows another branch and keeps its write", async () => {
  let completed = 0;
  const fixture = keptFixture({
    replace: inspectionAct("reemplazar", "r", (_, ctx) => ({
      status: "accepted",
      effects: [ctx.credentials.replace("signing", {}, 0)],
    })),
    release: inspectionAct("liberar", "l", (_, ctx) => ({
      status: "accepted",
      effects: [ctx.credentials.release("signing", 0)],
    })),
    local: inspectionAct("local", "o", () => {
      completed++;
      return { status: "accepted", text: "Leído" };
    }),
  });
  fixture.save();
  const check = keptChecks(fixture.program, inspectionShown, fixture.folder)[1];
  await check?.run();
  expect(completed).toBeGreaterThan(0);
  expect(check?.report?.()).toContain("vault/replace: replace a credential");
  expect(check?.report?.()).toContain("vault/release: release a credential");
});
it("C1: the refusal survives a nested action", async () => {
  const fixture = keptFixture({
    query,
    nested: inspectionAct("anidada", "a", async (_, ctx) => {
      if (!ctx.execute) throw new Error("missing nested execution");
      await ctx.execute({ act: "query", target: "vault", input: {} });
      return { status: "accepted" };
    }),
  });
  fixture.save();
  const shown = { ...inspectionShown, screens: { vault: anyToolScreen } };
  const check = keptChecks(fixture.program, shown, fixture.folder)[1];
  await check?.run();
  expect(check?.report?.()).toContain("vault/nested: adapter signer.import");
});
