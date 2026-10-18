import { sveltekit } from "@sveltejs/kit/vite"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  // The single-file build (svelte.config.js bundleStrategy "inline") must carry
  // its images and fonts too: as separate files they resolve next to
  // index.html instead of _app/, so they broke on GitHub Pages and from disk.
  build: { assetsInlineLimit: 100_000_000 },
})
