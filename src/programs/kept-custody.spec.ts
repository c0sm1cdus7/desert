import { expect, it, vi, afterEach } from "vitest";
import { copyFileSync, mkdtempSync, rmSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Type } from "@sinclair/typebox";
const base = vi.hoisted(() => ({ version: "desert/1" }));
vi.mock("../catalogs/levers.ts", async importOriginal => {
  const actual = await importOriginal<typeof import("../catalogs/levers.ts")>();
  return {
    ...actual,
    get baseProjectionVersion() {
      return base.version;
    },
  };
});
import { adapterHouse } from "../../tests/support/adapter-house.ts";
import { imported, call } from "../../tests/support/declared-adapters.ts";
import { shopShown, type Shop } from "../../tests/support/shop.ts";
import { toolAct } from "../tools/act-definition.ts";
import type { Composition } from "../tools/promises.ts";
import { MemoryHouseKeys } from "../adapters/secrets/custody/house-keys.ts";
import { keptChecks } from "./kept-journals.ts";
import { renewKeptJournals } from "./renew-kept.ts";
const folders: string[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  base.version = "desert/1";
  folders.splice(0).forEach(folder => rmSync(folder, { recursive: true, force: true }));
});
import { inspectKept } from "./kept-inspection.ts";
import { inspectionCapabilities } from "./kept-capabilities.ts";
import { startHouse } from "./house-runtime.ts";
import * as vault from "../adapters/secrets/custody/open-secret-vault.ts";
const shown = {
  ...shopShown,
  words: {
    ...shopShown.words,
    vault: {
      name: "Firma",
      key: "f",
      empty: "Sin firma.",
      listed: "Firmas",
      reads: {},
      presents: [{ title: "Firma", empty: "Sin firma.", reads: {} }],
    },
  },
};
for (const bound of [true, false])
  for (const withKeys of [false, true])
    it(`B3: abre y recorre antes y después de renovar, vínculos=${bound}, proveedor=${withKeys}`, async () => {
      const rig = adapterHouse(
        {
          rotate: toolAct(Type.Object({}), async (_, ctx) => ({
            status: "accepted",
            effects: [ctx.credentials.replace("signing", await imported(ctx), ctx.credentials.revision("signing"))],
          })),
        },
        { view: () => "{}" },
      );
      if (bound) expect((await rig.act("rotate")).status).toBe("accepted");
      rig.close();
      const folder = mkdtempSync(join(tmpdir(), "kept-custody-"));
      folders.push(folder);
      copyFileSync(join(rig.path, "journal.sqlite"), join(folder, "kept.sqlite"));
      const { secretKeys: _keys, ...options } = rig.options;
      const program: Composition<Shop> = {
        ...options,
        registry: options.registry.map(tool => ({ ...tool, acts: {} })),
      };
      const keys = new MemoryHouseKeys();
      const open = vi.spyOn(vault, "openSecretVault");
      const calls = [
        vi.spyOn(keys, "key"),
        vi.spyOn(keys, "has"),
        vi.spyOn(keys, "head"),
        vi.spyOn(keys, "anchor"),
        vi.spyOn(keys, "forget"),
        vi.spyOn(keys, "forgetHouse"),
      ];
      const variant = withKeys ? { ...program, secretKeys: keys } : program;
      for (const version of ["desert/1", "desert/3", "renovado"]) {
        if (version === "renovado") expect(renewKeptJournals(program, folder)).toEqual(["kept.sqlite"]);
        else base.version = version;
        const checks = keptChecks(variant, shown, folder);
        // The manual evidence must be renewed after changing the calculation version.
        const applicable = version === "desert/3" ? checks.slice(0, 3) : checks;
        for (const check of applicable) await expect(check.run(), `${version}: ${check.name}`).resolves.toBeUndefined();
      }
      expect(open).not.toHaveBeenCalled();
      open.mockRestore();
      for (const call of calls) expect(call).not.toHaveBeenCalled();
    });

it("B3: inspeccionar nunca abre custodia, ejecuta un adaptador ni habilita una casa viva", async () => {
  let used = false;
  const rig = adapterHouse({
    rotate: toolAct(Type.Object({}), async (_, ctx) => ({
      status: "accepted",
      effects: [ctx.credentials.replace("signing", await imported(ctx), ctx.credentials.revision("signing"))],
    })),
    use: toolAct(Type.Object({}), async (_, ctx) => {
      const current = ctx.credentials.current("signing");
      expect(current?.refs.key).toMatch(/^secret:/u);
      await expect(Promise.resolve().then(() => call(ctx, "inspect", current?.refs))).rejects.toMatchObject({
        code: "E-CUSTODY-DENIED",
      });
      used = true;
      return { status: "rejected", reason: "sin custodia en inspección" };
    }),
  });
  await rig.act("rotate");
  rig.close();
  const { secretKeys: _keys, ...options } = rig.options;
  const open = vi.spyOn(vault, "openSecretVault");
  const signer = rig.options.adapters?.signer;
  if (!signer) throw new Error("fixture signer");
  const adapter = vi.spyOn(signer, "open");
  const file = join(rig.path, "journal.sqlite");
  const before = readFileSync(file),
    files = readdirSync(rig.path).filter(name => /^(fixture|secret)/u.test(name));
  try {
    await inspectKept(options, file, async house => {
      const result = house.tools.act({ act: "use", target: "vault", input: {} }, 0, "ana");
      const done = result.status === "processing" ? await result.completion : result;
      expect(done.status).toBe("rejected");
    });
    expect(used).toBe(true);
    expect(open).not.toHaveBeenCalled();
    expect(adapter).not.toHaveBeenCalled();
    expect(readFileSync(file)).toEqual(before);
    expect(readdirSync(rig.path).filter(name => /^(fixture|secret)/u.test(name))).toEqual(files);
    // An unrecognized inspection flag cannot bypass the live-house provider requirement.
    expect(() => startHouse(rig.path, { ...options, ...{ inspection: true } })).toThrow("E-CUSTODY-PROVIDER");
  } finally {
    open.mockRestore();
    adapter.mockRestore();
  }
});

it("B3: no captura, vincula ni libera; el préstamo de referencias termina al cerrar", () => {
  const scope = { actor: "ana", tool: "vault", target: "vault" };
  const lease = inspectionCapabilities({ credentialSlots: { vault: ["signing"] } }, [])(scope);
  expect(lease.credentials.current("signing")).toBeUndefined();
  expect(lease.credentials.revision("signing")).toBe(0);
  expect(() => lease.credentials.current("ajena")).toThrow("E-CUSTODY-DENIED");
  expect(() => lease.capture("sintético")).toThrow("E-CUSTODY-DENIED");
  expect(() => lease.credentials.replace("signing", {}, 0)).toThrow("E-CUSTODY-DENIED");
  expect(() => lease.credentials.release("signing", 0)).toThrow("E-CUSTODY-DENIED");
  lease.close();
  expect(() => lease.credentials.current("signing")).toThrow("E-CUSTODY-DENIED");
});
