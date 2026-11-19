// Handle authenticated HTTP and JSON-RPC without sockets and preserve explicit correlation after redaction.
export { deriveHostCredential } from "./host-credential.ts";
import { mcpCredentials, credentialRoutes, type McpCredentialOptions } from "./mcp-credentials.ts";
import { requestDigest } from "../socket/requests/public-message.ts";
import { socketHttp } from "./socket-http.ts";
import { mcpSessions, abortableResponse } from "./mcp-sessions.ts";
import { redeemHttp } from "./invitation-http.ts";
import type { DoorAccess } from "../../runtime/door-access.ts";
import { Value } from "@sinclair/typebox/value";
import { executionDestination } from "../../fields/device-protocol.ts";
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
import { doorTexts } from "../../texts/doors.texts.ts";
import { isRecord } from "../../fields/json-values.ts";
import { mcpAct, privateInvitation } from "./mcp-actions.ts";
export type McpOptions = Readonly<{
  name: string;
  version: string;
  limits: Omit<ViewLimits, "now">;
}> &
  McpCredentialOptions;
const json = (value: unknown): McpResponse => ({
  status: 200,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(value),
});
export function mcpDoor<X extends Program>(
  house: McpHouse<X>,
  keysOrOptions: ReadonlyMap<string, DoorKey> | McpOptions,
  givenOptions?: McpOptions,
) {
  const founders = "get" in keysOrOptions ? keysOrOptions : undefined;
  const options = "get" in keysOrOptions ? givenOptions : keysOrOptions;
  if (!options) throw new Error("Missing MCP options");
  const { keys, oauth } = mcpCredentials(house, options, founders);
  validateOptions(options);
  const remote = socketHttp(house, keys);
  const book = requestBook(house);
  const controller = new AbortController();
  const pending = new Set<Promise<McpResponse>>();
  const waits = new Map<string, number>();
  const call = caller(house, book, options, waits);
  const sessions = mcpSessions(changed => house.bus.on(changed));
  const dispatch = dispatcher(house, keys, controller.signal, call, sessions.track);
  const route = credentialRoutes(dispatch, remote, oauth, controller.signal);
  const handle = (request: McpRequest) => {
    const work = route(request);
    pending.add(work);
    void work.then(
      () => pending.delete(work),
      () => pending.delete(work),
    );
    return work;
  };
  const close = async () => {
    controller.abort();
    sessions.close();
    await remote.close();
    await Promise.allSettled([...pending]);
    oauth?.close();
    book.stop();
  };
  return { handle, close };
}
function dispatcher<X extends Program>(
  house: McpHouse<X>,
  keys: DoorAccess,
  closing: AbortSignal,
  call: (by: string, method: string, params: unknown, signal: AbortSignal) => Promise<unknown>,
  track: ReturnType<typeof mcpSessions>["track"],
) {
  // Each identity gets the socket's rolling window of requests, whatever connection or key it comes through.
  const budgets = new Map<string, ReturnType<typeof requestBudget>>();
  return async (request: McpRequest): Promise<McpResponse> => {
    if (request.method === "POST" && request.path === "/door/invitations/redeem")
      return closing.aborted ? empty(503) : redeemHttp(keys, request);
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
    return authorizedRequest(house, keys, request, by, closing, call, track);
  };
}
async function authorizedRequest<X extends Program>(
  house: McpHouse<X>,
  keys: DoorAccess,
  request: McpRequest,
  by: string,
  closing: AbortSignal,
  call: (by: string, method: string, params: unknown, signal: AbortSignal) => Promise<unknown>,
  track: ReturnType<typeof mcpSessions>["track"],
) {
  const revoked = new AbortController();
  const stop = track(revoked, () => identityOf(house, keys, request) === by);
  const signal = AbortSignal.any([closing, revoked.signal, ...(request.signal ? [request.signal] : [])]);
  try {
    return await abortableResponse(
      protocol(
        request,
        (method, params) => call(by, method, params, signal),
        house,
        keys,
        () => identityOf(house, keys, request) === by,
      ),
      signal,
      () => empty(identityOf(house, keys, request) === by ? 503 : 401),
    );
  } finally {
    stop();
    revoked.abort();
  }
}
function identityOf<X extends Program>(house: McpHouse<X>, keys: DoorAccess, request: McpRequest) {
  const key = authenticate(request, keys);
  return key && !isMindActor(key.identity) && present(house.registry, house.tools.state().house, key.identity)
    ? key.identity
    : undefined;
}
async function protocol<X extends Program>(
  request: McpRequest,
  call: (method: string, params: unknown) => Promise<unknown>,
  house: McpHouse<X>,
  keys: DoorAccess,
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
function publicResult<X extends Program>(house: McpHouse<X>, keys: DoorAccess, value: unknown): unknown {
  const clean = house.tools.prepare(value);
  const redact = (value: unknown): unknown => {
    if (typeof value === "string") {
      let text = value;
      text = text.replace(/[A-Za-z0-9_+-]{8,}={0,2}/g, token => (keys.get(token) ? said.redacted : token));
      return text;
    }
    if (Array.isArray(value)) return value.map(redact);
    if (value && typeof value === "object")
      return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, redact(child)]));
    return value;
  };
  const safe = redact(clean);
  if (
    isRecord(value) &&
    isRecord(value.result) &&
    privateInvitation in value.result &&
    typeof value.result[privateInvitation] === "string" &&
    isRecord(safe) &&
    isRecord(safe.result) &&
    Array.isArray(safe.result.content)
  ) {
    safe.result.content.push({ type: "text", text: doorTexts.receipt(value.result[privateInvitation]) });
  }
  // Both doors use the same tagged digest when echoing the original identifier would disclose a credential.
  if (isRecord(value) && typeof value.id === "string" && isRecord(safe) && safe.id !== value.id)
    return { ...safe, id: requestDigest(value.id), correlation: "sha256" };
  return safe;
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
    const program = typeof args.program === "string" ? args.program : undefined;
    const target = typeof args.target === "string" ? args.target : undefined;
    if (name === "read") return reading.read(program, target);
    if (name === "actions") return reading.actions(program, target);
    if (name === "wait" && typeof args.since === "number" && typeof args.seconds === "number")
      return wait(house, waits, by, { since: args.since, seconds: args.seconds }, signal);
    if (name === "act" && program !== undefined && typeof args.action === "string")
      return mcpAct(
        house,
        book,
        by,
        program,
        args.action,
        typeof args.target === "string" ? args.target : program,
        args.data,
        Value.Check(executionDestination, args.destination) ? args.destination : undefined,
        signal,
      );
    throw new RpcError(-32602, said.params);
  };
}
/** One identity keeps at most the socket's number of open waits; each frees its place when it ends. */
async function wait<X extends Program>(
  house: McpHouse<X>,
  waits: Map<string, number>,
  by: string,
  { since, seconds }: Readonly<{ since: number; seconds: number }>,
  signal: AbortSignal,
) {
  const open = waits.get(by) ?? 0;
  if (open >= socketLimits.waits) throw new RpcError(-32000, said.busy);
  waits.set(by, open + 1);
  try {
    const changed = await houseChange(
      () => house.tools.state().through,
      changed => house.bus.on(changed),
      since,
      Math.min(60, seconds) * 1000,
      signal,
    );
    return toolResult(JSON.stringify(changed));
  } finally {
    waits.set(by, (waits.get(by) ?? 1) - 1);
  }
}

function validateOptions(options: McpOptions) {
  if (
    !options.name ||
    !options.version ||
    !Number.isSafeInteger(options.limits.recentLines) ||
    options.limits.recentLines < 1
  )
    throw new Error("MCP requires name, version and positive recentLines");
}
