import { Type, type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { freezeDeep, jsonSnapshot, type Frozen } from "../json.ts";
import { closed, name } from "./definition.ts";
import { ViewBoundContentSchema } from "./schema.ts";

const PortsSchema = closed({
  inputs: Type.Record(name, Type.Index(ViewBoundContentSchema, ["kind"]),
    { additionalProperties: false, maxProperties: 64 }),
  outputs: Type.Array(name, { uniqueItems: true, maxItems: 64 }),
});
type Ports = Frozen<Static<typeof PortsSchema>>;
type PortReferences<P extends Ports> = {
  readonly inputs: { readonly [K in keyof P["inputs"]]: { readonly kind: P["inputs"][K]; readonly input: K } };
  readonly outputs: P["outputs"];
  readonly output: { readonly [K in P["outputs"][number]]: K };
};

/** Names live here once; consumers select typed properties, never duplicate literals. */
export function viewPorts<const P extends Ports>(definition: P & Record<Exclude<keyof P, keyof Ports>, never>): PortReferences<P> {
  const source = jsonSnapshot(definition);
  if (!Check(PortsSchema, source)) throw new Error("INVALID_VIEW_PORTS");
  const inputs = Object.fromEntries(Object.entries(source.inputs).map(([input, kind]) => [input, { kind, input }]));
  const output = Object.fromEntries(source.outputs.map(name => [name, name]));
  return freezeDeep({ inputs, outputs: source.outputs, output }) as PortReferences<P>;
}
