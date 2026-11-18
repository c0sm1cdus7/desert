// The real launcher and drain, with fixture credentials and a house-side act held until shutdown's deadline.
import { writeFileSync } from "node:fs";
import { storageNotices } from "../../src/storage/storage-notices.ts";
import { lostDiagnostic } from "../../src/tools/failures/base-failure.ts";
import { socketHouse } from "./socket-house.ts";
const home = process.argv[2];
if (!home) throw new Error("Missing fixture home");
const f = await socketHouse("stream", new Promise<void>(() => {}));
const keep = setInterval(() => {}, 1000);
f.house().tools.act({ act: "attend", input: { target: "payments" } }, 0, "ana");
f.house().tools.act({ act: "receive", target: "payments", input: { payment: "pending", amount: 10 } }, 0, "ana");
storageNotices(home).warn({ name: "fixture", reason: "fixture rebuild notice" });
lostDiagnostic("fixture scrubbed diagnostic", "fixture storage failure");
writeFileSync(`${home}/fixture.pid`, String(process.pid));
process.on("SIGTERM", () => {
  void f.close().finally(() => clearInterval(keep));
});
process.send?.({ ready: true });
process.disconnect();
