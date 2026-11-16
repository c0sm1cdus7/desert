// Sondas adversarias P1–P11 con datos inventados, convertidas en afirmaciones ejecutables.
import { expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fixture, secret, field, inputOf, ref } from "../../tests/support/secret-rig.ts";
import { localPorts } from "./house-runtime.ts";

const utf = (v: unknown, s: string) =>
  JSON.stringify(v ?? null).includes(s) || JSON.stringify(v ?? null).includes(JSON.stringify(s).slice(1, -1));
const disk = (path: string, s: string) =>
  readdirSync(path)
    .filter(f => f.startsWith("journal"))
    .some(f => readFileSync(join(path, f)).includes(Buffer.from(s)));
const report = (label: string, observed: Record<string, unknown>) => {
  if (label === "P6") {
    expect(observed).toMatchObject({ bob: "rejected", anaOther: "accepted", unattended: "rejected" });
    const first: readonly unknown[] = Array.isArray(observed.a) ? observed.a : [];
    const second: readonly unknown[] = Array.isArray(observed.u) ? observed.u : [];
    const inputs = [...first, ...second];
    expect(inputs.length).toBe(3);
    expect(inputs.every(input => ref(field(input, "value")))).toBe(true);
    expect(inputs.some(input => field(input, "extra") === "QR")).toBe(true);
  }
  if (label === "P8") {
    expect(observed.status).toBe("accepted");
    expect(ref(observed.kept)).toBe(true);
    if (observed.value) expect(observed.disk).toBe(observed.value === "value" || observed.value === "text");
    if (observed.value) expect(String(observed.text)).toMatch(/^eco secret:[0-9a-f-]{36} fin$/u);
    else expect(String(observed.text)).toMatch(/^eco secret:[0-9a-f-]{36} fin$/u);
  }
  if (label === "P9") expect(observed).toMatchObject({ b: "accepted", facts: true });
};
it("P6 quien no tiene la herramienta o no la atiende manda un secreto", () => {
  const value = "QZ";
  const rig = fixture();
  const bob = localPorts(rig.house, "bob", { recentLines: 20 }).act(
    { act: "set", target: "vault", input: { value } },
    0,
  );
  const anaOther = rig.ports().act({ act: "set", target: "vault", input: { value: "QR", extra: "QR" } }, 0);
  const unattended = fixture();
  unattended.ports().act({ act: "unattend", input: { target: "vault" } }, 0);
  const u = unattended.set({ value: "QS" });
  rig.restart();
  unattended.restart();
  const acts = (r: typeof rig) =>
    r.facts().flatMap(e => (e.kind === "act" && e.data.option === "set" ? [e.data.input] : []));
  report("P6", { bob: bob.status, a: acts(rig), anaOther: anaOther.status, unattended: u.status, u: acts(unattended) });
});

it("P8 rarezas: ref-like, enorme, vacío, nombre de campo, json", () => {
  for (const value of [
    "secret:00000000-0000-0000-0000-000000000000",
    "Z".repeat(200_000),
    "",
    "value",
    "text",
    '"},"x":"',
    "\u0000‮",
  ]) {
    const rig = fixture(secret, input => ({
      status: "accepted",
      text: `eco ${String(field(input, "value"))} fin`,
      detail: { value: field(input, "value") },
    }));
    const done = rig.set({ value });
    const kept = field(inputOf(rig), "value");
    const entry = rig
      .facts()
      .filter(e => e.kind === "tool-entry")
      .at(-1);
    rig.restart();
    report("P8", {
      value: value.length > 50 ? `Z*${value.length}` : value,
      status: done.status,
      kept: typeof kept === "string" ? kept.slice(0, 50) : kept,
      text: String(entry ? field(entry.data, "text") : "").slice(0, 120),
      disk: value ? disk(rig.path, value) : null,
    });
  }
});

it("P9 dos acciones a la vez con el mismo bus: reacciones de otra herramienta", async () => {
  const value = "MARCADOR-PARALELO-0009";
  const rig = fixture(secret, async input => {
    await new Promise(r => setTimeout(r, 5));
    return { status: "accepted", text: String(field(input, "value")) };
  });
  const a = rig.set({ value });
  rig.ports().act({ act: "attend", input: { target: "other" } }, 0);
  const b = rig.set({ value }, "other");
  if (a.status === "processing") await a.completion;
  rig.restart();
  report("P9", {
    b: b.status,
    facts: utf(
      rig.facts().filter(e => e.kind === "act" && e.data.object === "other"),
      value,
    ),
  });
});
