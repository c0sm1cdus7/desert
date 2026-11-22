// Shapes a proposal's destination by kind and checks the chosen one against those the house offers.
import { Type, type TProperties } from "@sinclair/typebox";
import { object } from "../../fields/visible-text.ts";
import type { ExecutionDestination } from "../../fields/device-protocol.ts";
/** One destination is a literal; among several, a device is named by a string the house checks against the menu. */
export function destinationFields(destinations: readonly ExecutionDestination[] | undefined): TProperties {
  if (!destinations) return {};
  const [only] = destinations;
  if (only && destinations.length === 1)
    return {
      destination:
        only.kind === "house"
          ? object({ kind: Type.Literal("house") })
          : object({ kind: Type.Literal("device"), device: Type.Literal(only.device) }),
    };
  const choices = [
    ...(destinations.some(each => each.kind === "house") ? [object({ kind: Type.Literal("house") })] : []),
    ...(destinations.some(each => each.kind === "device")
      ? [object({ kind: Type.Literal("device"), device: Type.String() })]
      : []),
  ];
  return { destination: choices.length > 1 ? Type.Union(choices) : (choices[0] ?? Type.Never()) };
}
export function destinationAllowed(
  destinations: readonly ExecutionDestination[] | undefined,
  chosen: ExecutionDestination | undefined,
): boolean {
  if (!destinations) return chosen === undefined;
  return destinations.some(destination =>
    destination.kind === "house"
      ? chosen?.kind === "house"
      : chosen?.kind === "device" && chosen.device === destination.device,
  );
}
