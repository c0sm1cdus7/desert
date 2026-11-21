// A device's notice through the in-process door: authority from the house's record, held, refused, once.
import { expect, it } from "vitest";
import { setup } from "../../../tests/support/device-house.ts";
import { finished } from "../../../tests/support/device-outbox.ts";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
import { effect } from "../../house/facts.ts";
import type { DeviceResult, NoticeAnswer } from "../../fields/device-protocol.ts";
import type { Event } from "../../journal/vocabulary.ts";
type Rig = ReturnType<typeof setup>;
const announcing = { at: "device", tool: "shell", version: "1", announces: true } as const;
const events = (rig: Rig) => rig.house.journal.replay<Event[]>([], (all, event) => [...all, event]);
const notices = (rig: Rig) => events(rig).filter(event => event.kind === "device-execution-notice");
const execution = (rig: Rig) => {
  const [only] = rig.house.tools.state().house.devices.executions.values();
  if (!only) throw new Error("Missing execution");
  return only;
};
function gate() {
  let open: (result: DeviceResult) => void = () => {};
  const promise = new Promise<DeviceResult>(resolve => {
    open = resolve;
  });
  return { promise, open };
}
it("records a notice once, by the execution's actor, beside its result and never in its place", async () => {
  const rig = setup(announcing);
  const mac = rig.device("mac");
  await settle(rig.act("mac"));
  const started = execution(rig);
  expect(started).toMatchObject({ announces: true, status: "accepted" });
  const later: NoticeAnswer[] = [];
  expect(mac.connection.announce(finished(started.execution, { exit: 0 }), answer => later.push(answer))).toBe(
    "recorded",
  );
  expect(mac.connection.announce({ ...finished(started.execution), status: "failed" }, () => {})).toBe("recorded");
  expect(later).toEqual([]);
  const [fact, ...more] = notices(rig);
  expect(more).toEqual([]);
  expect(fact).toMatchObject({
    by: "beto",
    cause: [started.execution],
    data: { execution: started.execution, status: "finished", reference: `agents:${started.execution}:finished` },
  });
  expect(JSON.stringify(fact)).not.toContain("exit");
  expect(execution(rig)).toMatchObject({
    status: "accepted",
    reference: `result:${started.execution}`,
    notice: { status: "finished" },
  });
});
it("takes author and journey from the house's record, never from the device", () => {
  const rig = setup(announcing);
  const mac = rig.device("mac");
  const connection = rig.house.tools.state().house.devices.devices.get("mac")?.connection ?? "";
  const data = { execution: "e1", actor: "mind:agents", program: "agents", action: "run", device: "mac", connection };
  rig.house.bus.emit(effect("device-execution-started", { ...data, journey: "j1", announces: true }, "mind:agents"));
  rig.house.bus.emit(effect("device-execution-result", { execution: "e1", status: "accepted", reference: "r" }, "x"));
  expect(mac.connection.announce(finished("e1"), () => {})).toBe("recorded");
  expect(notices(rig)[0]).toMatchObject({ by: "mind:agents", process: "j1", cause: ["e1"] });
});
it("refuses alike a missing execution, another device's, one that does not announce and a rejected start", async () => {
  const rig = setup(announcing);
  const mac = rig.device("mac", () => Promise.resolve({ status: "rejected", reference: "no", reason: "no" }));
  const vm = rig.device("vm");
  await settle(rig.act("mac"));
  await settle(rig.act("vm"));
  const [rejected, theirs] = [...rig.house.tools.state().house.devices.executions.keys()];
  expect(mac.connection.announce(finished("missing"), () => {})).toBe("refused");
  expect(mac.connection.announce(finished(theirs ?? ""), () => {})).toBe("refused");
  expect(mac.connection.announce(finished(rejected ?? ""), () => {})).toBe("refused");
  expect(vm.connection.announce({ ...finished(theirs ?? ""), reference: "" }, () => {})).toBe("refused");
  const plain = setup();
  const quiet = plain.device("mac");
  await settle(plain.act("mac"));
  expect(quiet.connection.announce(finished(execution(plain).execution), () => {})).toBe("refused");
  expect([...notices(rig), ...notices(plain)]).toEqual([]);
});
it("holds a notice that comes before its start's result and records it as soon as the result is written", async () => {
  const rig = setup(announcing);
  const { promise, open } = gate();
  const mac = rig.device("mac", () => promise);
  const pending = settle(rig.act("mac"));
  await Promise.resolve();
  const id = execution(rig).execution;
  const later: NoticeAnswer[] = [];
  expect(mac.connection.announce(finished(id), answer => later.push(answer))).toBe("held");
  expect(notices(rig)).toEqual([]);
  open({ status: "accepted", reference: "started" });
  expect(await pending).toMatchObject({ status: "accepted" });
  expect(later).toEqual(["recorded"]);
  const kinds = events(rig).flatMap(event => (event.kind.startsWith("device-execution") ? [event.kind] : []));
  expect(kinds).toEqual(["device-execution-started", "device-execution-result", "device-execution-notice"]);
  expect(execution(rig)).toMatchObject({ status: "accepted", reference: "started", notice: { status: "finished" } });
});
it("keeps the first of two held notices and answers both callers once the start's result is written", async () => {
  const rig = setup(announcing);
  const { promise, open } = gate();
  const mac = rig.device("mac", () => promise);
  const pending = settle(rig.act("mac"));
  await Promise.resolve();
  const id = execution(rig).execution;
  const later: string[] = [];
  const written: string[] = [];
  for (const status of ["failed", "finished"] as const) {
    const heard = (answer: NoticeAnswer) => later.push(`${status}:${answer}`);
    expect(mac.connection.announce({ ...finished(id), status }, heard, () => written.push(status))).toBe("held");
  }
  open({ status: "accepted", reference: "started" });
  await pending;
  expect(later).toEqual(["failed:recorded", "finished:recorded"]);
  expect(written).toEqual(["failed"]);
  expect(mac.connection.announce({ ...finished(id), status: "cancelled" }, () => {})).toBe("recorded");
  expect(notices(rig).map(fact => fact.data)).toMatchObject([{ status: "failed" }]);
  expect(execution(rig).notice).toMatchObject({ status: "failed" });
});
it("refuses a held notice when its start is rejected", async () => {
  const rig = setup(announcing);
  const { promise, open } = gate();
  const mac = rig.device("mac", () => promise);
  const pending = settle(rig.act("mac"));
  await Promise.resolve();
  const later: NoticeAnswer[] = [];
  expect(mac.connection.announce(finished(execution(rig).execution), answer => later.push(answer))).toBe("held");
  open({ status: "rejected", reference: "no", reason: "no" });
  await pending;
  expect(later).toEqual(["refused"]);
  expect(notices(rig)).toEqual([]);
});
it("drops what is held on a disconnect, then records the notice resent over an unknown start", async () => {
  const rig = setup(announcing);
  const mac = rig.device("mac", () => new Promise(() => {}));
  const pending = settle(rig.act("mac"));
  await Promise.resolve();
  const id = execution(rig).execution;
  const later: NoticeAnswer[] = [];
  expect(mac.connection.announce(finished(id), answer => later.push(answer))).toBe("held");
  mac.connection.disconnect();
  expect(await pending).toMatchObject({ status: "inconclusive" });
  expect(execution(rig).status).toBe("unknown");
  expect(() => mac.connection.announce(finished(id), () => {})).toThrow();
  expect(later).toEqual([]);
  expect(notices(rig)).toEqual([]);
  const again = rig.reconnect("mac", mac.pair);
  expect(again.announce(finished(id), () => {})).toBe("recorded");
  expect(execution(rig)).toMatchObject({ status: "unknown", notice: { status: "finished" } });
});
it("takes nothing from a retired device and leaves its executions readable", async () => {
  const rig = setup(announcing);
  const mac = rig.device("mac");
  await settle(rig.act("mac"));
  rig.house.devices.retire("ana", "mac");
  expect(() => mac.connection.announce(finished(execution(rig).execution), () => {})).toThrow();
  expect(execution(rig)).toMatchObject({ device: "mac", status: "accepted", announces: true });
  expect(notices(rig)).toEqual([]);
});
it("replays a journal from before notices, and one with them, folding each notice once", async () => {
  const rig = setup(announcing);
  rig.device("mac");
  const connection = rig.house.tools.state().house.devices.devices.get("mac")?.connection ?? "";
  const old = { actor: "beto", program: "agents", action: "run", device: "mac", connection };
  rig.house.bus.emit(effect("device-execution-started", { ...old, execution: "old" }, "beto"));
  rig.house.bus.emit(effect("device-execution-result", { execution: "old", status: "accepted", reference: "r" }, "b"));
  rig.house.bus.emit(effect("device-execution-notice", { execution: "old", status: "lost", reference: "r" }, "beto"));
  await settle(rig.act("mac"));
  const id = [...rig.house.tools.state().house.devices.executions.keys()][1] ?? "";
  for (const status of ["finished", "failed"] as const)
    rig.house.bus.emit(effect("device-execution-notice", { execution: id, status, reference: "r" }, "beto"));
  rig.house.close();
  const reopened = rig.open().tools.state().house.devices.executions;
  expect(reopened.get("old")).toEqual({ ...old, execution: "old", status: "accepted", reference: "r" });
  expect(reopened.get(id)?.notice).toEqual({ execution: id, status: "finished", reference: "r" });
});
