// Compose protection before any writable house resource is acquired.
import { hasSecretInput } from "../../tools/inputs/secret-input.ts";
import { type HouseOptions, startState } from "../../house/state.ts";
import type { Program, State } from "../../tools/tool-contract.ts";
import type { Redactor } from "../redact.ts";
import { declaredInput } from "./declared-input.ts";
import { CustodyError } from "../custody/house-keys.ts";
import { checkSecrets } from "./secret-positions.ts";
import { protectHistory } from "../history/secret-history.ts";
export function protectedHouse<X extends Program>(home: string, options: HouseOptions<X>) {
  checkSecrets(options.words.event);
  for (const tool of options.registry) for (const act of Object.values(tool.acts)) checkSecrets(act.input);
  if (
    !options.secretKeys &&
    (hasSecretInput(options.words.event) ||
      options.registry.some(tool => Object.values(tool.acts).some(act => hasSecretInput(act.input))) ||
      options.own?.(startState(options.slices, options.by)).some(act => hasSecretInput(act.input)))
  )
    throw new CustodyError("E-CUSTODY-PROVIDER");
  const attach = (secrets: Redactor<X>, read: () => State<X>) =>
    secrets.actions(value => declaredInput(options, read(), value));
  return { attach, mark: protectHistory(home, options) };
}
