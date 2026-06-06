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

/** `{{ youtube <id|url> }}` (or `{{ yt … }}`) on its own line → a responsive 16:9 embed.
 *  Run BEFORE the scripture `{{ }}` resolver so the include isn't read as a reference. */
export function expandYouTube(md: string): string {
  return md.replace(/^[ \t]*\{\{\s*(?:youtube|yt)\s+([^}\n]+?)\s*\}\}[ \t]*$/gim, (m, arg) => {
    const id = youTubeId(arg);
    if (!id) {
      console.warn(`  ! unresolved youtube embed: {{ ${String(arg).trim()} }}`);
      return m;
    }
    return `<div class="yt-embed"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="YouTube video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
  });
}
