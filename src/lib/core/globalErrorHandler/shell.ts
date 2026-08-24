/**
 * src/lib/core/globalErrorHandler/shell.ts
 *
 * Constructs the target project's `globalErrorHandler.middleware.ts` file string.
 */

import type { ErrorBlock } from '../../types';

/**
 * Builds the code content for the global error handler middleware by combining
 * the active database and validator error blocks.
 *
 * @param dbBlock - Error handler imports and handling logic for the selected DB.
 * @param validatorBlock - Error handler imports and handling logic for the selected validator.
 * @returns The complete TypeScript string for globalErrorHandler.middleware.ts.
 */
export function buildGlobalErrorHandler(
  dbBlock: ErrorBlock,
  validatorBlock: ErrorBlock,
): string {
  return `/* eslint-disable @typescript-eslint/no-explicit-any */

import { Request, Response, NextFunction } from 'express';
import { TErrorSources } from '../interfaces/error';
import AppError from '../errors/AppError';
import config from '../config';
${validatorBlock.imports}
${dbBlock.imports}

const globalErrorHandler = (
  err: any,
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // If headers already sent, delegate to Express default error handler
  if (res.headersSent) {
    return next(err);
  }

  // ── Defaults ─────────────────────────────────────────────────────────────
  let statusCode = 500;
  let message = 'Something went wrong!';
  let errorSources: TErrorSources = [
    { path: '', message: 'Something went wrong' },
  ];

  // ── Discriminated dispatch ────────────────────────────────────────────────
  // Order matters: most specific first, generic Error last
  ${validatorBlock.handler}${dbBlock.handler}if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errorSources = [{ path: '', message: err.message }];
  } else if (err instanceof Error) {
    message = err.message;
    errorSources = [{ path: '', message: err.message }];
  }

  // ── Response ──────────────────────────────────────────────────────────────
  res.status(statusCode).json({
    success: false,
    message,
    errorSources,
    // Never leak stack traces in production
    stack: config.NODE_ENV === 'development' ? err?.stack : null,
  });
};

export default globalErrorHandler;
`;
}
