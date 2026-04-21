'use strict';

/**
 * Assembles the globalErrorHandler.ts file from three parts:
 *   1. Universal shell (structure, response shape — never changes)
 *   2. DB-specific error block (Mongoose / Prisma / pg / mysql)
 *   3. Validator-specific error block (Zod / Joi / Vine / Yup)
 *
 * The result is a single, fully-typed TypeScript file that handles every
 * error surface in the chosen stack — with the same response shape always.
 */
function buildGlobalErrorHandler(dbBlock, validatorBlock) {
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
  ${validatorBlock.handler}
  ${dbBlock.handler}
  if (err instanceof AppError) {
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

module.exports = {
    buildGlobalErrorHandler
};