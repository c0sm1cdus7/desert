import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { expect, it } from "vitest";
import { answerSchema, validateAnswer, type AnswerContext, type MindMenu } from "../../tools/minds/mind-answer.ts";
import { providerSchema, matchesSchema } from "./schema.ts";
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
it("construye ramas concretas cerradas y conserva restricciones locales al reducir el transporte", () => {
  const schema = answerSchema(menu);
  expect(Value.Check(schema, answer)).toBe(true);
  const transport = providerSchema(schema);
  expect(JSON.stringify(transport)).not.toMatch(/minLength|maximum|minimum|maxItems/);
  expect(matchesSchema(transport, answer)).toBe(true);
  expect(validateAnswer(answer, context)).toEqual({ ok: true, answer });
  const extra = {
    ...answer,
    acts: [{ ...answer.acts[0], input: { text: "Hola", detail: { number: 1, secret: "extra" } } }],
  };
  expect(Value.Check(schema, extra)).toBe(false);
  expect(validateAnswer(extra, context).ok).toBe(false);
});
