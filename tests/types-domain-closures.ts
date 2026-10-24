// Domain closures of slice 3 (design §3.0): what a contract carries is JSON, a closed schema or a string token, never
// unknown or an object identity. Each marked line must fail to type-check; tests/type-guarantees.test.ts proves it.
import type { Json } from "../src/json.ts";
import type { InputPropertySchema, JourneyInputSchema } from "../src/input-schema.ts";
import type { ValidationIssue } from "../src/validation-result.ts";
import type { ResolvedPanel } from "../src/views/resolved.ts";
import type { ViewEventOwner } from "../src/web/client/view-events.ts";
import type { ValidateInput } from "../src/web/types.ts";

declare const validate: ValidateInput;
const draft: Json = { title: "Notes", tags: ["a"], count: 2, done: false, empty: null };
validate("save", draft);
// @ts-expect-error Input is JSON: a missing value is not a draft.
validate("save", undefined);
// @ts-expect-error Input is JSON: a function is not a draft.
validate("save", { title: () => "Notes" });
const limit: Json | undefined = validate.inspect?.("save", draft).issues[0]?.params?.["limit"];
// @ts-expect-error Diagnostic parameters are JSON, not platform values.
const dated: ValidationIssue = { keyword: "format", instancePath: "", params: { at: new Date() } };

declare const schema: JourneyInputSchema;
const maxItems: number | undefined = schema.properties["tags"]?.maxItems;
const nested: InputPropertySchema | undefined = schema.properties["cover"]?.properties?.["media"];
// @ts-expect-error A property schema is closed: no keyword outside the subset the compiler emits.
const opened: InputPropertySchema = { type: "string", format: "email" };

declare const frame: ResolvedPanel["frame"];
const reading: ResolvedPanel = { frame, label: "Note", locked: false, readingIdentity: "reading-1" };
// @ts-expect-error A reading identity is a string token, never an object identity.
const objectReading: ResolvedPanel = { frame, label: "Note", locked: false, readingIdentity: {} };

declare const owner: ViewEventOwner;
const continuity: string = owner.key;
void [limit, dated, maxItems, nested, opened, reading, objectReading, continuity];
