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
  <title>\${pkg.name} — Developer Console</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #030712;
      --card-bg: rgba(15, 23, 42, 0.75);
      --accent-cyan: #06b6d4;
      --accent-glow: #22d3ee;
      --accent-purple: #8b5cf6;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --border: rgba(56, 189, 248, 0.15);
    }

    body {
      background-color: var(--bg);
      background-image: 
        radial-gradient(circle at 50% 0%, rgba(6, 182, 212, 0.18) 0%, transparent 60%),
        radial-gradient(circle at 85% 85%, rgba(139, 92, 246, 0.12) 0%, transparent 50%),
        linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
      background-size: 100% 100%, 100% 100%, 32px 32px, 32px 32px;
      color: var(--text-main);
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2.5rem 1.25rem;
    }

    .container {
      width: 100%;
      max-width: 680px;
      background: var(--card-bg);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 2.5rem;
      box-shadow: 
        0 25px 50px -12px rgba(0, 0, 0, 0.7),
        0 0 30px rgba(6, 182, 212, 0.1);
      position: relative;
      overflow: hidden;
    }

    .container::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, #06b6d4, #8b5cf6, #3b82f6);
    }

    /* HUD Header */
    .hud-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.75rem;
      padding-bottom: 1rem;
      border-bottom: 1px dashed rgba(255, 255, 255, 0.08);
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.72rem;
    }

    .hud-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.3);
      color: #4ade80;
      padding: 4px 10px;
      border-radius: 9999px;
      font-weight: 600;
      letter-spacing: 0.05em;
    }

    .pulse {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 10px #22c55e;
      animation: pulse-glow 2s infinite;
    }

    @keyframes pulse-glow {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.3); opacity: 0.7; }
    }

    .hud-meta {
      display: flex;
      gap: 0.85rem;
      color: #64748b;
    }

    .meta-tag {
      background: rgba(30, 41, 59, 0.6);
      padding: 3px 8px;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    /* Hero Section */
    .hero { margin-bottom: 1.75rem; }

    .title-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 1.85rem;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.03em;
    }

    .prompt-symbol { color: var(--accent-cyan); }
    .project-title {
      background: linear-gradient(135deg, #ffffff 30%, var(--accent-glow) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .cursor {
      display: inline-block;
      width: 3px;
      height: 1.1em;
      background: var(--accent-glow);
      margin-left: 2px;
      animation: blink 1.1s step-end infinite;
    }

    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

    .subtitle {
      color: var(--text-muted);
      font-size: 0.925rem;
      margin-top: 0.6rem;
      line-height: 1.6;
    }

    .tech-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 1rem;
    }

    .tech-pill {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.7rem;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(6, 182, 212, 0.1);
      border: 1px solid rgba(6, 182, 212, 0.25);
      color: var(--accent-glow);
    }

    /* Action Buttons */
    .actions-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.85rem;
      margin-bottom: 1.75rem;
    }

    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 0.875rem;
      font-weight: 700;
      text-decoration: none;
      padding: 0.75rem 1.25rem;
      border-radius: 10px;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .btn-primary {
      background: linear-gradient(135deg, #06b6d4, #8b5cf6);
      color: #ffffff;
      box-shadow: 0 4px 18px rgba(6, 182, 212, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.15);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(6, 182, 212, 0.5);
      filter: brightness(1.1);
    }

    .btn-secondary {
      background: rgba(30, 41, 59, 0.7);
      color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .btn-secondary:hover {
      background: rgba(51, 65, 85, 0.8);
      color: #ffffff;
      border-color: rgba(6, 182, 212, 0.4);
      transform: translateY(-2px);
    }

    /* Terminal Console Snippet */
    .terminal-box {
      background: #090d16;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 1.1rem 1.25rem;
      margin-bottom: 1.75rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
    }

    .terminal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.75rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      color: #64748b;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .terminal-line {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 3px 0;
      color: #cbd5e1;
    }

    .t-prompt { color: #06b6d4; font-weight: 700; }
    .t-cmd { color: #f8fafc; font-weight: 600; }
    .t-comment { color: #475569; margin-left: auto; font-size: 0.72rem; }

    /* Endpoints Section */
    .section-title {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.7rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 700;
      margin-bottom: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .route-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 1.75rem;
    }

    .route-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.65rem 0.9rem;
      border-radius: 8px;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.05);
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8rem;
      transition: all 0.2s ease;
      text-decoration: none;
    }

    .route-item:hover {
      background: rgba(30, 41, 59, 0.6);
      border-color: rgba(6, 182, 212, 0.35);
      transform: translateX(3px);
    }

    .method {
      font-weight: 800;
      font-size: 0.65rem;
      min-width: 44px;
      text-align: center;
      padding: 3px 6px;
      border-radius: 4px;
      letter-spacing: 0.05em;
    }

    .method-get { background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.3); }
    .method-all { background: rgba(139, 92, 246, 0.15); color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.3); }

    .route-path { color: #38bdf8; font-weight: 600; }
    .route-desc { color: #64748b; margin-left: auto; font-size: 0.72rem; font-family: 'Plus Jakarta Sans', sans-serif; }

    /* Footer */
    .footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.75rem;
      color: #475569;
      padding-top: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .footer a { color: #94a3b8; text-decoration: none; transition: color 0.15s; font-weight: 600; }
    .footer a:hover { color: #06b6d4; }
  </style>
</head>
<body>
  <div class="container">

    <!-- HUD Status Header -->
    <div class="hud-bar">
      <div class="hud-status">
        <span class="pulse"></span>
        <span>SYSTEM ACTIVE</span>
      </div>
      <div class="hud-meta">
        <span class="meta-tag">ENV: DEV</span>
        <span class="meta-tag">PORT 5000</span>
      </div>
    </div>

    <!-- Hero Title -->
    <div class="hero">
      <div class="title-row">
        <span class="prompt-symbol">&gt;</span>
        <span class="project-title">\${pkg.name}</span>
        <span class="cursor"></span>
      </div>
      <div class="subtitle">
        Production-ready modular Express API engine compiled with TypeScript.
      </div>
      <div class="tech-badges">
        <span class="tech-pill">Express.js</span>
        <span class="tech-pill">TypeScript 5</span>
        <span class="tech-pill">OpenAPI 3.0</span>
        <span class="tech-pill">Modular Architecture</span>
      </div>
    </div>

    <!-- Primary Quick Actions -->
    <div class="actions-grid">
      <a class="btn btn-primary" href="/docs">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
        <span>OpenAPI Specs</span>
      </a>
      <a class="btn btn-secondary" href="/health">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <span>Health Status</span>
      </a>
    </div>

    <!-- Quick Terminal Command Center -->
    <div class="terminal-box">
      <div class="terminal-header">
        <span>CLI Command Center</span>
        <span>create-express-modular</span>
      </div>
      <div class="terminal-line">
        <span class="t-prompt">$</span>
        <span class="t-cmd">cem add module &lt;name&gt;</span>
        <span class="t-comment"># Generate CRUD feature module</span>
      </div>
      <div class="terminal-line">
        <span class="t-prompt">$</span>
        <span class="t-cmd">cem add middleware &lt;name&gt;</span>
        <span class="t-comment"># Inject custom middleware</span>
      </div>
      <div class="terminal-line">
        <span class="t-prompt">$</span>
        <span class="t-cmd">cem list</span>
        <span class="t-comment"># Inspect architecture tree</span>
      </div>
    </div>

    <!-- Live Endpoints Matrix -->
    <div class="section-title">◈ Core Server Endpoints</div>
    <ul class="route-list">
      <a class="route-item" href="/docs">
        <span class="method method-get">GET</span>
        <span class="route-path">/docs</span>
        <span class="route-desc">Interactive Swagger API Specs</span>
      </a>
      <a class="route-item" href="/health">
        <span class="method method-get">GET</span>
        <span class="route-path">/health</span>
        <span class="route-desc">System health & uptime diagnostics</span>
      </a>
      <a class="route-item" href="/api/v1">
        <span class="method method-all">ALL</span>
        <span class="route-path">/api/v1/*</span>
        <span class="route-desc">Modular API Router Prefix</span>
      </a>
    </ul>

    <!-- Footer -->
    <div class="footer">
      <span>\${pkg.name} v\${pkg.version}</span>
      <a href="https://github.com/Levi9111/npm-create-express-modular" target="_blank">
        create-express-modular
      </a>
    </div>

  </div>
</body>
</html>\`;
}
`;
}
