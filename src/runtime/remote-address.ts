// Validate an encrypted house origin before any remote credential can leave this process.
import { meant } from "../fields/phrases.ts";
import { socketTexts } from "../texts/socket.texts.ts";
export function remoteAddress(address: string, path = "/door/socket"): URL {
  try {
    const url = new URL(address);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      (url.protocol !== "https:" && !(url.protocol === "http:" && local)) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new Error();
    url.pathname = path;
    return url;
  } catch {
    throw new Error(meant(socketTexts.remoteAddress));
  }
}
