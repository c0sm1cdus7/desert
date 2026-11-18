import { expect, it } from "vitest";
import { sign, generateKeyPairSync } from "node:crypto";
import { setup } from "../../../tests/support/device-house.ts";
import { createDeviceDoor } from "./device-door.ts";
import { createDeviceProcess } from "./device-process.ts";
import { settle } from "../../surface/bridge/ports/house-ports.ts";

it("rejects a different device credential, expires challenges and consumes each challenge once", () => {
  const rig = setup();
  const mac = rig.device("mac");
  mac.connection.disconnect();
  const other = generateKeyPairSync("ed25519");
  const challenge = rig.door.challenge("mac");
  expect(() =>
    rig.door.connect(
      challenge.id,
      sign(null, Buffer.from(challenge.message), other.privateKey).toString("base64"),
      mac.process,
    ),
  ).toThrow();
  expect(() =>
    rig.door.connect(
      challenge.id,
      sign(null, Buffer.from(challenge.message), mac.pair.privateKey).toString("base64"),
      mac.process,
    ),
  ).toThrow();
  let now = 0;
  const door = createDeviceDoor(rig.house.devices, () => now);
  const expired = door.challenge("mac");
  now = 30_000;
  expect(() =>
    door.connect(
      expired.id,
      sign(null, Buffer.from(expired.message), mac.pair.privateKey).toString("base64"),
      mac.process,
    ),
  ).toThrow();
  expect(Object.keys(mac.connection)).toEqual(["disconnect"]);
  expect(Object.hasOwn(rig.house.devices, "dispatch")).toBe(false);
});
it("requires acceptance and owner authority without granting administration on entry", () => {
  const rig = setup();
  const pair = generateKeyPairSync("ed25519");
  rig.house.devices.register("beto", {
    id: "new",
    name: "Nueva",
    publicKey: pair.publicKey.export({ type: "spki", format: "der" }).toString("base64"),
  });
  expect(() => rig.door.challenge("new")).toThrow();
  expect(() => rig.house.devices.accept("sin", "new")).toThrow();
  rig.house.devices.accept("beto", "new");
  expect(rig.house.tools.state().house.admin).toBe("ana");
  expect(() => rig.house.devices.retire("sin", "new")).toThrow();
  rig.house.devices.retire("beto", "new");
  expect(() => rig.house.devices.accept("beto", "new")).toThrow();
});
it("filters incompatible inventories and refreshes them only on an authenticated reconnection", async () => {
  const rig = setup();
  const mac = rig.device("mac");
  mac.connection.disconnect();
  const process = createDeviceProcess([
    {
      tool: "shell",
      version: "2",
      actions: { run: () => Promise.resolve({ status: "accepted", reference: "unused" }) },
    },
  ]);
  const challenge = rig.door.challenge("mac");
  rig.door.connect(
    challenge.id,
    sign(null, Buffer.from(challenge.message), mac.pair.privateKey).toString("base64"),
    process,
  );
  expect(rig.house.devices.available("agents", "run")).toEqual([]);
  expect((await settle(rig.act("mac"))).status).toBe("rejected");
  expect(rig.requests).toEqual([]);
});
it("does not run an invalid input or a manufactured result carrying effects", async () => {
  const rig = setup();
  rig.device("mac", request =>
    Promise.resolve({ status: "accepted", reference: `result:${request.execution}`, effects: [] }),
  );
  expect(
    (
      await settle(
        rig.house.tools.act(
          { act: "run", target: "agents", input: { command: 5 }, destination: { kind: "device", device: "mac" } },
          0,
          "beto",
        ),
      )
    ).status,
  ).toBe("rejected");
  expect(rig.requests).toEqual([]);
  expect((await settle(rig.act("mac"))).status).toBe("inconclusive");
});
it("does not give the machine an identity, own scene, kit, or membership", async () => {
  const rig = setup();
  rig.device("mac");
  for (const value of [
    { act: "scene", input: { general: "Mac", to: {} } },
    { act: "run", target: "agents", input: { command: "test" }, destination: { kind: "device", device: "mac" } },
  ])
    expect((await settle(rig.house.tools.act(value, 0, "mac"))).status).toBe("rejected");
  const house = rig.house.tools.state().house;
  expect(house.grants.has("mac")).toBe(false);
  expect(house.scenes.has("mac")).toBe(false);
  expect(house.minds.turns.size).toBe(0);
  expect(house.minds.scenes.size).toBe(0);
  expect(house.journeys.size).toBe(0);
  expect(rig.requests).toEqual([]);
});
