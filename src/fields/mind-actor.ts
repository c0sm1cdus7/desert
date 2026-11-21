// Tells an identity's assistant apart from a tool's own mind.
import { Type } from "@sinclair/typebox";
import { requireMind } from "./mind-errors.ts";
export type ToolMindActor = `mind:${string}`;
export type AssistantActor = `assistant:${string}`;
export type MindActor = ToolMindActor | AssistantActor;
/** The one house supervisor: a mind with no program of its own. Programs name it here, as a thread participant. */
export const houseSupervisor = "mind:supervisor" satisfies ToolMindActor;
const ownerPattern = "[a-z][a-z0-9.-]{0,63}";
export const assistantOwner = Type.String({ pattern: `^${ownerPattern}$` });
export const mindActor = Type.Union([
  Type.String({ pattern: "^mind:[^\\s:]+$" }),
  Type.String({ pattern: `^assistant:${ownerPattern}$` }),
]);
/** Reserved prefixes stay reserved even when their suffix is malformed. */
export const isMindActor = (actor: string): boolean => actor.startsWith("mind:") || actor.startsWith("assistant:");
export function assistantOf(owner: string): AssistantActor {
  requireMind(typeof owner === "string" && new RegExp(`^${ownerPattern}$`).test(owner), "owner");
  return `assistant:${owner}`;
}
export function parseMindActor(
  actor: string,
): Readonly<{ kind: "tool"; tool: string }> | Readonly<{ kind: "assistant"; owner: string }> | undefined {
  requireMind(typeof actor === "string", "actor");
  if (actor.startsWith("mind:") && actor.slice(5)) return { kind: "tool", tool: actor.slice(5) };
  if (actor.startsWith("assistant:") && new RegExp(`^${ownerPattern}$`).test(actor.slice(10)))
    return { kind: "assistant", owner: actor.slice(10) };
  return undefined;
}
