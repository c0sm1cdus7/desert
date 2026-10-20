import assert from "node:assert/strict";
import { compile } from "../compile.ts";
import { loadDefinition } from "../compiled-definition.ts";
import { freezeDeep, type Frozen } from "../json.ts";
import { deriveCases } from "./plan.ts";
import { digest, mechanismRevision } from "./revision.ts";
import { runVerification } from "./run.ts";
import type { HostFactory, VerificationReport } from "./types.ts";

export type { VerificationReport, VerificationCase, VerificationHost, HostFactory } from "./types.ts";

export function deriveVerification(definition: unknown) {
  const application = compile(definition);
  const product = loadDefinition(application);
  const cases = deriveCases(product);
  const planDigest = digest({ version: "desert.verification/1", product, cases });
  const issued = new WeakMap<object, { hostRevision: string, seed: number }>();
  return Object.freeze({
    cases: freezeDeep(structuredClone(cases)),
    contractDigest: application.digest,
    async run(options: { host: HostFactory, seed: number }) {
      const report = await runVerification(product, application, cases, planDigest, options.host, options.seed);
      issued.set(report, { hostRevision: report.hostRevision, seed: report.seed });
      return freezeDeep(report);
    },
    assertComplete(report: Frozen<VerificationReport>) {
      assert.equal(report.scope, "local-controller-sessions", "EVIDENCE_SCOPE_MISMATCH");
      assert.equal(report.contractDigest, application.digest, "CONTRACT_REVISION_MISMATCH");
      assert.equal(report.planDigest, planDigest, "PLAN_REVISION_MISMATCH");
      assert.equal(report.revisionBefore, mechanismRevision(), "MECHANISM_REVISION_MISMATCH");
      assert.equal(report.revisionAfter, report.revisionBefore, "REVISION_CHANGED_DURING_RUN");
      assert.equal(report.completed, true, "INCOMPLETE_EXECUTION");
      assert.deepEqual(report.cases.map(({ status, reason, ...item }) => item), cases, "INCOMPLETE_CASE_INVENTORY");
      assert.ok(cases.length > 0, "NO_JOURNEYS_TO_VERIFY");
      assert.ok(report.cases.every(item => item.status === "passed"), "UNSATISFIED_OBLIGATIONS");
      const execution = issued.get(report);
      assert.ok(execution, "UNRECOGNIZED_EXECUTION_REPORT");
      assert.equal(report.hostRevision, execution.hostRevision, "HOST_REVISION_MISMATCH");
      assert.equal(report.seed, execution.seed, "SEED_MISMATCH");
    },
  });
}
