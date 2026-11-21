// Who a notice reaches: never a device on an older tool version, only the journey that started it, and a relay.
import { expect, it, vi } from "vitest";
import { setup } from "../../../tests/support/device-house.ts";
import { deviceOutbox, finished } from "../../../tests/support/device-outbox.ts";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
import { effect } from "../../house/facts.ts";
import { deviceChoices } from "../../house/devices/device-state.ts";
import { createDeviceProcess } from "../../doors/devices/device-process.ts";
import { relayNotices } from "../../doors/devices/device-door.ts";
import { mindWakeDecision } from "../minds/mind-wake-policy.ts";
import type { DeviceResult } from "../../fields/device-protocol.ts";
import type { Event } from "../../journal/vocabulary.ts";
type Rig = ReturnType<typeof setup>;
const events = (rig: Rig) => rig.house.journal.replay<Event[]>([], (all, event) => [...all, event]);
const shell = (version: string, notices?: ReturnType<typeof deviceOutbox>["port"]) =>
  createDeviceProcess([
    {
      tool: "shell",
      version,
      actions: { run: request => Promise.resolve({ status: "accepted", reference: `r:${request.execution}` }) },
      ...(notices ? { notices } : {}),
    },
  ]);
it("never offers an announcing action at version 2 to a device still on version 1", async () => {
  const execution = { at: "device", tool: "shell", version: "2", announces: true } as const;
  const rig = setup(execution);
  const mac = rig.device("mac");
  const house = () => rig.house.tools.state().house;
  expect(deviceChoices(house(), execution, "run")).toEqual([]);
  expect(rig.house.devices.available("agents", "run")).toEqual([]);
  expect((await settle(rig.act("mac"))).status).toBe("rejected");
  expect(rig.requests).toEqual([]);
  mac.connection.disconnect();
  rig.reconnect("mac", mac.pair, shell("2"));
  expect(deviceChoices(house(), execution, "run")).toEqual([{ kind: "device", device: "mac", name: "mac" }]);
  expect((await settle(rig.act("mac"))).status).toBe("accepted");
  expect([...house().devices.executions.values()][0]?.announces).toBe(true);
});
it("wakes the journey that started the work with its recorded notice, and not its consciousness", () => {
  const rig = setup({ at: "device", tool: "shell", version: "1", announces: true });
  const mac = rig.device("mac");
  const connection = rig.house.tools.state().house.devices.devices.get("mac")?.connection ?? "";
  const data = { execution: "e1", actor: "mind:agents", program: "agents", action: "run", device: "mac", connection };
  rig.house.bus.emit(effect("device-execution-started", { ...data, journey: "j1", announces: true }, "mind:agents"));
  rig.house.bus.emit(effect("device-execution-unknown", { execution: "e1", reason: "corte" }, "mind:agents"));
  expect(mac.connection.announce(finished("e1"), () => {})).toBe("recorded");
  const history = events(rig);
  const notice = history.find(event => event.kind === "device-execution-notice");
  if (!notice) throw new Error("Missing notice");
  const policy = (scope: Parameters<typeof mindWakeDecision>[0]["scope"]) => ({
    scope,
    name: "agents",
    message: () => undefined,
    toolOf: () => "agents",
  });
  const journey = { kind: "journey" as const, actor: "mind:agents" as const, process: "j1", kit: [] };
  expect(mindWakeDecision(policy(journey), notice, history, 0)).toBe(true);
  const consciousness = { kind: "consciousness" as const, actor: "mind:agents" as const };
  expect(mindWakeDecision(policy(consciousness), notice, history, 0)).toBe(false);
});
it("relays an in-process device's notices: owed ones, new ones, held until recorded, and refusals", async () => {
  const rig = setup({ at: "device", tool: "shell", version: "1", announces: true });
  const outbox = deviceOutbox([finished("missing")]);
  let open: (result: DeviceResult) => void = () => {};
  const process = createDeviceProcess([
    {
      tool: "shell",
      version: "1",
      actions: { run: () => new Promise<DeviceResult>(resolve => (open = resolve)) },
      notices: outbox.port,
    },
  ]);
  const mac = rig.device("mac");
  mac.connection.disconnect();
  const link = rig.reconnect("mac", mac.pair, process);
  const reasons: string[] = [];
  if (!process.notices) throw new Error("Missing notices");
  const stop = relayNotices(link, process.notices, reason => reasons.push(reason));
  await vi.waitFor(() => expect(outbox.answers.get("missing")).toBe("refused"));
  expect(reasons).toEqual([expect.stringContaining("missing")]);
  const pending = settle(rig.act("mac"));
  await Promise.resolve();
  const [id = ""] = rig.house.tools.state().house.devices.executions.keys();
  outbox.push(finished(id, { exit: 0 }));
  expect(outbox.answers.has(id)).toBe(false);
  open({ status: "accepted", reference: "started" });
  await pending;
  await vi.waitFor(() => expect(outbox.answers.get(id)).toBe("recorded"));
  stop();
  expect(outbox.listening()).toBe(0);
});
