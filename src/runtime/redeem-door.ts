// Redeem on the person's machine only after reserving private storage for the returned credential.
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
  const destination = reserveDestination(target);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, proof: solveInvitationProof(code) }),
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok)
      throw new RedemptionFailure([400, 429].includes(response.status) ? doorTexts.denied : doorTexts.failed);
    const value: unknown = await response.json();
    if (!isRecord(value) || typeof value.key !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(value.key))
      throw new RedemptionFailure(doorTexts.failed);
    destination.save(url, value.key);
  } catch (error) {
    throw error instanceof RedemptionFailure ? error : new RedemptionFailure(doorTexts.failed);
  } finally {
    destination.close();
  }
}
