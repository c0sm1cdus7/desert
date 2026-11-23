// Compose live journal keys, the host credential and OAuth without persisting distribution secrets.
import { meant } from "../../fields/phrases.ts";
import { oauthCodeJournal } from "./oauth-code-journal.ts";
import { checkDoorRoot } from "../../house/doors/root-verifier.ts";
import { effect } from "../../house/facts.ts";
import { oauthTexts } from "../../texts/oauth.texts.ts";
import { liveDoorKeys } from "../socket/peers/live-door-keys.ts";
import type { DoorKey } from "../socket/peers/socket-peer.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { hostDoorAccess } from "./host-credential.ts";
import { oauthDoor, type OAuthOptions } from "./oauth-door.ts";
import type { McpHouse } from "./mcp-reading.ts";
import { empty, type McpRequest, type McpResponse } from "./mcp-access.ts";
export type McpCredentialOptions = Readonly<{ rootKey?: Uint8Array; oauth?: OAuthOptions }>;
export function mcpCredentials<X extends Program>(
  house: McpHouse<X>,
  options: McpCredentialOptions,
  founders?: ReadonlyMap<string, DoorKey>,
) {
  checkDoorRoot(house.bus, options.rootKey);
  if (options.oauth && !options.rootKey) throw new Error(meant(oauthTexts.configuration));
  const keys = hostDoorAccess(liveDoorKeys(house, founders), options.rootKey, () => house.tools.state().house.admin);
  const revoke = (key: string) => {
    const state = house.tools.state().house;
    if (state.doors.keys.get(key)?.revoked === false) house.bus.emit(effect("door-key-revoked", { key }, state.admin));
  };
  const oauth =
    options.oauth && options.rootKey
      ? oauthDoor(
          options.oauth,
          options.rootKey,
          keys,
          house.now,
          revoke,
          oauthCodeJournal(house.bus, () => house.tools.state().house),
        )
      : undefined;
  return { keys, oauth };
}
export function credentialRoutes(
  dispatch: (request: McpRequest) => Promise<McpResponse>,
  remote: Readonly<{ handle: (request: McpRequest) => Promise<McpResponse> }>,
  oauth: ReturnType<typeof oauthDoor> | undefined,
  closing: AbortSignal,
  devices?: Readonly<{ handle: (request: McpRequest) => Promise<McpResponse> }>,
) {
  return async (request: McpRequest): Promise<McpResponse> => {
    if (closing.aborted) return empty(503);
    let door = request.path === "/door/socket" ? remote : undefined;
    if (request.path.startsWith("/door/device/")) door = devices;
    const response = (await oauth?.handle(request)) ?? (await (door ? door.handle(request) : dispatch(request)));
    return request.path === "/mcp" && response.status === 401
      ? { ...response, headers: { ...response.headers, "WWW-Authenticate": oauth?.challenge(request) ?? "Bearer" } }
      : response;
  };
}
