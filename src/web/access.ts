import { randomBytes, timingSafeEqual } from "node:crypto";

function equals(left: unknown, right: string) {
  if (typeof left !== "string") return false;
  const candidate = Buffer.from(left);
  const expected = Buffer.from(right);
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function localBrowserAccess() {
  let invitation: string | undefined = randomBytes(32).toString("base64url");
  const session = randomBytes(32).toString("base64url");
  return {
    invitation,
    connect(candidate: unknown) {
      if (!invitation || !equals(candidate, invitation)) throw new Error("BROWSER_SESSION_REQUIRED");
      invitation = undefined;
      return `desert-local=${session}; HttpOnly; SameSite=Strict; Path=/`;
    },
    authenticated(cookie: string | undefined) {
      return (cookie ?? "").split(";").some(part => equals(part.trim(), `desert-local=${session}`));
    },
  };
}
