// Stage B of the negative suite: cases that need the slice-0 layout and the rules of slice 1.
// Each id is a test.todo until its rule lands; it then becomes a real case in stage-b.cases.ts.
import test from "node:test";
import { defineGateTests } from "./gate-tests.ts";
import { stageB } from "./stage-b.cases.ts";

defineGateTests(stageB);
// N50 (a /3 manifest, a /4 without gate evidence) is not a gate run: tests/build-manifest-qualification.test.ts covers it.

const pending: readonly [string, string][] = [
  ["N20", "a utility class from a composition survives into emitted CSS: CROSS_OWNER_CSS (G2)"],
  ["N36", "style-src-attr 'unsafe-inline' in the CSP: UNQUALIFIED_ARTIFACT"],
];

for (const [id, description] of pending) test.todo(`${id} ${description}`);
