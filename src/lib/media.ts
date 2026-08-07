// Shared media shorthands for author content (commentary notes + book intros).
// Imported by scripts/build-commentary.mjs (via --experimental-strip-types) and
// src/lib/bookintro.ts, so the syntax behaves identically in both.

/** Extract an 11-char YouTube video id from a bare id or any common URL form. */
export function youTubeId(s: string): string | null {
  s = s.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
  return m ? m[1] : null;
}

/** Extract a start time in whole seconds from a YouTube URL's `t=` / `start=` param.
 *  Accepts plain seconds ("395", "395s") or h/m/s form ("6m35s", "1h2m3s"). */
export function youTubeStart(s: string): number | null {
  const m = s.match(/[?&](?:t|start)=([\dhms]+)/i);
  if (!m) return null;
  const v = m[1];
  if (/^\d+s?$/i.test(v)) return parseInt(v, 10) || null;
  const hms = v.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
  if (hms && (hms[1] || hms[2] || hms[3])) {
    return +(hms[1] || 0) * 3600 + +(hms[2] || 0) * 60 + +(hms[3] || 0);
  }
  return null;
}

/** `{{ youtube <id|url> }}` (or `{{ yt … }}`) on its own line → a responsive 16:9 embed.
 *  A `?t=` / `&t=` start time in the URL is carried through as the embed's `start`.
 *  Run BEFORE the scripture `{{ }}` resolver so the include isn't read as a reference. */
export function expandYouTube(md: string): string {
  return md.replace(/^[ \t]*\{\{\s*(?:youtube|yt)\s+([^}\n]+?)\s*\}\}[ \t]*$/gim, (m, arg) => {
    const id = youTubeId(arg);
    if (!id) {
      console.warn(`  ! unresolved youtube embed: {{ ${String(arg).trim()} }}`);
      return m;
    }
    const start = youTubeStart(arg);
    const src = `https://www.youtube-nocookie.com/embed/${id}${start ? `?start=${start}` : ''}`;
    return `<div class="yt-embed"><iframe src="${src}" title="YouTube video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
  });
}
