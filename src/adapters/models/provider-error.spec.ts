import { expect, it, vi } from "vitest";
import { callAnthropic } from "./anthropic.ts";
import { cards } from "./catalog.ts";
const card = cards[0];
if (!card) throw new Error("card");
const request = { card, maxOutputTokens: 10, layers: ["a", "b", "c", "d"] as const, changing: "x", schema: {} };
const failure = async (body: ConstructorParameters<typeof Response>[0], status = 400) => {
  try {
    await callAnthropic(request, "synthetic", () => Promise.resolve(new Response(body, { status })));
    throw new Error("expected rejection");
  } catch (error) {
    return error;
  }
};
it.each([400, 401, 404, 429, 529])("conserva %s aunque no venga un sobre JSON", async status => {
  for (const body of [null, "", "{", "<html>proxy</html>", JSON.stringify({ error: null }), "42"])
    expect(await failure(body, status)).toMatchObject({ kind: "http", rejection: { status, type: "sin_tipo" } });
});
it("acota la lectura a 8 KiB y cancela sin consumir el resto del cuerpo", async () => {
  let bytes = 0;
  const cancel = vi.fn();
  const stream = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        bytes += 1024;
        controller.enqueue(new TextEncoder().encode("x".repeat(1024)));
      },
      cancel,
    },
    { highWaterMark: 0 },
  );
  const error = await failure(stream);
  expect(error).toMatchObject({ kind: "http", rejection: { status: 400, type: "sin_tipo" } });
  expect(bytes).toBe(8192);
  expect(cancel).toHaveBeenCalledOnce();
});
it("un cuerpo roto conserva HTTP y no reemplaza el rechazo por una falla JSON o de transporte", async () => {
  const stream = new ReadableStream<Uint8Array>({ start: controller => controller.error(new Error("broken")) });
  expect(await failure(stream)).toMatchObject({
    kind: "http",
    rejection: { status: 400, type: "sin_tipo", message: "No se pudo leer el cuerpo de error del proveedor." },
  });
});
it("redacta tipo, mensaje, causa y stack antes de recortar y quita controles de terminal", async () => {
  const planted = ["sk", "ant", "another-synthetic-key"].join("-");
  const error = await failure(
    JSON.stringify({
      error: {
        type: `invalid_request_error ${planted}`,
        message: `synthetic ${planted}\n\u001b[31m` + "x".repeat(2000),
      },
    }),
  );
  expect(error).toBeInstanceOf(Error);
  if (!(error instanceof Error)) throw new Error("error");
  const serialized = JSON.stringify([error, error.message, error.cause, error.stack]);
  expect(serialized.includes(planted)).toBe(false);
  expect(serialized.includes("synthetic")).toBe(false);
  expect(serialized).toContain("[secreto]");
  const rejection: unknown = Reflect.get(error, "rejection");
  if (!rejection || typeof rejection !== "object") throw new Error("rejection");
  const message: unknown = Reflect.get(rejection, "message");
  expect(typeof message === "string" && message.length === 512).toBe(true);
  expect(message).toContain("…");
});
it("limpia una llave cortada por el límite de lectura", async () => {
  const prefix = "x".repeat(8192 - 10);
  const planted = ["sk", "ant", "a-long-synthetic-key"].join("-");
  const error = await failure(prefix + planted);
  expect(JSON.stringify(error).includes("sk-ant")).toBe(false);
});
