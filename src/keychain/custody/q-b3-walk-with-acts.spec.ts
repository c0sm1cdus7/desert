// Fifth review, C1: the declared actions stay in the kept program.
import { expect, it, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { keptFixture, inspectionShown } from "../../../tests/support/kept-inspection.ts";
import { MemoryHouseKeys } from "./house-keys.ts";
import { keptChecks } from "../../checks/kept/kept-journals.ts";
for (const withKeys of [false, true])
  it(`C1: opens and walks sign and use, provider=${withKeys}, sparing the original and the keychain`, async () => {
    const fixture = keptFixture();
    expect((await fixture.rig.act("sign")).status).toBe("accepted");
    expect((await fixture.rig.act("use")).status).toBe("accepted");
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
      expect(report).toContain("vault/sign");
      expect(report).toContain("vault/use");
      expect(report).toContain("adaptador signer.import");
      expect(report).toContain("adaptador signer.inspect");
      expect(readFileSync(fixture.file)).toEqual(before);
      expect(readdirSync(fixture.folder)).toEqual(["kept.sqlite"]);
      for (const call of calls) expect(call).not.toHaveBeenCalled();
    } finally {
      calls.forEach(call => call.mockRestore());
    }
  });
