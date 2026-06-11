// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Dev-only: watch data/ and re-run the matching data build when a source file changes,
// then invalidate the SSR module cache and reload the browser. Without this, `astro dev`
// serves whatever the one-time `npm run data` produced at startup, so commentary/text
// edits don't show up until a manual restart. No effect on `astro build`.
function dataWatch() {
  // top-level data/ subdir → the build script that regenerates its JSON. Dirs not listed
  // here (book-intros, pericopes, …) are read directly by libs, so they just reload.
  const SCRIPTS = {
    texts: ['scripts/build-texts.mjs'],
    commentary: ['--experimental-strip-types', 'scripts/build-commentary.mjs'],
    intro: ['scripts/build-intro.mjs'],
    lectionary: ['--experimental-strip-types', 'scripts/build-lectionary.mjs'],
  };
  return {
    name: 'byz-data-watch',
    hooks: {
      /** @param {{ server: any, logger: any }} ctx */
      'astro:server:setup': ({ server, logger }) => {
        const dir = path.resolve('data');
        if (!fs.existsSync(dir)) return;
        let timer;
        const pending = new Set();
        fs.watch(dir, { recursive: true }, (_event, file) => {
          if (!file) return;
          pending.add(String(file).split(path.sep)[0]);
          clearTimeout(timer);
          timer = setTimeout(() => {
            const subs = [...pending];
            pending.clear();
            for (const sub of subs) {
              if (!SCRIPTS[sub]) continue;
              try {
                execFileSync(process.execPath, SCRIPTS[sub], { stdio: 'ignore' });
                logger.info(`rebuilt data/${sub}`);
              } catch (err) {
                logger.warn(`data/${sub} build failed: ${err.message?.split('\n')[0] ?? err}`);
              }
            }
            server.moduleGraph?.invalidateAll?.(); // drop cached lib state (e.g. backlinks)
            (server.ws ?? server.hot)?.send?.({ type: 'full-reload', path: '*' });
          }, 120);
        });
        logger.info('watching data/ — edits to texts & commentary now hot-reload');
      },
    },
  };
}

// Static-first build (Cloudflare Pages serves the output directly).
// See REQUIREMENTS.md §9 (Rendering & performance strategy — Option C).
export default defineConfig({
  site: 'https://byzantique.com',
  output: 'static',
  build: {
    format: 'directory',
  },
  // sitemap is generated automatically on every `astro build` (uses `site` above).
  // Excludes the search UI and 404 (404 is auto-excluded).
  // Keep the search UI and the (private) prayer pages out of the sitemap.
  integrations: [
    dataWatch(),
    sitemap({ filter: (page) => !page.includes('/search') && !page.includes('/prayers') }),
  ],
});
