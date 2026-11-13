import { effect } from "../../journal/events.ts";
// Sondas adversarias P1–P11 con datos inventados, convertidas en afirmaciones ejecutables.
import { expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fixture, secret, field, type P, has, ref } from "../../../tests/support/secret-rig.ts";
import { ownAct } from "../../tools/act-definition.ts";
import { localPorts } from "../../programs/house-runtime.ts";

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
    P10: { text: "MARCADOR-DIRECTO-0010" },
  };
  expect(observed).toMatchObject(expected[label] ?? {});
  if (label === "P4a") expect(observed.copy).not.toBe("banana");
  if (label === "P4b") expect(String(observed.reason)).toContain("secret:");
  if (label === "P4c") expect(has(observed.input, "ana")).toBe(false);
  if (label === "P7") expect(String(observed.text)).not.toContain("MARCADORMIXTO13");
};
it("P1 cerrado: secreto pasado por una acción anidada a una acción pública", async () => {
  for (const value of ["MARCADOR-LARGO-0001", "ab"]) {
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

it("P2 cerrado: secreto como nombre de propiedad en lo que la acción escribe", () => {
  const value = "MARCADOR-CLAVE-0002";
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

it("P3 cerrado: defecto de la superficie con el secreto (camino localPorts.defect)", () => {
  const value = "MARCADOR-SUPERFICIE-0003";
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

it("P7 cerrado: transformaciones y partidos de referencias", () => {
  const value = "MarcadorMixto13";
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

it("P10: un texto público enviado directamente al bus se conserva sin limpieza literal", () => {
  const rig = fixture();
  rig.set({ value: "MARCADOR-DIRECTO-0010" });
  const ev = rig.house.bus.emit(
    effect("tool-entry", { tool: "vault", target: "vault", author: "ana", text: "MARCADOR-DIRECTO-0010" }, "ana"),
  );
  report("P10", { text: ev.data.text });
});
