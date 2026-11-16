import { it } from "vitest";
import { programChecks } from "../../../programs/program-checks.ts";
import { identitiesProgram, identitiesShown } from "../../../../tests/support/identities-program.ts";
for (const check of programChecks(identitiesProgram, identitiesShown)) it(check.name, check.run);
