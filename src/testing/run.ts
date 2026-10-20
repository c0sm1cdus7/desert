import type { ProductDefinition } from "../contracts.ts";
import { environment } from "./environment.ts";
import { successfulOperation } from "./check-success.ts";
import { checkInputs } from "./check-inputs.ts";
import { checkAuthority, seedSentinels } from "./check-authority.ts";
import { checkGuards } from "./check-guards.ts";
import { checkAtomicity, checkConcurrency } from "./check-atomicity.ts";
import { checkRecovery } from "./check-recovery.ts";
import { mechanismRevision } from "./revision.ts";
import { VerificationGap, type Application, type HostFactory, type VerificationCase,
  type VerificationReport, type TestSandbox } from "./types.ts";

const checks = { success: successfulOperation, inputs: checkInputs, authority: checkAuthority,
  guards: checkGuards, atomicity: checkAtomicity, concurrency: checkConcurrency, recovery: checkRecovery };

export async function runVerification(product: ProductDefinition, application: Application,
  cases: VerificationCase[], planDigest: string, hostFactory: HostFactory, seed: number): Promise<VerificationReport> {
  if (!Number.isSafeInteger(seed)) throw new Error("INVALID_VERIFICATION_SEED");
  const revisionBefore = mechanismRevision();
  const host = hostFactory();
  const report: VerificationReport = {
    scope: "local-controller-sessions", contractDigest: application.digest, planDigest,
    revisionBefore, revisionAfter: "", hostRevision: host.revision(), seed, completed: false, cases: [],
  };
  try {
    for (const item of cases) {
      let sandbox: TestSandbox | undefined;
      try {
        if (!item.surfaceId) throw new VerificationGap("JOURNEY_HAS_NO_EXECUTABLE_ENTRY");
        const journey = product.journeys!.find(journey => journey.id === item.journeyId)!;
        sandbox = await host.open(application, journey.requires.controller);
        const f = await environment(product, journey, item.surfaceId, seed, sandbox);
        await seedSentinels(f);
        await checks[item.obligation](f);
        report.cases.push({ ...item, status: "passed" });
      } catch (error) {
        report.cases.push({ ...item, status: error instanceof VerificationGap ? "blocked" : "failed",
          reason: error instanceof Error ? error.message : String(error) });
      } finally { await sandbox?.close(); }
    }
  } finally { await host.close(); }
  report.revisionAfter = mechanismRevision();
  report.completed = true;
  return report;
}
