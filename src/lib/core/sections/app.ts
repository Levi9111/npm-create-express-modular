/**
 * src/lib/core/sections/app.ts
 *
 * Scaffolds `src/app.ts` — the Express application entry point.
 * The generated file conditionally includes cookie-parser and rate limiter
 * imports based on the user's choices during scaffolding.
 */

import fs from 'fs';
import path from 'path';
import type { TokenDelivery } from '../../types';

/**
 * Writes `src/app.ts` into the target project with all standard middleware
 * wired up. Import lines and middleware usage are adjusted based on whether
 * cookie-based auth or rate limiting were selected.
 *
 * @param projectPath   - Absolute path to the project root.
 * @param useRateLimit  - Whether to import and apply the global rate limiter.
 * @param tokenDelivery - `'cookie'` adds `cookie-parser`; `'header'` omits it.
 */
export function scaffoldApp(
  projectPath: string,
  useRateLimit: boolean,
  tokenDelivery: TokenDelivery = 'header',
): void {
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
