// Adversarial probes P1–P11 with invented data, turned into executable assertions.
import { effect } from "../house/facts.ts";
import { expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fixture, secret, field, type P, has, ref } from "../../tests/support/secret-rig.ts";
import { ownAct } from "../tools/act-definition.ts";
import { localPorts } from "../runtime/house-runtime.ts";

const utf = (v: unknown, s: string) =>
  JSON.stringify(v ?? null).includes(s) || JSON.stringify(v ?? null).includes(JSON.stringify(s).slice(1, -1));
const disk = (path: string, s: string) =>
  readdirSync(path)
    .filter(f => f.startsWith("journal"))
    .some(f => readFileSync(join(path, f)).includes(Buffer.from(s)));
const report = (label: string, observed: Record<string, unknown>) => {
  const expected: Record<string, unknown> = {
    P1: { status: "accepted", facts: false, disk: false },
    P2: { status: "accepted", result: false, facts: false, disk: false },
    P3: { facts: false, disk: false },
    P4a: { status: "accepted" },
    P4b: { status: "rejected", defect: true },
    P5made: { status: "accepted", facts: false, disk: false },
    P5target: { status: "accepted", facts: false, disk: false },
    P7: { status: "accepted" },
    P10: { text: "DIRECT-MARKER-0010" },
  };
  expect(observed).toMatchObject(expected[label] ?? {});
  if (label === "P4a") expect(observed.copy).not.toBe("banana");
  if (label === "P4b") expect(String(observed.reason)).toContain("secret:");
  if (label === "P4c") expect(has(observed.input, "ana")).toBe(false);
  if (label === "P7") expect(String(observed.text)).not.toContain("MIXEDMARKER13");
};
it("P1 closed: a secret passed through a nested action to a public action", async () => {
  for (const value of ["LONG-MARKER-0001", "ab"]) {
    const rig = fixture(
      secret,
      undefined,
      {},
      {
        own: () => [
          ownAct<P, typeof secret>("own", "forward", { input: secret, purpose: "Anida" }, async (input, context) => {
            expect(ref(input.value)).toBe(true);
            const r = await context.execute?.({ act: "set", target: "other", input: { value: input.value } });
            return { status: "accepted", text: `ok ${r?.status}` };
          }),
        ],
      },
    );
    rig.ports().act({ act: "attend", input: { target: "other" } }, 0);
    const started = rig.ports().act({ act: "forward", target: "own", input: { value } }, 0);
    const done = started.status === "processing" ? await started.completion : started;
    rig.restart();
    const serialized = `:${JSON.stringify(value)}`;
    const inputs = rig
      .facts()
      .flatMap(e =>
        e.kind === "act" && ["forward", "set"].includes(e.data.option) ? [field(e.data.input, "value")] : [],
      );
    expect(inputs.length).toBe(2);
    expect(inputs.every(ref)).toBe(true);
    report("P1", {
      value,
      status: done.status,
      facts: JSON.stringify(rig.facts()).includes(serialized),
      disk: disk(rig.path, serialized),
    });
  }
});

it("P2 closed: a secret as a property name in what the action writes", () => {
  const value = "KEY-MARKER-0002";
  const rig = fixture(secret, input => ({
    status: "accepted",
    text: "ok",
    detail: { [String(field(input, "value"))]: true },
  }));
  const done = rig.set({ value });
  rig.restart();
  report("P2", {
    status: done.status,
    result: utf(done, value),
    facts: utf(rig.facts(), value),
    disk: disk(rig.path, value),
  });
});

it("P3 closed: a surface defect carrying the secret (the localPorts.defect path)", () => {
  const value = "SURFACE-MARKER-0003";
  const rig = fixture();
  rig.set({ value });
  const safe = field(rig.facts().find(e => e.kind === "act" && e.data.option === "set")?.data, "input");
  const reference = field(safe, "value");
  const ports = localPorts(rig.house, "ana", { recentLines: 20 });
  const reason = ports.defect(
    new Error(`fallo con ${String(reference)}`, { cause: { act: "set", target: "vault", input: safe } }),
    "vault",
    "vault",
    "set",
  );
  rig.restart();
  report("P3", { reason: utf(reason, value), facts: utf(rig.facts(), value), disk: disk(rig.path, value) });
});

it("P7 closed: transformations and splits of references", () => {
  const value = "MixedMarker13";
  const rig = fixture(secret, input => {
    const v = String(field(input, "value"));
    return {
      status: "accepted",
      text: `${v.toUpperCase()} | ${v.slice(0, 7)} ${v.slice(7)} | ${v.split("").join(" ")}`,
    };
  });
  const done = rig.set({ value });
  report("P7", {
    text: rig
      .facts()
      .filter(e => e.kind === "tool-entry")
      .map(e => field(e.data, "text"))
      .at(-1),
    status: done.status,
  });
});

it("P10: a public text sent straight to the bus is kept without literal cleaning", () => {
  const rig = fixture();
  rig.set({ value: "DIRECT-MARKER-0010" });
  const ev = rig.house.bus.emit(
    effect("tool-entry", { tool: "vault", target: "vault", author: "ana", text: "DIRECT-MARKER-0010" }, "ana"),
  );
  report("P10", { text: ev.data.text });
});
