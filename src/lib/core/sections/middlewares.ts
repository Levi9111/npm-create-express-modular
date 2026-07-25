/**
 * src/lib/core/sections/middlewares.ts
 *
 * Scaffolds the core middleware files into `src/app/middlewares/`.
 * Currently writes `notFound.middleware.ts`.
 * The `globalErrorHandler.middleware.ts` is written by the DB generator
 * (via `src/lib/core/globalErrorHandler/shell.ts`).
 */

import fs from 'fs';
import path from 'path';

/**
 * Creates `notFound.middleware.ts` in the target project's middlewares directory.
 *
 * @param projectPath - Absolute path to the project root.
 */
export function scaffoldMiddlewares(projectPath: string): void {
  const mwDir = path.join(projectPath, 'src/app/middlewares');
  fs.mkdirSync(mwDir, { recursive: true });

  fs.writeFileSync(
    path.join(mwDir, 'notFound.middleware.ts'),
    `import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

const notFound = (_req: Request, res: Response, _next: NextFunction): void => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message: 'API Not Found!',
    error: '',
  });
};

export default notFound;
`,
  );
}

/**
 * Creates the shared `src/app/interfaces/error.ts` file that defines
 * the generic error response types consumed by the global error handler.
 *
 * @param projectPath - Absolute path to the project root.
 */
export function scaffoldInterfaces(projectPath: string): void {
  const ifaceDir = path.join(projectPath, 'src/app/interfaces');
  fs.mkdirSync(ifaceDir, { recursive: true });

  fs.writeFileSync(
    path.join(ifaceDir, 'error.ts'),
    `export type TErrorSources = {
  path: string | number;
  message: string;
}[];

export type TGenericErrorResponse = {
  statusCode: number;
  message: string;
  errorSources: TErrorSources;
};
`,
  );
}
