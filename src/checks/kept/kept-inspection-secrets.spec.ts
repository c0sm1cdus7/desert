import { expect, it } from "vitest";
import { copyFileSync } from "node:fs";
import { join } from "node:path";
import { fixture, home, words } from "../../../tests/support/secret-rig.ts";
import { inspectKept } from "./kept-inspection.ts";
it("capturar una posición secreta de un hecho también conserva la marca de inspección", async () => {
  const rig = fixture();
  rig.close();
  const file = join(home(), "kept.sqlite");
  copyFileSync(join(rig.path, "journal.sqlite"), file);
  await expect(
    inspectKept(rig.options, file, house => {
      house.bus.emit(words.fact("sale-registered", { value: "inventado", copy: "público" }, "ana"));
    }),
  ).rejects.toMatchObject({
    name: "InspectionUnavailable",
    code: "E-CUSTODY-DENIED",
    reason: "capturar credencial o escribir custodia",
  });
});
