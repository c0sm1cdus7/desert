// the ids the house reserves: own acts, mind actors, the house supervisor, reminders, secrets
import { houseSupervisor } from "../fields/mind-actor.ts";
export const ids = {
  mind: "mind:",
  /** The one house supervisor: a mind with no program of its own; composition reserves the program id. */
  supervisor: houseSupervisor,
  self: "me",
  attention: "attention:",
  secret: "secret:",
} as const;
