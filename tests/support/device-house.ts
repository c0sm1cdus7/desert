import "./upgrade-vault.ts";
import { afterEach } from "vitest";
import { generateKeyPairSync, sign } from "node:crypto";
import { Type } from "@sinclair/typebox";
import { startHouse } from "../../src/runtime/house-runtime.ts";
import { home, time } from "./upgrade-support.ts";
import { vocabulary } from "../../src/journal/vocabulary.ts";
import { toolAct } from "../../src/tools/act-definition.ts";
import { createDeviceProcess } from "../../src/doors/devices/device-process.ts";
import type { ActionExecution, DeviceRequest, DeviceResult } from "../../src/fields/device-protocol.ts";

const closers: (() => void)[] = [];
afterEach(() => {
  closers
    .splice(0)
    .reverse()
    .forEach(close => close());
});
function deviceOptions(execution: ActionExecution) {
  const action = {
    ...toolAct(Type.Object({ command: Type.String() }), () => ({ status: "accepted", value: "house" }), "world"),
    execution,
  };
  const options = {
    by: "host",
    identities: true,
    projectionVersion: "devices/1",
    words: vocabulary({}),
    slices: { initial: {}, step: {} },
    registry: [
      {
        id: "agents",
        purpose: "Ejecutar",
        acts: { run: action },
        targets: () => [],
        view: () => "",
        summary: () => "",
      },
    ],
    creation: {
      admin: "ana",
      assignments: [
        { identity: "beto", tools: ["agents"] },
        { identity: "sin", tools: [] },
      ],
    },
  };
  return options;
}
export function setup(execution: ActionExecution = { at: "either", tool: "shell", version: "1" }) {
  const options = deviceOptions(execution);
  const path = home();
  const open = () => {
    const house = startHouse(path, options, time);
    closers.push(house.close);
    return house;
  };
  const house = open();
  house.tools.act({ act: "attend", input: { target: "agents" } }, 0, "beto");
  const door = house.devices.door;
  const requests: DeviceRequest[] = [];
  const device = provisioner(house, door, requests);
  const act = (device: string, by = "beto") =>
    house.tools.act(
      { act: "run", target: "agents", input: { command: "test" }, destination: { kind: "device", device } },
      0,
      by,
    );
  return { house, open, door, requests, device, act, options };
}

function provisioner(
  house: ReturnType<typeof startHouse>,
  door: ReturnType<typeof startHouse>["devices"]["door"],
  requests: DeviceRequest[],
) {
  return function device(id: string, handler?: (request: DeviceRequest) => Promise<DeviceResult>) {
    const pair = generateKeyPairSync("ed25519");
    const publicKey = pair.publicKey.export({ type: "spki", format: "der" }).toString("base64");
    house.devices.register("ana", { id, name: id, publicKey });
    house.devices.accept("ana", id);
    const process = createDeviceProcess([
      {
        tool: "shell",
        version: "1",
        actions: {
          run: async request => {
            requests.push(request);
            return handler
              ? handler(request)
              : { status: "accepted", reference: `result:${request.execution}`, value: id };
          },
        },
      },
    ]);
    const challenge = door.challenge(id);
    const connection = door.connect(
      challenge.id,
      sign(null, Buffer.from(challenge.message), pair.privateKey).toString("base64"),
      process,
    );
    return { connection, process, pair, challenge };
  };
}
