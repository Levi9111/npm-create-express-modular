/**
 * src/lib/utils/inject.ts
 *
 * Helper for injecting import and route entries into the generated
 * `src/app/routes/index.ts` file using its marker comments.
 */

import fs from 'fs';
import path from 'path';

const IMPORT_MARKER = '// --- INJECT IMPORTS HERE ---';
const ROUTE_MARKER = '// --- INJECT ROUTES HERE ---';

/**
 * Injects an import line and a route registration entry into the project's
 * unified route registry (`src/app/routes/index.ts`).
 *
 * Both markers must be present in the file; if either is missing the
 * function returns silently — the caller is responsible for warning the user.
 *
 * @param projectPath - Absolute path to the project root.
 * @param importLine  - The full import statement to inject (e.g. `import { AuthRoutes } from '...'`).
 * @param routeLine   - The route entry object to inject (e.g. `{ path: '/auth', route: AuthRoutes },`).
 * @returns `true` when both markers were found and the file was updated, `false` otherwise.
 */
export function injectRoute(
  projectPath: string,
  importLine: string,
  routeLine: string,
): boolean {
  const indexPath = path.join(projectPath, 'src/app/routes/index.ts');
  if (!fs.existsSync(indexPath)) return false;

  let content = fs.readFileSync(indexPath, 'utf8');

  if (!content.includes(IMPORT_MARKER) || !content.includes(ROUTE_MARKER)) {
    return false;
  }

  content = content.replace(
    IMPORT_MARKER,
    `${importLine}\n${IMPORT_MARKER}`,
  );

  content = content.replace(
    ROUTE_MARKER,
    `${routeLine}\n  ${ROUTE_MARKER}`,
  );

  fs.writeFileSync(indexPath, content);
  return true;
}
