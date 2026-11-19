// Redeem on the person's machine only after reserving private storage for the returned credential.
import { setTimeout as wait } from "node:timers/promises";
import { createHash } from "node:crypto";
import { solveInvitationProof } from "./invitation-proof.ts";
import { isRecord } from "../fields/json-values.ts";
import { doorTexts } from "../texts/doors.texts.ts";
import { reserveDestination, RedemptionFailure, type RedemptionTarget } from "./redemption-destination.ts";
export type { RedemptionTarget } from "./redemption-destination.ts";
export function redemptionUrl(address: string): URL {
  const url = new URL(address);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && local)) || url.username || url.password)
    throw new RedemptionFailure(doorTexts.secure);
  url.pathname = "/door/invitations/redeem";
  url.search = "";
  url.hash = "";
  return url;
}
export async function redeemToFile(address: string, code: string, target: RedemptionTarget): Promise<void> {
  const url = redemptionUrl(address);
  const attempt = createHash("sha256")
    .update(JSON.stringify([url.href, code, target.name]))
    .digest("hex");
  const destination = reserveDestination(target, attempt);
  try {
    const key = destination.prepare();
    destination.sending();
    const issued = await exchange(url, code, key, () => destination.cancel());
    destination.save(url, issued);
  } catch (error) {
    throw error instanceof RedemptionFailure ? error : new RedemptionFailure(destination.guidance());
  } finally {
    destination.close();
  }
}

async function exchange(url: URL, code: string, key: string, cancel: () => void): Promise<string> {
  let challenge = "",
    proof = solveInvitationProof(code);
  const deadline = Date.now() + 15_000;
  for (;;) {
    if (Date.now() >= deadline) throw new RedemptionFailure(doorTexts.failed);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, proof, challenge, key }),
      redirect: "error",
      signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())),
    });
    if (response.status === 503) {
      await wait(25);
      continue;
    }
    if (!response.ok && response.status !== 428) {
      if ([400, 429].includes(response.status)) cancel();
      throw new RedemptionFailure([400, 429].includes(response.status) ? doorTexts.denied : doorTexts.failed);
    }
    const value: unknown = await response.json();
    if (response.status === 428 && isRecord(value) && typeof value.challenge === "string") {
      challenge = value.challenge;
      proof = solveInvitationProof(code, challenge);
      continue;
    }
    if (!response.ok || !isRecord(value) || typeof value.key !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(value.key))
      throw new RedemptionFailure(doorTexts.failed);
    return value.key;
  }
}
