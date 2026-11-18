// Presents rule writes according to current authority, including changes while a form is open.
import type { Program, State } from "../../../tools/tool-contract.ts";
import { rulesTexts as words } from "../../../texts/rules.texts.ts";
export function rulePresentation<X extends Program>(tool: string, name: string, read: () => State<X>) {
  if (tool !== "rules" || (name !== "save" && name !== "propose")) return undefined;
  const state = read();
  const admin = state.by === state.house.admin;
  const memberNotice = name === "save" ? words.authorityChanged : words.proposalNotice;
  return {
    ...(admin ? words.save : words.propose),
    listed: name === (admin ? "save" : "propose"),
    notice: admin ? words.saveNotice : memberNotice,
  };
}

/** Keep menu wording live rather than copying an actor's former authority into the form. */
export function presentedRuleAction<X extends Program>(
  tool: string,
  name: string,
  state: () => State<X>,
  walk: { label: string; verb: string },
  listed: () => boolean,
) {
  const presentation = () => rulePresentation(tool, name, state);
  return {
    get label() {
      return presentation()?.name ?? walk.label;
    },
    get verb() {
      return presentation()?.enter ?? walk.verb;
    },
    listed: () => (presentation()?.listed ?? true) && listed(),
  };
}
