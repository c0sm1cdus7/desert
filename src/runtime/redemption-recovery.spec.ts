// Process death releases the destination lock while its durable candidate survives and cannot be overwritten.
import { expect, it, vi } from "vitest";
import { fork } from "node:child_process";
import { join, resolve } from "node:path";
import { mkdtempSync, readFileSync, readdirSync, rmSync, mkdirSync, chmodSync } from "node:fs";
import { reserveDestination } from "./redemption-destination.ts";
import { redeemToFile } from "./redeem-door.ts";
import { doorHouse, invitationCode } from "../../tests/support/door-house.ts";
import { httpDoorFetch } from "../../tests/support/http-door-fetch.ts";
it.each(["SIGINT", "SIGTERM", "SIGKILL"] as const)(
  "recovers after %s without stealing a live reservation",
  async signal => {
    const home = mkdtempSync("/tmp/desert-recovery-"),
      file = join(home, "credential");
    const child = fork(resolve("tests/support/reservation-child.ts"), [file], {
      stdio: ["ignore", "ignore", "ignore", "ipc"],
      execArgv: [],
    });
    const exited = new Promise<void>(done => child.once("exit", () => done()));
    try {
      await new Promise<void>((done, reject) => {
        child.once("message", () => done());
        child.once("error", reject);
      });
      expect(() => reserveDestination({ file }, "same-attempt")).toThrow();
      const recovery = readdirSync(home).find(name => name.startsWith(".desert-redemption-"));
      if (!recovery) throw new Error("Missing recovery");
      const candidate = readFileSync(join(home, recovery), "utf8").trim();
      child.kill(signal);
      await exited;
      const resumed = reserveDestination({ file }, "same-attempt");
      try {
        expect(resumed.prepare() === candidate).toBe(true);
        expect(() => reserveDestination({ file }, "same-attempt")).toThrow();
        resumed.save(new URL("http://localhost"), candidate);
      } finally {
        resumed.close();
      }
      expect(readFileSync(file, "utf8").trim() === candidate).toBe(true);
    } finally {
      child.kill("SIGKILL");
      await exited;
      rmSync(home, { recursive: true, force: true });
    }
  },
);
it("recovers a response lost after issuance by presenting the already saved candidate", async () => {
  const h = doorHouse();
  let door = h.door(),
    transport = httpDoorFetch(door.handle);
  const file = join(h.home, "credential");
  const code = invitationCode(await h.act("invite", { door: "agent" }, "identities/beto"));
  let lost = false;
  vi.stubGlobal("fetch", async (...args: Parameters<typeof fetch>) => {
    const response = await transport.send(...args);
    if (response.status === 200 && !lost) {
      lost = true;
      throw new Error("lost-response");
    }
    return response;
  });
  try {
    await expect(redeemToFile("http://localhost", code, { file })).rejects.toThrow();
    expect([...h.house().tools.state().house.doors.keys.values()].filter(key => key.identity === "beto")).toHaveLength(
      1,
    );
    transport.disconnect();
    await door.close();
    h.reopen();
    door = h.door();
    transport = httpDoorFetch(door.handle);
    await redeemToFile("http://localhost", code, { file });
    const candidate = readFileSync(file, "utf8").trim();
    expect(h.access().get(candidate)?.identity).toBe("beto");
    expect([...h.house().tools.state().house.doors.keys.values()].filter(key => key.identity === "beto")).toHaveLength(
      1,
    );
  } finally {
    vi.unstubAllGlobals();
    transport.disconnect();
    await door.close();
    h.close();
  }
});
it("admits exactly one of two simultaneous recovery processes", async () => {
  const home = mkdtempSync("/tmp/desert-recovery-race-"),
    file = join(home, "credential");
  const abandoned = reserveDestination({ file }, "same-attempt");
  const candidate = abandoned.prepare();
  abandoned.close();
  const children = [0, 1].map(() =>
    fork(resolve("tests/support/reservation-child.ts"), [file], {
      stdio: ["ignore", "ignore", "ignore", "ipc"],
      execArgv: [],
    }),
  );
  const exits = children.map(child => new Promise<void>(done => child.once("exit", () => done())));
  try {
    const results = await Promise.all(
      children.map(
        child =>
          new Promise<boolean>(done =>
            child.once("message", (value: unknown) =>
              done(typeof value === "object" && value !== null && "ready" in value && value.ready === true),
            ),
          ),
      ),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
    children[results.indexOf(true)]?.send("publish");
    await Promise.all(exits);
    expect(readFileSync(file, "utf8").trim() === candidate).toBe(true);
  } finally {
    children.forEach(child => child.kill("SIGKILL"));
    await Promise.all(exits);
    rmSync(home, { recursive: true, force: true });
  }
});

it("finishes the same exchange after directory permissions are restored", async () => {
  const h = doorHouse(),
    door = h.door(),
    transport = httpDoorFetch(door.handle);
  const directory = join(h.home, "destination");
  mkdirSync(directory);
  const file = join(directory, "credential");
  const code = invitationCode(await h.act("invite", { door: "agent" }, "identities/beto"));
  let restricted = false;
  vi.stubGlobal("fetch", async (...args: Parameters<typeof fetch>) => {
    const response = await transport.send(...args);
    if (response.status === 200 && !restricted) {
      restricted = true;
      chmodSync(directory, 0o500);
    }
    return response;
  });
  try {
    await expect(redeemToFile("http://localhost", code, { file })).rejects.toThrow(/archivo privado/);
    chmodSync(directory, 0o700);
    await redeemToFile("http://localhost", code, { file });
    expect(h.access().get(readFileSync(file, "utf8").trim())?.identity).toBe("beto");
    expect([...h.house().tools.state().house.doors.keys.values()].filter(key => key.identity === "beto")).toHaveLength(
      1,
    );
  } finally {
    chmodSync(directory, 0o700);
    vi.unstubAllGlobals();
    transport.disconnect();
    await door.close();
    h.close();
  }
});
