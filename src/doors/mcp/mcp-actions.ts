// Run MCP actions through the request book with live authorization and a single private invitation receipt.
import { doorTexts } from "../../texts/doors.texts.ts";
import type { ExecutionDestination } from "../../fields/device-protocol.ts";
import { randomUUID } from "node:crypto";
import { stripVTControlCharacters } from "node:util";
import { allowedAct } from "../../house/kit.ts";
import { targetTool } from "../../house/attendance.ts";
import { mcpTexts } from "../../texts/mcp.texts.ts";
import { said as inWords, type Text } from "../../fields/phrases.ts";
import { readerLanguage } from "../../house/members.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { requestBook } from "../socket/requests/request-book.ts";
import type { RequestAct, ServerMessage } from "../socket/wire/protocol.ts";
import type { McpHouse } from "./mcp-reading.ts";
import { toolResult } from "./mcp-protocol.ts";
/** The receipt of an invitation, in the words of whoever asked for it: the handler adds it after redaction. */
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
  const language = readerLanguage(state.house, by);
  const said = (text: Text): string => inWords(text, language);
  const declared = targetTool(house.registry, state, target);
  if (declared?.id !== tool || !Object.hasOwn(declared.acts, action)) return toolResult(said(mcpTexts.action), true);
  if (!allowedAct(state.house, by, tool, action)) return toolResult(said(toolTexts.kitRefusal(tool)), true);
  const attendance: RequestAct = { type: "act", id: randomUUID(), act: "attend", input: { target }, through: 0 };
  const attended = await book.act(by, { ...attendance, through: state.through }, signal);
  if (attended.type !== "result" || attended.status !== "accepted") return toolResult(said(mcpTexts.failed), true);
  const result = await book.act(
    by,
    {
      type: "act",
      id: randomUUID(),
      act: action,
      ...(destination ? { destination } : {}),
      target,
      input,
      through: house.tools.state().through,
    },
    signal,
  );
  return actionResult(house, result, tool, action, said);
}
function actionResult<X extends Program>(
  house: McpHouse<X>,
  result: ServerMessage,
  tool: string,
  action: string,
  said: (text: Text) => string,
) {
  if (result.type === "rejection") return toolResult(said(result.reason), true);
  if (result.type !== "result") return toolResult(said(mcpTexts.failed), true);
  if (result.status !== "accepted") return toolResult(said(result.reason ?? mcpTexts.failed), true);
  // The act's own result says what was done; the activity entry for the others repeats the same words.
  const done = result.effects.filter(event => event.kind === "act-done").map(event => said(event.data.text));
  const texts = [...new Set(done.length ? done : result.effects.map(event => said(event.data.text)))];
  const response = toolResult(
    stripVTControlCharacters(house.tools.prepare(texts.join("\n") || said(mcpTexts.accepted))),
  );
  const receipt = result.private === undefined ? undefined : said(result.private);
  const code =
    tool === "identities" && ["new", "invite"].includes(action)
      ? receipt?.match(/[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}/)?.[0]
      : undefined;
  return code ? { ...response, [privateInvitation]: said(doorTexts.receipt(code)) } : response;
}
