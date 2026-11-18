// Replace only HTTP with IPC while a separate process executes the unchanged redemption CLI entry point.
process.channel?.unref();
globalThis.fetch = async (_url, options) => {
  process.channel?.ref();
  const pending = new Promise<unknown>(resolve => {
    process.once("message", value => {
      process.disconnect();
      resolve(value);
    });
  });
  process.send?.({ body: options?.body });
  return new Response(JSON.stringify(await pending));
};
