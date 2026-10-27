// The content rules (D–V) in the order the gate runs them. Each reads the shared context and returns every violation.
import type { ContentRule } from "./context.ts";
import { ruleD } from "./composition-template.ts";
import { ruleD2 } from "./composition-dispatch.ts";
import { ruleE } from "./presentation.ts";
import { ruleF } from "./owner-imports.ts";
import { ruleG } from "./css-ownership.ts";
import { ruleH } from "./native-controls.ts";
import { ruleI } from "./dom-access.ts";
import { ruleJ } from "./specimens.ts";
import { ruleK } from "./grammar.ts";
import { ruleL2 } from "./approvals.ts";
import { ruleN } from "./nonvisual.ts";
import { ruleO } from "./opaque-source.ts";
import { ruleT } from "./template-artifacts.ts";
import { ruleU } from "./contract-types.ts";
import { ruleV } from "./messages.ts";

export const contentRuleIds = Object.freeze(["D", "D2", "E", "F", "G", "H", "I", "J", "K", "L2", "N", "O", "T", "U", "V"] as const);
export type ContentRuleId = typeof contentRuleIds[number];
export const contentRules: Readonly<Record<ContentRuleId, ContentRule>> = Object.freeze({
  D: ruleD, D2: ruleD2, E: ruleE, F: ruleF, G: ruleG, H: ruleH, I: ruleI, J: ruleJ, K: ruleK, L2: ruleL2, N: ruleN, O: ruleO, T: ruleT, U: ruleU, V: ruleV });
