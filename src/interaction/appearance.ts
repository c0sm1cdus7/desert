// The finite appearance values pieces draw: the system tints, the system wallpapers and the two modes a preview shows.
import { Type, type Static } from "@sinclair/typebox";

export const TintSchema = Type.Union([Type.Literal("blue"), Type.Literal("violet"), Type.Literal("rose"), Type.Literal("green"),
  Type.Literal("slate")]);
export const WallpaperSchema = Type.Union([Type.Literal("silk"), Type.Literal("mist"), Type.Literal("plain")]);
export const AppearanceModeSchema = Type.Union([Type.Literal("light"), Type.Literal("dark")]);
export type Tint = Static<typeof TintSchema>;
export type Wallpaper = Static<typeof WallpaperSchema>;
export type AppearanceMode = Static<typeof AppearanceModeSchema>;
