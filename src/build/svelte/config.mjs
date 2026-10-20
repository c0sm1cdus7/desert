import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { fileURLToPath } from "node:url";

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ out: "build" }),
    alias: { "@desert": fileURLToPath(new URL("../../", import.meta.url)) },
    csp: { mode: "hash", directives: {
      "default-src": ["self"], "script-src": ["self"], "style-src": ["self"],
      "connect-src": ["self"], "img-src": ["self", "data:"],
      "style-src-attr": ["unsafe-inline"],
      "object-src": ["none"], "base-uri": ["none"], "frame-ancestors": ["none"],
    } },
  },
};
