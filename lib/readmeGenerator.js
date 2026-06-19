'use strict';

const fs = require('fs');
const path = require('path');
const { runScript } = require('./pm');

/**
 * Generate a README.md tailored to the scaffolded project.
 *
 * @param {string} projectPath  Absolute path to the new project directory
 * @param {object} opts
 * @param {string} opts.projectName  Name of the project
 * @param {string} opts.db           Database choice: 'mongoose' | 'prisma' | 'drizzle'
 * @param {string} opts.validator    Validator choice: 'zod' | 'joi'
 * @param {boolean} opts.useAuth     Whether JWT auth module was included
 * @param {boolean} opts.useDocker   Whether Docker files were generated
 * @param {string} opts.tokenDelivery 'cookie' | 'header'
 */
function generateReadme(projectPath, opts) {
    const {
        projectName,
        db,
        validator,
        useAuth,
        useDocker,
        tokenDelivery,
        pm = 'npm',
    } = opts;

    const dbLabel = { mongoose: 'Mongoose (MongoDB)', prisma: 'Prisma (PostgreSQL / MySQL / SQLite)', drizzle: 'Drizzle (PostgreSQL)' }[db] || db;
    const valLabel = validator === 'zod' ? 'Zod' : 'Joi';

    const lines = [];

    // ── Header ────────────────────────────────────────────────────────────────
    lines.push(`# ${projectName}`);
    lines.push('');
    lines.push(`> Scaffolded with [create-express-modular](https://create-express-modular.lovable.app/) (cem)`);
    lines.push('');
    lines.push(`A production-ready, domain-driven **Express + TypeScript** backend.`);
    lines.push('');

    // ── Stack ─────────────────────────────────────────────────────────────────
    lines.push('## Tech Stack');
    lines.push('');
    lines.push(`| Layer | Choice |`);
    lines.push(`|---|---|`);
    lines.push(`| Runtime | Node.js ≥ 18 |`);
    lines.push(`| Framework | Express |`);
    lines.push(`| Language | TypeScript |`);
    lines.push(`| Database / ORM | ${dbLabel} |`);
    lines.push(`| Validation | ${valLabel} |`);

    if (useAuth) {
        const delivery = tokenDelivery === 'cookie' ? 'HTTP-only cookies' : 'Authorization header';
        lines.push(`| Auth | JWT (bcrypt + rate limiting) — ${delivery} |`);
    }

    if (useDocker) {
        lines.push(`| Containerization | Docker + docker-compose |`);
    }

    lines.push('');

    // ── Getting started ───────────────────────────────────────────────────────
    lines.push('## Getting Started');
    lines.push('');
    lines.push('```bash');
    lines.push('# Install dependencies (already done by CEM)');
    const installCommand = pm === 'npm' ? 'npm install' : pm === 'yarn' ? 'yarn' : 'pnpm install';
    lines.push(installCommand);
    lines.push('');
    lines.push('# Start the dev server with hot reload');
    lines.push('cem dev');
    lines.push('```');
    lines.push('');
    lines.push('Your server will be running at `http://localhost:5000`.');
    lines.push('');
    lines.push('Visit the root URL in a browser to see the **CEM Welcome Page** — a styled landing page showing project info, server status, and available routes.');
    lines.push('');

    // ── Scripts ────────────────────────────────────────────────────────────────
    lines.push('## Available Scripts');
    lines.push('');
    lines.push('| Command | Description |');
    lines.push('|---|---|');
    lines.push('| `cem dev` | Start dev server with live reload |');
    lines.push('| `cem build` | Convention guards + compile TypeScript to `dist/` |');
    lines.push('| `cem start` | Start the production server with preflight checks |');
    lines.push('| `cem check` | Type-check, lint, and format check in one command |');
    lines.push('| `cem list` | List all modules, middlewares, and env vars |');
    lines.push(`| \`${runScript(pm, 'lint')}\` | Run ESLint |`);
    lines.push(`| \`${runScript(pm, 'lint:fix')}\` | Run ESLint with auto-fix |`);
    lines.push(`| \`${runScript(pm, 'prettier:fix')}\` | Format code with Prettier |`);
    lines.push('');

    // ── Package manager ───────────────────────────────────────────────────────
    const pmLabel = pm === 'yarn' ? 'Yarn' : pm === 'pnpm' ? 'pnpm' : 'npm';
    const addCmd    = pm === 'npm' ? 'npm install'    : pm === 'yarn' ? 'yarn add'    : 'pnpm add';
    const addDevCmd = pm === 'npm' ? 'npm install -D' : pm === 'yarn' ? 'yarn add -D' : 'pnpm add -D';
    const removeCmd = pm === 'npm' ? 'npm uninstall'  : pm === 'yarn' ? 'yarn remove' : 'pnpm remove';

    lines.push(`## Package Manager (${pmLabel})`);
    lines.push('');
    lines.push(`This project was scaffolded with **${pmLabel}**. Use it for all package operations:`);
    lines.push('');
    lines.push('```bash');
    lines.push(`# Install a production dependency`);
    lines.push(`${addCmd} <package>`);
    lines.push('');
    lines.push(`# Install a dev dependency`);
    lines.push(`${addDevCmd} <package>`);
    lines.push('');
    lines.push(`# Remove a package`);
    lines.push(`${removeCmd} <package>`);
    lines.push('');
    lines.push(`# Re-install all dependencies`);
    lines.push(pm === 'npm' ? 'npm install' : pm === 'yarn' ? 'yarn' : 'pnpm install');
    lines.push('```');
    lines.push('');
    lines.push('> `cem dev`, `cem build`, `cem check`, and `cem start` are **package-manager-agnostic** —');
    lines.push('> they invoke tools directly from `node_modules/.bin/` and work the same regardless of which PM you use.');
    lines.push('');


    lines.push('## Adding Features');
    lines.push('');
    lines.push('### Add a module');
    lines.push('');
    lines.push('```bash');
    lines.push('cem add module Product');
    lines.push('```');
    lines.push('');
    lines.push('Creates a complete `Product` module in `src/app/modules/Product/` (controller, service, route, model, interface, validation) and auto-registers it in your router.');
    lines.push('');
    lines.push('### Add a middleware');
    lines.push('');
    lines.push('```bash');
    lines.push('cem add middleware rateLimiter');
    lines.push('```');
    lines.push('');
    lines.push('### Add an environment variable');
    lines.push('');
    lines.push('```bash');
    lines.push('cem add env STRIPE_SECRET_KEY');
    lines.push('```');
    lines.push('');
    lines.push('Adds the variable to `.env`, `.env.example`, and `src/app/config/index.ts` simultaneously.');
    lines.push('');

    // ── Removing things ───────────────────────────────────────────────────────
    lines.push('## Removing Features');
    lines.push('');
    lines.push('```bash');
    lines.push('cem remove module Product      # deletes folder + unwires route');
    lines.push('cem remove middleware logger    # deletes the middleware file');
    lines.push('cem remove env STRIPE_SECRET_KEY');
    lines.push('```');
    lines.push('');

    // ── Project structure ─────────────────────────────────────────────────────
    lines.push('## Project Structure');
    lines.push('');
    lines.push('```');
    lines.push(`${projectName}/`);
    lines.push('├── src/');
    lines.push('│   ├── app/');
    lines.push('│   │   ├── config/');
    lines.push('│   │   │   └── index.ts             # Central config (all env vars)');
    lines.push('│   │   ├── errors/                   # Error handler helpers');
    lines.push('│   │   ├── interfaces/               # Shared TypeScript types');
    lines.push('│   │   ├── middlewares/');
    lines.push('│   │   │   ├── globalErrorHandler.middleware.ts');
    lines.push('│   │   │   └── notFound.middleware.ts');
    if (useAuth) {
        lines.push('│   │   │   ├── auth.middleware.ts');
        lines.push('│   │   │   └── rateLimiter.middleware.ts');
    }
    lines.push('│   │   ├── modules/');
    if (useAuth) {
        lines.push('│   │   │   └── Auth/             # JWT Auth module');
    }
    lines.push('│   │   ├── routes/');
    lines.push('│   │   │   └── index.ts             # Unified routing registry');
    lines.push('│   │   └── utils/');
    lines.push('│   │       ├── catchAsync.ts');
    lines.push('│   │       ├── sendResponse.ts');
    lines.push('│   │       ├── validateRequest.ts');
    lines.push('│   │       ├── welcomePage.ts');
    lines.push('│   │       └── logger.ts');
    lines.push('│   ├── app.ts');
    lines.push('│   └── server.ts');
    if (useDocker) {
        lines.push('├── Dockerfile');
        lines.push('├── .dockerignore');
        lines.push('├── docker-compose.yml');
    }
    lines.push('├── .env');
    lines.push('├── .env.example');
    lines.push('├── eslint.config.mjs');
    lines.push('├── tsconfig.json');
    lines.push('└── package.json');
    lines.push('```');
    lines.push('');

    // ── Docker (conditional) ──────────────────────────────────────────────────
    if (useDocker) {
        lines.push('## Docker');
        lines.push('');
        lines.push('```bash');
        lines.push('# Start everything (app + database)');
        lines.push('docker-compose up --build');
        lines.push('');
        lines.push('# Production (single service, external DB)');
        lines.push(`docker build -t ${projectName} .`);
        lines.push(`docker run -p 5000:5000 --env-file .env ${projectName}`);
        lines.push('```');
        lines.push('');
    }

    // ── Error handling ────────────────────────────────────────────────────────
    lines.push('## Error Handling');
    lines.push('');
    lines.push('The `globalErrorHandler` middleware is **stack-aware** — it maps database and validation errors into a consistent JSON response:');
    lines.push('');
    lines.push('```json');
    lines.push('{');
    lines.push('  "success": false,');
    lines.push('  "message": "Validation Error",');
    lines.push('  "errorSources": [');
    lines.push('    { "path": "email", "message": "Invalid email address" }');
    lines.push('  ]');
    lines.push('}');
    lines.push('```');
    lines.push('');

    // ── Footer ────────────────────────────────────────────────────────────────
    lines.push('---');
    lines.push('');
    lines.push('Built with [`create-express-modular`](https://create-express-modular.lovable.app/) — stop scaffolding, start shipping.');
    lines.push('');

    fs.writeFileSync(path.join(projectPath, 'README.md'), lines.join('\n'));
}

module.exports = { generateReadme };
