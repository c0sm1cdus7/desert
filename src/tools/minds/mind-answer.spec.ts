import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { expect, it } from "vitest";
import { object } from "../../fields/visible-text.ts";
import { answerSchema, validateAnswer, type AnswerContext, type MindMenu } from "./mind-answer.ts";
import { turnLimits } from "./mind-contract.ts";
const menu: MindMenu = [
  {
    tool: "notes",
    act: "write",
    target: "notes",
    scope: "work",
    input: Type.Object({
      text: Type.String({ minLength: 1 }),
      detail: Type.Object({ number: Type.Integer({ minimum: 1 }) }),
    }),
  },
];
const context: AnswerContext = {
  menu,
  active: true,
  consulted: false,
  allowed: () => true,
  scope: { kind: "journey", actor: "assistant:beto", process: "j", kit: [{ tool: "notes", acts: ["write"] }] },
};
const answer = {
  scene: "Preparando una nota",
  consulta: null,
  acts: [{ act: "write", target: "notes", input: { text: "Mate mañana", detail: { number: 1 } } }],
};
it("reserva doce intentos físicos compartidos y una corrección y consulta", () => {
  expect(turnLimits).toEqual({ calls: 12, corrections: 1, consultations: 1 });
});

it.each([
  { ...answer, by: "ana" },
  { ...answer, process: "ajeno" },
  { ...answer, scene: "\u200b" },
  { ...answer, scene: "x".repeat(4001) },
  { ...answer, consulta: { question: "" } },
  { ...answer, acts: [{ ...answer.acts[0], target: "otra" }] },
  { ...answer, acts: [{ ...answer.acts[0], by: "ana" }] },
  { ...answer, acts: [{ act: "write", target: "notes", input: { text: "", detail: { number: 0 } } }] },
  { ...answer, acts: Array.from({ length: 33 }, () => answer.acts[0]) },
])("rechaza propuesta inválida sin recuperar otro autor ni proceso %#", value => {
  expect(validateAnswer(value, context).ok).toBe(false);
});
it("rechaza permiso retirado, consulta repetida, cierre, trabajo en consciencia y kit ampliado", () => {
  expect(validateAnswer(answer, { ...context, allowed: () => false }).ok).toBe(false);
  expect(validateAnswer({ ...answer, consulta: { question: "¿Sigo?" } }, { ...context, consulted: true }).ok).toBe(
    false,
  );
  expect(validateAnswer(answer, { ...context, active: false }).ok).toBe(false);
  expect(validateAnswer(answer, { ...context, scope: { kind: "consciousness", actor: "assistant:beto" } }).ok).toBe(
    false,
  );
  expect(
    validateAnswer(answer, { ...context, scope: { kind: "journey", actor: "assistant:beto", process: "j", kit: [] } })
      .ok,
  ).toBe(false);
});
it("acepta comunicación y apertura solo en consciencia y controles solo en journey", () => {
  const input = object({});
  for (const scope of ["communication", "open", "control"] as const) {
    const menu: MindMenu = [{ tool: "notes", act: "write", target: "notes", input, scope }];
    const value = { ...answer, acts: [{ act: "write", target: "notes", input: {} }] };
    expect(
      validateAnswer(value, { ...context, menu, scope: { kind: "consciousness", actor: "assistant:beto" } }).ok,
    ).toBe(scope !== "control");
    expect(validateAnswer(value, { ...context, menu }).ok).toBe(scope === "control");
  }
});
it("un menú vacío permite silencio pero nunca inventar una acción", () => {
  expect(Value.Check(answerSchema([]), { ...answer, acts: [] })).toBe(true);
  expect(validateAnswer(answer, { ...context, menu: [] }).ok).toBe(false);
});

it("cierra también los objetos dentro de entradas de tuplas", () => {
  const input = Type.Object({ values: Type.Tuple([Type.Object({ text: Type.String() })]) });
  const schema = answerSchema([{ tool: "notes", act: "write", target: "notes", scope: "work", input }]);
  const proposal = (value: unknown) => ({ ...answer, acts: [{ act: "write", target: "notes", input: value }] });
  expect(Value.Check(schema, proposal({ values: [{ text: "Hola" }] }))).toBe(true);
  expect(Value.Check(schema, proposal({ values: [{ text: "Hola", extra: true }] }))).toBe(false);
});

it("requires a destination offered to the journey and rejects a different or missing machine", () => {
  const remoteMenu: MindMenu = menu.map(item => ({
    ...item,
    destinations: [
      { kind: "device", device: "mac" },
      { kind: "device", device: "vm" },
    ],
  }));
  for (const device of ["mac", "vm", "absent", undefined]) {
    const value = {
      ...answer,
      acts: answer.acts.map(act => ({ ...act, ...(device ? { destination: { kind: "device", device } } : {}) })),
    };
    const valid = device === "mac" || device === "vm";
    expect(Value.Check(answerSchema(remoteMenu), value)).toBe(valid);
    expect(validateAnswer(value, { ...context, menu: remoteMenu }).ok).toBe(valid);
  }
});
