import { expect, it } from "vitest";
import { copyFileSync } from "node:fs";
import { join } from "node:path";
import { fixture, home, words } from "../../../tests/support/secret-rig.ts";
import { inspectKept } from "./kept-inspection.ts";
it("capturing a secret position of a fact also keeps the inspection mark", async () => {
  const rig = fixture();
  rig.close();
  const file = join(home(), "kept.sqlite");
  copyFileSync(join(rig.path, "journal.sqlite"), file);
  await expect(
    inspectKept(rig.options, file, house => {
      house.bus.emit(words.fact("sale-registered", { value: "invented", copy: "public" }, "ana"));
    }),
  ).rejects.toMatchObject({
    name: "InspectionUnavailable",
    code: "E-CUSTODY-DENIED",
    reason: "capture a credential or write custody",
  });
});
