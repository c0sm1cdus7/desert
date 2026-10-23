/** Finite local controls, not a consumer-provided render function. */
export type ToolbarControls = Readonly<{ kind: "calendar" }>;

export function assertToolbarControls(value: unknown): asserts value is ToolbarControls | undefined {
  if (value === undefined) return;
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Reflect.ownKeys(value).length !== 1 || !("kind" in value) || value.kind !== "calendar") {
    throw new Error("INVALID_TOOLBAR_CONTROLS");
  }
}
