import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(() => ({ plugins: [
  { name: "desert-surface",
    resolveId(id) { if (id === "virtual:desert/surface") return "\0desert-surface"; },
    load(id) { if (id === "\0desert-surface") return readFileSync(resolve("surface.mjs"), "utf8"); },
  },
  tailwindcss(), sveltekit(),
] }));
