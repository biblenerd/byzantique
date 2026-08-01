// The studio's dev-only JSON API, mounted at /__studio/api/* by studio/integration.mjs.
// It runs inside the Astro dev server, so it reads and writes data/commentary/*.md
// directly and renders previews through the real build pipeline. `load` is Vite's
// ssrLoadModule, used to pull the project's .ts libraries with full TypeScript support.

import fs from 'node:fs';
import path from 'node:path';

const json = (res, code, data) => {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
};

const readBody = (req) =>
  new Promise((resolve) => {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => resolve(b));
  });

// Recover a note's slug from its filename by stripping the structural CODE_chapter_verse
// prefix (ROM_05_12-, GEN_01_01-02_03-, GEN_00-, …). Works whether or not the file is
// filed exactly to convention, so even a misfiled note loads with a sensible slug.
function recoverSlug(rel) {
  const stem = path.basename(rel).replace(/\.md$/, '');
  const code = (stem.match(/^[0-9A-Z]+/) || [''])[0];
  const m = stem.match(new RegExp('^' + code + '(?:_\\d+)+(?:-\\d+(?:_\\d+)?)*[-_](.+)$'));
  return m ? m[1] : stem;
}

const parseTags = (s) =>
  String(s || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

export async function handle(req, res, { root, load }) {
  const url = new URL(req.url, 'http://localhost');
  const route = url.pathname.replace(/^\/__studio\/api/, '') || '/';

  const notes = await load('/src/lib/notes.ts');
  const shortcodes = await load('/src/lib/shortcodes.ts');
  const canon = await load('/src/lib/canon.ts');
  const texts = await load('/src/lib/texts.ts');
  const scripture = await load('/src/lib/scripture.ts');

  const SRC = path.join(root, 'data/commentary');
  const chapterCount = (code) => texts.loadBook(code)?.chapters.length ?? 0;
  const previewCtx = () => {
    const registry = notes.buildNoteRegistry(SRC);
    return {
      file: '(studio)',
      warn: () => {},
      resolveNote: (id, book) => notes.resolveNoteRef(registry, id, book),
    };
  };

  // GET /notes — every note, for the browser list.
  if (route === '/notes' && req.method === 'GET') {
    const list = [];
    for (const file of notes.walkMarkdown(SRC)) {
      const { data } = notes.parseFrontmatter(fs.readFileSync(file, 'utf8'));
      const a = data.anchor ? notes.parseAnchor(data.anchor) : null;
      const meta = a ? canon.bookByCode(a.book) : null;
      list.push({
        path: path.relative(root, file),
        id: path.basename(file, '.md'),
        anchor: data.anchor ?? '',
        title: data.title ?? '',
        tags: data.tags ?? '',
        book: a?.book ?? '',
        bookName: meta?.name ?? '',
        testament: meta?.testament ?? '',
      });
    }
    list.sort((x, y) => x.path.localeCompare(y.path));
    return json(res, 200, list);
  }

  // GET /note?path=… — one note, parsed into fields for editing.
  if (route === '/note' && req.method === 'GET') {
    const rel = url.searchParams.get('path') || '';
    const abs = path.join(root, rel);
    if (!abs.startsWith(SRC) || !fs.existsSync(abs)) return json(res, 404, { error: 'not found' });
    const { data, body } = notes.parseFrontmatter(fs.readFileSync(abs, 'utf8'));
    return json(res, 200, {
      path: rel,
      anchor: data.anchor ?? '',
      title: data.title ?? '',
      tags: data.tags ?? '',
      slug: recoverSlug(rel),
      body: body.trim(),
    });
  }

  // GET /registry — the shortcode metadata for the insert toolbar.
  if (route === '/registry' && req.method === 'GET') {
    return json(
      res,
      200,
      shortcodes.SHORTCODES.map((s) => ({
        name: s.name,
        title: s.title,
        description: s.description,
        syntax: s.syntax,
        phase: s.phase,
      })),
    );
  }

  // GET /canon — books for the anchor builder (with chapter counts).
  if (route === '/canon' && req.method === 'GET') {
    return json(
      res,
      200,
      canon.BOOKS.map((b) => ({
        code: b.code,
        name: b.name,
        slug: b.slug,
        testament: b.testament,
        chapters: chapterCount(b.code),
      })),
    );
  }

  // GET /tags — every tag in use, most common first, for tag autocomplete.
  if (route === '/tags' && req.method === 'GET') {
    const counts = new Map();
    for (const file of notes.walkMarkdown(SRC)) {
      const { data } = notes.parseFrontmatter(fs.readFileSync(file, 'utf8'));
      for (const t of parseTags(data.tags)) counts.set(t, (counts.get(t) || 0) + 1);
    }
    const list = [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
    return json(res, 200, list);
  }

  // GET /refcheck?ref=ROM+6:23 — validate a scripture reference for the ref picker.
  if (route === '/refcheck' && req.method === 'GET') {
    const ref = (url.searchParams.get('ref') || '').trim();
    const link = ref ? scripture.refLink(ref) : null;
    return json(res, 200, {
      ok: !!link,
      label: link?.label ?? null,
      href: link?.href ?? null,
      preview: link ? scripture.refPreview(ref) : null,
    });
  }

  // GET /doctor — notes whose filename drifts from the convention for their anchor. A range
  // may be filed by start verse only OR start-end (both accepted); the slug before .md must
  // be a clean kebab, so ISA_11_02-03_gifts7's underscore is flagged. A wrong book folder or
  // chapter-folder padding is flagged too.
  if (route === '/doctor' && req.method === 'GET') {
    const SENT = ' ';
    const WHOLE = 999;
    const CLEAN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    const p2 = (n) => String(n).padStart(2, '0');
    const issues = [];
    for (const file of notes.walkMarkdown(SRC)) {
      const rel = path.relative(root, file);
      const { data } = notes.parseFrontmatter(fs.readFileSync(file, 'utf8'));
      if (!data.anchor) {
        issues.push({ path: rel, reason: 'no anchor in frontmatter', expected: null });
        continue;
      }
      const tmpl = notes.notePathFor(data.anchor, SENT, chapterCount);
      const a = notes.parseAnchor(data.anchor);
      if (!tmpl || !a) {
        issues.push({ path: rel, reason: `unparseable anchor "${data.anchor}"`, expected: null });
        continue;
      }
      const i = tmpl.indexOf(SENT);
      const prefixFull = tmpl.slice(0, i);
      const suffix = tmpl.slice(i + SENT.length);
      const dir = prefixFull.slice(0, prefixFull.lastIndexOf('/'));
      const fullStem = prefixFull.slice(dir.length + 1, -1); // drop trailing '-'

      const stems = [fullStem];
      if (a.scope !== 'book') {
        const startStem =
          a.ev === WHOLE && a.sc === a.ec ? `${a.book}_${p2(a.sc)}` : `${a.book}_${p2(a.sc)}_${p2(a.sv)}`;
        if (startStem !== fullStem) stems.push(startStem);
      }

      const relStem = path.basename(rel).replace(/\.md$/, '');
      const filed =
        path.dirname(rel) === dir &&
        stems.some((st) => relStem.startsWith(st + '-') && CLEAN.test(relStem.slice(st.length + 1)));
      if (filed) continue;

      issues.push({ path: rel, reason: 'misfiled', expected: prefixFull + recoverSlug(rel) + suffix });
    }
    return json(res, 200, issues);
  }

  // POST /lint — every unresolved reference in a body, with offsets, for inline underlines.
  if (route === '/lint' && req.method === 'POST') {
    const { body = '' } = JSON.parse((await readBody(req)) || '{}');
    return json(res, 200, { problems: shortcodes.validateReferences(String(body), previewCtx()) });
  }

  // POST /preview — render + validate a draft through the real pipeline.
  if (route === '/preview' && req.method === 'POST') {
    const { anchor = '', body = '', slug = '' } = JSON.parse((await readBody(req)) || '{}');
    const ctx = previewCtx();
    let html = '';
    let error = null;
    try {
      html = shortcodes.renderAuthorHtml(String(body).trim(), ctx, { footnotes: true });
    } catch (e) {
      error = String(e?.message || e);
    }
    const problems = shortcodes.validateReferences(String(body), ctx);
    // Split the filename around the slug so the editor can show a static path prefix, an
    // editable filename, and the .md suffix. A sentinel slug locates the boundary.
    const SENT = ' ';
    const tmpl = notes.notePathFor(anchor, SENT, chapterCount);
    let prefix = null;
    let suffix = null;
    let target = null;
    if (tmpl) {
      const i = tmpl.indexOf(SENT);
      prefix = tmpl.slice(0, i);
      suffix = tmpl.slice(i + SENT.length);
      target = prefix + String(slug) + suffix;
    }
    return json(res, 200, { html, error, problems, path: target, prefix, suffix });
  }

  // POST /save — write the note to its convention path, moving it if the anchor or slug
  // changed. When a move changes the note's id and the old id is left orphaned, repoint every
  // note: reference that pointed at the old id (rename with reference fixup).
  if (route === '/save' && req.method === 'POST') {
    const d = JSON.parse((await readBody(req)) || '{}');
    const slug = (d.slug || notes.slugify(d.title || '')).trim();
    if (!slug) return json(res, 400, { error: 'Give the note a filename or a title first.' });
    const target = notes.notePathFor(d.anchor || '', slug, chapterCount);
    if (!target)
      return json(res, 400, { error: `Could not resolve a path for anchor "${d.anchor}".` });
    const abs = path.join(root, target);

    const fm = ['---', `anchor: ${d.anchor}`, `title: ${d.title || ''}`];
    if (String(d.tags || '').trim()) fm.push(`tags: ${String(d.tags).trim()}`);
    fm.push('---', '');
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, fm.join('\n') + '\n' + String(d.body || '').trim() + '\n');

    let moved = false;
    if (d.originalPath && d.originalPath !== target) {
      const oldAbs = path.join(root, d.originalPath);
      if (oldAbs.startsWith(SRC) && fs.existsSync(oldAbs)) {
        fs.rmSync(oldAbs);
        moved = true;
      }
    }

    // Rename fixup: if the id changed and the old id is now orphaned, repoint references.
    let refsUpdated = 0;
    const refFiles = [];
    if (moved) {
      const oldId = path.basename(d.originalPath, '.md');
      const newId = path.basename(target, '.md');
      const reg = notes.buildNoteRegistry(SRC);
      if (oldId !== newId && !reg.has(oldId)) {
        const esc = oldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp('\\]\\(note:([0-9A-Z]+/)?' + esc + '\\)', 'g');
        for (const file of notes.walkMarkdown(SRC)) {
          const txt = fs.readFileSync(file, 'utf8');
          const hits = txt.match(re);
          if (!hits) continue;
          fs.writeFileSync(file, txt.replace(re, '](note:$1' + newId + ')'));
          refsUpdated += hits.length;
          refFiles.push(path.relative(root, file));
        }
      }
    }

    const problems = shortcodes.validateReferences(String(d.body || ''), previewCtx());
    return json(res, 200, { path: target, moved, slug, problems, refsUpdated, refFiles });
  }

  return json(res, 404, { error: `no studio route ${req.method} ${route}` });
}
