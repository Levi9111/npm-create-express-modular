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

    // welcomePage — styled HTML landing page served at /
    fs.writeFileSync(
        path.join(utilsDir, 'welcomePage.ts'),
        `export function cemWelcomePage(): string {
  const pkg = (() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('../../package.json');
    } catch {
      return { name: 'my-api', version: '1.0.0' };
    }
  })();

  return \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>\${pkg.name} — API</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: #0a0a0a;
      color: #e2e8f0;
      font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }

    .container {
      width: 100%;
      max-width: 680px;
    }

    /* ── Badge ── */
    .badge {
      display: inline-block;
      background: #06b6d4;
      color: #000;
      font-weight: 700;
      font-size: 0.75rem;
      padding: 2px 10px;
      border-radius: 2px;
      letter-spacing: 0.08em;
      margin-bottom: 1.25rem;
    }

    /* ── Header ── */
    .header {
      margin-bottom: 2rem;
    }

    .project-name {
      font-size: 1.75rem;
      font-weight: 700;
      color: #22d3ee;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }

    .version {
      color: #64748b;
      font-size: 0.85rem;
      margin-top: 0.4rem;
    }

    .tagline {
      color: #94a3b8;
      font-size: 0.9rem;
      margin-top: 0.75rem;
      line-height: 1.6;
    }

    /* ── Divider ── */
    .divider {
      border: none;
      border-top: 1px solid #1e293b;
      margin: 1.75rem 0;
    }

    /* ── Status row ── */
    .status-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      font-size: 0.85rem;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 6px #22c55e;
      flex-shrink: 0;
    }

    .status-text { color: #22c55e; }
    .status-time { color: #475569; margin-left: auto; }

    /* ── Routes ── */
    .section-label {
      font-size: 0.7rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #475569;
      margin-bottom: 0.75rem;
    }

    .route-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      margin-bottom: 1.75rem;
    }

    .route-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0.75rem;
      border-radius: 4px;
      background: #0f172a;
      border: 1px solid #1e293b;
      font-size: 0.82rem;
      transition: border-color 0.15s;
    }

    .route-item:hover { border-color: #06b6d4; }

    .method {
      font-weight: 700;
      font-size: 0.7rem;
      min-width: 42px;
      text-align: center;
      padding: 2px 6px;
      border-radius: 3px;
    }

    .method-get    { background: #052e16; color: #22c55e; }
    .method-post   { background: #1e1b4b; color: #818cf8; }
    .method-patch  { background: #1c1917; color: #f59e0b; }
    .method-delete { background: #1a0a0a; color: #f87171; }

    .route-path { color: #22d3ee; }
    .route-desc { color: #475569; margin-left: auto; font-size: 0.75rem; }

    /* ── Health ── */
    .health-link {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      color: #475569;
      font-size: 0.8rem;
      text-decoration: none;
      padding: 0.4rem 0.75rem;
      border: 1px solid #1e293b;
      border-radius: 4px;
      transition: all 0.15s;
      margin-bottom: 1.75rem;
    }

    .health-link:hover {
      border-color: #22c55e;
      color: #22c55e;
    }

    /* ── Footer ── */
    .footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.75rem;
      color: #334155;
    }

    .footer a {
      color: #334155;
      text-decoration: none;
      transition: color 0.15s;
    }

    .footer a:hover { color: #22d3ee; }

    .cem-credit {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .cem-badge-small {
      background: #06b6d4;
      color: #000;
      font-weight: 700;
      font-size: 0.6rem;
      padding: 1px 5px;
      border-radius: 2px;
    }

    /* ── Cursor blink ── */
    .cursor {
      display: inline-block;
      width: 2px;
      height: 1.1em;
      background: #22d3ee;
      margin-left: 3px;
      vertical-align: middle;
      animation: blink 1s step-end infinite;
    }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0; }
    }
  </style>
</head>
<body>
  <div class="container">

    <div class="header">
      <div class="badge">CEM</div>
      <div class="project-name">\${pkg.name}<span class="cursor"></span></div>
      <div class="version">v\${pkg.version}</div>
      <div class="tagline">
        Modular Express + TypeScript — production-ready API server.
      </div>
    </div>

    <hr class="divider" />

    <div class="status-row">
      <span class="dot"></span>
      <span class="status-text">Server is running</span>
      <span class="status-time">\${new Date().toLocaleTimeString('en-GB')}</span>
    </div>

    <div class="section-label">Available Routes</div>
    <ul class="route-list">
      <li class="route-item">
        <span class="method method-get">GET</span>
        <span class="route-path">/health</span>
        <span class="route-desc">Health check</span>
      </li>
      <li class="route-item">
        <span class="method method-get">GET</span>
        <span class="route-path">/api/v1/</span>
        <span class="route-desc">API base</span>
      </li>
    </ul>

    <a class="health-link" href="/health">
      <span>◈</span>
      <span>Check /health</span>
    </a>

    <hr class="divider" />

    <div class="footer">
      <span>\${new Date().getFullYear()} · \${pkg.name}</span>
      <div class="cem-credit">
        <span>Built with</span>
        <span class="cem-badge-small">CEM</span>
        <a href="https://github.com/Levi9111/npm-create-express-modular" target="_blank">
          create-express-modular
        </a>
      </div>
    </div>

  </div>
</body>
</html>\`;
}
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
        "import { cemWelcomePage } from './app/utils/welcomePage';",
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
        '// ── Root ──────────────────────────────────────────────────────────────────────',
        "app.get('/', (_req: Request, res: Response): void => {",
        "  res.setHeader('Content-Type', 'text/html');",
        '  res.send(cemWelcomePage());',
        '});',
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