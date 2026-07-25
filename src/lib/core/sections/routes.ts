/**
 * src/lib/core/sections/routes.ts
 *
 * Scaffolds the `src/app/routes/` directory into the target project.
 * Writes `routes/index.ts` — the unified route registry that uses
 * inject markers for auto-wiring new modules.
 */

import fs from 'fs';
import path from 'path';

/**
 * Creates `src/app/routes/index.ts` with the inject markers that
 * `cem add module` and `cem add auth` depend on.
 *
 * @param projectPath - Absolute path to the project root.
 */
export function scaffoldRoutes(projectPath: string): void {
  const routesDir = path.join(projectPath, 'src/app/routes');
  fs.mkdirSync(routesDir, { recursive: true });

  fs.writeFileSync(
    path.join(routesDir, 'index.ts'),
    `import { Router } from 'express';
// --- INJECT IMPORTS HERE ---

const router = Router();

const moduleRoutes = [
  // --- INJECT ROUTES HERE ---
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
`,
  );
}
