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
it.each([400, 401, 404, 429, 529])("keeps %s even without a JSON envelope", async status => {
  for (const body of [null, "", "{", "<html>proxy</html>", JSON.stringify({ error: null }), "42"])
    expect(await failure(body, status)).toMatchObject({ kind: "http", rejection: { status, type: "untyped" } });
});
it("bounds the read to 8 KiB and cancels without consuming the rest of the body", async () => {
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
  expect(error).toMatchObject({ kind: "http", rejection: { status: 400, type: "untyped" } });
  expect(bytes).toBe(8192);
  expect(cancel).toHaveBeenCalledOnce();
});
it("a broken body keeps HTTP and does not replace the rejection with a JSON or transport failure", async () => {
  const stream = new ReadableStream<Uint8Array>({ start: controller => controller.error(new Error("broken")) });
  expect(await failure(stream)).toMatchObject({
    kind: "http",
    rejection: { status: 400, type: "untyped", message: "The provider's error body could not be read." },
  });
});
it("redacts type, message, cause and stack before truncating and strips terminal controls", async () => {
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
  expect(serialized).toContain("[secret]");
  const rejection: unknown = Reflect.get(error, "rejection");
  if (!rejection || typeof rejection !== "object") throw new Error("rejection");
  const message: unknown = Reflect.get(rejection, "message");
  expect(typeof message === "string" && message.length === 512).toBe(true);
  expect(message).toContain("…");
});
it("cleans a key cut by the read limit", async () => {
  const prefix = "x".repeat(8192 - 10);
  const planted = ["sk", "ant", "a-long-synthetic-key"].join("-");
  const error = await failure(prefix + planted);
  expect(JSON.stringify(error).includes("sk-ant")).toBe(false);
});
