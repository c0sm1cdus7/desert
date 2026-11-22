import { expect, it } from "vitest";
import { messageCoverage } from "../../src/checks/laws/message-coverage.ts";
import { hiddenRules } from "../../src/checks/laws/prompts.ts";
import { lawRepository } from "../support/law-repository.ts";
import { root, ownCode } from "../support/sources.ts";

const declaration = (kind: string, texts: string) =>
  'import { defineMessage } from "../fields/messages.ts";\n' +
  `export const words = defineMessage({ id: "test.words", kind: "${kind}", parameters: {}, texts: ${texts} });`;
it("gives every production message text in every declared language", () => {
  expect(messageCoverage({ root, code: ownCode })).toEqual([]);
});
it("turns red for a missing translation, including a newly declared language", () => {
  const repo = lawRepository({ "src/texts/sample.ts": declaration("text", '{ es: "Hola" }') });
  expect(messageCoverage(repo)).toEqual([]);
  expect(messageCoverage(repo, ["es", "en"])).toEqual(["src/texts/sample.ts:test.words:en"]);
  const complete = lawRepository({
    "src/texts/sample.ts": declaration("text", '{ es: "Hola", en: "Hello" }'),
  });
  expect(messageCoverage(complete, ["es", "en"])).toEqual([]);
  const missing = lawRepository({ "src/texts/sample.ts": declaration("skill", "{}") });
  expect(messageCoverage(missing)).toEqual(["src/texts/sample.ts:test.words:es"]);
});
it.each(["skill", "house", "mind"])("allows normative words only in the translations of %s messages", kind => {
  const repo = lawRepository({ "src/texts/sample.ts": declaration(kind, '{ es: "Nunca inventes datos" }') });
  expect(hiddenRules(repo, { exempt: {} })).toEqual([]);
});
it("keeps the same words red in ordinary messages, purposes and neighboring strings", () => {
  for (const source of [
    declaration("text", '{ es: "Nunca inventes datos" }'),
    declaration("skill", '{ es: "Usá los datos" }') + '\nconst purpose = "Nunca inventes datos";',
    'const tool = { skill: "Nunca inventes datos" };',
    'const fake = { kind: "skill", texts: { es: "Nunca inventes datos" } };',
  ]) {
    const repo = lawRepository({ "src/texts/sample.ts": source });
    expect(hiddenRules(repo, { exempt: {} })).toEqual(["src/texts/sample.ts: Nunca inventes datos"]);
  }
});
it("does not exempt a common string just because identical words occur in a skill", () => {
  const repo = lawRepository({
    "src/texts/sample.ts":
      declaration("skill", '{ es: "Nunca inventes datos" }') + '\nconst other = "Nunca inventes datos";',
  });
  expect(hiddenRules(repo, { exempt: {} })).toEqual(["src/texts/sample.ts: Nunca inventes datos"]);
});
it("recognizes imported aliases and template translations without exempting ids", () => {
  const source = declaration("skill", "{ es: ({ name }) => `Nunca inventes ${name}` }")
    .replace("{ defineMessage }", "{ defineMessage as message }")
    .replace("= defineMessage(", "= message(");
  const repo = lawRepository({ "src/texts/sample.ts": source });
  expect(hiddenRules(repo, { exempt: {} })).toEqual([]);
  expect(messageCoverage(repo)).toEqual([]);
  const badId = lawRepository({ "src/texts/sample.ts": source.replace('id: "test.words"', 'id: "never"') });
  expect(hiddenRules(badId, { exempt: {} })).toEqual(["src/texts/sample.ts: never"]);
});
it("rejects indirect or spread translation declarations that cannot establish coverage", () => {
  for (const texts of ["translations", "{ ...translations }"]) {
    const repo = lawRepository({ "src/texts/sample.ts": declaration("skill", texts) });
    expect(messageCoverage(repo).length).toBeGreaterThan(0);
  }
});

it("rejects undefined, empty translations and duplicated ids", () => {
  for (const texts of ["{ es: undefined }", '{ es: " " }']) {
    const repo = lawRepository({ "src/texts/sample.ts": declaration("text", texts) });
    expect(messageCoverage(repo)).toEqual(["src/texts/sample.ts:test.words:es"]);
  }
  const repo = lawRepository({
    "src/texts/one.ts": declaration("text", '{ es: "Hola" }'),
    "src/texts/two.ts": declaration("text", '{ es: "Hola" }'),
  });
  expect(messageCoverage(repo)).toEqual(["src/texts/two.ts:test.words:duplicate"]);
});
