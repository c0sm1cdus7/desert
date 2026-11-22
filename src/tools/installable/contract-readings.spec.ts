// A consumer reads its provider's objects from the state each callback already receives, trimmed to what it asks.
import { Type } from "@sinclair/typebox";
import { afterAll, afterEach, expect, it } from "vitest";
import { askableDocumentProgram, documentProgram } from "../../../tests/support/contract-programs.ts";
import { distributionRig } from "../../../tests/support/distribution-rig.ts";
import { input, openHouse, rejection } from "../../../tests/support/distribution-contracts.ts";
import { presentation } from "../../../tests/support/installable-program.ts";
import { certifyContracts } from "../../checks/contracts/public-contracts.ts";
import { identityView } from "../../house/members.ts";
import { structuralContractErrors } from "../../runtime/contracts/package-checks.ts";
import { componer } from "../../runtime/distributions/compose.ts";
import { localPorts } from "../../runtime/house-runtime.ts";
import { text, when } from "../../fields/fields.ts";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
import { walked } from "../../surface/bridge/acts/asked-act.ts";
import { houseTools, questionsFor } from "../../surface/bridge/assembly/house-tools.ts";
import { programContracts } from "../../runtime/distributions/program-contracts.ts";
import { startTools } from "../start.ts";
import type { State } from "../tool-contract.ts";
import { programa, programAct, type LocalProgram } from "./program.ts";
const metadata = {
  id: "ventas",
  version: "1.0.0",
  desert: 1,
  codigo: [import.meta.filename],
  hechos: [],
  inicial: () => ({}),
} as const;
type Reader = LocalProgram<typeof metadata>;
const folds: unknown[] = [];
let seen: State<Reader> | undefined;
const reading = (state: State<Reader>) => state.readings?.["documentos-fiscales"]?.comprobante?.("v1");
const estado = (state: State<Reader>) => {
  seen = state;
  const read = reading(state);
  return read?.status === "found" ? JSON.stringify(read.value) : undefined;
};
const words = (name: string, key: string) => ({ name, key, listed: name, empty: "Sin datos", reads: {}, presents: [] });
const request = {
  acciones: { emitir: { entrada: input(), salida: Type.Object({ id: Type.String() }), rechazos: rejection() } },
  objetos: {
    comprobante: { clave: Type.String(), datos: Type.Object({ estado: Type.Literal("emitido") }), lectura: "casa" },
  },
  avisos: {},
  casos: [
    {
      id: "sin-comprobante",
      actor: "beto",
      prepare: {
        version: 2,
        selections: [
          { kind: "tool", program: "documentos", tool: "fiscal" },
          { kind: "tool", program: "ventas", tool: "lector" },
        ],
      },
      steps: [{ kind: "read", name: "comprobante", key: "v1", at: "current", expect: { status: "unavailable" } }],
    },
  ],
} as const;
/** A note asked only once the provider has the receipt: `when` reads the local state with its readings. */
const asks: unknown[] = [];
const noting = Type.Object({
  nota: when(text("Nota", "algo"), (_answered, _at, state: State<Reader>, target: string) => {
    asks.push([Object.keys(state.tools).join(), target]);
    return estado(state) !== undefined;
  }),
});
const group = { purpose: "leer comprobantes", targets: () => [], summary: () => "", palabras: words("Lector", "l") };
const consumer = programa(metadata, {
  ...group,
  palabras: words("Ventas", "v"),
  skill: documentProgram.skill,
  artifact: "reader-commit",
  pide: { "documentos-fiscales": request },
  herramientas: {
    lector: {
      ...group,
      view: state => `${Object.keys(state.tools).join(",")} ${estado(state) ?? "nada"}`,
      acts: {
        mirar: programAct<Reader, ReturnType<typeof Type.Object>>({
          name: "mirar",
          enter: "mirar",
          purpose: "mirar el comprobante",
          key: "m",
          on: "tool",
          undoable: true,
          input: Type.Object({}),
          refuses: ["sin comprobante"],
          offered: state => (estado(state) === undefined ? "sin comprobante" : undefined),
          confirms: (_input, state) => estado(state),
          run: () => ({ status: "accepted" }),
          cases: [{ promise: "Se apaga sin comprobante", input: {}, then: { refused: "sin comprobante" } }],
        }),
        anotar: programAct<Reader, typeof noting>({
          name: "anotar",
          enter: "anotar",
          purpose: "anotar el comprobante",
          key: "a",
          on: "tool",
          undoable: true,
          input: noting,
          run: () => ({ status: "accepted", text: "Anotado · v1" }),
          cases: [{ promise: "Anota sin nota", input: {}, then: { says: "Anotado · v1", facts: [] } }],
        }),
      },
    },
  },
  plegar: (own, _event, before) => {
    folds.push(before.readings);
    return own;
  },
});
const options = {
  programas: [consumer, askableDocumentProgram],
  identidades: true,
  mentes: { asistentes: false, programas: [] },
  presentacion: presentation,
} as const;
const { program, shown } = componer({ ...options, contratos: await certifyContracts(options) });
const house = openHouse(program, ":memory:", [{ kind: "program", program: "ventas" }]);
afterEach(() => {
  seen = undefined;
});
afterAll(() => house.close());
function issue() {
  const engine = startTools({ ...house.ports, history: house.history.events(house.ports.state().through) });
  engine.act({ act: "attend", input: { target: "documentos/fiscal" } }, 0, "ana");
  engine.act({ act: "fiscal/emitir", target: "documentos/fiscal", input: { venta: "v1" } }, 0, "ana");
  engine.stop();
}
const reader = program.registry.find(tool => tool.id === "ventas");
const mirar = reader?.acts["lector/mirar"];
const as = (by: string) => identityView(house.ports.state(), by);
it("reads in offered, confirms and view, trimmed to the request, and never while folding", () => {
  expect(mirar?.offered?.(as("ana"), "ventas/lector", 0)).toBe("sin comprobante");
  expect(reader?.view(as("ana"), "ventas/lector", { recentLines: 20, now: 0 })).toBe("own nada");
  issue();
  expect(mirar?.offered?.(as("ana"), "ventas/lector", 0)).toBeUndefined();
  expect(mirar?.confirms?.({}, as("ana"), "ventas/lector", 0)).toBe('{"estado":"emitido"}');
  expect(reader?.view(as("ana"), "ventas/lector", { recentLines: 20, now: 0 })).toBe('own {"estado":"emitido"}');
  expect(folds.length).toBeGreaterThan(0);
  expect(folds.every(each => each === undefined)).toBe(true);
});
it("keeps the provider's raw state out of reach and refuses a key outside the requested schema", () => {
  mirar?.offered?.(as("ana"), "ventas/lector", 0);
  expect(Object.keys(seen?.tools ?? {})).toEqual(["own"]);
  expect(seen?.readings?.["documentos-fiscales"]?.comprobante?.(42)).toEqual({
    status: "core-failure",
    reason: "invalid-reference",
  });
  expect(seen?.readings?.["documentos-fiscales"]?.comprobante?.("v2")).toEqual({ status: "unavailable" });
});
it("says whether whoever looks holds the provider's requested action in their kit", () => {
  mirar?.offered?.(as("ana"), "ventas/lector", 0);
  expect(seen?.readings?.["documentos-fiscales"]?.can("emitir")).toBe(true);
  expect(seen?.readings?.["documentos-fiscales"]?.can("anular")).toBe(false);
  mirar?.offered?.(as("beto"), "ventas/lector", 0);
  expect(seen?.by).toBe("beto");
  expect(seen?.readings?.["documentos-fiscales"]?.can("emitir")).toBe(false);
});
it("keeps `can` from naming an object, since a consumer reads each object by its name beside it", () => {
  const [half] = programContracts([consumer]);
  if (!half) throw new Error("missing half");
  const objetos = { can: request.objetos.comprobante };
  const shadowed = { ...half, pide: { "documentos-fiscales": { ...request, objetos } } };
  expect(structuralContractErrors([shadowed])).toContain("ventas/documentos-fiscales/objetos/can:nombre-reservado");
});
it("asks a field whose when reads the state only as it calls for it, on the local state and target", async () => {
  const rig = distributionRig(program);
  try {
    const ports = localPorts(rig.house(), "ana", { recentLines: 20 });
    const tools = houseTools(ports, shown);
    const act = reader?.acts["lector/anotar"];
    if (!act) throw new Error("missing act");
    const own = { tool: "ventas", name: "lector/anotar", act };
    const { ask, walk } = walked(
      { ...ports, act: value => ports.act(value, ports.state().through) },
      own,
      questionsFor(ports, shown, () => tools),
    );
    expect(ask.next([], "ventas/lector")).toBeNull();
    expect(walk.next([], "ventas/lector")?.ask).not.toBe("Nota");
    rig.attend("documentos/fiscal");
    expect((await settle(rig.act("fiscal/emitir", "documentos/fiscal", { venta: "v1" }))).status).toBe("accepted");
    expect(ask.next([], "ventas/lector")?.ask).toBe("Nota");
    expect(walk.next([], "ventas/lector")?.ask).toBe("Nota");
    expect(asks.at(-1)).toEqual(["own", "lector"]);
  } finally {
    rig.close();
  }
});
