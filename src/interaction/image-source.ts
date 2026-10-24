// Where a picture comes from: a public path or URL, or a private asset reference the media proxy resolves.
import { Type, type Static } from "@sinclair/typebox";
import { AssetReferenceSchema } from "../assets/types.ts";

export const ImageSourceSchema = Type.Union([Type.String(), AssetReferenceSchema]);
export type ImageSource = Readonly<Static<typeof ImageSourceSchema>>;
