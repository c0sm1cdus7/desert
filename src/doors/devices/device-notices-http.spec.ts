// The house side of notices on the HTTP device door, spoken by hand: answers, held notices and old devices.
import { expect, it } from "vitest";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { deviceHttpHouse } from "../../../tests/support/device-http-house.ts";
import { finished } from "../../../tests/support/device-outbox.ts";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
import { isRecord } from "../../fields/json-values.ts";
import { deviceRequest, type DeviceNotice } from "../../fields/device-protocol.ts";
import { object } from "../../fields/visible-text.ts";
import { devicePaths, pollBody } from "./device-wire.ts";
type Rig = Awaited<ReturnType<typeof deviceHttpHouse>>;
const announcing = { at: "device", tool: "shell", version: "1", announces: true } as const;
const inventory = [{ tool: "shell", version: "1", actions: ["run"] }];
/** The poll answer a device from before 21/11 parses: strict, so one unknown field breaks it. */
const oldAnswer = object({
  requests: Type.Array(object({ call: Type.String({ minLength: 1, maxLength: 64 }), request: deviceRequest })),
});
async function connect(h: Rig, device: string, signer = h.provision(device)) {
  const challenge = (await h.post(devicePaths.challenge, { device })).json();
  if (!isRecord(challenge) || typeof challenge.id !== "string" || typeof challenge.message !== "string")
    throw new Error("Missing challenge");
  const body = { id: challenge.id, signature: signer(challenge.message), inventory };
  const connected = (await h.post(devicePaths.connect, body)).json();
  if (!isRecord(connected) || typeof connected.session !== "string") throw new Error("Missing session");
  return connected.session;
}
async function poll(h: Rig, token: string, body: Readonly<{ results?: unknown[]; notices?: DeviceNotice[] }>) {
  const answer = await h.post(devicePaths.poll, { results: [], ...body }, token);
  expect(answer.status).toBe(200);
  const value = answer.json();
  if (!isRecord(value) || !Array.isArray(value.requests)) throw new Error("Missing requests");
  const [first] = value.requests.filter(isRecord);
  return { value, call: typeof first?.call === "string" ? first.call : "" };
}
const accepted = (call: string) => ({ call, result: { status: "accepted", reference: "started", value: "v" } });
const notices = (h: Rig) =>
  h.rig.house.journal.replay(0, (count, event) => count + (event.kind === "device-execution-notice" ? 1 : 0));
it("answers an old device as before: no answered field, so its strict parser reads every answer", async () => {
  const h = await deviceHttpHouse({ execution: announcing });
  const token = await connect(h, "mac");
  const started = settle(h.act("mac"));
  const { value, call } = await poll(h, token, {});
  expect(Object.keys(value)).toEqual(["requests"]);
  expect(Value.Check(oldAnswer, value)).toBe(true);
  const after = await poll(h, token, { results: [accepted(call)] });
  expect(Value.Check(oldAnswer, after.value)).toBe(true);
  expect(await started).toMatchObject({ status: "accepted" });
  expect(Value.Check(pollBody, { results: [] })).toBe(true);
});
it("holds a notice that came with its start's result, answers recorded once written, and shows its value", async () => {
  const seen: unknown[] = [];
  const h = await deviceHttpHouse({ execution: announcing, observeNotice: (_, notice) => seen.push(notice.value) });
  const token = await connect(h, "mac");
  const started = settle(h.act("mac"));
  const { call } = await poll(h, token, { notices: [] });
  const id = [...h.house().tools.state().house.devices.executions.keys()][0] ?? "";
  const together = await poll(h, token, { results: [accepted(call)], notices: [finished(id, { exit: 0 })] });
  expect(together.value.answered).toEqual([]);
  await started;
  const after = await poll(h, token, { notices: [finished(id, { exit: 0 })] });
  expect(after.value.answered).toEqual([{ execution: id, answer: "recorded" }]);
  expect(notices(h)).toBe(1);
  expect((await poll(h, token, { notices: [finished(id, { exit: 2 })] })).value.answered).toEqual([
    { execution: id, answer: "recorded" },
  ]);
  expect(seen).toEqual([{ exit: 0 }]);
});
it("keeps a poll whose notices are all held waiting, and answers it when the start's result lands", async () => {
  const h = await deviceHttpHouse({ execution: announcing, pollMs: 10_000 });
  const token = await connect(h, "mac");
  const started = settle(h.act("mac"));
  const { call } = await poll(h, token, { notices: [] });
  const id = [...h.house().tools.state().house.devices.executions.keys()][0] ?? "";
  let answered = false;
  const waiting = poll(h, token, { notices: [finished(id)] }).then(answer => {
    answered = true;
    return answer;
  });
  await new Promise(resolve => setTimeout(resolve, 100));
  expect(answered).toBe(false);
  await poll(h, token, { results: [accepted(call)] });
  expect((await waiting).value.answered).toEqual([{ execution: id, answer: "recorded" }]);
  expect(await started).toMatchObject({ status: "accepted" });
});
it("answers refused to what is not this device's announcing execution, and shows it to nobody else", async () => {
  const seen: unknown[] = [];
  const h = await deviceHttpHouse({ observeNotice: (_, notice) => seen.push(notice) });
  const token = await connect(h, "mac");
  const started = settle(h.act("mac"));
  const { call } = await poll(h, token, { notices: [] });
  await poll(h, token, { results: [accepted(call)] });
  await started;
  const id = [...h.house().tools.state().house.devices.executions.keys()][0] ?? "";
  const answer = await poll(h, token, { notices: [finished(id), finished("missing")] });
  expect(answer.value.answered).toEqual([
    { execution: id, answer: "refused" },
    { execution: "missing", answer: "refused" },
  ]);
  expect(seen).toEqual([]);
  expect(notices(h)).toBe(0);
});
it("drops a held notice when its session ends, and records it when sent again on the next one", async () => {
  const h = await deviceHttpHouse({ execution: announcing, pollMs: 50 });
  const signer = h.provision("mac");
  const token = await connect(h, "mac", signer);
  const started = settle(h.act("mac"));
  await poll(h, token, { notices: [] });
  const id = [...h.house().tools.state().house.devices.executions.keys()][0] ?? "";
  expect((await poll(h, token, { notices: [finished(id)] })).value.answered).toEqual([]);
  const next = await connect(h, "mac", signer);
  expect(await started).toMatchObject({ status: "inconclusive" });
  expect(notices(h)).toBe(0);
  const again = await poll(h, next, { notices: [finished(id)] });
  expect(again.value.answered).toEqual([{ execution: id, answer: "recorded" }]);
  expect(h.house().tools.state().house.devices.executions.get(id)).toMatchObject({
    status: "unknown",
    notice: { status: "finished" },
  });
});
