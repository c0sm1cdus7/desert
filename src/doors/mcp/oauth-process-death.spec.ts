// A killed writer never closes its door or house; both recovery and durable rechecking run in fresh processes.
import { it, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { oauthCrashProcess } from "../../../tests/support/oauth-crash-process.ts";

it.each([
  "writing-key",
  "key-without-code",
  "writing-code",
  "pending",
  "writing-delivery",
  "delivery-before-response",
  "delivered",
])(
  "recovers OAuth after SIGKILL at %s and durably rejects reuse",
  async cut => {
    const home = mkdtempSync(join(tmpdir(), "desert-oauth-death-"));
    try {
      const written = await oauthCrashProcess(home, "produce", cut);
      expect(written.signal).toBe("SIGKILL");
      expect(written.cut).toBe(cut);
      expect(typeof written.material === "string" && written.material.length === 43).toBe(true);
      if (["key-without-code", "pending", "delivered"].includes(cut)) expect(written.authenticated).toBe(200);
      if (cut === "key-without-code")
        expect(written.state).toEqual({ keys: 1, codes: 0, delivered: false, marked: true, redeemed: true });
      const recovered = await oauthCrashProcess(home, "recover", cut, written);
      const delivered = ["delivery-before-response", "delivered"].includes(cut);
      expect(recovered.signal).toBe("SIGKILL");
      expect(recovered.pid).not.toBe(written.pid);
      expect(recovered.before).toBe(delivered ? 200 : 401);
      expect(recovered.after).toBe(401);
      if (["pending", "writing-delivery", "delivery-before-response", "delivered"].includes(cut))
        expect(recovered.replay).toBe("invalid_grant");
      expect(recovered.clean).toBe(true);
      expect(recovered.founder).toBe(200);
      // A rollback during key issuance leaves neither a key nor a consumed invitation.
      expect(recovered.state).toEqual({
        keys: cut === "writing-key" ? 0 : 1,
        codes: ["writing-key", "key-without-code", "writing-code"].includes(cut) ? 0 : 1,
        delivered,
        marked: cut !== "writing-key",
        redeemed: cut !== "writing-key",
      });
      const durable = await oauthCrashProcess(home, "verify", cut, written);
      expect(durable.signal).toBe("SIGKILL");
      expect(durable.pid).not.toBe(recovered.pid);
      expect(durable.before).toBe(401);
      expect(durable.after).toBe(401);
      expect(durable.clean).toBe(true);
      expect(durable.founder).toBe(200);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  },
  60_000,
);
