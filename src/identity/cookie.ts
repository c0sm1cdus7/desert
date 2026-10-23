import { validCredential } from "./sessions.ts";

export function identityCookie(token: string) {
  return `desert-identity=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`;
}
export const clearIdentityCookie = "desert-identity=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0";
export const clearBootstrapCookie = "desert-bootstrap=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0";
export function cookieCredential(cookie: string | undefined) {
  const matches = (cookie ?? "").split(";").map(part => part.trim()).filter(part => part.startsWith("desert-identity="));
  if (matches.length !== 1) return undefined;
  const token = matches[0]!.slice("desert-identity=".length);
  return validCredential(token) ? token : undefined;
}
