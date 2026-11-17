// The shared visible-text pattern and closed-object schema used by fields and house declarations.
import { Type, type TProperties } from "@sinclair/typebox";
export const object = <T extends TProperties>(fields: T) => Type.Object(fields, { additionalProperties: false });
// Unicode White_Space, Cc, Cf and Default_Ignorable_Code_Point, plus blank glyphs; ranges work without the u flag.
export const visibleText = [
  "(?:[^\\u0000-\\u0020\\u007f-\\u00a0\\u00ad\\u034f\\u0600-\\u0605\\u061c\\u06dd\\u",
  "070f\\u0890-\\u0891\\u08e2\\u115f-\\u1160\\u1680\\u17b4-\\u17b5\\u180b-\\u180f\\u",
  "2000-\\u200f\\u2028-\\u202f\\u205f-\\u206f\\u2800\\u3000\\u3164\\ufe00-\\ufe0f\\u",
  "feff\\uffa0\\ufff0-\\ufffb\\ud800-\\udfff]|(?!(?:\\ud804[\\udcbd\\udccd]|\\ud80",
  "d[\\udc30-\\udc3f]|\\ud82f[\\udca0-\\udca3]|\\ud834[\\udd73-\\udd7a]|\\udb40[\\u",
  "dc00-\\udfff]|\\udb41[\\udc00-\\udfff]|\\udb42[\\udc00-\\udfff]|\\udb43[\\udc00",
  "-\\udfff]))[\\ud800-\\udbff][\\udc00-\\udfff])",
].join("");
