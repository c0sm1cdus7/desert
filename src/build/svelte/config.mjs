import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { fileURLToPath } from "node:url";
import { resolveBitsScrollLock } from "./bits-scroll-lock.ts";

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ out: "build" }),
    alias: {
      "@desert": fileURLToPath(new URL("../../", import.meta.url)),
      "@desert-internal/bits-scroll-lock": resolveBitsScrollLock(),
    },
    csp: { mode: "hash", directives: {
      "default-src": ["self"], "script-src": ["self"], "style-src": ["self"],
      "connect-src": ["self"], "img-src": ["self", "data:", "blob:"],
      "media-src": ["self", "blob:"],
      // Only SvelteKit's route announcer and the empty attribute Bits writes back when a modal releases the body, by hash
      // (rule T, N36): no other inline style attribute applies.
      "style-src-attr": ["unsafe-hashes", "sha256-S8qMpvofolR8Mpjy4kQvEm7m1q8clzU4dfDH0AmvZjo=", "sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU="],
      "object-src": ["none"], "base-uri": ["none"], "frame-ancestors": ["none"],
    } },
  },
};
