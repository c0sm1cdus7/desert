// Plan §14 (owner law 2): every error code raised on the human-surface path is either a code a person can see, with its
// `errors.<CODE>` message, or listed once as internal. The feedback a person reads comes from the bundle, wording unchanged.
import assert from "node:assert/strict";
import test from "node:test";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { internalErrorCodes, surfaceErrorCodes } from "../src/messages/error-codes.ts";
import { Messages } from "../src/messages/keys.ts";
import { controllerErrorCode } from "../src/web/errors.ts";
import { failureFeedback } from "../src/web/client/failure-feedback.ts";

const web = new URL("../src/web/", import.meta.url).pathname;
const raised = /new (?:Error|TransportError)\(\s*["'`]([A-Z][A-Z0-9_]+)/g;

async function codesRaisedUnder(folder: string): Promise<Map<string, string>> {
  const codes = new Map<string, string>();
  for (const entry of await readdir(folder, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
    const path = join(entry.parentPath, entry.name), source = await readFile(path, "utf8");
    for (const match of source.matchAll(raised)) codes.set(match[1] ?? "", path);
  }
  return codes;
}

test("every code raised under src/web is a surface code with a message or a listed internal code", async () => {
  const known = new Set<string>([...surfaceErrorCodes, ...internalErrorCodes]);
  const unlisted = [...await codesRaisedUnder(web)].filter(([code]) => !known.has(code)).map(([code, path]) => `${code} (${path})`);
  assert.deepEqual(unlisted, []);
});

test("a code is surface or internal, never both, and every surface code resolves in the renderer's bundle", () => {
  const internal = new Set<string>(internalErrorCodes);
  assert.deepEqual(surfaceErrorCodes.filter(code => internal.has(code)), []);
  const en = Messages.bundle("en");
  for (const code of surfaceErrorCodes) assert.match(en.text({ key: `errors.${code}` }), /\S/);
});

test("the controller passes exactly its listed codes and normalizes the rest", () => {
  assert.equal(controllerErrorCode(new Error("VERSION_CONFLICT")), "VERSION_CONFLICT");
  assert.equal(controllerErrorCode(new Error("COMMIT_UNCERTAIN: lost")), "COMMIT_UNCERTAIN");
  assert.equal(controllerErrorCode(new Error("INVALID_RESPONSE")), "CONTROLLER_UNAVAILABLE");
  assert.equal(controllerErrorCode(new Error("CONNECTION_LOST")), "CONTROLLER_UNAVAILABLE");
});

test("failure feedback reads the bundle with the wording it had before the catalog", () => {
  assert.deepEqual(failureFeedback("VERSION_CONFLICT"), { title: "We couldn’t complete that action",
    description: "The record changed after your review. Go back and review its current version." });
  assert.deepEqual(failureFeedback("SOMETHING_ELSE"), { title: "We couldn’t complete that action",
    description: "The operation could not be completed. Your draft has been kept. Restore the connection and try again." });
  assert.deepEqual(failureFeedback("READ_REFRESH_FAILED"), { title: "We couldn’t refresh the data",
    description: "The latest data could not be loaded. Your unsent changes are preserved." });
  assert.equal(failureFeedback(null).description, "");
  assert.equal(failureFeedback("VERSION_CONFLICT", true).title, "The result isn’t confirmed");
});
