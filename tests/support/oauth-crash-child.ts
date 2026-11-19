// Real SQLite and MCP handlers; IPC carries only disposable test credentials, never stdout or saved files.
import { oauthHouse, responseField } from "./oauth-house.ts";
import { mcpDoor } from "../../src/doors/mcp/mcp-handler.ts";
import { isRecord } from "../../src/fields/json-values.ts";
const [home, phase, cut] = process.argv.slice(2);
if (!home) throw new Error("Missing disposable house");
const f = await oauthHouse(false, home, Buffer.alloc(32, 7));
let material = "";
let token = "";
let invitation = "";
let founderMaterial = f.h.founder;

// Block synchronously even inside a SQLite transaction until the parent sends SIGKILL.
function stop(report: Record<string, unknown>): never {
  process.send?.({ ...report, pid: process.pid, material, token, invitation, founderMaterial });
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0);
  throw new Error("Crash barrier unexpectedly resumed");
}
function snapshot() {
  const doors = f.h.house().tools.state().house.doors;
  return {
    keys: [...doors.keys.values()].filter(key => key.identity === "beto").length,
    codes: doors.codes.size,
    delivered: [...doors.codes.values()].some(code => code.delivered),
    marked: [...doors.keys.values()].some(key => key.identity === "beto" && key.oauth),
    redeemed: [...doors.invitations.values()].some(invite => invite.redeemed),
  };
}
function installCuts() {
  const access = f.h.access();
  const attempt = access.attempt;
  access.attempt = async (...args) => {
    material = args[3] ?? "";
    invitation = args[0];
    const result = await attempt(...args);
    if (cut === "key-without-code" && result.key) {
      const authenticated = (await f.read(material)).status;
      stop({ cut, authenticated, state: snapshot() });
    }
    return result;
  };
  f.h.house().bus.on(event => {
    if (
      (cut === "writing-key" && event.kind === "door-key-issued") ||
      (cut === "writing-code" && event.kind === "door-oauth-issued") ||
      (cut === "writing-delivery" && event.kind === "door-oauth-delivered")
    )
      stop({ cut, state: snapshot() });
  });
  const bus = f.h.house().bus;
  const together = bus.together.bind(bus);
  bus.together = write => {
    const result = together(write);
    if (cut === "delivery-before-response" && snapshot().delivered) stop({ cut, state: snapshot() });
    return result;
  };
}
async function produce() {
  installCuts();
  // Compose after installing the barrier: host access copies the invitation method.
  f.door = mcpDoor(f.h.house(), f.options);
  const grant = await f.grant();
  token = grant.token.toString();
  if (cut !== "pending") {
    const response = await f.form("/token", grant.token);
    if (response.status !== 200 || responseField(response.body, "access_token") !== material)
      throw new Error("Synthetic token was not delivered");
  }
  stop({ cut, authenticated: (await f.read(material)).status, state: snapshot() });
}
async function recover(message: unknown) {
  if (
    !isRecord(message) ||
    typeof message.material !== "string" ||
    typeof message.token !== "string" ||
    typeof message.invitation !== "string" ||
    typeof message.founderMaterial !== "string"
  )
    throw new Error("Invalid crash test message");
  material = message.material;
  token = message.token;
  invitation = message.invitation;
  founderMaterial = message.founderMaterial;
  const before = (await f.read(material)).status;
  let replay: string | undefined;
  if (phase === "recover" && token)
    replay = responseField((await f.form("/token", new URLSearchParams(token))).body, "error");
  const after = (await f.read(material)).status;
  const history = f.h.history();
  const code = new URLSearchParams(token).get("code") ?? "";
  const clean = [material, invitation, code, founderMaterial]
    .filter(value => value.length > 0)
    .every(value => !history.includes(value));
  stop({ phase, before, after, replay, clean, state: snapshot(), founder: (await f.read(founderMaterial)).status });
}
if (phase === "produce") await produce();
else
  process.once("message", (message: unknown) => {
    void recover(message).catch(() => process.exit(1));
  });
