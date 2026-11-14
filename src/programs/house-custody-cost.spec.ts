import { expect, it, vi } from "vitest";
import { Type } from "@sinclair/typebox";
import { adapterHouse } from "../../tests/support/adapter-house.ts";
import { imported, call } from "../../tests/support/declared-adapters.ts";
import { toolAct } from "../tools/act-definition.ts";
import { MemoryHouseKeys } from "../adapters/secrets/custody/house-keys.ts";
import { MacOSHouseKeys } from "../adapters/secrets/custody/macos-house-keys.ts";
import { SqliteJournal } from "../adapters/storage/journal-store.ts";
import { fakeKeychain } from "../../tests/support/fake-keychain.ts";
const empty = Type.Object({});
it("costo por abrir, acto sin secretos, rechazo y firma con 0, 60 y 600 rotaciones", async () => {
  const fake = fakeKeychain(),
    keys = new MacOSHouseKeys(fake.command);
  vi.spyOn(MemoryHouseKeys.prototype, "key").mockImplementation((account, create) => keys.key(account, create));
  vi.spyOn(MemoryHouseKeys.prototype, "head").mockImplementation(house => keys.head(house));
  vi.spyOn(MemoryHouseKeys.prototype, "anchor").mockImplementation((house, head) => keys.anchor(house, head));
  vi.spyOn(MemoryHouseKeys.prototype, "has").mockImplementation(account => keys.has(account));
  vi.spyOn(MemoryHouseKeys.prototype, "forget").mockImplementation(account => keys.forget(account));
  const reads = vi.spyOn(SqliteJournal.prototype, "replay");
  try {
    const rig = adapterHouse({
      rotate: toolAct(empty, async (_, ctx) => ({
        status: "accepted",
        effects: [ctx.credentials.replace("signing", await imported(ctx), ctx.credentials.revision("signing"))],
      })),
      noop: toolAct(empty, () => ({ status: "accepted", text: "sin secretos" })),
      reject: toolAct(empty, () => ({ status: "rejected", reason: "no corresponde" })),
      sign: toolAct(empty, async (_, ctx) => {
        const current = ctx.credentials.current("signing");
        if (!current) return { status: "rejected", reason: "sin firma" };
        return { status: "accepted", text: JSON.stringify(await call(ctx, "inspect", current.refs)) };
      }),
    });
    await rig.act("rotate");
    let rotated = 0;
    const table: unknown[] = [];
    const reset = () => {
      fake.calls.length = 0;
      reads.mockClear();
    };
    const cost = () => ({ keychain: fake.calls.length, journal: reads.mock.calls.length });
    for (const rotations of [0, 60, 600]) {
      while (rotated < rotations) {
        expect((await rig.act("rotate")).status).toBe("accepted");
        rotated++;
      }
      rig.close();
      reset();
      rig.restart();
      const opening = cost();
      reset();
      expect((await rig.act("noop")).status).toBe("accepted");
      const plain = cost();
      reset();
      expect((await rig.act("reject")).status).toBe("rejected");
      const rejected = cost();
      reset();
      expect((await rig.act("sign")).status).toBe("accepted");
      const signing = cost();
      table.push({ rotations, opening, plain, rejected, signing });
      process.stdout.write(JSON.stringify(table.at(-1)) + "\n");
      expect(plain).toEqual({ keychain: 0, journal: 0 });
      expect(rejected).toEqual({ keychain: 0, journal: 0 });
      expect(signing).toEqual({ keychain: 4, journal: 2 });
      const rowsRead = reads.mock.results.reduce(
        (sum, result) => sum + (result.type === "return" && Array.isArray(result.value) ? result.value.length : 0),
        0,
      );
      expect(rowsRead).toBeLessThan(30);
    }
  } finally {
    vi.restoreAllMocks();
  }
}, 120000);
