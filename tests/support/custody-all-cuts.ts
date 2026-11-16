import { mock } from "node:test";
import { writeFileSync } from "node:fs";
import { SecretCustody } from "../../src/keychain/custody/secret-custody.ts";
import { CustodyDatabase } from "../../src/keychain/custody/custody-database.ts";
import { processKeys } from "./custody-provider.ts";
const [file, home, ordinal, phase, output] = process.argv.slice(2);
if (!file || !home) throw new Error("fixture");
let position = 0;
const calls: string[] = [];
function cut<T>(name: string, work: () => T): T {
  const current = ++position;
  calls.push(name);
  if (current === Number(ordinal) && phase === "before") process.kill(process.pid, "SIGKILL");
  const result = work();
  if (current === Number(ordinal) && phase === "after") process.kill(process.pid, "SIGKILL");
  return result;
}
const provider = processKeys(home);
const key = provider.key.bind(provider),
  anchor = provider.anchor.bind(provider),
  forget = provider.forget.bind(provider);
provider.key = (id, create) => (create ? cut("key", () => key(id, create)) : key(id, create));
provider.anchor = (id, head) => cut("anchor", () => anchor(id, head));
provider.forget = id => cut("forget", () => forget(id));
const prototype = CustodyDatabase.prototype;
const identity = mock.method(prototype, "identity"),
  save = mock.method(prototype, "saveKeyCheck"),
  intent = mock.method(prototype, "intent"),
  put = mock.method(prototype, "put");
const append = mock.method(prototype, "appendBatch"),
  remove = mock.method(prototype, "remove"),
  retire = mock.method(prototype, "retireLegacy");
const compact = mock.method(prototype, "compactLegacy"),
  hold = mock.method(prototype, "hold"),
  unhold = mock.method(prototype, "unhold"),
  unretain = mock.method(prototype, "unretain");
mock.method(prototype, "identity", function (this: CustodyDatabase) {
  return cut("identity", () => identity.call(this));
});
mock.method(prototype, "saveKeyCheck", function (this: CustodyDatabase, value: string) {
  return cut("saveKeyCheck", () => save.call(this, value));
});
mock.method(prototype, "intent", function (this: CustodyDatabase, ...args: Parameters<typeof intent>) {
  return cut("intent", () => intent.call(this, ...args));
});
mock.method(prototype, "put", function (this: CustodyDatabase, ...args: Parameters<typeof put>) {
  return cut("put", () => put.call(this, ...args));
});
mock.method(prototype, "appendBatch", function (this: CustodyDatabase, ...args: Parameters<typeof append>) {
  return cut("appendBatch", () => append.call(this, ...args));
});
mock.method(prototype, "remove", function (this: CustodyDatabase, ...args: Parameters<typeof remove>) {
  return cut("remove", () => remove.call(this, ...args));
});
mock.method(prototype, "retireLegacy", function (this: CustodyDatabase) {
  return cut("retire", () => retire.call(this));
});
mock.method(prototype, "compactLegacy", function (this: CustodyDatabase) {
  return cut("compact", () => compact.call(this));
});
mock.method(prototype, "hold", function (this: CustodyDatabase, ...args: Parameters<typeof hold>) {
  return cut("hold", () => hold.call(this, ...args));
});
mock.method(prototype, "unhold", function (this: CustodyDatabase, ...args: Parameters<typeof unhold>) {
  return cut("unhold", () => unhold.call(this, ...args));
});
mock.method(prototype, "unretain", function (this: CustodyDatabase, ...args: Parameters<typeof unretain>) {
  return cut("unretain", () => unretain.call(this, ...args));
});
const store = new SecretCustody(file, home, provider);
const scope = { actor: "ana", tool: "vault", target: "organization:test" },
  session = store.begin(scope);
const first = { key: session.capture(Buffer.from("PRIMER_SINTETICO")) };
session.replace("signing", first, 0);
store.retain(first.key, "history");
const next = { key: session.capture(Buffer.from("SEGUNDO_SINTETICO")) };
session.replace("signing", next, 1);
store.releaseRetention(first.key, "history");
session.capture(Buffer.from("PROVISIONAL_SINTETICO"));
session.cancel();
store.begin(scope).release("signing", 2);
store.close();
if (output) writeFileSync(output, JSON.stringify(calls));
