// Reconoce el borrador de un acto antes de pedir revisión o permitir efectos.
import { programCall } from "../../fields/program-call.ts";
import { effect } from "../../house/facts.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import type { Decision } from "../execute.ts";
import type { Program, Tool, ActContext } from "../tool-contract.ts";
export function actionDraft<X extends Program>(
  tool: Tool<X> | undefined,
  context: ActContext<X>,
  input: unknown,
): Decision<X> | undefined {
  const { state, through, target, at, by } = context;
  const draft = programCall(tool?.draft?.bind(tool), state, through, input, target, at);
  if (!draft) return undefined;
  const data = { tool: tool?.id ?? "", target: draft, author: by, text: toolTexts.draft, draft: true, detail: input };
  return { status: "draft", reason: toolTexts.draft, draft: input, effects: [effect("tool-entry", data, by)] };
}
