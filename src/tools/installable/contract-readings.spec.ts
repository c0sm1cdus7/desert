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
import { compose } from "../../runtime/distributions/compose.ts";
import { localPorts } from "../../runtime/house-runtime.ts";
import { text, when } from "../../fields/fields.ts";
import { settle } from "../../surface/bridge/ports/house-ports.ts";
import { walked } from "../../surface/bridge/acts/asked-act.ts";
import { houseTools, questionsFor } from "../../surface/bridge/assembly/house-tools.ts";
import { programContracts } from "../../runtime/distributions/program-contracts.ts";
import { startTools } from "../start.ts";
import type { State } from "../tool-contract.ts";
import { defineProgram, programAct, type LocalProgram } from "./program.ts";
const metadata = {
  id: "sales",
  version: "1.0.0",
  desert: 1,
  code: [import.meta.filename],
  facts: [],
  initial: () => ({}),
} as const;
type Reader = LocalProgram<typeof metadata>;
const folds: unknown[] = [];
let seen: State<Reader> | undefined;
const reading = (state: State<Reader>) => state.readings?.["fiscal-documents"]?.voucher?.("v1");
const voucherState = (state: State<Reader>) => {
  seen = state;
  const read = reading(state);
  return read?.status === "found" ? JSON.stringify(read.value) : undefined;
};
const words = (name: string, key: string) => ({ name, key, listed: name, empty: "Sin datos", reads: {}, presents: [] });
const request = {
  actions: { issue: { input: input(), output: Type.Object({ id: Type.String() }), rejections: rejection() } },
  objects: {
    voucher: { key: Type.String(), data: Type.Object({ state: Type.Literal("issued") }), reading: "house" },
  },
  notices: {},
  cases: [
    {
      id: "no-voucher",
      actor: "beto",
      prepare: {
        version: 2,
        selections: [
          { kind: "tool", program: "documents", tool: "fiscal" },
          { kind: "tool", program: "sales", tool: "reader" },
        ],
      },
      steps: [{ kind: "read", name: "voucher", key: "v1", at: "current", expect: { status: "unavailable" } }],
    },
  ],
} as const;
/** A note asked only once the provider has the receipt: `when` reads the local state with its readings. */
const asks: unknown[] = [];
const noting = Type.Object({
  note: when(text("Nota", "algo"), (_answered, _at, state: State<Reader>, target: string) => {
    asks.push([Object.keys(state.tools).join(), target]);
    return voucherState(state) !== undefined;
  }),
});
const group = { purpose: "leer comprobantes", targets: () => [], summary: () => "", words: words("Lector", "l") };
const consumer = defineProgram(metadata, {
  ...group,
  words: words("Ventas", "v"),
  skill: documentProgram.skill,
  artifact: "reader-commit",
  requests: { "fiscal-documents": request },
  tools: {
    reader: {
      ...group,
      view: state => `${Object.keys(state.tools).join(",")} ${voucherState(state) ?? "nada"}`,
      acts: {
        look: programAct<Reader, ReturnType<typeof Type.Object>>({
          name: "mirar",
          enter: "mirar",
          purpose: "mirar el comprobante",
          key: "m",
          on: "tool",
          undoable: true,
          input: Type.Object({}),
          refuses: ["sin comprobante"],
          offered: state => (voucherState(state) === undefined ? "sin comprobante" : undefined),
          confirms: (_input, state) => voucherState(state),
          run: () => ({ status: "accepted" }),
          cases: [{ promise: "Se apaga sin comprobante", input: {}, then: { refused: "sin comprobante" } }],
        }),
        note: programAct<Reader, typeof noting>({
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
  fold: (own, _event, before) => {
    folds.push(before.readings);
    return own;
  },
});
const options = {
  programs: [consumer, askableDocumentProgram],
  identities: true,
  minds: { assistants: false, programs: [] },
  shown: presentation,
} as const;
const { program, shown } = compose({ ...options, contracts: await certifyContracts(options) });
const house = openHouse(program, ":memory:", [{ kind: "program", program: "sales" }]);
afterEach(() => {
  seen = undefined;
});
afterAll(() => house.close());
function issue() {
  const engine = startTools({ ...house.ports, history: house.history.events(house.ports.state().through) });
  engine.act({ act: "attend", input: { target: "documents/fiscal" } }, 0, "ana");
  engine.act({ act: "fiscal/issue", target: "documents/fiscal", input: { sale: "v1" } }, 0, "ana");
  engine.stop();
}
const reader = program.registry.find(tool => tool.id === "sales");
const look = reader?.acts["reader/look"];
const as = (by: string) => identityView(house.ports.state(), by);
it("reads in offered, confirms and view, trimmed to the request, and never while folding", () => {
  expect(look?.offered?.(as("ana"), "sales/reader", 0)).toBe("sin comprobante");
  expect(reader?.view(as("ana"), "sales/reader", { recentLines: 20, now: 0 })).toBe("own nada");
  issue();
  expect(look?.offered?.(as("ana"), "sales/reader", 0)).toBeUndefined();
  expect(look?.confirms?.({}, as("ana"), "sales/reader", 0)).toBe('{"state":"issued"}');
  expect(reader?.view(as("ana"), "sales/reader", { recentLines: 20, now: 0 })).toBe('own {"state":"issued"}');
  expect(folds.length).toBeGreaterThan(0);
  expect(folds.every(each => each === undefined)).toBe(true);
});
it("keeps the provider's raw state out of reach and refuses a key outside the requested schema", () => {
  look?.offered?.(as("ana"), "sales/reader", 0);
  expect(Object.keys(seen?.tools ?? {})).toEqual(["own"]);
  expect(seen?.readings?.["fiscal-documents"]?.voucher?.(42)).toEqual({
    status: "core-failure",
    reason: "invalid-reference",
  });
  expect(seen?.readings?.["fiscal-documents"]?.voucher?.("v2")).toEqual({ status: "unavailable" });
});
it("says whether whoever looks holds the provider's requested action in their kit", () => {
  look?.offered?.(as("ana"), "sales/reader", 0);
  expect(seen?.readings?.["fiscal-documents"]?.can("issue")).toBe(true);
  expect(seen?.readings?.["fiscal-documents"]?.can("cancel")).toBe(false);
  look?.offered?.(as("beto"), "sales/reader", 0);
  expect(seen?.by).toBe("beto");
  expect(seen?.readings?.["fiscal-documents"]?.can("issue")).toBe(false);
});
it("keeps `can` from naming an object, since a consumer reads each object by its name beside it", () => {
  const [half] = programContracts([consumer]);
  if (!half) throw new Error("missing half");
  const objects = { can: request.objects.voucher };
  const shadowed = { ...half, requests: { "fiscal-documents": { ...request, objects } } };
  expect(structuralContractErrors([shadowed])).toContain("sales/fiscal-documents/objects/can:reserved-name");
});
it("asks a field whose when reads the state only as it calls for it, on the local state and target", async () => {
  const rig = distributionRig(program);
  try {
    const ports = localPorts(rig.house(), "ana", { recentLines: 20 });
    const tools = houseTools(ports, shown, "es");
    const act = reader?.acts["reader/note"];
    if (!act) throw new Error("missing act");
    const own = { tool: "sales", name: "reader/note", act };
    const surface = {
      ...ports,
      language: "es" as const,
      act: (value: Parameters<typeof ports.act>[0]) => ports.act(value, ports.state().through),
    };
    const { ask, walk } = walked(
      surface,
      own,
      questionsFor(surface, shown, () => tools),
    );
    expect(ask.next([], "sales/reader")).toBeNull();
    expect(walk.next([], "sales/reader")?.ask).not.toBe("Nota");
    rig.attend("documents/fiscal");
    expect((await settle(rig.act("fiscal/issue", "documents/fiscal", { sale: "v1" }))).status).toBe("accepted");
    expect(ask.next([], "sales/reader")?.ask).toBe("Nota");
    expect(walk.next([], "sales/reader")?.ask).toBe("Nota");
    expect(asks.at(-1)).toEqual(["own", "reader"]);
  } finally {
    rig.close();
  }
});
