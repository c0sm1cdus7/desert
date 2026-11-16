// Current data become answers once; equality stays in the declared data shape, after parsing those answers.
import { Value } from "@sinclair/typebox/value";
import type { Asking } from "./asking.ts";
export const currentAnswers = (ask: Asking, read: (target?: string) => unknown) => ({
  today: (target?: string): readonly string[] | undefined => {
    const current = read(target);
    return current === undefined ? undefined : ask.answers(current);
  },
  same: (answers: readonly string[], current: readonly string[]): boolean =>
    Value.Equal(ask.input(answers), ask.input(current)),
});
