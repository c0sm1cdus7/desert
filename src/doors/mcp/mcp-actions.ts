// Run MCP actions through the request book with live authorization and a single private invitation receipt.
import type { ExecutionDestination } from "../../fields/device-protocol.ts";
import { randomUUID } from "node:crypto";
import { stripVTControlCharacters } from "node:util";
import { allowedAct } from "../../house/kit.ts";
import { targetTool } from "../../house/attendance.ts";
import { mcpTexts as said } from "../../texts/mcp.texts.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { requestBook } from "../socket/requests/request-book.ts";
import type { RequestAct, ServerMessage } from "../socket/wire/protocol.ts";
import type { McpHouse } from "./mcp-reading.ts";
import { toolResult } from "./mcp-protocol.ts";
export const privateInvitation = Symbol("invitation-receipt");
export async function mcpAct<X extends Program>(
  house: McpHouse<X>,
  book: ReturnType<typeof requestBook<X>>,
  by: string,
  tool: string,
  action: string,
  target: string,
  input: unknown,
  destination?: ExecutionDestination,
  signal?: AbortSignal,
) {
  const state = house.tools.state();
  const declared = targetTool(house.registry, state, target);
  if (declared?.id !== tool || !Object.hasOwn(declared.acts, action)) return toolResult(said.action, true);
  if (!allowedAct(state.house, by, tool, action)) return toolResult(toolTexts.kitRefusal(tool), true);
  const attendance: RequestAct = {
    tipo: "acto",
    id: randomUUID(),
    act: "attend",
    input: { target },
    through: state.through,
  };
  const attended = await book.act(by, attendance, signal);
  if (attended.tipo !== "resultado" || attended.status !== "accepted") return toolResult(said.failed, true);
  const result = await book.act(
    by,
    {
      tipo: "acto",
      id: randomUUID(),
      act: action,
      ...(destination ? { destination } : {}),
      target,
      input,
      through: house.tools.state().through,
    },
    signal,
  );
  return actionResult(house, result, tool, action);
}
function actionResult<X extends Program>(house: McpHouse<X>, result: ServerMessage, tool: string, action: string) {
  if (result.tipo === "rechazo") return toolResult(result.motivo, true);
  if (result.tipo !== "resultado") return toolResult(said.failed, true);
  if (result.status !== "accepted") return toolResult(result.reason ?? said.failed, true);
  // The act's own result says what was done; the activity entry for the others repeats the same words.
  const done = result.efectos.filter(event => event.kind === "act-done").map(event => event.data.text);
  const texts = [...new Set(done.length ? done : result.efectos.map(event => event.data.text))];
  const response = toolResult(stripVTControlCharacters(house.tools.prepare(texts.join("\n") || said.accepted)));
  const code =
    tool === "identities" && ["new", "invite"].includes(action)
      ? result.private?.match(/[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}/)?.[0]
      : undefined;
  return code ? { ...response, [privateInvitation]: code } : response;
}
