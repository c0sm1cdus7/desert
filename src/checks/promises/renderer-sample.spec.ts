// The distribution sample must really run each declared form from the Menu through the shared router.
import { it } from "vitest";
import { program, shown } from "../../../tests/support/shop-program.ts";
import { programChecks } from "../program-checks.ts";
for (const check of programChecks(program, shown).filter(check => check.name.startsWith("sample ·")))
  it(check.name, check.run);
