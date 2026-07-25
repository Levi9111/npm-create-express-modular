/**
 * src/lib/utils/fs.ts
 *
 * Shared filesystem helpers used by the CLI scaffolding pipeline.
 */

import fs from 'fs';
import path from 'path';

/**
 * Recursively copies a directory tree from `from` to `to`.
 * Creates `to` (and any missing parents) if it does not exist.
 *
 * @param from - Absolute path of the source directory.
 * @param to   - Absolute path of the destination directory.
 */
export function copyFolderSync(from: string, to: string): void {
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach((entry) => {
    const src = path.join(from, entry);
    const dest = path.join(to, entry);
    if (fs.lstatSync(src).isFile()) {
      fs.copyFileSync(src, dest);
    } else {
      copyFolderSync(src, dest);
    }
  });
}
