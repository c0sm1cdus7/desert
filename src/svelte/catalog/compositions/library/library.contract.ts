// The props of Library: the media `library`, the open `album` (null for the whole library) and `onalbum`, raised when a
// card opens an album. A caller that binds it may `select(record)` a search result: true when the record was found.
import { Type } from "@sinclair/typebox";
import { MediaLibrarySchema } from "../../../../views/media-library.ts";

export const LibraryContract = {
  props: Type.Object({
    library: MediaLibrarySchema,
    album: Type.Union([Type.String(), Type.Null()]),
  }, { additionalProperties: false }),
  events: Type.Object({
    album: Type.String(),
  }, { additionalProperties: false }),
  instance: Type.Object({
    select: Type.Function([Type.String()], Type.Boolean()),
  }, { additionalProperties: false }),
} as const;
