// Prepara el mismo pedido para medir, diagnosticar y enviar, sin acceder a una llave ni al transporte.
import { requestBody } from "../../adapters/models/anthropic.ts";
import type { Card } from "../../adapters/models/catalog.ts";
import { requireMind } from "../../fields/mind-errors.ts";
import type { FitResult } from "./mind-frame-fit.ts";
import type { MindFrame, TurnExchange } from "./mind-ports.ts";
export function mindRequest(
  card: Card,
  frame: MindFrame,
  schema: Record<string, unknown>,
  exchanges?: readonly TurnExchange[],
) {
  const request = { card, maxOutputTokens: 16000, layers: frame.layers, changing: frame.changing, schema };
  return exchanges ? { ...request, exchanges } : request;
}
export function diagnoseMindRequest(
  card: Card,
  frame: MindFrame,
  schema: Record<string, unknown>,
  exchanges?: readonly TurnExchange[],
) {
  return requestBody(mindRequest(card, frame, schema, exchanges));
}
export function diagnoseFittedMindRequest(card: Card | undefined, fitted: FitResult, schema: Record<string, unknown>) {
  requireMind(card, "runtime.card");
  requireMind(!fitted.tooLarge, "runtime.frame-too-large");
  return diagnoseMindRequest(card, fitted.frame, schema);
}
