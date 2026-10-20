import type { Facts } from "./types.ts";

export function matchesConditions(facts: Facts, conditions: Facts) {
  return Object.entries(conditions).every(([field, value]) => facts[field] === value);
}
