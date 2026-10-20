import { constants, closeSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { openLocalController } from "../local.ts";
import { requirePrivatePath } from "./postgres-host.ts";

type Controller = Awaited<ReturnType<typeof openLocalController>>;
type Credential = { id: string; token: string };

function privateFileExists(path: string) {
  try { requirePrivatePath(path, false); return true; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

export function writePrivateJson(path: string, value: unknown, exclusive = false) {
  privateFileExists(path);
  const file = openSync(path, constants.O_WRONLY | constants.O_CREAT | constants.O_NOFOLLOW |
    (exclusive ? constants.O_EXCL : constants.O_TRUNC), 0o600);
  try { writeFileSync(file, JSON.stringify(value) + "\n"); }
  finally { closeSync(file); }
}

export async function developerIdentity(controller: Controller, directory: string, initialize: boolean): Promise<Credential> {
  const path = join(directory, "identity.json");
  if (!privateFileExists(path)) {
    if (!initialize) throw new Error("LOCAL_CREDENTIAL_MISSING");
    const identity = await controller.identities.issue("Local developer");
    writePrivateJson(path, identity, true);
    return identity;
  }
  let identity: unknown;
  try { identity = JSON.parse(readFileSync(path, "utf8")); }
  catch { throw new Error("INVALID_LOCAL_CREDENTIAL"); }
  if (!identity || typeof identity !== "object" || Array.isArray(identity) ||
    Object.keys(identity).sort().join() !== "id,token" ||
    !("id" in identity) || typeof identity.id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identity.id) ||
    !("token" in identity) || typeof identity.token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(identity.token)) {
    throw new Error("INVALID_LOCAL_CREDENTIAL");
  }
  // Valid shape is not authority. Session operations recheck the retained token;
  // expiry or revocation must never create another identity and orphan its notes.
  return { id: identity.id, token: identity.token };
}
