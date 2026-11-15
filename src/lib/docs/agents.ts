/**
 * src/lib/docs/agents.ts
 *
 * Builds the `AGENTS.md` file content for the scaffolded project.
 * This document helps AI coding assistants understand the project
 * architecture, conventions, and CLI commands.
 */

import type { DbChoice, ValidatorChoice, TokenDelivery, PackageManager } from '../types';

export interface AgentDocsOptions {
  projectName: string;
  db: DbChoice;
  validator: ValidatorChoice;
  useAuth: boolean;
  useDocker: boolean;
  tokenDelivery?: TokenDelivery;
  pm?: PackageManager;
}

/** Maps a DB choice to a human-readable label. */
function dbLabel(db: DbChoice): string {
  return (
    {
      mongoose: 'Mongoose (MongoDB)',
      prisma: 'Prisma (PostgreSQL)',
      drizzle: 'Drizzle (PostgreSQL)',
    }[db] || db
  );
}

/** Returns the model/schema pattern description for the chosen DB. */
function modelPattern(db: DbChoice): string {
  switch (db) {
    case 'mongoose':
      return 'Mongoose schemas — `new Schema<IModel>({...})` exported as `model<IModel>(\'Name\', schema)`';
    case 'prisma':
      return 'Prisma schema — models defined in `prisma/schema.prisma`, accessed via singleton `prisma` client in `src/app/utils/prisma.ts`';
    case 'drizzle':
      return 'Drizzle schemas — tables defined with `pgTable()` in model files, accessed via `drizzle(pool)` in `src/app/utils/drizzle.ts`';
    default:
      return '';
  }
}

/**
 * Returns the DB migration command for the chosen DB and package manager,
 * or `null` if the DB manages migrations automatically (e.g. Mongoose).
 */
function migrationCmd(db: DbChoice, pm: PackageManager): string | null {
  switch (db) {
    case 'mongoose':
      return null;
    case 'prisma':
      return `${pm === 'npm' ? 'npx' : pm === 'yarn' ? 'yarn' : 'pnpm exec'} prisma migrate dev --name <migration_name>`;
    case 'drizzle':
      return `${pm === 'npm' ? 'npx' : pm === 'yarn' ? 'yarn' : 'pnpm exec'} drizzle-kit migrate`;
    default:
      return null;
  }
}

/**
 * Builds the full `AGENTS.md` content as a string.
 *
 * @param opts - Project configuration options chosen during scaffolding.
 * @returns The complete markdown document.
 */
export function buildAgentsMd(opts: AgentDocsOptions): string {
  const {
    projectName,
    db,
    validator,
    useAuth,
    useDocker,
    tokenDelivery,
    pm = 'npm',
  } = opts;

  const lines: string[] = [];

  lines.push(`# AGENTS.md — ${projectName}`);
  lines.push('');
  lines.push('## Token-Saving Workflow');
  lines.push('1. Read `cem-cli.json` first (stack, paths, live `state.modules`, `state.middlewares`, `state.env`) instead of scanning directories.');
  lines.push('2. Use `cem` with `--json` or `--quiet` for compact, zero-noise output.');
  lines.push('3. Never hand-write boilerplate files — generate them with `cem add`.');
  lines.push('');
  lines.push('## Stack');
  lines.push(`- Runtime: Node.js ≥ 22 | Express + TypeScript | PM: ${pm}`);
  lines.push(`- DB: ${dbLabel(db)} | Validator: ${validator === 'zod' ? 'Zod' : 'Joi'}`);
  if (useAuth) {
    lines.push(`- Auth: JWT (${tokenDelivery === 'cookie' ? 'HTTP-only cookies' : 'Authorization header'})`);
  }
  if (useDocker) {
    lines.push('- Docker: Dockerfile + docker-compose');
  }
  lines.push('');
  lines.push('## CLI Commands');
  lines.push('- `cem list --json` — full project state (modules, middlewares, env, utils)');
  lines.push('- `cem add module <Name...> -y --json` — scaffold module(s) & auto-wire routes');
  lines.push('- `cem add middleware <name...> --json` — scaffold `<name>.middleware.ts`');
  lines.push('- `cem add env <KEY...> --json` — add env key(s) to `.env`, `.env.example`, `src/app/config/index.ts`');
  lines.push('- `cem remove module|middleware|env <name...> -y --json` — remove & unwire');
  lines.push('- `cem check --json` / `cem check --fix --json` — typecheck, lint, format');
  lines.push('- `cem build` / `cem dev` / `cem start`');
  lines.push('');
  lines.push('## Rules');
  lines.push('- Pattern: ' + modelPattern(db));
  lines.push('- Wrap handlers with `catchAsync()`; respond with `sendResponse()`; validate with `validateRequest()`.');
  if (db === 'mongoose') {
    lines.push('- Use `QueryBuilder` (`src/app/utils/QueryBuilder.ts`) for search/filter/sort/pagination.');
  }
  lines.push('- Middlewares MUST be named `<name>.middleware.ts` in `src/app/middlewares/`.');
  lines.push('- Never read `process.env` directly — import `config` from `src/app/config`.');
  lines.push('- Keep inject markers in `src/app/routes/index.ts` intact.');
  lines.push('- Do not modify core middlewares (`globalErrorHandler`, `notFound`' + (useAuth ? ', `auth`, `rateLimiter`' : '') + ') unless requested.');
  const migrate = migrationCmd(db, pm);
  if (migrate) {
    lines.push(`- DB migrations: \`${migrate}\``);
  }
  lines.push('');

  return lines.join('\n');
}

export { migrationCmd, dbLabel };
