// Exercise the HTTP adapter through real Web streams without binding a port or contacting a network.
import type { McpRequest, McpResponse } from "../../src/doors/mcp/mcp-access.ts";
export function httpDoorFetch(handle: (request: McpRequest) => Promise<McpResponse>) {
  const posted: string[] = [];
  const streams = new Set<AbortController>();
  const send: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    const controller = new AbortController();
    const abort = () => controller.abort();
    request.signal.addEventListener("abort", abort, { once: true });
    if (request.signal.aborted) abort();
    const text = await request.text();
    if (request.method === "POST") posted.push(text);
    const result = await handle({
      method: request.method,
      path: new URL(request.url).pathname,
      headers: Object.fromEntries(request.headers),
      signal: controller.signal,
      body: () => [Buffer.from(text)],
    });
    if (!result.events) return new Response(result.body, result);
    streams.add(controller);
    const iterator = result.events[Symbol.asyncIterator]();
    const body = new ReadableStream<Uint8Array>({
      async pull(output) {
        const next = await iterator.next();
        if (next.done) {
          streams.delete(controller);
          output.close();
        } else output.enqueue(new TextEncoder().encode(next.value));
      },
      async cancel() {
        abort();
        streams.delete(controller);
        await iterator.return?.();
      },
    });
    return new Response(body, result);
  };
  return { send, posted, disconnect: () => streams.forEach(controller => controller.abort()) };
}
