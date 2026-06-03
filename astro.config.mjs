// @ts-check
import { defineConfig } from 'astro/config';

// Static-first build (Cloudflare Pages serves the output directly).
// See REQUIREMENTS.md §9 (Rendering & performance strategy — Option C).
export default defineConfig({
  site: 'https://byzantique.com',
  output: 'static',
  build: {
    format: 'directory',
  },
});
