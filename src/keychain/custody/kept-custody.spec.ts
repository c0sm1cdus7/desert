import { expect, it, vi, afterEach } from "vitest";
import { copyFileSync, mkdtempSync, rmSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Type } from "@sinclair/typebox";
const base = vi.hoisted(() => ({ version: "desert/1" }));
vi.mock("../../house/own-acts.ts", async importOriginal => {
  const actual = await importOriginal<typeof import("../../house/own-acts.ts")>();
  return {
    ...actual,
    get baseProjectionVersion() {
      return base.version;
    },
  };
});
import { adapterHouse } from "../../../tests/support/adapter-house.ts";
import { imported, call } from "../../../tests/support/declared-adapters.ts";
import type { Shop } from "../../../tests/support/shop.ts";
import { sign, inspectionShown, declaredRegistry } from "../../../tests/support/kept-inspection.ts";
import { toolAct } from "../../tools/act-definition.ts";
import type { Composition } from "../../tools/promises.ts";
import { MemoryHouseKeys } from "./house-keys.ts";
import { keptChecks } from "../../checks/kept/kept-journals.ts";
import { renewKeptJournals } from "../../checks/kept/renew-kept.ts";
const folders: string[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  base.version = "desert/1";
  folders.splice(0).forEach(folder => rmSync(folder, { recursive: true, force: true }));
});
import { inspectKept } from "../../checks/kept/kept-inspection.ts";
import { inspectionCapabilities } from "../../checks/kept/kept-capabilities.ts";
import { startHouse } from "../../runtime/house-runtime.ts";
import * as vault from "./open-secret-vault.ts";
for (const bound of [true, false])
  for (const withKeys of [false, true])
    // Each walk opens a kept journal three times: about five seconds alone, more beside other files.
    it(
      `B3: opens and walks before and after renewing, bound=${bound}, provider=${withKeys}`,
      { timeout: 30_000 },
      async () => {
        const rig = adapterHouse({ rotate: sign }, { view: () => "{}" });
        if (bound) expect((await rig.act("rotate")).status).toBe("accepted");
        rig.close();
        const folder = mkdtempSync(join(tmpdir(), "kept-custody-"));
        folders.push(folder);
        copyFileSync(join(rig.path, "journal.sqlite"), join(folder, "kept.sqlite"));
        const { secretKeys: _keys, ...options } = rig.options;
        const program: Composition<Shop> = {
          ...options,
          registry: declaredRegistry(options.registry),
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
        for (const version of ["desert/1", "desert/3", "renewed"]) {
          if (version === "renewed") expect(renewKeptJournals(program, folder)).toEqual(["kept.sqlite"]);
          else base.version = version;
          const checks = keptChecks(variant, inspectionShown, folder);
          // The manual evidence must be renewed after changing the calculation version.
          const applicable = version === "desert/3" ? checks.slice(0, 3) : checks;
          for (const check of applicable)
            await expect(check.run(), `${version}: ${check.name}`).resolves.toBeUndefined();
        }
        expect(open).not.toHaveBeenCalled();
        open.mockRestore();
        for (const call of calls) expect(call).not.toHaveBeenCalled();
      },
    );

it("B3: inspecting never opens custody, runs an adapter or enables a live house", async () => {
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
    const live = startHouse(rig.path, { ...rig.options, ...{ inspection: true } });
    try {
      expect(open).toHaveBeenCalledTimes(1);
      const rotated = live.tools.act({ act: "rotate", target: "vault", input: {} }, 0, "ana");
      const done = rotated.status === "processing" ? await rotated.completion : rotated;
      expect(done.status).toBe("accepted");
      expect(adapter).toHaveBeenCalledTimes(1);
    } finally {
      live.close();
    }
  } finally {
    open.mockRestore();
    adapter.mockRestore();
  }
});

it("B3: does not capture, bind or release; the loan of references ends on close", () => {
  const scope = { actor: "ana", tool: "vault", target: "vault" };
  const lease = inspectionCapabilities({ credentialSlots: { vault: ["signing"] } }, [])(scope);
  expect(lease.credentials.current("signing")).toBeUndefined();
  expect(lease.credentials.revision("signing")).toBe(0);
  expect(() => lease.credentials.current("foreign")).toThrow("E-CUSTODY-DENIED");
  expect(() => lease.capture("synthetic")).toThrow("E-CUSTODY-DENIED");
  expect(() => lease.credentials.replace("signing", {}, 0)).toThrow("E-CUSTODY-DENIED");
  expect(() => lease.credentials.release("signing", 0)).toThrow("E-CUSTODY-DENIED");
  lease.close();
  expect(() => lease.credentials.current("signing")).toThrow("E-CUSTODY-DENIED");
});
