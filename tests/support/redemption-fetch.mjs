// A disposable CLI transport pauses before returning the candidate; no network or host configuration is used.
import { writeFileSync } from "node:fs";
globalThis.fetch = async (_url, options) => {
  const { key } = JSON.parse(options.body);
  if (process.env.REDEMPTION_TEST_MARKER) writeFileSync(process.env.REDEMPTION_TEST_MARKER, String(process.pid));
  if (!process.env.REDEMPTION_TEST_RELEASE) await new Promise(() => setInterval(() => {}, 1000));
  return new Response(JSON.stringify({ key }));
};
