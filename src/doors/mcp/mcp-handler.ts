// Maneja HTTP y JSON-RPC sin sockets; cada pedido toma su identidad de la llave y usa los puertos de la casa.
import { isMindActor } from "../../fields/mind-actor.ts";
import { present } from "../../house/kit.ts";
import type { Program, ViewLimits } from "../../tools/tool-contract.ts";
import { requestBook } from "../socket/requests/request-book.ts";
import { houseChange } from "../socket/requests/house-change.ts";
import { requestBudget } from "../socket/peers/request-budget.ts";
import { socketLimits } from "../socket/wire/protocol.ts";
import type { DoorKey } from "../socket/peers/socket-peer.ts";
import { mcpTexts as said } from "../../texts/mcp.texts.ts";
import { authenticate, bodyFailure, readBody, empty, type McpRequest, type McpResponse } from "./mcp-access.ts";
import { initialize, mcpTools, rpcMessage, RpcError, toolCall, toolResult, type RpcId } from "./mcp-protocol.ts";
import { mcpReading, type McpHouse } from "./mcp-reading.ts";
import { mcpAct } from "./mcp-actions.ts";
export type McpOptions = Readonly<{ name: string; version: string; limits: Omit<ViewLimits, "now"> }>;
const json = (value: unknown): McpResponse => ({
  status: 200,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(value),
});
export function mcpDoor<X extends Program>(
  house: McpHouse<X>,
  keys: ReadonlyMap<string, DoorKey>,
  options: McpOptions,
) {
  if (
    !options.name ||
    !options.version ||
    !Number.isSafeInteger(options.limits.recentLines) ||
    options.limits.recentLines < 1
  )
    throw new Error("MCP requires name, version and positive recentLines");
  const book = requestBook(house);
  const controller = new AbortController();
  const pending = new Set<Promise<McpResponse>>();
  const waits = new Map<string, number>();
  const call = caller(house, book, options, waits);
  const dispatch = dispatcher(house, keys, controller.signal, call);
  const handle = (request: McpRequest) => {
    const work = dispatch(request);
    pending.add(work);
    void work.then(
      () => pending.delete(work),
      () => pending.delete(work),
    );
    return work;
  };
  const close = async () => {
    controller.abort();
    await Promise.allSettled([...pending]);
    book.stop();
  };
  return { handle, close };
}
function dispatcher<X extends Program>(
  house: McpHouse<X>,
  keys: ReadonlyMap<string, DoorKey>,
  closing: AbortSignal,
  call: (by: string, method: string, params: unknown, signal: AbortSignal) => Promise<unknown>,
) {
  // Each identity gets the socket's rolling window of requests, whatever connection or key it comes through.
  const budgets = new Map<string, ReturnType<typeof requestBudget>>();
  return async (request: McpRequest): Promise<McpResponse> => {
    if (request.method === "GET" && request.path === "/salud")
      return { status: 200, headers: { "Content-Type": "text/plain" }, body: said.health };
    if (request.method === "GET" && request.path === "/mcp") return empty(405, { Allow: "POST" });
    if (request.method !== "POST" || request.path !== "/mcp") return empty(404);
    const by = identityOf(house, keys, request);
    if (!by) return empty(401, { "WWW-Authenticate": "Bearer" });
    if (closing.aborted) return empty(503);
    const budget = budgets.get(by) ?? requestBudget();
    budgets.set(by, budget);
    if (!budget.take(false)) return empty(429, { "Retry-After": "1" });
    const failed = bodyFailure(request);
    if (failed) return failed;
    const signal = request.signal ? AbortSignal.any([closing, request.signal]) : closing;
    return protocol(
      request,
      (method, params) => call(by, method, params, signal),
      house,
      keys,
      () => identityOf(house, keys, request) === by,
    );
  };
}
function identityOf<X extends Program>(house: McpHouse<X>, keys: ReadonlyMap<string, DoorKey>, request: McpRequest) {
  const key = authenticate(request, keys);
  return key && !isMindActor(key.identity) && present(house.registry, house.tools.state().house, key.identity)
    ? key.identity
    : undefined;
}
async function protocol<X extends Program>(
  request: McpRequest,
  call: (method: string, params: unknown) => Promise<unknown>,
  house: McpHouse<X>,
  keys: ReadonlyMap<string, DoorKey>,
  authorized: () => boolean,
): Promise<McpResponse> {
  let id: RpcId = null;
  try {
    let value: unknown;
    try {
      const body = await readBody(request);
      if (body === undefined) return empty(413);
      if (!authorized()) return empty(401, { "WWW-Authenticate": "Bearer" });
      value = JSON.parse(body);
    } catch {
      throw new RpcError(-32700, said.parse);
    }
    const message = rpcMessage(value);
    id = message.id;
    if (message.method.startsWith("notifications/")) return empty(202);
    const result = await call(message.method, message.params);
    if (!authorized()) return empty(401, { "WWW-Authenticate": "Bearer" });
    return json(publicResult(house, keys, { jsonrpc: "2.0", id, result }));
  } catch (error) {
    if (!authorized()) return empty(401, { "WWW-Authenticate": "Bearer" });
    return json(
      publicResult(house, keys, {
        jsonrpc: "2.0",
        id,
        error: {
          code: error instanceof RpcError ? error.code : -32603,
          message: error instanceof RpcError ? error.message : said.failed,
        },
      }),
    );
  }
}
function publicResult<X extends Program>(
  house: McpHouse<X>,
  keys: ReadonlyMap<string, DoorKey>,
  value: unknown,
): unknown {
  const clean = house.tools.prepare(value);
  const redact = (value: unknown): unknown => {
    if (typeof value === "string") {
      let text = value;
      for (const key of keys.keys()) if (key) text = text.split(key).join(said.redacted);
      return text;
    }
    if (Array.isArray(value)) return value.map(redact);
    if (value && typeof value === "object")
      return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, redact(child)]));
    return value;
  };
  return redact(clean);
}
function caller<X extends Program>(
  house: McpHouse<X>,
  book: ReturnType<typeof requestBook<X>>,
  options: McpOptions,
  waits: Map<string, number>,
) {
  return async (by: string, method: string, params: unknown, signal: AbortSignal): Promise<unknown> => {
    if (method === "initialize") return initialize(params, { name: options.name, version: options.version });
    if (method === "ping") return {};
    if (method === "tools/list") return { tools: mcpTools };
    if (method !== "tools/call") throw new RpcError(-32601, said.method);
    const { name, args } = toolCall(params);
    const reading = mcpReading(house, by, options.limits);
    const program = typeof args.programa === "string" ? args.programa : undefined;
    const target = typeof args.objetivo === "string" ? args.objetivo : undefined;
    if (name === "leer") return reading.read(program, target);
    if (name === "acciones") return reading.actions(program, target);
    if (name === "esperar" && typeof args.desde === "number" && typeof args.segundos === "number")
      return wait(house, waits, by, { desde: args.desde, segundos: args.segundos }, signal);
    if (name === "actuar" && program !== undefined && typeof args.accion === "string")
      return mcpAct(
        house,
        book,
        by,
        program,
        args.accion,
        typeof args.objetivo === "string" ? args.objetivo : program,
        args.datos,
      );
    throw new RpcError(-32602, said.params);
  };
}
/** One identity keeps at most the socket's number of open waits; each frees its place when it ends. */
async function wait<X extends Program>(
  house: McpHouse<X>,
  waits: Map<string, number>,
  by: string,
  { desde, segundos }: Readonly<{ desde: number; segundos: number }>,
  signal: AbortSignal,
) {
  const open = waits.get(by) ?? 0;
  if (open >= socketLimits.waits) throw new RpcError(-32000, said.busy);
  waits.set(by, open + 1);
  try {
    const changed = await houseChange(
      () => house.tools.state().through,
      changed => house.bus.on(changed),
      desde,
      Math.min(60, segundos) * 1000,
      signal,
    );
    return toolResult(JSON.stringify(changed));
  } finally {
    waits.set(by, (waits.get(by) ?? 1) - 1);
  }
}
