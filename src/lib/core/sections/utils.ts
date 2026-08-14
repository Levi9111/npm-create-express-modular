/**
 * src/lib/core/sections/utils.ts
 *
 * Scaffolds the `src/app/utils/` directory into the target project.
 * Writes core utilities: catchAsync, sendResponse, logger, QueryBuilder stub,
 * and the CEM welcome page generator.
 */

import fs from 'fs';
import path from 'path';

/**
 * Creates all core utility files under `src/app/utils/`.
 *
 * @param projectPath - Absolute path to the project root.
 */
export function scaffoldUtils(projectPath: string): void {
  const utilsDir = path.join(projectPath, 'src/app/utils');
  fs.mkdirSync(utilsDir, { recursive: true });

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

  fs.writeFileSync(
    path.join(utilsDir, 'QueryBuilder.ts'),
    `// This file is populated by the DB generator.
// For Mongoose projects: search, filter, sort, paginate, fields chaining.
// For SQL/Prisma projects: replace with your own query helper as needed.
export {};
`,
  );

  fs.writeFileSync(
    path.join(utilsDir, 'welcomePage.ts'),
    buildWelcomePage(),
  );
}

/**
 * Returns the full content of `welcomePage.ts` — the CEM server landing page
 * shown at the root URL of a newly scaffolded project.
 */
function buildWelcomePage(): string {
  return `export function cemWelcomePage(): string {
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

    .container { width: 100%; max-width: 680px; }

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

    .header { margin-bottom: 2rem; }

    .project-name {
      font-size: 1.75rem;
      font-weight: 700;
      color: #22d3ee;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }

    .version { color: #64748b; font-size: 0.85rem; margin-top: 0.4rem; }

    .tagline {
      color: #94a3b8;
      font-size: 0.9rem;
      margin-top: 0.75rem;
      line-height: 1.6;
    }

    .divider { border: none; border-top: 1px solid #1e293b; margin: 1.75rem 0; }

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

    .health-link:hover { border-color: #22c55e; color: #22c55e; }

    .footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.75rem;
      color: #334155;
    }

    .footer a { color: #334155; text-decoration: none; transition: color 0.15s; }
    .footer a:hover { color: #22d3ee; }

    .cem-credit { display: flex; align-items: center; gap: 0.4rem; }

    .cem-badge-small {
      background: #06b6d4;
      color: #000;
      font-weight: 700;
      font-size: 0.6rem;
      padding: 1px 5px;
      border-radius: 2px;
    }

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
        <span class="route-path">/docs</span>
        <span class="route-desc">Swagger API Specs (OpenAPI 3.0)</span>
      </li>
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

    <a class="health-link" href="/docs" target="_blank">
      <span>📖</span>
      <span>Open Swagger Docs (/docs)</span>
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
`;
}
