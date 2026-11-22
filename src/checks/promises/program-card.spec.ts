// Program-owned minds select certified cards at their own program through the common derived gate.
import { it } from "vitest";
import { shopProgram, shopShown } from "../../../tests/support/shop.ts";
import { programChecks } from "../program-checks.ts";
const program = { ...shopProgram, identities: true, minds: { assistants: false, programs: ["sales"] } };
for (const check of programChecks(program, shopShown).filter(check =>
  check.name.startsWith("sales · assign-mind-card ·"),
))
  it(check.name, check.run);

import { sampleOptions, sampleMetadata, sampleBody } from "../../../tests/support/installable-program.ts";
import { defineProgram } from "../../tools/installable/program.ts";
import { compose } from "../../runtime/distributions/compose.ts";
for (const shortcut of [false, true]) {
  const definition = defineProgram(sampleMetadata, {
    ...sampleBody,
    tools: { personal: sampleBody.tools.personal },
  });
  const composed = compose({ ...sampleOptions, programs: [definition], singleToolShortcut: shortcut });
  const grouped = { ...composed.program, minds: { assistants: false, programs: ["notes"] } };
  for (const check of programChecks(grouped, composed.shown).filter(check =>
    check.name.startsWith("notes · assign-mind-card ·"),
  ))
    it(`${shortcut} · ${check.name}`, check.run);
}
