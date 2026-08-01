// Dev-only notes studio. Under `astro dev` it injects the /studio page and mounts the
// write API at /__studio/api/*. Under `astro build` the hook returns early, so neither the
// route nor the middleware exists in production — nothing to exclude from the sitemap or
// Pagefind, because none of it is ever built.

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { handle } from './api.mjs';

export default function studio() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return {
    name: 'byz-studio',
    hooks: {
      'astro:config:setup': ({ command, injectRoute, updateConfig, logger }) => {
        if (command !== 'dev') return;

        injectRoute({ pattern: '/studio', entrypoint: path.join(here, 'studio.astro') });

        updateConfig({
          vite: {
            plugins: [
              {
                name: 'byz-studio-api',
                configureServer(server) {
                  server.middlewares.use('/__studio/api', async (req, res) => {
                    try {
                      await handle(req, res, {
                        root: process.cwd(),
                        load: (id) => server.ssrLoadModule(id),
                      });
                    } catch (err) {
                      res.statusCode = 500;
                      res.setHeader('content-type', 'application/json');
                      res.end(JSON.stringify({ error: String(err?.stack || err) }));
                    }
                  });
                },
              },
            ],
          },
        });

        logger.info('studio ready at /studio (dev only)');
      },
    },
  };
}
