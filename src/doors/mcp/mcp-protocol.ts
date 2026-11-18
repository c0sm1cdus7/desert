// Los mensajes JSON-RPC y las cuatro herramientas fijas de la puerta MCP, sin sesión de transporte.
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { object } from "../../fields/visible-text.ts";
import { isRecord } from "../../fields/json-values.ts";
import { mcpTexts as said } from "../../texts/mcp.texts.ts";
const name = Type.String({ minLength: 1, maxLength: 256 });
const selection = object({ programa: Type.Optional(name), objetivo: Type.Optional(name) });
export const mcpInputs = {
  leer: selection,
  acciones: selection,
  actuar: object({
    programa: name,
    accion: name,
    objetivo: Type.Optional(name),
    datos: Type.Record(Type.String(), Type.Unknown()),
  }),
  esperar: object({
    desde: Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
    segundos: Type.Number({ minimum: 0 }),
  }),
};
export const mcpTools = [
  { ...said.leer, inputSchema: mcpInputs.leer },
  { ...said.acciones, inputSchema: mcpInputs.acciones },
  { ...said.actuar, inputSchema: mcpInputs.actuar },
  { ...said.esperar, inputSchema: mcpInputs.esperar },
];
export class RpcError extends Error {
  readonly code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}
export type RpcId = string | number | null;
export function rpcMessage(value: unknown) {
  if (
    !isRecord(value) ||
    value.jsonrpc !== "2.0" ||
    typeof value.method !== "string" ||
    (value.id !== undefined && value.id !== null && typeof value.id !== "string" && typeof value.id !== "number") ||
    (typeof value.id === "number" && !Number.isFinite(value.id)) ||
    (value.params !== undefined && !isRecord(value.params))
  )
    throw new RpcError(-32600, said.request);
  const id: RpcId = typeof value.id === "string" || typeof value.id === "number" ? value.id : null;
  return { id, method: value.method, params: value.params };
}
export function toolCall(params: unknown): { name: keyof typeof mcpInputs; args: Record<string, unknown> } {
  if (!isRecord(params) || typeof params.name !== "string" || !Object.hasOwn(mcpInputs, params.name))
    throw new RpcError(-32602, said.params);
  const name = params.name;
  if (name !== "leer" && name !== "acciones" && name !== "actuar" && name !== "esperar")
    throw new RpcError(-32602, said.params);
  const args: unknown = params.arguments ?? {};
  if (name !== "esperar" && isRecord(args) && Object.hasOwn(args, "herramienta"))
    throw new RpcError(-32602, said.programParameter);
  if (
    !isRecord(args) ||
    (args.objetivo !== undefined && args.programa === undefined) ||
    !Value.Check(mcpInputs[name], args)
  )
    throw new RpcError(-32602, said.params);
  return { name, args };
}
export function initialize(params: unknown, serverInfo: { name: string; version: string }) {
  if (!isRecord(params) || typeof params.protocolVersion !== "string") throw new RpcError(-32602, said.params);
  const versions = ["2025-03-26", "2025-06-18", "2025-11-25"];
  return {
    protocolVersion: versions.includes(params.protocolVersion) ? params.protocolVersion : "2025-11-25",
    serverInfo,
    capabilities: { tools: { listChanged: false } },
    instructions: said.instructions,
  };
}
export const toolResult = (text: string, isError = false) => ({ content: [{ type: "text", text }], isError });
