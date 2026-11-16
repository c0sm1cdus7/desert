import { it } from "vitest";
import { programChecks } from "./program-checks.ts";
import { kitBoundary, boundaryShown } from "../../tests/support/kit-boundary.ts";
for (const check of programChecks(kitBoundary(9), boundaryShown).filter(check =>
  check.name.includes("identities · kit:"),
))
  it(check.name, check.run);
