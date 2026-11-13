// A placeholder cannot become the explanation of a disabled option, even if a program declares it.
import { expect, it } from "vitest";
import { answerChange, answerValidity } from "./answer-change.ts";
import { disabled, narrowed } from "../../surface/bridge/questions/picked-options.ts";
import { toolTexts } from "../../texts/tools.texts.ts";

it("rejects invalid data as a disabled reason", () => {
  expect(() => answerChange(toolTexts.invalid)).toThrow("OutsideDefect");
  expect(() => disabled({ title: "Cosa" }, toolTexts.invalid)).toThrow("OutsideDefect");
});
it("rejects invalid offered answers without a reason, while a missing reference simply is not valid", () => {
  const field = narrowed(
    {
      kind: "pick",
      ask: "Cosa",
      of: "things",
      shown: value => value,
      nothing: () => "sin cosas",
      found: () => [],
      valid: () => false,
    },
    () => undefined,
    () => false,
  );
  expect(field.valid("missing")).toBe(false);
  expect(() => answerValidity(false)).toThrow("OutsideDefect");
  expect(() => field.wrong("missing")).toThrow("OutsideDefect");
});
