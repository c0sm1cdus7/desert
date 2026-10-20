import type { RequestListener } from "node:http";
import type { loadVerifiedBuild } from "./manifest.ts";

export function publicHandler(manifest: Pick<ReturnType<typeof loadVerifiedBuild>, "files">, render: RequestListener): RequestListener {
  const paths = new Set(Object.keys(manifest.files)
    .filter(path => path.startsWith("web/client/"))
    .map(path => "/" + path.slice("web/client/".length)));
  paths.add("/");
  return (request, response) => {
    let path: string;
    try { path = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname); }
    catch { response.writeHead(400); response.end(); return; }
    if (!paths.has(path)) { response.writeHead(404); response.end(); return; }
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" }); response.end(); return;
    }
    render(request, response);
  };
}
