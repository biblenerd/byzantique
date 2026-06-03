// Hover-tooltip definitions for grouping/status chips.
// Source of truth (editable): data/chip-definitions.json — keys match chip labels.

import fs from 'node:fs';
import path from 'node:path';

const defs: Record<string, string> = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'data/chip-definitions.json'), 'utf8'),
);

/** Definition text for a chip label, or undefined if none is defined. */
export const chipDef = (label: string): string | undefined => defs[label];
