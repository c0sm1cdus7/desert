import { writeHeapSnapshot } from "node:v8";
import { join } from "node:path";
import { SecretCustody } from "../../src/keychain/custody/secret-custody.ts";
import { processKeys } from "./custody-provider.ts";
const [file, home, mode] = process.argv.slice(2);
if (!file || !home) throw new Error("fixture");
const store = new SecretCustody(file, home, processKeys(home));
if (mode === "probe") {
  store.close();
  process.exit(0);
}
const session = store.begin({ actor: "ana", tool: "vault", target: "organization:test" });
const current = session.current("signing");
if (current) await store.adapter(session, ["signing"]).use(current.refs, material => material.key?.byteLength);
writeHeapSnapshot(join(home, "synthetic.heapsnapshot"));
store.close();
