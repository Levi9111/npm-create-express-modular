/**
 * src/lib/pm.ts
 *
 * Package manager detection and command helpers.
 * Supports npm, yarn, and pnpm with a consistent interface so the
 * rest of the CLI never hard-codes PM-specific commands.
 */

import fs from 'fs';
import path from 'path';
import type { PackageManager } from './types';

/**
 * Detect the package manager from the current context.
 * Priority: lock file → npm_config_user_agent → default npm.
 */
export function detectPM(cwd: string = process.cwd()): PackageManager {
  // 1. Lock file (strongest signal — existing project)
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(cwd, 'package-lock.json'))) return 'npm';

  // 2. User agent (set by the PM that invoked the CLI)
  const ua = process.env.npm_config_user_agent || '';
  if (ua.startsWith('pnpm')) return 'pnpm';
  if (ua.startsWith('yarn')) return 'yarn';

  // 3. Default
  return 'npm';
}

// ─── COMMAND MAPS ────────────────────────────────────────────────────────────
const COMMANDS: Record<PackageManager, Record<string, string>> = {
  npm: {
    install: 'npm install',
    installDev: 'npm install -D',
    ci: 'npm ci',
    run: 'npm run',
    exec: 'npx',
    global: 'npm i -g',
    lockfile: 'package-lock.json',
  },
  yarn: {
    install: 'yarn add',
    installDev: 'yarn add -D',
    ci: 'yarn install --frozen-lockfile',
    run: 'yarn',
    exec: 'yarn dlx',
    global: 'yarn global add',
    lockfile: 'yarn.lock',
  },
  pnpm: {
    install: 'pnpm add',
    installDev: 'pnpm add -D',
    ci: 'pnpm install --frozen-lockfile',
    run: 'pnpm',
    exec: 'pnpm dlx',
    global: 'pnpm add -g',
    lockfile: 'pnpm-lock.yaml',
  },
};

export function commands(pm: PackageManager): Record<string, string> {
  return COMMANDS[pm] || COMMANDS.npm;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

export function runScript(pm: PackageManager, script: string): string {
  return pm === 'npm' ? `npm run ${script}` : `${pm} ${script}`;
}

export function installCmd(
  pm: PackageManager,
  packages: string[],
  { dev = false }: { dev?: boolean } = {},
): string {
  const base = dev ? commands(pm).installDev : commands(pm).install;
  return `${base} ${packages.join(' ')}`;
}

export function initialInstallCmd(pm: PackageManager): string {
  switch (pm) {
    case 'yarn':
      return 'yarn install';
    case 'pnpm':
      return 'pnpm install';
    default:
      return 'npm install --no-audit --no-fund --loglevel=error';
  }
}
