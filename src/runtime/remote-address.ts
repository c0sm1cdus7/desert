// Validate an encrypted house origin before any remote credential can leave this process.
import { socketTexts } from "../texts/socket.texts.ts";
export function remoteAddress(address: string): URL {
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
    url.pathname = "/door/socket";
    return url;
  } catch {
    throw new Error(socketTexts.remoteAddress);
  }
}
