// Actuar entra por el libro del socket, con atención previa, límites y kit verificados por la casa.
import { randomUUID } from "node:crypto";
import { stripVTControlCharacters } from "node:util";
import { allowedAct } from "../../house/kit.ts";
import { targetTool } from "../../house/attendance.ts";
import { mcpTexts as said } from "../../texts/mcp.texts.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import type { Program } from "../../tools/tool-contract.ts";
import type { requestBook } from "../socket/requests/request-book.ts";
import type { McpHouse } from "./mcp-reading.ts";
import { toolResult } from "./mcp-protocol.ts";
export async function mcpAct<X extends Program>(
  house: McpHouse<X>,
  book: ReturnType<typeof requestBook<X>>,
  by: string,
  tool: string,
  action: string,
  target: string,
  input: unknown,
) {
  const state = house.tools.state();
  const declared = targetTool(house.registry, state, target);
  if (declared?.id !== tool || !Object.hasOwn(declared.acts, action)) return toolResult(said.action, true);
  if (!allowedAct(state.house, by, tool, action)) return toolResult(toolTexts.kitRefusal(tool), true);
  const attended = await book.act(by, {
    tipo: "acto",
    id: randomUUID(),
    act: "attend",
    input: { target },
    through: state.through,
  });
  if (attended.tipo !== "resultado" || attended.status !== "accepted") return toolResult(said.failed, true);
  const result = await book.act(by, {
    tipo: "acto",
    id: randomUUID(),
    act: action,
    target,
    input,
    through: house.tools.state().through,
  });
  if (result.tipo === "rechazo") return toolResult(result.motivo, true);
  if (result.tipo !== "resultado") return toolResult(said.failed, true);
  if (result.status !== "accepted") return toolResult(result.reason ?? said.failed, true);
  // The act's own result says what was done; the activity entry for the others repeats the same words.
  const done = result.efectos.filter(event => event.kind === "act-done").map(event => event.data.text);
  const texts = [...new Set(done.length ? done : result.efectos.map(event => event.data.text))];
  return toolResult(stripVTControlCharacters(house.tools.prepare(texts.join("\n") || said.accepted)));
}
