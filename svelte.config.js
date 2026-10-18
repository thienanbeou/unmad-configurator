import adapter from "@sveltejs/adapter-static"
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte"

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    // One self-contained build/index.html that opens straight from disk
    // (file://): everything inlined, hash routes (#/demo).
    adapter: adapter(),
    output: { bundleStrategy: "inline" },
    router: { type: "hash" },
  },
}

export default config
