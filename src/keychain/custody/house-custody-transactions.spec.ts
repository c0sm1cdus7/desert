import { expect, it, vi } from "vitest";
import { Type } from "@sinclair/typebox";
import { adapterHouse } from "../../../tests/support/adapter-house.ts";
import { imported } from "../../../tests/support/declared-adapters.ts";
import { toolAct } from "../../tools/act-definition.ts";
import { MemoryHouseKeys } from "./house-keys.ts";
import { MacOSHouseKeys } from "../macos/macos-house-keys.ts";
import { fakeKeychain } from "../../../tests/support/fake-keychain.ts";
const empty = Type.Object({});
it("el together del arranque confirma dos posiciones en un agregado y vuelve a abrir", async () => {
  let complete: (value: unknown) => void = () => {};
  const finished = new Promise(resolve => {
    complete = resolve;
  });
  let started = false;
  const rig = adapterHouse(
    {},
    {
      start(ports) {
        if (started) return () => {};
        started = true;
        return ports.bus.on("boot", () => {
          void imported(ports).then(refs => {
            try {
              ports.bus.together(() => {
                ports.bus.emit(ports.credentials.replace("signing", refs, 0));
                ports.bus.emit(ports.credentials.replace("backup", refs, 0));
              });
              complete("ok");
            } catch (error) {
              complete(error);
            }
          });
        });
      },
    },
  );
  expect(await finished).toBe("ok");
  const history = JSON.stringify(rig.facts());
  expect(history.match(/credential-bound/gu)).toHaveLength(2);
  expect(history.match(/"batchSize":2/gu)).toHaveLength(2);
  expect(() => rig.restart()).not.toThrow();
});
for (const status of [null, 44])
  it(`la casa devuelve el resultado y avisa ancla pendiente con estado ${status}`, async () => {
    const fake = fakeKeychain();
    let fail = false;
    const keys = new MacOSHouseKeys((file, args, input, options) => {
      if (fail && args[0] === "-i" && Buffer.from(input).includes("desert.custody-anchor.v3"))
        return { status, stdout: Buffer.alloc(0) };
      return fake.command(file, args, input, options);
    });
    vi.spyOn(MemoryHouseKeys.prototype, "key").mockImplementation((account, create) => keys.key(account, create));
    vi.spyOn(MemoryHouseKeys.prototype, "head").mockImplementation(house => keys.head(house));
    vi.spyOn(MemoryHouseKeys.prototype, "anchor").mockImplementation((house, head) => keys.anchor(house, head));
    vi.spyOn(MemoryHouseKeys.prototype, "has").mockImplementation(account => keys.has(account));
    try {
      const rig = adapterHouse({
        bind: toolAct(empty, async (_, context) => {
          const refs = await imported(context);
          fail = true;
          return { status: "accepted", text: "conectado", effects: [context.credentials.replace("signing", refs, 0)] };
        }),
        current: toolAct(empty, (_, context) => ({
          status: context.credentials.current("signing") ? "accepted" : "rejected",
          reason: "sin firma",
        })),
      });
      const result = await rig.act("bind");
      expect(result).toMatchObject({ status: "accepted", anchorPending: true });
      expect(JSON.stringify(result.effects)).toContain("conectado");
      expect(JSON.stringify(rig.facts()).match(/credential-bound/gu)).toHaveLength(1);
      fail = false;
      rig.restart();
      expect(await rig.act("current")).toMatchObject({ status: "accepted" });
    } finally {
      vi.restoreAllMocks();
    }
  });
