import { McpServer, fromJsonSchema, type JsonSchemaType } from "@modelcontextprotocol/server";
import type { LocalSession } from "../local/session.ts";
import { requireSessionBinding } from "../local/session-binding.ts";
import { Requests, type Method } from "../web/protocol.ts";
import { dispatch } from "../web/dispatch.ts";
import { controllerErrorCode } from "../web/errors.ts";
import { jsonSnapshot } from "../json.ts";

const agentMethods = ["preflight", "begin", "read", "prepare", "accept", "receipt", "offer", "activityCreate", "activityList",
  "activityRead", "activityAnswer", "activityReopen", "activityPrepare", "activityCancel"] as const satisfies readonly Method[];
const descriptions = {
  preflight: "Check canonical requirements and current eligibility without creating a run or executing a command.",
  begin: "Start an exposed journey for this identity. Creates a run, never executes the product command.",
  read: "Read only fields published by the admitted read journey, scoped to this identity.",
  prepare: "Validate inputs and prepare the admitted command. Returns its exact confirmation; does not execute it.",
  accept: "Explicitly execute the prepared command with its exact confirmation digest. Repeating the same intent returns its receipt. Never infer authorization from preparation alone.",
  receipt: "Recover the original intent receipt after uncertain delivery. Never create a replacement intent to retry execution.",
  offer: "Check a published subject action against current ownership and canonical state guards.",
  activityCreate: "Create a persistent activity draft using only installed journeys and views. Persist an occurrence UUID before sending; retry the exact occurrence and material after uncertain delivery. Does not execute a command.",
  activityList: "Discover this identity and surface's open, unexpired activity drafts. Returns bounded metadata, never draft answers.",
  activityRead: "Read this identity's persistent activity draft and its current reachable steps.",
  activityAnswer: "Answer an active activity step at its exact revision. Earlier changes invalidate dependent answers and prepared approval.",
  activityReopen: "Reopen an active step at its exact revision. Immediately invalidates that step, all later completions and prepared approval without executing the command.",
  activityPrepare: "Prepare a completed activity for explicit final acceptance. Does not execute the command.",
  activityCancel: "Cancel this identity's activity and invalidate its prepared approval.",
} satisfies Record<(typeof agentMethods)[number], string>;

const readOnly = new Set<Method>(["preflight", "read", "receipt", "offer", "activityRead", "activityList"]);
// TypeBox's symbol metadata is authoring-only, not part of its JSON Schema wire representation.
const requestSchemas = Object.fromEntries(Object.entries(Requests).map(([method, schema]) =>
  [method, JSON.parse(JSON.stringify(schema)) as JsonSchemaType])) as Record<Method, JsonSchemaType>;

export function createAgentMcpServer(session: LocalSession) {
  const binding = requireSessionBinding(session);
  const surface = binding.application.surface(binding.surface);
  if (surface.kind !== "agent") throw new Error("MCP_AGENT_SURFACE_REQUIRED");
  const server = new McpServer({ name: `${surface.productId}-desert`, version: "1.0.0" });
  server.registerTool("catalog", {
    description: "Describe this agent surface's exposed journeys, input schemas and published read fields. Registration is not proof that a controller is currently reachable.",
    inputSchema: fromJsonSchema({ type: "object", properties: {}, additionalProperties: false }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async () => ({ content: [], structuredContent: jsonSnapshot(surface) }));
  for (const method of agentMethods) {
    if (method.startsWith("activity") && !binding.activitiesDigest) continue;
    server.registerTool(method, {
      description: descriptions[method], inputSchema: fromJsonSchema(requestSchemas[method]),
      annotations: { readOnlyHint: readOnly.has(method), destructiveHint: method === "accept",
        idempotentHint: readOnly.has(method) || method === "accept" || method === "activityCreate", openWorldHint: false },
    }, async input => {
      try {
        const result = await dispatch(session, method, input);
        return { content: [], structuredContent: { result: jsonSnapshot(result) } };
      } catch (error) {
        const code = controllerErrorCode(error);
        return { isError: true, content: [{ type: "text" as const, text: code }], structuredContent: { error: code } };
      }
    });
  }
  return server;
}
