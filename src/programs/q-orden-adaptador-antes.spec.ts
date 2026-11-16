import { anyToolScreen } from "../surface/bridge/any-tool.ts";
// Quinta revisión, orden: también se corta una llamada a un adaptador sin credenciales.
import { expect, it } from "vitest";
import { programAct } from "../tools/promises.ts";
import { CustodyError } from "../adapters/secrets/custody/house-keys.ts";
import { call } from "../../tests/support/declared-adapters.ts";
import { type Shop } from "../../tests/support/shop.ts";
import { offer, input, keptFixture, inspectionShown, inspectionAct } from "../../tests/support/kept-inspection.ts";
import { keptChecks } from "./kept-journals.ts";
const consultar = programAct<Shop, typeof input, typeof offer.outside>({
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
it("C1: recorre el adaptador sin credenciales vinculadas y cuenta la acción impedida", async () => {
  const fixture = keptFixture({ consultar });
  fixture.save();
  const check = keptChecks(fixture.program, inspectionShown, fixture.folder)[1];
  expect(check).toBeDefined();
  await check?.run();
  expect(check?.report?.()).toContain("vault/consultar");
  expect(check?.report?.()).toContain("adaptador signer.import");
});
for (const failure of [
  new Error("E-CUSTODY-DENIED"),
  new CustodyError("E-CUSTODY-DENIED"),
  Object.assign(new Error("E-CUSTODY-DENIED"), { name: "InspectionUnavailable", code: "E-CUSTODY-DENIED" }),
])
  it(`C1: una falla ${failure.name} con el mismo texto sigue siendo falla del programa`, async () => {
    const fixture = keptFixture({
      consultar: inspectionAct("consultar", "c", () => {
        throw failure;
      }),
    });
    fixture.save();
    const check = keptChecks(fixture.program, inspectionShown, fixture.folder)[1];
    await expect(check?.run()).rejects.toThrow("failed internally");
    expect(check?.report?.()).toBeUndefined();
  });
it("C1: corta reemplazo y liberación, sigue otra rama y conserva su escritura", async () => {
  let completed = 0;
  const fixture = keptFixture({
    reemplazar: inspectionAct("reemplazar", "r", (_, ctx) => ({
      status: "accepted",
      effects: [ctx.credentials.replace("signing", {}, 0)],
    })),
    liberar: inspectionAct("liberar", "l", (_, ctx) => ({
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
  expect(check?.report?.()).toContain("vault/reemplazar: reemplazar credencial");
  expect(check?.report?.()).toContain("vault/liberar: liberar credencial");
});
it("C1: la negativa sobrevive una acción anidada", async () => {
  const fixture = keptFixture({
    consultar,
    anidada: inspectionAct("anidada", "a", async (_, ctx) => {
      if (!ctx.execute) throw new Error("ejecución anidada ausente");
      await ctx.execute({ act: "consultar", target: "vault", input: {} });
      return { status: "accepted" };
    }),
  });
  fixture.save();
  const shown = { ...inspectionShown, screens: { vault: anyToolScreen } };
  const check = keptChecks(fixture.program, shown, fixture.folder)[1];
  await check?.run();
  expect(check?.report?.()).toContain("vault/anidada: adaptador signer.import");
});
