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
  <title>\${pkg.name} — API Server</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: #06080d;
      background-image: 
        radial-gradient(circle at 50% -10%, rgba(6, 182, 212, 0.15) 0%, transparent 55%),
        linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
      background-size: 100% 100%, 32px 32px, 32px 32px;
      color: #f1f5f9;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1.25rem;
    }

    .container {
      width: 100%;
      max-width: 640px;
      background: rgba(13, 18, 30, 0.75);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 2.25rem;
      box-shadow: 
        0 24px 48px -12px rgba(0, 0, 0, 0.5),
        0 0 0 1px rgba(6, 182, 212, 0.15);
    }

    .badge-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.25rem;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(59, 130, 246, 0.2));
      border: 1px solid rgba(34, 211, 238, 0.3);
      color: #22d3ee;
      font-family: 'Fira Code', monospace;
      font-weight: 700;
      font-size: 0.72rem;
      padding: 3px 10px;
      border-radius: 6px;
      letter-spacing: 0.06em;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      background: rgba(34, 197, 94, 0.08);
      border: 1px solid rgba(34, 197, 94, 0.2);
      color: #4ade80;
      font-size: 0.75rem;
      font-weight: 500;
      padding: 3px 10px;
      border-radius: 9999px;
    }

    .pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 8px #22c55e;
      position: relative;
    }

    .header { margin-bottom: 1.75rem; }

    .project-name {
      font-family: 'Fira Code', monospace;
      font-size: 1.65rem;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.02em;
      line-height: 1.25;
      display: flex;
      align-items: center;
    }

    .highlight { color: #22d3ee; }

    .version {
      font-family: 'Fira Code', monospace;
      color: #64748b;
      font-size: 0.8rem;
      margin-top: 0.35rem;
    }

    .tagline {
      color: #94a3b8;
      font-size: 0.88rem;
      margin-top: 0.65rem;
      line-height: 1.55;
    }

    .divider {
      border: none;
      height: 1px;
      background: linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
      margin: 1.5rem 0;
    }

    .actions-group {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 1.75rem;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-size: 0.825rem;
      font-weight: 600;
      text-decoration: none;
      padding: 0.6rem 1.1rem;
      border-radius: 8px;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      flex: 1;
    }

    .btn-primary {
      background: linear-gradient(135deg, #06b6d4, #2563eb);
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(6, 182, 212, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(6, 182, 212, 0.45);
      background: linear-gradient(135deg, #22d3ee, #3b82f6);
    }

    .btn-secondary {
      background: rgba(30, 41, 59, 0.6);
      color: #cbd5e1;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .btn-secondary:hover {
      background: rgba(51, 65, 85, 0.8);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.15);
    }

    .section-label {
      font-size: 0.7rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 600;
      margin-bottom: 0.75rem;
    }

    .route-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }

    .route-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 0.85rem;
      border-radius: 8px;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.05);
      font-family: 'Fira Code', monospace;
      font-size: 0.82rem;
      transition: all 0.15s ease;
    }

    .route-item:hover {
      background: rgba(30, 41, 59, 0.5);
      border-color: rgba(6, 182, 212, 0.3);
      transform: translateX(2px);
    }

    .method {
      font-weight: 700;
      font-size: 0.68rem;
      min-width: 44px;
      text-align: center;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .method-get    { background: rgba(34, 197, 94, 0.12); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.25); }
    .method-post   { background: rgba(99, 102, 241, 0.12); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.25); }
    .method-patch  { background: rgba(245, 158, 11, 0.12); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.25); }
    .method-delete { background: rgba(239, 68, 68, 0.12); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.25); }

    .route-path { color: #38bdf8; font-weight: 500; }
    .route-desc { color: #64748b; margin-left: auto; font-size: 0.75rem; font-family: 'Inter', sans-serif; }

    .footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.75rem;
      color: #475569;
    }

    .footer a { color: #64748b; text-decoration: none; transition: color 0.15s; }
    .footer a:hover { color: #38bdf8; }

    .cem-credit { display: flex; align-items: center; gap: 0.4rem; }

    .cem-badge-small {
      background: rgba(6, 182, 212, 0.15);
      color: #22d3ee;
      border: 1px solid rgba(6, 182, 212, 0.3);
      font-weight: 700;
      font-size: 0.6rem;
      padding: 1px 5px;
      border-radius: 3px;
    }

    .cursor {
      display: inline-block;
      width: 2px;
      height: 1.1em;
      background: #22d3ee;
      margin-left: 4px;
      vertical-align: middle;
      animation: blink 1.2s step-end infinite;
    }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }
  </style>
</head>
<body>
  <div class="container">

    <div class="badge-bar">
      <div class="badge">
        <span>⚡</span> CEM MODULAR
      </div>
      <div class="status-pill">
        <span class="pulse-dot"></span>
        <span>Online</span>
      </div>
    </div>

    <div class="header">
      <div class="project-name">
        <span class="highlight">\${pkg.name}</span><span class="cursor"></span>
      </div>
      <div class="version">v\${pkg.version}</div>
      <div class="tagline">
        Modular Express + TypeScript architecture — production-ready server.
      </div>
    </div>

    <div class="actions-group">
      <a class="btn btn-primary" href="/docs" target="_blank">
        <span>📖</span>
        <span>Swagger API Docs</span>
      </a>
      <a class="btn btn-secondary" href="/health" target="_blank">
        <span>◈</span>
        <span>Health Check</span>
      </a>
    </div>

    <div class="section-label">Default Core Routes</div>
    <ul class="route-list">
      <li class="route-item">
        <span class="method method-get">GET</span>
        <span class="route-path">/docs</span>
        <span class="route-desc">Swagger API specs (OpenAPI 3.0)</span>
      </li>
      <li class="route-item">
        <span class="method method-get">GET</span>
        <span class="route-path">/health</span>
        <span class="route-desc">System health status check</span>
      </li>
      <li class="route-item">
        <span class="method method-get">GET</span>
        <span class="route-path">/api/v1/</span>
        <span class="route-desc">Base API router prefix</span>
      </li>
    </ul>

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
