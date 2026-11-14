import { identityNameTexts } from "../texts/tools.texts.ts";

/** One rule for names introduced at runtime. Replaying older facts does not apply it retroactively. */
export function identityNameProblem(name: string, runner: string): string | undefined {
  if (name === runner) return identityNameTexts.house;
  if (name.startsWith("mind:")) return identityNameTexts.mind;
  if (name !== name.trim()) return identityNameTexts.trim;
  if (/\p{Cc}/u.test(name)) return identityNameTexts.control;
  if (/\p{Cf}/u.test(name)) return identityNameTexts.format;
  if (!name || /\p{Cn}|\p{Cs}|\p{Co}|\p{Zl}|\p{Zp}/u.test(name) || !/[^\p{M}\s]/u.test(name))
    return identityNameTexts.visible;
  return undefined;
}
