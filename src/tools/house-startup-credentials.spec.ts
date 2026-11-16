import { expect, it } from "vitest";
import { adapterHouse } from "../../tests/support/adapter-house.ts";
import { imported } from "../../tests/support/declared-adapters.ts";
import type { ToolStartup } from "./startup-contract.ts";
import type { Shop } from "../../tests/support/shop.ts";
it("startup accepts only its original credential command and fixes every receipt author", async () => {
  let startup: ToolStartup<Shop> | undefined;
  const rig = adapterHouse(
    {},
    {
      start: ports => {
        startup = ports;
        return () => {};
      },
    },
  );
  if (!startup) throw new Error("fixture");
  const ports = startup;
  const refs = await imported(ports);
  const command = ports.credentials.replace("signing", refs, 0);
  const before = rig.facts();
  expect(() => ports.bus.emit({ ...command })).toThrow(/act/);
  expect(rig.facts()).toEqual(before);
  Object.assign(command.data, { author: "ana", text: "forged" });
  const receipt = ports.bus.emit(command);
  expect(receipt.by).toBe("mind:vault");
  expect(receipt.data.author).toBe("mind:vault");
  expect(receipt.data.text).toBe("");
  expect(JSON.stringify(rig.facts())).not.toContain("forged");
  expect(() => ports.bus.emit(command)).toThrow(/act/);
});
