// The JSON-RPC messages and the four fixed tools of the MCP door, with no transport session.
import { executionDestination } from "../../fields/device-protocol.ts";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { object } from "../../fields/visible-text.ts";
import { isRecord } from "../../fields/json-values.ts";
import { mcpTexts as said } from "../../texts/mcp.texts.ts";
const name = Type.String({ minLength: 1, maxLength: 256 });
const selection = object({ program: Type.Optional(name), target: Type.Optional(name) });
export const mcpInputs = {
  read: selection,
  actions: selection,
  act: object({
    program: name,
    action: name,
    target: Type.Optional(name),
    data: Type.Record(Type.String(), Type.Unknown()),
    destination: Type.Optional(executionDestination),
  }),
  wait: object({
    since: Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
    seconds: Type.Number({ minimum: 0 }),
  }),
};
export const mcpTools = [
  { name: "read", description: said.read, inputSchema: mcpInputs.read },
  { name: "actions", description: said.actions, inputSchema: mcpInputs.actions },
  { name: "act", description: said.act, inputSchema: mcpInputs.act },
  { name: "wait", description: said.wait, inputSchema: mcpInputs.wait },
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
  if (name !== "read" && name !== "actions" && name !== "act" && name !== "wait")
    throw new RpcError(-32602, said.params);
  const args: unknown = params.arguments ?? {};
  if (
    !isRecord(args) ||
    (args.target !== undefined && args.program === undefined) ||
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
