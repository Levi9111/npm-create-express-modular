/**
 * src/lib/docs/claude.ts
 *
 * Builds a concise, token-efficient `CLAUDE.md` for the scaffolded project.
 */

import { runScript } from '../pm';
import type { AgentDocsOptions } from './agents';
import { dbLabel, migrationCmd } from './agents';

export function buildClaudeMd(opts: AgentDocsOptions): string {
  const {
    projectName,
    db,
    validator,
    useAuth,
    useDocker,
    tokenDelivery,
    pm = 'npm',
  } = opts;

  const lines: string[] = [
    `# CLAUDE.md — ${projectName}`,
    '',
    'See `AGENTS.md` for full rules and `cem-cli.json` for live project state (`modules`, `middlewares`, `env`).',
    '',
    '## Stack',
    `- ${dbLabel(db)} | ${validator === 'zod' ? 'Zod' : 'Joi'} | ${pm}${useAuth ? ` | JWT (${tokenDelivery === 'cookie' ? 'cookie' : 'header'})` : ''}${useDocker ? ' | Docker' : ''}`,
    '',
    '## Commands (Prefer `--json` / `--quiet` to minimize output)',
    '- `cem list --json` — inspect modules, middlewares, env',
    '- `cem add module <Name...> [--fields "name:string,price:number,flag:boolean?,role:enum(a|b),owner:ref(User)"] -y --json` — generate typed module, CRUD service, & wired route',
    '- `cem add middleware <name...> --json` — generate `<name>.middleware.ts`',
    '- `cem add env <KEY...> --json` — add env var to `.env`, `.env.example`, `src/app/config/index.ts`',
    '- `cem check --json` / `cem check --fix --json` — typecheck, lint, format',
    `- \`${runScript(pm, 'build')}\` / \`${runScript(pm, 'start:dev')}\``,
  ];

  const migrate = migrationCmd(db, pm);
  if (migrate) {
    lines.push(`- Migrate: \`${migrate}\``);
  }

  lines.push(
    '',
    '## Key Paths',
    '- `cem-cli.json` — stack + live `state` manifest',
    '- `src/app/config/index.ts` — centralized env config (never use `process.env` directly)',
    '- `src/app/routes/index.ts` — route registry (preserve `INJECT` markers)',
    '- `src/app/middlewares/` — `<name>.middleware.ts` naming enforced by `cem build`',
    '- `src/app/utils/` — `catchAsync`, `sendResponse`, `validateRequest`, `logger`',
  );

  if (useAuth) {
    lines.push("- `src/app/middlewares/auth.middleware.ts` — `auth('ADMIN')` / `auth('USER', 'ADMIN')`");
  }

  lines.push('');
  return lines.join('\n');
}
