// Create an identity and deliver its single-use invitation only in the private receipt.
import { issueInvitation } from "../../house/doors/door-material.ts";
import { doorTexts } from "../../texts/doors.texts.ts";
import { systemTool } from "../../house/system-tools.ts";
import { programKit } from "../../house/kit-selection.ts";
import { newIdentityCases } from "./new-identity-cases.ts";
import { Type } from "@sinclair/typebox";
import { object } from "../../fields/visible-text.ts";
import { t } from "../../house/own-acts.ts";
import { text, textLimit, someOf, option } from "../../fields/fields.ts";
import { identityNameProblem } from "../../house/identities/identity-name.ts";
import { effect } from "../../house/facts.ts";
import { identityTexts as words } from "../../texts/identities.texts.ts";
import { programName } from "./kit-catalog.ts";
import { programAct } from "../promises.ts";
import type { Program, ToolRegistry } from "../tool-contract.ts";
import { identityTarget, members } from "./identity-reading.ts";
function identityInput<X extends Program>(catalog: ToolRegistry<X>) {
  return object({
    identity: Type.String({
      title: words.identifier,
      placeholder: words.identifierExample,
      minLength: 1,
      maxLength: 120,
      verbatim: true,
    }),
    name: Type.Optional({ ...text(words.display, words.optional), ...t(textLimit) }),
    tools: someOf(words.programs, "none", ...catalog.map(tool => option(tool.id, programName(tool), ""))),
  });
}
export function newIdentity<X extends Program>(registry: ToolRegistry<X>, runner: string) {
  const catalog = registry.filter(tool => !systemTool(tool.id));
  const input = identityInput(catalog);
  return programAct<X, typeof input>({
    ...words.new,
    on: "tool",
    undoable: true,
    input,
    refuses: [words.only, words.repeated],
    stops: ({ identity }, state) =>
      typeof identity !== "string"
        ? undefined
        : (identityNameProblem(identity, runner) ??
          (members(state.house).includes(identity) ? words.repeated : undefined)),
    run: ({ identity, name, tools }, { by, at }) => {
      const invitation = issueInvitation(identity, "agent", by, at);
      return {
        private: doorTexts.receipt(invitation.code),
        status: "accepted",
        text: words.created(name ?? identity),
        target: identityTarget(identity),
        effects: [
          effect("granted", { version: 2, identity, kit: programKit(tools) }, by),
          ...(name === undefined ? [] : [effect("named", { identity, name }, by)]),
          invitation.fact,
        ],
      };
    },
    cases: newIdentityCases<X>(catalog),
  });
}
