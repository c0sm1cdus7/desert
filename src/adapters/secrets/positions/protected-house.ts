// Compose protection before any writable house resource is acquired.
import type { HouseOptions } from "../../../programs/house-runtime.ts";
import type { Program, State } from "../../../tools/tool-contract.ts";
import type { Redactor } from "../redact.ts";
import { declaredInput } from "./declared-input.ts";
import { checkSecrets } from "./secret-positions.ts";
import { protectedVocabulary } from "./protected-vocabulary.ts";
import { protectHistory } from "../history/secret-history.ts";
export function protectedHouse<X extends Program>(home: string, options: HouseOptions<X>) {
  checkSecrets(options.words.event);
  for (const tool of options.registry) for (const act of Object.values(tool.acts)) checkSecrets(act.input);
  const attach = (secrets: Redactor<X>, read: () => State<X>) =>
    secrets.actions(value => declaredInput(options, read(), value));
  return { attach, words: protectedVocabulary(options.words), mark: protectHistory(home, options) };
}
