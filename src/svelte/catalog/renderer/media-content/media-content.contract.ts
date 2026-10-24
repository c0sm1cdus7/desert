// The props of MediaContent: the media library, the open album (null for the library root) and `onalbum`, called with
// the album to open (required: the library it mounts needs it). `select` reveals a record and says whether it could.
import { Type } from "@sinclair/typebox";
import { MediaLibrarySchema } from "../../../../views/media-library.ts";

export const MediaContentContract = {
  props: Type.Object({
    library: MediaLibrarySchema,
    album: Type.Union([Type.String(), Type.Null()]),
    onalbum: Type.Function([Type.String()], Type.Void()),
  }, { additionalProperties: false }),
  instance: Type.Object({ select: Type.Function([Type.String()], Type.Boolean()) }, { additionalProperties: false }),
} as const;
