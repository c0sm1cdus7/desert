import type { HumanSurface, ValidateInput } from "../types.ts";
import type { ViewProgram } from "../../views/program-schema.ts";
import { sourceRead } from "../../views/program-bindings.ts";
import { humanProduct } from "./model.ts";
import { readModelScope, type ModelScope } from "./model-scope.ts";
import { webTransport, type ControllerTransport } from "./transport.ts";
import { sharedWebConnection } from "./connection.ts";
import type { DraftFileHost } from "../../interaction/image-input.ts";

export function readScopes(program: ViewProgram, surface: HumanSurface) {
  return program.journeys.filter(item => item.kind === "read").map(read => {
    const mutations = program.journeys.filter(item => (item.kind === "create" || item.kind === "update" || item.kind === "action") &&
      sourceRead(program, surface, item).id === read.id);
    const creations = mutations.filter(item => item.kind === "create").map(item => item.id);
    return readModelScope(surface, { read: read.id, creations,
      ...(read.referenceCreation ? {referenceCreation:read.referenceCreation} : {}),
      ...(creations.length === 1 ? { primaryCreation: creations[0]! } : {}),
      subjectActions: mutations.filter(item => item.kind === "update" || item.kind === "action").map(item => item.id),
    });
  });
}

/** Read identity owns collection/draft epochs; transport and admission remain canonical. */
export function viewScopes(program: ViewProgram, surface: HumanSurface, validate: ValidateInput, transport?: ControllerTransport, files?: DraftFileHost) {
  const controller = transport ?? webTransport(surface.contractDigest);
  const observeConnection = sharedWebConnection(surface, controller);
  const initialize = Object.fromEntries(program.journeys.flatMap(item => item.kind === "update"
    ? [[item.id, item.initialize]] : []));
  const binding = (scope: ModelScope) => ({ surface, scope,
    model: humanProduct(surface, validate, { reading: false, initialize, scope, transport: controller, observeConnection,
      ...(files ? { files } : {}) }) });
  const scopes = readScopes(program, surface).map(binding);
  // Presentation observes canonical availability but has no read or mutation capability.
  if (program.journeys.some(item => item.kind === "presentation")) scopes.push(binding({ kind: "presentation" }));
  return scopes;
}
