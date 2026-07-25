/**
 * src/lib/core/sections/errors.ts
 *
 * Scaffolds the `src/app/errors/` directory into the target project.
 * Currently writes `AppError.ts` — the base custom error class used
 * by all service and middleware layers.
 */

import fs from 'fs';
import path from 'path';

/**
 * Creates `src/app/errors/AppError.ts` in the target project.
 *
 * @param projectPath - Absolute path to the project root.
 */
export function scaffoldErrors(projectPath: string): void {
  const errDir = path.join(projectPath, 'src/app/errors');
  fs.mkdirSync(errDir, { recursive: true });

  fs.writeFileSync(
    path.join(errDir, 'AppError.ts'),
    `class AppError extends Error {
  public statusCode: number;

  constructor(statusCode: number, message: string, stack: string = '') {
    super(message);
    this.statusCode = statusCode;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default AppError;
`,
  );
}
