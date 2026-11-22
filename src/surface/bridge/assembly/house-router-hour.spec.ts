import { afterEach, beforeEach, expect, it } from "vitest";
import { socketHouse } from "../../../../tests/support/socket-house.ts";
import { shopShown } from "../../../../tests/support/shop.ts";
import { keysOf } from "../../../doors/terminal/input.ts";
import { localPorts } from "../../../runtime/house-runtime.ts";
import type { Screen } from "../../contract/contract.ts";
import { houseRouter } from "./house-router.ts";

const zone = process.env.TZ;
// The process runs far from the program's country: a web server's container, not the person's own machine.
beforeEach(() => void (process.env.TZ = "Asia/Tokyo"));
afterEach(() => {
  if (zone === undefined) delete process.env.TZ;
  else process.env.TZ = zone;
});
const programHour = (at: number): string =>
  new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(at);
const texts = (screen: Screen): string =>
  screen.body.kind === "thread" ? screen.body.events.flatMap(event => event.text.map(span => span.text)).join("") : "";

/** A sale walked to its end: the clock it shows, and the time its result says it ended. */
async function sold(hour?: (at: number) => string) {
  const house = await socketHouse("stream");
  const ports = localPorts(house.house(), "ana", { recentLines: 40 });
  const router = houseRouter(ports, hour ? { ...shopShown, hour } : shopShown);
  try {
    const before = router.screen({ rows: 26 }).clock;
    for (const key of ["v", "r", "1", "\r", "1500", "\r"]) for (const intent of keysOf(key)) router.send(intent);
    await router.idle();
    return { now: ports.now(), before, after: router.screen({ rows: 26 }) };
  } finally {
    router.stop();
    await house.close();
  }
}

it("shows the program's hour in the Barra and in a finished act when the program gives it", async () => {
  const { now, before, after } = await sold(programHour);
  expect(programHour(now)).not.toBe(new Date(now).toTimeString().slice(0, 5));
  expect(before).toBe(programHour(now));
  expect(after.clock).toBe(programHour(now));
  expect(texts(after)).toContain(` · ${programHour(now)}`);
});

it("keeps the process's hour, as today, when the program gives none", async () => {
  const { now, before, after } = await sold();
  const process = new Date(now).toTimeString().slice(0, 5);
  expect(before).toBe(process);
  expect(after.clock).toBe(process);
  expect(texts(after)).toContain(` · ${process}`);
});
