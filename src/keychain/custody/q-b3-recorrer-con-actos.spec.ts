// Quinta revisión, C1: las acciones declaradas permanecen en el programa conservado.
import { expect, it, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { keptFixture, inspectionShown } from "../../../tests/support/kept-inspection.ts";
import { MemoryHouseKeys } from "./house-keys.ts";
import { keptChecks } from "../../checks/kept/kept-journals.ts";
for (const withKeys of [false, true])
  it(`C1: abre y recorre firmar y usar, proveedor=${withKeys}, sin tocar el original ni el llavero`, async () => {
    const fixture = keptFixture();
    expect((await fixture.rig.act("firmar")).status).toBe("accepted");
    expect((await fixture.rig.act("usar")).status).toBe("accepted");
    fixture.save();
    const before = readFileSync(fixture.file);
    const keys = new MemoryHouseKeys();
    const calls = (["key", "has", "head", "anchor", "forget", "forgetHouse"] as const).map(method =>
      vi.spyOn(keys, method),
    );
    const program = withKeys ? { ...fixture.program, secretKeys: keys } : fixture.program;
    try {
      const checks = keptChecks(program, inspectionShown, fixture.folder);
      for (const check of checks) await check.run();
      const report = checks[1]?.report?.();
      expect(report).toContain("no recorribles en inspección");
      expect(report).toContain("vault/firmar");
      expect(report).toContain("vault/usar");
      expect(report).toContain("adaptador signer.import");
      expect(report).toContain("adaptador signer.inspect");
      expect(readFileSync(fixture.file)).toEqual(before);
      expect(readdirSync(fixture.folder)).toEqual(["kept.sqlite"]);
      for (const call of calls) expect(call).not.toHaveBeenCalled();
    } finally {
      calls.forEach(call => call.mockRestore());
    }
  });
