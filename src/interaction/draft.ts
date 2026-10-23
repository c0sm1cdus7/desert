import type { AssetReference } from "../assets/types.ts";
import type { ImageFileSelection } from "./image-input.ts";

export type DraftValue = string | readonly string[] | AssetReference | ImageFileSelection;
export type Draft = Record<string, DraftValue>;
