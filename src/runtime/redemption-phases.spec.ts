// Recovery messages reflect durable evidence, including another code passed to the real CLI for either destination.
import { expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { readFileSync, readdirSync, writeFileSync, rmSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { doorHouse, invitationCode } from "../../tests/support/redemption-home.ts";
import { reserveDestination } from "./redemption-destination.ts";
import { redeemToFile, redemptionUrl } from "./redeem-door.ts";
import { isRecord } from "../fields/json-values.ts";
import { doorTexts } from "../texts/doors.texts.ts";
for (const mode of ["file", "claude"])
  it.each(["reserved", "uncertain", "confirmed"] as const)(`recovers ${mode} with honest %s evidence`, async phase => {
    const h = doorHouse();
    const file = join(h.home, "destination"),
      target = { file, ...(mode === "claude" ? { name: "test" } : {}) };
    const code = invitationCode(await h.act("invite", { door: "agent" }, "identities/beto"));
    const other = invitationCode(await h.act("invite", { door: "agent" }, "identities/beto"));
    const address = "http://localhost";
    let calls = 0,
      key = "";
    const send = vi.fn((_url: unknown, init: RequestInit) => {
      calls++;
      if (typeof init.body !== "string") throw new Error("Missing test body");
      const value: unknown = JSON.parse(init.body);
      if (!isRecord(value) || typeof value.code !== "string" || typeof value.key !== "string")
        throw new Error("Invalid test request");
      key = value.key;
      const result = h.access().redeem(value.code, key);
      if (calls === 1 && phase === "uncertain") throw new Error("Response lost after issuance");
      if (calls === 1 && phase === "confirmed")
        writeFileSync(file, mode === "file" ? "editor" : JSON.stringify({ mcpServers: { test: {} } }), { mode: 0o600 });
      return Promise.resolve(new Response(JSON.stringify(result), { status: result.status }));
    });
    vi.stubGlobal("fetch", send);
    try {
      if (phase === "reserved") {
        const attempt = createHash("sha256")
          .update(JSON.stringify([redemptionUrl(address).href, code, target.name]))
          .digest("hex");
        const reserved = reserveDestination(target, attempt);
        key = reserved.prepare();
        reserved.close();
        expect(h.access().get(key)).toBeUndefined();
      } else
        await expect(redeemToFile(address, code, target)).rejects.toThrow(
          phase === "confirmed" ? /Emisión confirmada/ : /Resultado incierto/,
        );
      const recovery = readdirSync(h.home).find(name => name.startsWith(".desert-redemption-"));
      if (!recovery) throw new Error("Missing recovery file");
      const path = join(h.home, recovery);
      expect(readFileSync(path, "utf8").trim() === key).toBe(true);
      expect(statSync(path).mode & 0o777).toBe(0o600);
      const args = [
        "--import",
        resolve("tests/support/redemption-fetch.mjs"),
        resolve("src/runtime/redeem-door-cli.ts"),
        address,
        `--${mode}`,
        file,
        ...(mode === "claude" ? ["--name", "test"] : []),
      ];
      const conflict = spawnSync(process.execPath, args, {
        input: `${other}\n`,
        encoding: "utf8",
        timeout: 20000,
        env: { ...process.env, REDEMPTION_TEST_RELEASE: "1" },
      });
      const output = conflict.stdout + conflict.stderr;
      expect(conflict.status).toBe(1);
      const guidance = { reserved: doorTexts.pending, uncertain: doorTexts.uncertain, confirmed: doorTexts.confirmed };
      expect(output).toContain(guidance[phase](path));
      expect(output).toContain(doorTexts.resume);
      expect(output.includes(key)).toBe(false);
      expect(output).not.toContain("Canje completo");
      expect(h.access().get(key)?.identity).toBe(phase === "reserved" ? undefined : "beto");
      expect(readFileSync(path, "utf8").trim() === key).toBe(true);
      if (phase === "confirmed") rmSync(file);
      await redeemToFile(address, code, target);
      expect(readFileSync(file, "utf8").includes(key)).toBe(true);
      expect(h.access().get(key)?.identity).toBe("beto");
      expect(
        [...h.house().tools.state().house.doors.keys.values()].filter(each => each.identity === "beto"),
      ).toHaveLength(1);
      expect(h.history()).toContain(doorTexts.redeemed);
      expect([...h.house().tools.state().house.doors.invitations.values()][0]?.redeemed).toBe(true);
    } finally {
      vi.unstubAllGlobals();
      h.close();
    }
  });
