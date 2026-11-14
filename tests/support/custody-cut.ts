import { processKeys } from "./custody-provider.ts";
// Child process uses only synthetic material and a fixed in-memory test key; never a real provider.
import type { SecretRef } from "../../src/adapters/secrets/custody/custody-contract.ts";
import { mock } from "node:test";
import { SecretCustody } from "../../src/adapters/secrets/custody/secret-custody.ts";
import { CustodyDatabase } from "../../src/adapters/secrets/custody/custody-database.ts";
const [file, home, point] = process.argv.slice(2);
if (!file || !home) throw new Error("fixture");
const stop = () => process.kill(process.pid, "SIGKILL");
if (point === "retire") {
  const wrapped = mock.method(CustodyDatabase.prototype, "retireLegacy", function (this: CustodyDatabase) {
    wrapped.mock.restore();
    this.retireLegacy();
    stop();
  });
}
if (point === "purge") {
  const wrapped = mock.method(CustodyDatabase.prototype, "remove", function (this: CustodyDatabase, ref: SecretRef) {
    wrapped.mock.restore();
    this.remove(ref);
    stop();
  });
}
if (point === "copy") {
  const wrapped = mock.method(
    CustodyDatabase.prototype,
    "put",
    function (this: CustodyDatabase, ref: SecretRef, payload: string) {
      wrapped.mock.restore();
      this.put(ref, payload);
      stop();
    },
  );
}
if (point === "before-retire") mock.method(CustodyDatabase.prototype, "retireLegacy", stop);
if (point === "compact")
  mock.method(CustodyDatabase.prototype, "compactLegacy", function (this: CustodyDatabase) {
    this.db.exec("vacuum;");
    stop();
  });
const store = new SecretCustody(file, home, processKeys(home));
if (point === "purge" || point === "released")
  store.begin({ actor: "ana", tool: "vault", target: "organization:test" }).release("signing", 1);
stop();
