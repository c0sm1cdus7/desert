// The operating system's colour scheme as nonvisual state. AppearanceRoot, the one foundation that reads the platform
// preference, publishes it here; compositions read `systemScheme` instead of calling matchMedia.
import { Type, type Static } from "@sinclair/typebox";
import { readonly, writable } from "svelte/store";

export const SystemSchemeSchema = Type.Union([Type.Literal("light"), Type.Literal("dark")]);
export type SystemScheme = Static<typeof SystemSchemeSchema>;

/** Light until AppearanceRoot publishes the platform's preference (the scheme a page without one renders in). */
const scheme = writable<SystemScheme>("light");

/** The system colour scheme, as last published by AppearanceRoot. */
export const systemScheme = readonly(scheme);

/** AppearanceRoot's writer: the platform preference it read. */
export function publishSystemScheme(value: SystemScheme): void {
  scheme.set(value);
}
