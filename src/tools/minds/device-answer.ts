// Limita la elección de una propuesta a los destinos compatibles ofrecidos por la casa.
import { Type, type TProperties } from "@sinclair/typebox";
import { object } from "../../fields/visible-text.ts";
import type { ExecutionDestination } from "../../fields/device-protocol.ts";
export function destinationFields(destinations: readonly ExecutionDestination[] | undefined): TProperties {
  if (!destinations) return {};
  const choices = destinations.map(destination =>
    destination.kind === "house"
      ? object({ kind: Type.Literal("house") })
      : object({ kind: Type.Literal("device"), device: Type.Literal(destination.device) }),
  );
  return { destination: choices.length ? Type.Union(choices) : Type.Never() };
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
