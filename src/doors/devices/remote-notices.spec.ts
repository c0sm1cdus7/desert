// A device's durable outbox over HTTP: sent until answered, resent after a cut, and loud against an older house.
import { expect, it, vi } from "vitest";
import { deviceHttpHouse, onCleanup } from "../../../tests/support/device-http-house.ts";
import { deviceOutbox, finished } from "../../../tests/support/device-outbox.ts";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
import { deviceTexts } from "../../texts/devices.texts.ts";
import { createDeviceProcess } from "./device-process.ts";
import { connectRemoteDevice } from "./remote-device.ts";
import { deviceHttpLimits, devicePaths } from "./device-wire.ts";
import { NoticeOutbox } from "./remote-notices.ts";
type Rig = Awaited<ReturnType<typeof deviceHttpHouse>>;
const announcing = { at: "device", tool: "shell", version: "1", announces: true } as const;
function start(h: Rig, outbox: ReturnType<typeof deviceOutbox>, send: typeof fetch = fetch) {
  const controller = new AbortController();
  const reasons: string[] = [];
  const endpoint = createDeviceProcess([
    {
      tool: "shell",
      version: "1",
      actions: { run: request => Promise.resolve({ status: "accepted", reference: `r:${request.execution}` }) },
      notices: outbox.port,
    },
  ]);
  const running = connectRemoteDevice({
    url: h.url(),
    device: "mac",
    sign: h.provision("mac"),
    endpoint,
    fetch: send,
    signal: controller.signal,
    backoff: { first: 10, max: 40 },
    report: reason => reasons.push(reason),
  });
  onCleanup(async () => {
    controller.abort();
    await running;
  });
  return reasons;
}
const wait = (check: () => void) => vi.waitFor(check, { timeout: 3_000, interval: 10 });
const executions = (h: Rig) => [...h.house().tools.state().house.devices.executions.values()];
it("sends what it owes on connecting and each new notice, until the house answers it", async () => {
  const seen: unknown[] = [];
  const h = await deviceHttpHouse({ execution: announcing, observeNotice: (_, notice) => seen.push(notice.value) });
  const outbox = deviceOutbox([finished("missing")]);
  const reasons = start(h, outbox);
  await wait(() => expect(outbox.answers.get("missing")).toBe("refused"));
  expect(reasons).toEqual([deviceTexts.noticeRefused("missing")]);
  expect(await settle(h.act("mac"))).toMatchObject({ status: "accepted" });
  const [execution] = executions(h);
  outbox.push(finished(execution?.execution ?? "", { exit: 0 }));
  await wait(() => expect(outbox.answers.get(execution?.execution ?? "")).toBe("recorded"));
  expect(executions(h)[0]?.notice).toMatchObject({ status: "finished" });
  expect(seen).toEqual([{ exit: 0 }]);
});
it("sends a notice again after the poll carrying it was cut, and the house records it once", async () => {
  const h = await deviceHttpHouse({ execution: announcing });
  const outbox = deviceOutbox();
  let cut = 1;
  const send: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    const body = request.url.endsWith(devicePaths.poll) ? await request.clone().text() : "";
    if (body.includes('"status":"finished"') && cut-- > 0) {
      await fetch(request);
      throw new TypeError("cut after sending");
    }
    return fetch(request);
  };
  const reasons = start(h, outbox, send);
  await wait(() => expect(h.connection("mac")).toBeDefined());
  await settle(h.act("mac"));
  const id = executions(h)[0]?.execution ?? "";
  outbox.push(finished(id));
  await wait(() => expect(outbox.answers.get(id)).toBe("recorded"));
  expect(reasons).toContain("TypeError: cut after sending");
  const count = h.rig.house.journal.replay(0, (n, event) => n + (event.kind === "device-execution-notice" ? 1 : 0));
  expect(count).toBe(1);
});
it("fails loudly against a house older than its notices and keeps every notice for the updated house", async () => {
  const h = await deviceHttpHouse({ execution: announcing });
  const outbox = deviceOutbox([finished("owed")]);
  /** A house from before 21/11 answers 400 to any body with a field it does not know. */
  const old: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    if (request.url.endsWith(devicePaths.poll) && (await request.clone().text()).includes('"notices"'))
      return new Response(null, { status: 400 });
    return fetch(request);
  };
  const reasons = start(h, outbox, old);
  await wait(() => expect(reasons.length).toBeGreaterThan(1));
  expect(new Set(reasons)).toEqual(new Set([`Error: ${deviceTexts.refusedBody}`]));
  expect(outbox.answers.size).toBe(0);
});
it("sends no notices field from a device whose tools do not announce, so an older house still reads it", async () => {
  const h = await deviceHttpHouse();
  const bodies: string[] = [];
  const send: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    if (request.url.endsWith(devicePaths.poll)) bodies.push(await request.clone().text());
    return fetch(request);
  };
  const controller = new AbortController();
  const endpoint = createDeviceProcess([
    { tool: "shell", version: "1", actions: { run: () => Promise.resolve({ status: "accepted", reference: "r" }) } },
  ]);
  const { signal } = controller;
  const running = connectRemoteDevice({
    url: h.url(),
    device: "mac",
    sign: h.provision("mac"),
    endpoint,
    fetch: send,
    signal,
  });
  onCleanup(async () => {
    controller.abort();
    await running;
  });
  expect(endpoint.notices).toBeUndefined();
  await wait(() => expect(bodies.length).toBeGreaterThan(0));
  expect(bodies.every(body => !body.includes("notices"))).toBe(true);
});
it("trims a notice that would fill the body to the byte, and never lets one that waits block the rest", async () => {
  const sized = (execution: string, bytes: number) => {
    const empty = finished(execution, "");
    return finished(execution, "x".repeat(bytes - Buffer.byteLength(JSON.stringify(empty))));
  };
  const told: string[] = [];
  const outbox = deviceOutbox([
    sized("whole", deviceHttpLimits.body - deviceHttpLimits.envelope),
    sized("half", deviceHttpLimits.body / 2),
  ]);
  const box = new NoticeOutbox(
    outbox.port,
    reason => told.push(reason),
    () => {},
  );
  await box.open(() => true);
  outbox.push(finished("small"));
  expect(told).toEqual([deviceTexts.noticeTrimmed("whole")]);
  const busy = box.offer(deviceHttpLimits.body / 2);
  expect(busy.map(notice => [notice.execution, "value" in notice])).toEqual([
    ["whole", false],
    ["small", false],
  ]);
  expect(box.offer(deviceHttpLimits.envelope).map(notice => notice.execution)).toEqual(["whole", "half", "small"]);
});
it("leaves out and names one tool's invalid notice, and still sends every other tool's", async () => {
  const bad = { ...finished("bad"), reference: "r".repeat(201) };
  const [a, b] = [deviceOutbox([bad]), deviceOutbox([finished("good")])];
  const run = () => Promise.resolve({ status: "accepted", reference: "r" } as const);
  const endpoint = createDeviceProcess([
    { tool: "a", version: "1", actions: { run }, notices: a.port },
    { tool: "b", version: "1", actions: { run }, notices: b.port },
  ]);
  if (!endpoint.notices) throw new Error("Missing notices");
  const told: string[] = [];
  const box = new NoticeOutbox(
    endpoint.notices,
    reason => told.push(reason),
    () => {},
  );
  await box.open(() => true);
  a.push({ ...bad, execution: "worse" });
  b.push(finished("better"));
  expect(box.offer(deviceHttpLimits.envelope).map(notice => notice.execution)).toEqual(["good", "better"]);
  expect(told).toEqual([deviceTexts.noticeInvalid("a", "bad"), deviceTexts.noticeInvalid("a", "worse")]);
});
