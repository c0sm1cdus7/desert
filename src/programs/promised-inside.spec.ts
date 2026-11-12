// A program with a tool that lives in another: every promise of it is walked by keys through the tool it lives in.
import { describe, it } from "vitest";
import { must } from "../surface/window.ts";
import { programChecks } from "./program-checks.ts";
import { shopProgram, shopShown, shopWords } from "../../tests/support/shop.ts";

const payments = { ...must(shopWords.payments), inside: "sales" };
const nested = { ...shopShown, words: { ...shopWords, payments } };

describe("a program with a tool that lives in another", () => {
  for (const check of programChecks(shopProgram, nested)) it(check.name, check.run);
});
