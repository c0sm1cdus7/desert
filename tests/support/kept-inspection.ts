import { afterEach } from "vitest";
import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { object } from "../../src/catalogs/acts.ts";
import { programAct, type ProgramAct } from "../../src/tools/promises.ts";
import { adapterHouse } from "./adapter-house.ts";
import { imported, call } from "./declared-adapters.ts";
import { isProgram } from "../../src/tools/execution/program-causes.ts";
import type { Tool } from "../../src/tools/tool-contract.ts";
import type { Declared } from "../../src/tools/promises-contract.ts";
import { shopShown, type Shop } from "./shop.ts";
const folders: string[] = [];
afterEach(() => folders.splice(0).forEach(folder => rmSync(folder, { recursive: true, force: true })));
export const input = object({});
export const offer = {
  undoable: true,
  on: "tool",
  input,
  cases: [{ promise: "resultado sintético", input: {}, then: { says: "Consultado", facts: [] } }],
  outside: ["sin firma"],
} as const;
export const firmar = programAct<Shop, typeof input, typeof offer.outside>({
  ...offer,
  name: "firmar",
  enter: "firmar",
  key: "f",
  purpose: "la firma sintética",
  run: async (_, ctx) => ({
    status: "accepted",
    text: "Firmada",
    effects: [ctx.credentials.replace("signing", await imported(ctx), ctx.credentials.revision("signing"))],
  }),
});
export const usar = programAct<Shop, typeof input, typeof offer.outside>({
  ...offer,
  name: "usar",
  enter: "usar",
  key: "u",
  purpose: "la firma sintética",
  run: async (_, ctx) => {
    const current = ctx.credentials.current("signing");
    if (!current) return { status: "rejected", reason: "sin firma" };
    await call(ctx, "inspect", current.refs);
    return { status: "accepted", text: "Usada" };
  },
});
export const inspectionShown = {
  ...shopShown,
  words: {
    ...shopShown.words,
    vault: {
      name: "Firma",
      key: "x",
      empty: "Sin firma.",
      listed: "Firmas",
      reads: {},
      presents: [{ title: "Firma", empty: "Sin firma.", reads: {} }],
    },
  },
};
export function keptFixture(acts: Readonly<Record<string, ProgramAct<Shop>>> = { firmar, usar }) {
  const rig = adapterHouse(acts, { view: () => "{}" });
  const folder = mkdtempSync(join(tmpdir(), "kept-inspection-spec-"));
  folders.push(folder);
  const file = join(folder, "kept.sqlite");
  const { secretKeys: _keys, ...options } = rig.options;
  const program = { ...options, registry: declaredRegistry(options.registry) };
  return {
    rig,
    folder,
    file,
    program,
    save: () => {
      rig.close();
      copyFileSync(join(rig.path, "journal.sqlite"), file);
    },
  };
}

export function declaredRegistry(registry: readonly Tool<Shop>[]) {
  return registry.map(tool => ({
    ...tool,
    acts: Object.fromEntries(
      Object.entries(tool.acts).map(([name, act]) => {
        if (!isProgram(act)) throw new Error(`Acción sin declarar: ${tool.id}/${name}`);
        return [name, act];
      }),
    ),
  }));
}
export function inspectionAct(
  name: string,
  key: string,
  run: Declared<Shop, typeof input, typeof offer.outside>["run"],
) {
  return programAct<Shop, typeof input, typeof offer.outside>({
    ...offer,
    name,
    enter: name,
    key,
    purpose: "la comprobación sintética",
    run,
  });
}
