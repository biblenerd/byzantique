// Report every unresolved reference across the commentary corpus in a single pass, rather
// than failing on the first the way the build does. ref: and note: problems are errors
// (they would fail the build); {{ }} scripture and youtube includes are warnings. Exits
// non-zero when any errors are found, so it can serve as a pre-commit or CI check.
//
//   npm run validate

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { buildNoteRegistry, walkMarkdown, parseFrontmatter, resolveNoteRef } from '../src/lib/notes.ts';
import { validateReferences } from '../src/lib/shortcodes.ts';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'data/commentary');

const registry = buildNoteRegistry(SRC);
let errors = 0;
let warnings = 0;
let filesWithProblems = 0;

for (const file of walkMarkdown(SRC)) {
  const { body } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
  const ctx = { resolveNote: (id, book) => resolveNoteRef(registry, id, book) };
  const problems = validateReferences(body, ctx);
  if (!problems.length) continue;

  filesWithProblems++;
  console.log(`\n${path.relative(ROOT, file)}`);
  for (const p of problems) {
    if (p.severity === 'error') errors++;
    else warnings++;
    console.log(`  ${p.severity === 'error' ? '✗' : '!'} [${p.kind}] ${p.reason}`);
  }
}

console.log(
  errors + warnings
    ? `\nvalidate: ${errors} error(s), ${warnings} warning(s) across ${filesWithProblems} file(s).`
    : 'validate: no reference problems found.',
);
process.exit(errors ? 1 : 0);
