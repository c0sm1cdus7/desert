import { Type, type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { labelLimits } from "./labels.ts";
import { fileLimits } from "./assets/policy.ts";
import { mediaTypes, policyOrder, type MediaType } from "./media/rendition-policy.ts";

const TextField = Type.Object({
  kind: Type.Literal("text"),
  minLength: Type.Optional(Type.Integer({ minimum: 0 })),
  maxLength: Type.Optional(Type.Integer({ minimum: 0 })),
}, { additionalProperties: false });

const IntegerField = Type.Object({
  kind: Type.Literal("integer"),
  minimum: Type.Optional(Type.Integer({ minimum: Number.MIN_SAFE_INTEGER, maximum: Number.MAX_SAFE_INTEGER })),
  maximum: Type.Optional(Type.Integer({ minimum: Number.MIN_SAFE_INTEGER, maximum: Number.MAX_SAFE_INTEGER })),
}, { additionalProperties: false });

const PrincipalField = Type.Object({ kind: Type.Literal("principal") }, { additionalProperties: false });
/** A file of one of the accepted media types (src/media/rendition-policy.ts) of at most maxBytes. Its value is the reference
 * to the SDK's `asset` object that holds the file (src/assets/object.ts). */
const FileField = Type.Object({ kind: Type.Literal("file"),
  accept: Type.Array(Type.Union(mediaTypes.map(type => Type.Literal(type))), { minItems: 1, uniqueItems: true }),
  maxBytes: Type.Integer({ minimum: 1, maximum: fileLimits.maxBytes }),
}, { additionalProperties: false });
const LabelConstraintsSchema = Type.Object({
  maxItems: Type.Optional(Type.Integer({ minimum: 1, maximum: labelLimits.maxItems })),
  maxLength: Type.Optional(Type.Integer({ minimum: 1, maximum: labelLimits.maxLength })),
}, { additionalProperties: false });
const LabelsField = Type.Object({ kind: Type.Literal("labels"),
  maxItems: Type.Integer({ minimum: 1, maximum: 200 }),
  maxLength: Type.Integer({ minimum: 1, maximum: labelLimits.maxLength }),
  reference: Type.Optional(Type.Union([Type.Object({ object: Type.String({minLength:1}), label: Type.String({minLength:1}),
    color: Type.Optional(Type.String({minLength:1})) }, {additionalProperties:false}),
    Type.Object({object:Type.String({minLength:1}),media:Type.String({minLength:1}),memberOf:Type.Optional(Type.String({minLength:1})),
      where:Type.Optional(Type.Record(Type.String(),Type.String({minLength:1})))},{additionalProperties:false})])),
}, { additionalProperties: false });
const EnumField = Type.Object({ kind: Type.Literal("enum"), values: Type.Array(Type.String({ minLength: 1 }), {
  minItems: 1, uniqueItems: true,
}) }, { additionalProperties: false });

export const FieldDefinitionSchema = Type.Union([TextField, IntegerField, PrincipalField, EnumField, FileField, LabelsField]);
export type FieldDefinition = Static<typeof FieldDefinitionSchema>;

export function text(options: Omit<Static<typeof TextField>, "kind"> = {}): Static<typeof TextField> {
  return { ...options, kind: "text" };
}

export function integer(options: Omit<Static<typeof IntegerField>, "kind"> = {}): Static<typeof IntegerField> {
  return { ...options, kind: "integer" };
}

export function principal(): Static<typeof PrincipalField> { return { kind: "principal" }; }
/** A file fact: the media types it accepts (kept in the policy's order, src/media/rendition-policy.ts) and its size limit,
 * at most the SDK's (src/assets/policy.ts). Raises INVALID_FILE_DEFINITION. */
export function file<const A extends readonly [MediaType, ...MediaType[]]>(options: { readonly accept: A; readonly maxBytes: number }):
  Readonly<{ kind: "file"; accept: A[number][]; maxBytes: number }> {
  const shaped = typeof options === "object" && options !== null && Object.keys(options).sort().join(",") === "accept,maxBytes"
    && Array.isArray(options.accept);
  const accept = shaped ? policyOrder(options.accept) : [];
  const definition = { kind: "file" as const, accept, maxBytes: shaped ? options.maxBytes : 0 };
  if (!shaped || accept.length !== options.accept.length || !Check(FileField, definition)) {
    throw new Error(`INVALID_FILE_DEFINITION: accept distinct types of ${mediaTypes.join(", ")}; maxBytes 1 to ${fileLimits.maxBytes}`);
  }
  return Object.freeze({ ...definition, accept: Object.freeze([...accept]) as A[number][] });
}
export function labels(options: Static<typeof LabelConstraintsSchema> = {}): Readonly<Static<typeof LabelsField>> {
  if (!Check(LabelConstraintsSchema, options)) throw new Error("INVALID_LABELS_DEFINITION");
  return Object.freeze({ kind: "labels", ...labelLimits, ...options });
}
/** A bounded many-reference value. Target labels/colors are presentation, never stored in the association. */
export function references<const O extends {readonly id:string; readonly facts:Readonly<Record<string, FieldDefinition>>}>(
  object:O, options:{label:{[K in keyof O['facts']]:O['facts'][K] extends {kind:'text'} ? K : never}[keyof O['facts']];
    color:{[K in keyof O['facts']]:O['facts'][K] extends {kind:'enum'} ? K : never}[keyof O['facts']]},
): Readonly<Static<typeof LabelsField>> {
  if (!object?.id || !options || Object.keys(options).length !== 2 || object.facts[options.label]?.kind !== 'text'
    || object.facts[options.color]?.kind !== 'enum') throw new Error('INVALID_REFERENCE_DEFINITION');
  return Object.freeze({kind:'labels',maxItems:12,maxLength:36,
    reference:Object.freeze({object:object.id,label:String(options.label),color:String(options.color)})});
}
export function enumeration<const V extends [string, ...string[]]>(values: V) {
  return { kind: "enum" as const, values };
}
export function mediaReferences(object:string | {readonly id:string;readonly facts:Readonly<Record<string,FieldDefinition>>},
  options:{media:string;maxItems?:number;memberOf?:string;where?:Readonly<Record<string,string>>}) {
  const id=typeof object==='string' ? object : object?.id;
  if (!id || !options || Object.keys(options).some(key=>!['media','maxItems','memberOf','where'].includes(key)) || !options.media
    || typeof object !== 'string' && object.facts[options.media]?.kind !== 'file'
    || options.maxItems !== undefined && (!Number.isInteger(options.maxItems) || options.maxItems<1 || options.maxItems>200)
    || options.memberOf !== undefined && !options.memberOf) throw new Error('INVALID_REFERENCE_DEFINITION');
  return Object.freeze({kind:'labels' as const,maxItems:options.maxItems ?? 200,maxLength:36,
    reference:Object.freeze({object:id,media:options.media,...(options.memberOf?{memberOf:options.memberOf}:{}),...(options.where?{where:{...options.where}}:{})})});
}
export function namedReferences<const O extends {readonly id:string;readonly facts:Readonly<Record<string,FieldDefinition>>}>(object:O,
  options:{label:{[K in keyof O['facts']]:O['facts'][K] extends {kind:'text'} ? K : never}[keyof O['facts']]}) {
  if (!object?.id || !options || Object.keys(options).length !== 1 || object.facts[options.label]?.kind !== 'text') throw new Error('INVALID_REFERENCE_DEFINITION');
  return Object.freeze({kind:'labels' as const,maxItems:12,maxLength:36,reference:Object.freeze({object:object.id,label:String(options.label)})});
}
