'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Writes all universal files that never change regardless of DB or validator choice.
 * These are the stable core of every generated project.
 */
function scaffoldCoreFiles(projectPath, useRateLimit = false, tokenDelivery = 'header') {
    _scaffoldErrors(projectPath);
    _scaffoldUtils(projectPath);
    _scaffoldInterfaces(projectPath);
    _scaffoldMiddlewares(projectPath);
    _scaffoldRoutes(projectPath);
    _scaffoldApp(projectPath, useRateLimit, tokenDelivery);
}

// ─── ERRORS ───────────────────────────────────────────────────────────────────
function _scaffoldErrors(projectPath) {
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

// ─── UTILS ────────────────────────────────────────────────────────────────────
function _scaffoldUtils(projectPath) {
    const utilsDir = path.join(projectPath, 'src/app/utils');
    fs.mkdirSync(utilsDir, { recursive: true });

    // catchAsync — wraps async route handlers, forwards errors to globalErrorHandler
    fs.writeFileSync(
        path.join(utilsDir, 'catchAsync.ts'),
        `import { NextFunction, Request, RequestHandler, Response } from 'express';

export const catchAsync = (fn: RequestHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
`,
    );

    // sendResponse — standardized JSON response shape across every controller
    fs.writeFileSync(
        path.join(utilsDir, 'sendResponse.ts'),
        `import { Response } from 'express';

type TResponse<T> = {
  statusCode: number;
  success: boolean;
  message?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  data: T | null;
};

const sendResponse = <T>(res: Response, data: TResponse<T>): void => {
  res.status(data.statusCode).json({
    success: data.success,
    message: data.message,
    meta: data.meta,
    data: data.data,
  });
};

export default sendResponse;
`,
    );

    // logger — thin console wrapper, swap for pino/winston in production
    fs.writeFileSync(
        path.join(utilsDir, 'logger.ts'),
        `type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const isDev = process.env.NODE_ENV !== 'production';

function formatMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString();
  return \`[\${timestamp}] [\${level.toUpperCase()}] \${message}\`;
}

const logger = {
  info: (message: string): void => {
    console.log(formatMessage('info', message));
  },

  warn: (message: string): void => {
    console.warn(formatMessage('warn', message));
  },

  error: (message: string, error?: unknown): void => {
    console.error(formatMessage('error', message));
    if (error instanceof Error && isDev) {
      console.error(error.stack);
    }
  },

  debug: (message: string): void => {
    if (isDev) {
      console.debug(formatMessage('debug', message));
    }
  },
};

export default logger;
`,
    );

    // QueryBuilder — stub for non-Mongoose projects, overwritten by Mongoose generator
    fs.writeFileSync(
        path.join(utilsDir, 'QueryBuilder.ts'),
        `// This file is populated by the DB generator.
// For Mongoose projects: search, filter, sort, paginate, fields chaining.
// For SQL/Prisma projects: replace with your own query helper as needed.
export {};
`,
    );
}

// ─── INTERFACES ───────────────────────────────────────────────────────────────
function _scaffoldInterfaces(projectPath) {
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

// ─── MIDDLEWARES ──────────────────────────────────────────────────────────────
function _scaffoldMiddlewares(projectPath) {
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

// ─── ROUTES ───────────────────────────────────────────────────────────────────
function _scaffoldRoutes(projectPath) {
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

// ─── APP.TS ───────────────────────────────────────────────────────────────────
function _scaffoldApp(projectPath, useRateLimit, tokenDelivery = 'header') {
    const useCookies = tokenDelivery === 'cookie';
    const lines = [
        "import express, { Application, Request, Response } from 'express';",
        "import cors from 'cors';",
        "import helmet from 'helmet';",
        "import logger from './app/utils/logger';",
    ];

    if (useCookies) {
        lines.push("import cookieParser from 'cookie-parser';");
    }

    if (useRateLimit) {
        lines.push("import { globalRateLimiter } from './app/middlewares/rateLimiter.middleware';");
    }

    lines.push(
        "import router from './app/routes';",
        "import notFound from './app/middlewares/notFound.middleware';",
        "import globalErrorHandler from './app/middlewares/globalErrorHandler.middleware';",
        '',
        'const app: Application = express();',
        '',
        '// ── Global Middlewares ────────────────────────────────────────────────────────',
        'app.use(helmet());',
        'app.use(cors());',
    );

    if (useRateLimit) {
        lines.push('app.use(globalRateLimiter);');
    }

    lines.push(
        'app.use(express.json());',
        'app.use(express.urlencoded({ extended: true }));',
    );

    if (useCookies) {
        lines.push('app.use(cookieParser());');
    }

    lines.push(
        '',
        '// ── Health Check ──────────────────────────────────────────────────────────────',
        "app.get('/health', (_req: Request, res: Response): void => {",
        '  const uptime = process.uptime();',
        '  const timestamp = new Date().toISOString();',
        '  logger.info(`Health check called — uptime: ${uptime.toFixed(2)}s`);',
        '  res.status(200).json({',
        "    status: 'ok',",
        '    uptime: parseFloat(uptime.toFixed(2)),',
        '    timestamp,',
        '  });',
        '});',
        '',
        '// ── Routes ────────────────────────────────────────────────────────────────────',
        "app.use('/api/v1', router);",
        '',
        '// ── Error Handlers (must be last) ────────────────────────────────────────────',
        'app.use(notFound);',
        'app.use(globalErrorHandler);',
        '',
        'export default app;',
    );

    fs.writeFileSync(path.join(projectPath, 'src/app.ts'), lines.join('\n') + '\n');
}

// ─── MONGOOSE QUERY BUILDER ───────────────────────────────────────────────────
function scaffoldQueryBuilder(projectPath) {
    fs.writeFileSync(
        path.join(projectPath, 'src/app/utils/QueryBuilder.ts'),
        `import { QueryFilter, Query } from 'mongoose';

class QueryBuilder<T> {
  public modelQuery: Query<T[], T>;
  public query: Record<string, unknown>;

  constructor(modelQuery: Query<T[], T>, query: Record<string, unknown>) {
    this.modelQuery = modelQuery;
    this.query = query;
  }

  search(searchableFields: string[]) {
    const searchTerm = this.query?.searchTerm;
    if (searchTerm) {
      this.modelQuery = this.modelQuery.find({
        $or: searchableFields.map((field) => ({
          [field]: { $regex: searchTerm, $options: 'i' },
        })),
      } as QueryFilter<T>);
    }
    return this;
  }

  filter() {
    const queryObj = { ...this.query };
    const excludedFields = ['searchTerm', 'sort', 'limit', 'page', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);
    this.modelQuery = this.modelQuery.find(queryObj as QueryFilter<T>);
    return this;
  }

  sort() {
    const sort =
      (this.query?.sort as string)?.split(',').join(' ') || '-createdAt';
    this.modelQuery = this.modelQuery.sort(sort);
    return this;
  }

  paginate() {
    const page = Number(this.query?.page) || 1;
    const limit = Number(this.query?.limit) || 10;
    const skip = (page - 1) * limit;
    this.modelQuery = this.modelQuery.skip(skip).limit(limit);
    return this;
  }

  fields() {
    const fields =
      (this.query?.fields as string)?.split(',').join(' ') || '-__v';
    this.modelQuery = this.modelQuery.select(fields);
    return this;
  }

  async countTotal() {
    const filter = this.modelQuery.getFilter();
    const total = await this.modelQuery.model.countDocuments(filter);
    const page = Number(this.query?.page) || 1;
    const limit = Number(this.query?.limit) || 10;
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export default QueryBuilder;
`,
    );
}

module.exports = {
    scaffoldCoreFiles,
    scaffoldQueryBuilder,
};