import { Type } from "@sinclair/typebox";
import { expect, it } from "vitest";
import { answerSchema, type MindMenu } from "../../tools/minds/mind-answer.ts";
import { matchesSchema, providerSchema } from "./schema.ts";
import { enumLimit, providerComplexity, providerLimits } from "./schema-compaction.ts";
const ids = (count: number, prefix: string) => Array.from({ length: count }, (_, index) => `${prefix}-${index + 1}`);
/** The shape that broke the communicator: one branch per thread and one literal per message to reply to. */
function houseMenu(threads: number, messages: number): MindMenu {
  const replyTo = Type.Union(ids(messages, "message").map(id => Type.Literal(id)));
  const to = Type.Union(["franco", "martin", "mind:notes"].map(id => Type.Literal(id)));
  return [
    ...ids(threads, "communicator/threads").flatMap(target => [
      {
        tool: "communicator",
        act: "threads/say",
        target,
        scope: "work" as const,
        input: Type.Object({ text: Type.String(), replyTo: Type.Optional(replyTo) }),
      },
      {
        tool: "communicator",
        act: "threads/add",
        target,
        scope: "work" as const,
        input: Type.Object({ identity: to }),
      },
    ]),
    {
      tool: "communicator",
      act: "message",
      target: "mind:communicator",
      scope: "communication" as const,
      input: Type.Object({ to, text: Type.String(), replyTo: Type.Optional(replyTo) }),
    },
    { tool: "journeys", act: "end", target: "journey", scope: "control" as const, input: Type.Object({}) },
  ];
}
const answer = (act: string, target: string, input: unknown) => ({
  scene: "Listo",
  consulta: null,
  acts: [{ act, target, input }],
});
it("keeps the grammar the same size and inside the documented limits however much the house grows", () => {
  const small = providerSchema(answerSchema(houseMenu(enumLimit + 1, enumLimit + 1)));
  const large = providerSchema(answerSchema(houseMenu(300, 1000)));
  expect(large).toEqual(small);
  const measured = providerComplexity(large);
  expect(measured.optional).toBeLessThanOrEqual(providerLimits.optional);
  expect(measured.unions).toBeLessThanOrEqual(providerLimits.unions);
  expect(measured.bytes).toBeLessThan(4000);
});
it("merges branches exactly while the lists are short, and the local contract keeps every dropped constraint", () => {
  const menu = houseMenu(3, 4);
  const local = answerSchema(menu);
  const sent = providerSchema(local);
  expect(JSON.stringify(sent).match(/threads\/say/g)).toHaveLength(1);
  for (const target of ids(3, "communicator/threads")) {
    const said = answer("threads/say", target, { text: "Hola", replyTo: "message-2" });
    expect(matchesSchema(sent, said)).toBe(true);
    expect(matchesSchema(local, said)).toBe(true);
  }
  expect(matchesSchema(sent, answer("threads/say", "communicator/threads/9", { text: "Hola" }))).toBe(false);
  expect(matchesSchema(sent, answer("threads/say", "communicator/threads/1", { text: "x", replyTo: "otro" }))).toBe(
    false,
  );
  const crossed = answer("threads/add", "mind:communicator", { identity: "franco" });
  expect(matchesSchema(sent, crossed)).toBe(false);
  const huge = houseMenu(200, 200);
  const unknownReply = answer("threads/say", "communicator/threads/7", { text: "Hola", replyTo: "message-999" });
  expect(matchesSchema(providerSchema(answerSchema(huge)), unknownReply)).toBe(true);
  expect(matchesSchema(answerSchema(huge), unknownReply)).toBe(false);
});
