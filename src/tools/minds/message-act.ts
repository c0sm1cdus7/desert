// Offers identities a native directed message through the same action engine as every house act.
import { isMindActor } from "../../fields/mind-actor.ts";
import { object } from "../../fields/visible-text.ts";
import { effect } from "../../house/facts.ts";
import { mindText } from "../../house/minds/journey-facts.ts";
import { surfaceTexts } from "../../texts/surface.texts.ts";
import { accepted, ownAct } from "../act-definition.ts";
import type { Program, State } from "../tool-contract.ts";
export const directedMessageInput = object({ text: mindText });
export function mindMessageActs<X extends Program>(state: State<X>) {
  if (isMindActor(state.by)) return [];
  return [...state.house.mindAssignments.keys()].map(to =>
    ownAct<X, typeof directedMessageInput>(
      to,
      "message",
      {
        input: directedMessageInput,
        purpose: surfaceTexts.talk.send,
      },
      (input, context) => accepted(effect("mind-requested", { to, ...input }, context.by)),
    ),
  );
}
