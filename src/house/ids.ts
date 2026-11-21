// the ids the house reserves: own acts, mind actors, the house supervisor, reminders, secrets
export const ids = {
  mind: "mind:",
  /** The one house supervisor: a mind with no program of its own; composition reserves the program id. */
  supervisor: "mind:supervisor",
  self: "me",
  attention: "attention:",
  secret: "secret:",
} as const;
