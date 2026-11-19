// Public clients carry bounded, authenticated registration metadata instead of creating journal entries.
import { createHmac, hkdfSync, timingSafeEqual } from "node:crypto";
import { isRecord } from "../../fields/json-values.ts";
export type OAuthClient = Readonly<{ redirect_uris: readonly string[]; client_name?: string }>;
export const loopback = (url: URL) => url.hostname === "localhost" || url.hostname === "127.0.0.1";
function redirect(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048 || value.includes("#")) return false;
  try {
    const url = new URL(value);
    return (
      !url.username &&
      !url.password &&
      !url.hash &&
      (url.protocol === "https:" || (url.protocol === "http:" && loopback(url)))
    );
  } catch {
    return false;
  }
}
export function clientMetadata(value: unknown): OAuthClient | undefined {
  if (
    !isRecord(value) ||
    !Array.isArray(value.redirect_uris) ||
    !value.redirect_uris.length ||
    value.redirect_uris.length > 8 ||
    !value.redirect_uris.every(redirect) ||
    (value.client_name !== undefined && (typeof value.client_name !== "string" || value.client_name.length > 120)) ||
    value.token_endpoint_auth_method !== "none" ||
    (value.grant_types !== undefined &&
      (!Array.isArray(value.grant_types) ||
        value.grant_types.length !== 1 ||
        value.grant_types[0] !== "authorization_code")) ||
    (value.response_types !== undefined &&
      (!Array.isArray(value.response_types) || value.response_types.length !== 1 || value.response_types[0] !== "code"))
  )
    return undefined;
  return {
    redirect_uris: value.redirect_uris,
    ...(typeof value.client_name === "string" ? { client_name: value.client_name } : {}),
  };
}
export function registeredRedirect(client: OAuthClient, requested: string): boolean {
  if (!redirect(requested)) return false;
  return client.redirect_uris.some(registered => {
    if (registered === requested) return true;
    const left = new URL(registered),
      right = new URL(requested);
    if (!loopback(left) || !loopback(right)) return false;
    const withoutPort = (value: string) =>
      value.replace(/^(https?:\/\/(?:localhost|127\.0\.0\.1))(?::[0-9]+)?(?=\/|[?#]|$)/, "$1");
    return withoutPort(registered) === withoutPort(requested);
  });
}
export function clientRegistrations(rootKey: Uint8Array, origin: string) {
  const key = Buffer.from(hkdfSync("sha256", rootKey, origin, "desert/door/oauth/client/v1", 32));
  const sign = (payload: string) => createHmac("sha256", key).update(payload).digest();
  return {
    issue: (client: OAuthClient) => {
      const payload = Buffer.from(JSON.stringify(client)).toString("base64url");
      return `${payload}.${sign(payload).toString("base64url")}`;
    },
    read: (id: string): OAuthClient | undefined => {
      if (id.length > 24000) return undefined;
      const parts = id.split(".");
      const payload = parts[0],
        signature = parts[1];
      if (parts.length !== 2 || !payload || !signature || !/^[A-Za-z0-9_-]{43}$/.test(signature)) return undefined;
      const supplied = Buffer.from(signature, "base64url");
      if (supplied.toString("base64url") !== signature || !timingSafeEqual(sign(payload), supplied)) return undefined;
      try {
        const value: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
        return isRecord(value) ? clientMetadata({ ...value, token_endpoint_auth_method: "none" }) : undefined;
      } catch {
        return undefined;
      }
    },
  };
}
