// Founders are read once per journal, and failed redemption never leaves half an issued credential.
import { afterEach, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";
import { doorHouse, invitationCode } from "../../tests/support/door-house.ts";
import { seedDoorKeys } from "./door-access.ts";
import { founderDoorKeys } from "../doors/socket/peers/environment-door-keys.ts";
import { doorTexts } from "../texts/doors.texts.ts";
import { effect } from "../house/facts.ts";
const opened: ReturnType<typeof doorHouse>[] = [];
afterEach(() => {
  opened.splice(0).forEach(house => house.close());
});
it.each([false, true])("adopts founders at birth or at the first opening of an existing house (%s)", existing => {
  const material = randomBytes(32).toString("base64url");
  let reads = 0;
  const environment = {
    get FOUNDER() {
      reads++;
      return material;
    },
  };
  const warn = vi.fn();
  const founders = founderDoorKeys(environment, [{ identity: "ana", door: "agente", variable: "FOUNDER" }], warn);
  const h = doorHouse(existing ? { read: () => new Map(), present: () => false } : founders);
  opened.push(h);
  if (existing) {
    expect(h.house().tools.state().house.doors.initialized).toBe(false);
    seedDoorKeys(h.house().bus, () => h.house().tools.state().house, founders);
  }
  expect(h.access().get(material)?.identity).toBe("ana");
  expect(reads).toBe(1);
  const initialReads = reads;
  const count = h.house().tools.state().house.doors.keys.size;
  h.reopen();
  seedDoorKeys(h.house().bus, () => h.house().tools.state().house, founders);
  expect(reads).toBe(initialReads);
  expect(h.house().tools.state().house.doors.keys.size).toBe(count);
  expect(warn).toHaveBeenCalledWith(doorTexts.foundersIgnored);
  expect(h.history().includes(material)).toBe(false);
  expect(JSON.stringify(warn.mock.calls).includes(material)).toBe(false);
});
it("never reads host values after invitation history, even when no key remains", async () => {
  const h = doorHouse({ read: () => new Map(), present: () => false });
  opened.push(h);
  await h.act("invite", { door: "agente" }, "identities/beto");
  const read = vi.fn(() => {
    throw new Error("Must not read environment values");
  });
  const warn = vi.fn();
  seedDoorKeys(h.house().bus, () => h.house().tools.state().house, { read, present: () => true, warn });
  expect(read).not.toHaveBeenCalled();
  expect(warn).toHaveBeenCalledOnce();
});
it("restores both invitation and key state if the redemption transaction fails", async () => {
  const h = doorHouse();
  opened.push(h);
  const code = invitationCode(await h.act("invite", { door: "agente" }, "identities/beto"));
  const before = h.house().tools.state().house.doors.keys.size;
  const stop = h.house().bus.on("door-invitation-redeemed", () => {
    throw new Error("Synthetic storage failure");
  });
  expect(() => h.access().redeem(code)).toThrow();
  stop();
  expect(h.house().tools.state().house.doors.keys.size).toBe(before);
  expect([...h.house().tools.state().house.doors.invitations.values()].every(invitation => !invitation.redeemed)).toBe(
    true,
  );
  expect(h.access().redeem(code).status).toBe(200);
});
it("scrubs pasted keys and codes from journal entries, diagnostics and MCP preparation", async () => {
  const h = doorHouse();
  opened.push(h);
  const code = invitationCode(await h.act("invite", { door: "agente" }, "identities/beto"));
  const key = h.access().redeem(code).key;
  if (!key) throw new Error("Missing synthetic credential");
  h.house().bus.emit(
    effect(
      "tool-entry",
      { tool: "identities", target: "identities", author: "ana", text: `${key} ${code}`, diagnostic: `${key} ${code}` },
      "ana",
    ),
  );
  const prepared = JSON.stringify(h.house().tools.prepare({ [key]: code, nested: [key] }));
  expect([key, code].some(value => h.history().includes(value) || prepared.includes(value))).toBe(false);
  expect(prepared).toContain("[secreto]");
});
it("refuses expiration reached between fingerprint verification and the transaction", async () => {
  const h = doorHouse();
  opened.push(h);
  const code = invitationCode(await h.act("invite", { door: "agente" }, "identities/beto"));
  const before = h.house().tools.state().house.doors.keys.size;
  const together = h.house().bus.together.bind(h.house().bus);
  const transaction = vi.spyOn(h.house().bus, "together").mockImplementation(<T>(write: () => T): T => {
    h.advance(86_400_000);
    return together(write);
  });
  try {
    expect(h.access().redeem(code).status).toBe(400);
    expect(h.house().tools.state().house.doors.keys.size).toBe(before);
    expect(
      [...h.house().tools.state().house.doors.invitations.values()].every(invitation => !invitation.redeemed),
    ).toBe(true);
  } finally {
    transaction.mockRestore();
  }
});
