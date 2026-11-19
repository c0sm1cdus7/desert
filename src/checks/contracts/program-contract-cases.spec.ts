// The ordinary program gate executes consumer cases, including a provider that returns the wrong result.
import { expect, it } from "vitest";
import { contractOptions } from "../../../tests/support/distribution-contracts.ts";
import { componer } from "../../runtime/distributions/compose.ts";
import { contractChecks } from "./program-contract-cases.ts";
it("runs consumer requests at the provider gate", async () => {
  const { program } = componer(contractOptions);
  const checks = contractChecks(program);
  expect(checks.length).toBeGreaterThan(0);
  for (const check of checks) await check.run();
});
it("turns the gate red for a provider that breaks a consumer case", async () => {
  const { program } = componer(contractOptions);
  const broken = {
    ...program,
    registry: program.registry.map(tool => ({
      ...tool,
      acts: Object.fromEntries(
        Object.entries(tool.acts).map(([name, act]) => [
          name,
          { ...act, run: Object.assign(() => ({ status: "accepted" as const, value: {} }), act.run) },
        ]),
      ),
    })),
  };
  const checks = contractChecks(broken);
  expect(checks.length).toBeGreaterThan(0);
  await expect(checks[0]?.run()).rejects.toThrow();
});
