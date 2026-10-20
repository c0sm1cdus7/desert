// Keep the original shape-only compatibility checks independent of Notebook's new domain facts.
export const LegacyShape = { id: "notebook", objects: [{ id: "note", facts: {
  title: { kind: "text", minLength: 1 }, body: { kind: "text", minLength: 1 },
} }] };
