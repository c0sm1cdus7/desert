export type ToolbarIdentityContent = Readonly<{ title: string; subtitle?: string | undefined }>;

/** Continuation echoes an existing heading; dialog roles preserve the native accessible title. */
export type ToolbarIdentityRole = "heading" | "continuation" | "dialog" | "message";
