import { enumeration, objectType, ownershipPolicy, principal, text } from "desert-sdk/src/index.ts";

export const Note = objectType({
  id: "note",
  facts: {
    title: text({ minLength: 1 }),
    body: text({ minLength: 1 }),
    owner: principal(),
    state: enumeration(["active", "archived"]),
  },
});

export const OnlyOwnerCanAccess = ownershipPolicy(Note, "owner");
